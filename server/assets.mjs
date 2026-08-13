// 산출물(스토리보드 이미지·영상) 조회와 전송.
//
// 화면은 Cloudflare Workers 런타임이라 unsorted/outputs/ 를 직접 읽을 수 없다.
// 그래서 파일을 아는 쪽인 이 사이드카가 목록과 바이트를 모두 내려준다.
//
// 경로 규칙은 projects.mjs 와 같다. 화면은 슬러그와 "매니페스트가 알려준 상대경로"만
// 보낼 수 있고, 절대경로는 서버가 만든다. 화면이 경로를 지어낼 수 있으면 그것이 곧
// 임의 파일 읽기가 되므로, 매니페스트에 없는 경로는 받아도 거절한다.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readdir, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";

import { readDocumentManifest } from "./documents.mjs";
import { PROJECT_ROOT } from "./gate.mjs";
import { SLUG_PATTERN } from "./projects.mjs";

const PROJECTS_DIR = resolve(PROJECT_ROOT, "unsorted/outputs/projects");

/** 스토리보드 3안은 폴더 이름이 곧 안 이름이다. 이 셋 말고는 읽지 않는다. */
const VARIANTS = ["a", "b", "c"];

/**
 * 공개해도 되는 형식만 내보낸다. .md/.json 은 제외한다. 이 라우트의 목적은
 * "화면에 그리는 것"이고, 문서·이력에는 각각 전용 라우트가 이미 있다.
 */
const CONTENT_TYPES = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".mp4", "video/mp4"],
]);

/**
 * 검수에 실패한 채로 남아 있는 초안 영상.
 *
 * 어느 프로젝트 폴더에도 들어 있지 않다. 요청서(kling-a-30s-request.json)가 가리키는
 * 원본 이미지의 sha256 이 현재 어느 프로젝트의 scene-01.png 와도 일치하지 않기 때문에,
 * 특정 프로젝트 소속으로 옮기면 확인되지 않은 연결을 사실인 것처럼 기록하게 된다.
 * 그래서 있는 자리 그대로, 자기 메타데이터와 함께 내보낸다.
 */
// 웹 재생용 사본을 먼저 쓴다. 원본은 9.8MB · High profile 이라 시연장 회선에서
// 재생 시작까지 오래 걸린다. 사본은 Main profile · faststart · 4.6MB 다.
// 사본이 없으면 원본을 그대로 내보낸다. 사본은 언제든 다시 만들 수 있다:
//   ffmpeg -i draft.mp4 -c:v libx264 -profile:v main -pix_fmt yuv420p -movflags +faststart -an draft-web.mp4
const STANDALONE_VIDEOS = [
  "unsorted/outputs/video/draft-web.mp4",
  "unsorted/outputs/video/draft.mp4",
];

function isSafeSlug(slug) {
  return typeof slug === "string" && SLUG_PATTERN.test(slug);
}

async function listPngs(slug, variant) {
  const relativeDir = `storyboard/images/${variant}`;
  const absoluteDir = resolve(PROJECTS_DIR, slug, relativeDir);
  let entries;
  try {
    entries = await readdir(absoluteDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".png")
    // scene-01, scene-02 … 는 문자열 정렬이 곧 장면 순서다. 정렬을 빼면
    // readdir 이 주는 순서가 그대로 나가서 장면이 뒤섞여 보인다.
    .map((entry) => `${relativeDir}/${entry.name}`)
    .sort();
}

async function statOrNull(absolute) {
  try {
    const info = await stat(absolute);
    return info.isFile() ? info : null;
  } catch {
    return null;
  }
}

/** 프로젝트 폴더 안의 영상. 아직 어느 프로젝트도 여기까지 오지 못했지만, 오면 잡힌다. */
async function findProjectVideo(slug) {
  const relativeDir = "video";
  const absoluteDir = resolve(PROJECTS_DIR, slug, relativeDir);
  let entries;
  try {
    entries = await readdir(absoluteDir, { withFileTypes: true });
  } catch {
    return null;
  }
  const file = entries.find(
    (entry) => entry.isFile() && extname(entry.name).toLowerCase() === ".mp4",
  );
  if (!file) return null;
  const relativePath = `${relativeDir}/${file.name}`;
  const info = await statOrNull(resolve(PROJECTS_DIR, slug, relativePath));
  if (!info) return null;
  return { path: relativePath, bytes: info.size, standalone: false };
}

/**
 * 화면이 그릴 수 있는 것 전부의 목록.
 *
 * 없는 것은 빈 배열·null 로 정직하게 내려간다. 목록을 부풀리면 화면은 깨진 이미지를
 * 그리고, 시연에서 그것은 "만들다 만 것"으로 보인다.
 */
export async function readAssetManifest(slug) {
  if (!isSafeSlug(slug)) return null;

  const storyboard = {};
  for (const variant of VARIANTS) {
    storyboard[variant] = await listPngs(slug, variant);
  }

  let video = await findProjectVideo(slug);
  if (!video) {
    for (const candidate of STANDALONE_VIDEOS) {
      const info = await statOrNull(resolve(PROJECT_ROOT, candidate));
      if (info) {
        video = { path: candidate, bytes: info.size, standalone: true };
        break;
      }
    }
  }

  return { slug, storyboard, video };
}

/**
 * 그릴 것이 실제로 있는 프로젝트만 추린다.
 *
 * 화면이 프로젝트를 하나씩 물어보며 "이건 있나" 확인하게 두면 요청이 프로젝트 수만큼
 * 늘고, 빈 프로젝트를 고른 순간 화면이 비어 버린다. 어디에 무엇이 있는지는 파일을
 * 아는 쪽이 한 번에 알려주는 편이 맞다.
 */
export async function listAssetProjects() {
  let entries;
  try {
    entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
  } catch {
    return [];
  }

  const projects = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !SLUG_PATTERN.test(entry.name)) continue;
    const manifest = await readAssetManifest(entry.name);
    if (!manifest) continue;
    const counts = Object.fromEntries(
      VARIANTS.map((variant) => [variant, manifest.storyboard[variant].length]),
    );
    const total = VARIANTS.reduce((sum, variant) => sum + counts[variant], 0);
    // 이미지가 0장이어도 목록에서 빼지 않는다. 문안까지만 끝난 프로젝트는 미완성이
    // 아니라 유료 이미지 생성 승인을 기다리는 상태이고, 기획안·시나리오·문안은
    // 이미 존재한다. 목록에서 빼면 그 프로젝트는 화면에서 사라져 없는 것이 된다.
    // 문서 개수를 같이 실어 보낸다. 화면이 기본으로 열 프로젝트를 고르려면
    // "그림이 몇 장인가"가 아니라 "읽을 것이 있는가"를 알아야 하는데, 자산
    // 목록만으로는 그 둘을 구분할 수 없다.
    const documents = await readDocumentManifest(entry.name);
    projects.push({
      slug: entry.name,
      counts,
      total,
      documents: documents?.total ?? 0,
      video: manifest.video,
    });
  }

  projects.sort((a, b) => b.slug.localeCompare(a.slug));
  return projects;
}

/**
 * 매니페스트가 실제로 알려준 경로인지 확인한 뒤에만 절대경로를 만든다.
 *
 * 확장자 검사나 ../ 검사만으로 막지 않는 이유: 그런 검사는 "이 파일을 읽어도 되는가"가
 * 아니라 "이 문자열이 위험해 보이는가"를 볼 뿐이다. 목록에 있는 것만 내보내면
 * 판단 기준이 하나로 모인다.
 */
export async function resolveAsset(slug, relativePath) {
  if (!isSafeSlug(slug) || typeof relativePath !== "string") return null;

  const manifest = await readAssetManifest(slug);
  if (!manifest) return null;

  const allowed = new Set([
    ...VARIANTS.flatMap((variant) => manifest.storyboard[variant]),
    ...(manifest.video ? [manifest.video.path] : []),
  ]);
  if (!allowed.has(relativePath)) return null;

  const contentType = CONTENT_TYPES.get(extname(relativePath).toLowerCase());
  if (!contentType) return null;

  // 단독 영상만 저장소 루트 기준이고, 나머지는 프로젝트 폴더 기준이다.
  const base = STANDALONE_VIDEOS.includes(relativePath) ? PROJECT_ROOT : resolve(PROJECTS_DIR, slug);
  const absolute = resolve(base, relativePath);
  const info = await statOrNull(absolute);
  if (!info) return null;

  return { absolute, contentType, bytes: info.size };
}

/**
 * 목록용 축소본을 만들어 둔다.
 *
 * 원본 장면 그림은 941×1672 · 2MB 안팎인데 목록에서 차지하는 자리는 269×165 다.
 * 원본을 그대로 내려보내면 3안 미리보기에만 6MB 를 쓰고, 시연장 회선에서는 그동안
 * 그림 자리가 비어 있다. 비어 있는 자리는 "아직 안 만든 것"으로 읽힌다.
 *
 * ffmpeg 가 없거나 실패하면 null 을 돌려주고 호출한 쪽이 원본을 보낸다. 축소가
 * 안 되는 것은 느려질 뿐이지만, 그림이 아예 안 나오는 것은 고장이다.
 */
const THUMBNAIL_DIR = resolve(PROJECT_ROOT, "unsorted/outputs/.thumbnails");
const THUMBNAIL_WIDTHS = new Set([320, 540]);

export async function resolveThumbnail(asset, width) {
  if (!THUMBNAIL_WIDTHS.has(width)) return null;
  if (!asset.contentType.startsWith("image/")) return null;

  // 원본 경로와 크기·수정시각으로 이름을 짓는다. 그림이 다시 생성되면 mtime 이
  // 바뀌므로 낡은 축소본을 계속 내보내는 일이 없다.
  const info = await statOrNull(asset.absolute);
  if (!info) return null;
  const key = createHash("sha256")
    .update(`${asset.absolute}:${info.size}:${info.mtimeMs}:${width}`)
    .digest("hex")
    .slice(0, 16);
  // webp 가 아니라 jpeg 를 쓴다. Homebrew 의 ffmpeg 빌드에 libwebp 인코더가 없는
  // 경우가 있고("Default encoder for format webp is probably disabled"), mjpeg 는
  // 어느 빌드에나 들어 있다. 목록용 축소본에는 이 차이가 중요하지 않다.
  const target = resolve(THUMBNAIL_DIR, `${key}.jpg`);

  const cached = await statOrNull(target);
  if (cached) return { absolute: target, contentType: "image/jpeg", bytes: cached.size };

  await mkdir(THUMBNAIL_DIR, { recursive: true });
  const made = await new Promise((done) => {
    const proc = spawn("ffmpeg", [
      "-loglevel", "error",
      "-y",
      "-i", asset.absolute,
      "-vf", `scale=${width}:-2`,
      "-q:v", "4",
      target,
    ]);
    const timer = setTimeout(() => proc.kill("SIGKILL"), 20_000);
    proc.on("error", () => {
      clearTimeout(timer);
      done(false);
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      done(code === 0);
    });
  });
  if (!made) return null;

  const written = await statOrNull(target);
  if (!written) return null;
  return { absolute: target, contentType: "image/jpeg", bytes: written.size };
}

/**
 * 파일을 내보낸다. 영상은 Range 요청을 지원해야 한다.
 *
 * <video> 는 탐색(스크러빙)할 때 Range 로 부분 요청을 보낸다. 206 을 못 주면 브라우저는
 * 매번 처음부터 다시 받거나, Safari 에서는 아예 재생을 시작하지 않는다.
 */
export function sendAsset(req, res, asset) {
  // 산출물은 캐시한다. no-store 를 걸면 화면이 폴링으로 리렌더될 때마다 2MB PNG 를
  // 다시 받는다. 요청이 겹치면 브라우저가 앞의 것을 취소해서, 그림이 떴다 사라졌다 한다.
  // 조회 응답(JSON)과 달리 이쪽은 파일이고, 바뀌면 경로나 프로젝트가 함께 바뀐다.
  const cacheControl = "private, max-age=300";
  const range = req.headers.range;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range ?? "");

  if (match) {
    const [, rawStart, rawEnd] = match;
    const start = rawStart === "" ? Math.max(0, asset.bytes - Number(rawEnd)) : Number(rawStart);
    const end = rawStart === "" || rawEnd === "" ? asset.bytes - 1 : Number(rawEnd);

    if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= asset.bytes) {
      res.writeHead(416, { "content-range": `bytes */${asset.bytes}` });
      return res.end();
    }

    res.writeHead(206, {
      "content-type": asset.contentType,
      "content-length": end - start + 1,
      "content-range": `bytes ${start}-${end}/${asset.bytes}`,
      "accept-ranges": "bytes",
      "cache-control": cacheControl,
    });
    return createReadStream(asset.absolute, { start, end }).pipe(res);
  }

  res.writeHead(200, {
    "content-type": asset.contentType,
    "content-length": asset.bytes,
    "accept-ranges": "bytes",
    "cache-control": cacheControl,
  });
  return createReadStream(asset.absolute).pipe(res);
}

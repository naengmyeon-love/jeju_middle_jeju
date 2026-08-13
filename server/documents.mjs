// 문안(기획안·시나리오·스토리보드·프롬프트) 조회.
//
// 왜 자산(assets.mjs)과 나누는가: 자산 라우트는 "화면에 그리는 것"이고 .md/.json 을
// 일부러 막는다. 이쪽은 읽는 것이라 반대로 텍스트만 내보낸다. 한 라우트가 둘을 겸하면
// 확장자 허용 목록이 넓어지고, 넓어진 목록은 곧 제작 이력·설정 파일까지 열어 준다.
//
// Timely Agent(Solar Pro 4)가 만드는 것은 전부 여기에 해당한다. 이미지는 그 다음
// 단계(Higgsfield 유료 생성)의 결과물이므로, 문안만 있고 그림이 없는 프로젝트는
// 미완성이 아니라 "유료 승인 대기" 상태다.

import { readFile, readdir, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";

import { PROJECT_ROOT } from "./gate.mjs";
import { SLUG_PATTERN } from "./projects.mjs";

const PROJECTS_DIR = resolve(PROJECT_ROOT, "unsorted/outputs/projects");

/** 읽어도 되는 텍스트 형식. production-log.json 같은 기록은 전용 라우트가 따로 있다. */
const TEXT_EXTENSIONS = new Set([".md", ".txt"]);

/** 한 파일이 지나치게 크면 화면이 멈춘다. 문안은 이 크기를 넘을 일이 없다. */
const MAX_BYTES = 512 * 1024;

/**
 * 사이드카는 시연 중 공개 터널 뒤에 놓인다. 산출물에 키가 섞여 들어간 적이 있다면
 * 그것을 그대로 내보내게 된다. 공개 빌드 검사(web/scripts/check-public-build.mjs)와
 * 같은 기준을 여기서도 적용한다. 경로가 둘인데 기준이 하나만 있으면 의미가 없다.
 */
const SECRET_VALUE =
  /(?:sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|(?:api[_ -]?key|secret|token|password)\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,})/i;

/** 어느 폴더를 어떤 이름으로 보여줄지. 목록에 없는 폴더는 읽지 않는다. */
const GROUPS = [
  { id: "planning", label: "기획·시나리오", dir: "planning" },
  { id: "storyboard", label: "스토리보드 문안", dir: "storyboard" },
  { id: "prompts", label: "Higgsfield 프롬프트", dir: "storyboard/prompts" },
  { id: "review", label: "검수 기록", dir: "review" },
];

function isSafeSlug(slug) {
  return typeof slug === "string" && SLUG_PATTERN.test(slug);
}

async function listTextFiles(slug, dir) {
  const absoluteDir = resolve(PROJECTS_DIR, slug, dir);
  let entries;
  try {
    entries = await readdir(absoluteDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue;
    const relativePath = `${dir}/${entry.name}`;
    const info = await stat(resolve(PROJECTS_DIR, slug, relativePath)).catch(() => null);
    if (!info?.isFile()) continue;
    files.push({ path: relativePath, name: entry.name, bytes: info.size });
  }
  // plan-a, plan-b, plan-c / a1, a2 … 는 이름 순서가 곧 읽는 순서다.
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

export async function readDocumentManifest(slug) {
  if (!isSafeSlug(slug)) return null;

  const groups = [];
  for (const group of GROUPS) {
    // storyboard 폴더를 읽을 때 prompts 하위까지 딸려오면 같은 파일이 두 번 나온다.
    const files = (await listTextFiles(slug, group.dir)).filter(
      (file) => group.id !== "storyboard" || !file.path.startsWith("storyboard/prompts/"),
    );
    if (files.length) groups.push({ ...group, files });
  }

  const total = groups.reduce((sum, group) => sum + group.files.length, 0);
  return { slug, groups, total };
}

/**
 * 매니페스트에 있는 경로만 읽는다. 판단 기준을 한 곳에 모은다(assets.mjs 와 같은 이유).
 */
export async function readDocument(slug, relativePath) {
  if (!isSafeSlug(slug) || typeof relativePath !== "string") return null;

  const manifest = await readDocumentManifest(slug);
  if (!manifest) return null;

  const allowed = new Set(manifest.groups.flatMap((group) => group.files.map((f) => f.path)));
  if (!allowed.has(relativePath)) return null;

  const absolute = resolve(PROJECTS_DIR, slug, relativePath);
  const info = await stat(absolute).catch(() => null);
  if (!info?.isFile()) return null;
  if (info.size > MAX_BYTES) return { path: relativePath, error: "파일이 너무 큽니다." };

  const text = await readFile(absolute, "utf8");
  if (SECRET_VALUE.test(text)) {
    // 무엇이 걸렸는지는 내보내지 않는다. 걸린 위치를 알려주는 것만으로도 단서가 된다.
    return { path: relativePath, error: "비밀값이 탐지되어 공개하지 않습니다." };
  }

  return { path: relativePath, bytes: info.size, text };
}

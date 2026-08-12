#!/usr/bin/env node
// 컷 클립의 실제 마지막 프레임을 PNG 로 뽑는다.
// 다음 컷의 start image 는 이 파일이어야 한다. 사람이 매번 ffmpeg 옵션과
// 저장 경로를 맞추면 어긋나므로, 추출 시점과 경로 규칙을 여기에 고정한다.

import { spawn } from "node:child_process";
import { mkdir, stat, rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "../..");

// 컨테이너 끝에서 이만큼 앞으로 seek 한 뒤 첫 프레임을 쓴다.
// 0 으로 두면 마지막 프레임 직후로 넘어가 빈 출력이 나오는 경우가 있다.
const SEEK_FROM_END_SECONDS = 0.05;

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function usage() {
  console.log(`사용법:
  node unsorted/scripts/extract-last-frame.mjs --clip <경로> [--out <경로>]

--clip  컷 클립 mp4 경로 (예: project-output/video/clips/scene-01.mp4)
--out   저장 경로. 생략하면 같은 프로젝트의
        video/frames/<클립이름>-last.png 로 저장한다.

출력은 저장된 PNG 의 절대 경로 한 줄이다. 그 경로를 다음 컷의
start image 로 그대로 넘긴다.`);
}

function defaultOutputPath(clipPath) {
  // .../video/clips/scene-01.mp4 → .../video/frames/scene-01-last.png
  const clipsDirectory = dirname(clipPath);
  const videoDirectory = dirname(clipsDirectory);
  const stem = basename(clipPath).replace(/\.[^.]+$/, "");
  return resolve(videoDirectory, "frames", `${stem}-last.png`);
}

function runFfmpeg(arguments_) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("ffmpeg", arguments_, {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      if (error.code === "ENOENT") {
        rejectPromise(new Error("ffmpeg 를 찾지 못했다. 설치 후 다시 실행한다."));
        return;
      }
      rejectPromise(error);
    });
    child.on("close", (code) => {
      if (code === 0) resolvePromise();
      else rejectPromise(new Error(`ffmpeg 가 상태 ${code} 로 종료했다:\n${stderr.trim()}`));
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.clip) {
    usage();
    process.exit(args.clip ? 0 : 2);
  }

  const clipPath = resolve(projectRoot, String(args.clip));
  if (!clipPath.startsWith(`${projectRoot}/`)) {
    fail("--clip 은 프로젝트 안의 경로여야 한다.");
  }
  try {
    await stat(clipPath);
  } catch {
    fail(`클립 파일이 없다: ${clipPath}`);
  }

  const outputPath =
    typeof args.out === "string"
      ? resolve(projectRoot, args.out)
      : defaultOutputPath(clipPath);
  if (!outputPath.startsWith(`${projectRoot}/`)) {
    fail("--out 은 프로젝트 안의 경로여야 한다.");
  }
  await mkdir(dirname(outputPath), { recursive: true });

  await runFfmpeg([
    "-y",
    "-sseof",
    `-${SEEK_FROM_END_SECONDS}`,
    "-i",
    clipPath,
    "-vsync",
    "0",
    "-frames:v",
    "1",
    "-q:v",
    "1",
    outputPath,
  ]);

  // 빈 파일이 남으면 다음 컷이 깨진 start image 를 물게 된다. 여기서 끊는다.
  let size = 0;
  try {
    ({ size } = await stat(outputPath));
  } catch {
    fail(`프레임 추출에 실패했다. 출력 파일이 생성되지 않았다: ${outputPath}`);
  }
  if (size === 0) {
    await rm(outputPath, { force: true });
    fail(`프레임 추출에 실패했다. 출력 파일이 비어 있다: ${clipPath}`);
  }

  console.log(outputPath);
}

main().catch((error) => fail(error.message));

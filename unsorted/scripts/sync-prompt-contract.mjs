#!/usr/bin/env node
// character-guide.json 의 image_generation 블록을 higgsfield-prompt-builder skill 안으로 복사한다.
//
// 왜 복사가 필요한가: 타임리 같은 외부 플랫폼은 skill 폴더만 업로드하고 shared/ 는 갱신하지 않는다.
// 계약이 shared/ 에만 있으면 스킬이 계약을 읽지 못해 즉흥으로 프롬프트를 만든다.
// 그래서 스킬이 자기 계약을 들고 다니게 하되, 원본은 character-guide.json 하나로 유지한다.
//
// --check 를 주면 쓰지 않고 동기화 여부만 검사한다 (CI/커밋 전 확인용, 어긋나면 exit 1).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";

const projectRoot = resolve(import.meta.dirname, "../..");
const sourcePath = resolve(projectRoot, "data/character-guide.json");
const targets = [
  resolve(
    projectRoot,
    "skills/higgsfield-prompt-builder/references/image-generation-contract.json",
  ),
];

const checkOnly = process.argv.includes("--check");

const guide = JSON.parse(await readFile(sourcePath, "utf8"));
if (!guide.image_generation) {
  console.error("ERROR: character-guide.json 에 image_generation 블록이 없습니다.");
  process.exit(2);
}

const payload = {
  _generated_by: "unsorted/scripts/sync-prompt-contract.mjs",
  _source: "data/character-guide.json → image_generation",
  _warning:
    "이 파일을 직접 수정하지 않는다. character-guide.json 을 고치고 sync 스크립트를 다시 실행한다.",
  guide_version: guide.guide_version,
  updated_at: guide.updated_at,
  official_characters: guide.official_characters.map((c) => ({
    id: c.id,
    name_ko: c.name_ko,
    name_en: c.name_en,
  })),
  image_generation: guide.image_generation,
};

const serialised = `${JSON.stringify(payload, null, 2)}\n`;

let drifted = false;
for (const target of targets) {
  if (checkOnly) {
    let current = null;
    try {
      current = await readFile(target, "utf8");
    } catch {
      current = null;
    }
    if (current !== serialised) {
      drifted = true;
      console.error(`DRIFT: ${target}`);
    }
    continue;
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, serialised, "utf8");
  console.log(`synced: ${target}`);
}

if (checkOnly) {
  if (drifted) {
    console.error(
      "계약이 원본과 어긋났습니다. npm run sync:contract 를 실행하십시오.",
    );
    process.exit(1);
  }
  console.log("계약 동기화 상태 정상.");
}

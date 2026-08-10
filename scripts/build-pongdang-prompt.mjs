#!/usr/bin/env node
// 퐁당패밀리 캐릭터 이미지 생성 프롬프트 조립기.
// character-guide.json 의 image_generation 계약만을 근거로 프롬프트를 만든다.
// 사람이 캐릭터 외형을 다시 쓰지 못하게 하는 것이 목적이다.

import { readFile, access } from "node:fs/promises";
import { resolve, relative } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const guidePath = resolve(
  projectRoot,
  "pongdangpongdang/guides/character-guide.json",
);
const pagesDir = resolve(
  projectRoot,
  "pongdangpongdang/캐릭터_가이드라인_작업용/pages",
);

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
  node scripts/build-pongdang-prompt.mjs \\
    --characters boo-rabong,hokko \\
    --scene "BOO RABONG holds out a tangerine toward HOKKO. HOKKO sits and looks up." \\
    --background "the yard of a Jeju stone house in daytime" \\
    --camera "front-facing medium shot" \\
    [--model nano_banana_2] [--aspect 9:16] [--command]

캐릭터 id: boo-rabong, go-lebang, yang-pongdang, nyang-nyangi, hokko, gu-aegu
--command 를 주면 그대로 실행 가능한 higgsfield CLI 명령을 함께 출력한다.

주의: --scene 에는 행동, 표정, 배경만 쓴다. 캐릭터 외형은 절대 쓰지 않는다.
외형은 가이드의 lock_en 이 담당하며, 장면에서 다시 서술하면 원본에서 이탈한다.`);
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const args = parseArgs(process.argv.slice(2));

if (args.help || Object.keys(args).length === 0) {
  usage();
  process.exit(0);
}

const guide = JSON.parse(await readFile(guidePath, "utf8"));
const contract = guide.image_generation;
if (!contract) fail("character-guide.json 에 image_generation 블록이 없습니다.");

const ids = String(args.characters ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

if (ids.length === 0) fail("--characters 가 필요합니다.");

const unknown = ids.filter((id) => !contract.characters[id]);
if (unknown.length > 0) {
  fail(
    `공식 6인에 없는 캐릭터입니다: ${unknown.join(", ")}. ` +
      `사용 가능: ${Object.keys(contract.characters).join(", ")}`,
  );
}

if (!args.scene) fail("--scene 이 필요합니다.");

// 레퍼런스 페이지 수집. 단체 컷이면 세계관·관계도·키비례표를 더한다.
const pageNumbers = new Set();
for (const id of ids) {
  for (const page of contract.characters[id].reference_pages) pageNumbers.add(page);
}
if (ids.length > 1) {
  for (const page of contract.group_rules.reference_pages) pageNumbers.add(page);
}

const referencePaths = [...pageNumbers]
  .sort((a, b) => a - b)
  .map((n) => resolve(pagesDir, `page-${String(n).padStart(2, "0")}.png`));

// 사전 게이트: 레퍼런스가 하나라도 없으면 프롬프트를 내주지 않는다.
const missing = [];
for (const path of referencePaths) {
  if (!(await exists(path))) missing.push(path);
}
if (missing.length > 0) {
  fail(
    `레퍼런스 페이지가 없습니다. 생성을 중단합니다:\n  ${missing.join("\n  ")}`,
  );
}

const cast = ids.map((id) => contract.characters[id].lock_en);
if (ids.length > 1) {
  // 키 순서는 등장 인원만 뽑아 영문 표기로 낸다. 프롬프트에 불필요한 이름이 들어가면
  // 모델이 등장하지 않는 캐릭터를 그려 넣는다.
  const koToEn = new Map(
    guide.official_characters.map((c) => [c.name_ko, c.name_en]),
  );
  const present = new Set(
    ids.map((id) => guide.official_characters.find((c) => c.id === id).name_ko),
  );
  const ordered = contract.group_rules.height_order_tall_to_short
    .filter((name) => present.has(name))
    .map((name) => koToEn.get(name));
  cast.push(
    `height order from tallest to shortest: ${ordered.join(" > ")}`,
  );
}

const negatives = [...contract.global_negative_en];
for (const id of ids) {
  const character = contract.characters[id];
  const forbidden = character.forbidden_en;
  if (!forbidden || forbidden.length === 0) {
    fail(`${id} 에 forbidden_en 이 없습니다. 가이드를 먼저 채워야 합니다.`);
  }
  negatives.push(...forbidden);
}

const aspect = args.aspect ?? contract.mandatory.aspect_ratio_default;
const camera = args.camera ?? "front-facing medium shot";
const background = args.background
  ? `Background is ${args.background}.`
  : "Background is a plain uncluttered setting.";

const prompt = [
  "[STYLE]",
  contract.style_lock_en,
  "",
  "[CAST]",
  ...cast,
  "",
  "[SCENE]",
  args.scene,
  background,
  "",
  "[COMPOSITION]",
  `${camera}, vertical ${aspect} framing, characters inside the safe area, plain uncluttered background`,
  "",
  "[NEGATIVE]",
  ...negatives,
  "",
  "[OUTPUT]",
  "single still image, no text anywhere in the image",
].join("\n");

console.log(prompt);

if (args.command) {
  const model = args.model ?? "nano_banana_2";
  const imageFlags = referencePaths
    .map((path) => `  --image ${JSON.stringify(relative(projectRoot, path))} \\`)
    .join("\n");
  console.log(
    [
      "",
      "# ---- 실행 명령 (제작·비용 승인 이후에만) ----",
      `higgsfield generate create ${model} \\`,
      "  --prompt \"$(cat prompt.txt)\" \\",
      imageFlags,
      `  --aspect_ratio ${aspect} \\`,
      "  --wait",
    ].join("\n"),
  );
}

console.error(
  `\n[게이트 통과] 캐릭터 ${ids.length}인, 레퍼런스 ${referencePaths.length}장, 네거티브 ${negatives.length}항목.` +
    `\n생성 후 각 캐릭터의 사용 규칙 페이지와 결과를 1:1로 대조하십시오.`,
);

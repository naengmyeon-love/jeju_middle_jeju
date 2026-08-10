#!/usr/bin/env node
// 퐁당패밀리 캐릭터 이미지 생성 프롬프트 조립기.
// character-guide.json 의 image_generation 계약만을 근거로 프롬프트를 만든다.
// 사람이 캐릭터 외형을 다시 쓰지 못하게 하는 것이 목적이다.

import { readFile, access } from "node:fs/promises";
import { resolve, relative } from "node:path";

const projectRoot = resolve(import.meta.dirname, "../..");
const guidePath = resolve(projectRoot, "data/character-guide.json");
const pagesDir = resolve(projectRoot, "shared/references/pages");

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
    [--model nano_banana_flash] [--aspect 9:16] [--command]

캐릭터 id: boo-rabong, go-lebang, yang-pongdang, nyang-nyangi, hokko, gu-aegu
--command 를 주면 그대로 실행 가능한 higgsfield CLI 명령을 함께 출력한다.

주의: --scene 에는 행동, 표정, 배경만 쓴다. 캐릭터 외형은 절대 쓰지 않는다.
외형은 가이드의 lock_en 이 담당하며, 장면에서 다시 서술하면 원본에서 이탈한다.

--camera 는 한 순간·한 앵글만 받는다. 샷 크기를 정확히 하나 포함해야 하고
(${SHOT_SIZES.join(", ")}), 카메라 이동·샷 전환 표현은 거부된다.
--scene 도 한 순간만 받는다. 시간 흐름 표현은 거부된다.`);
}

// ── 정지 이미지 입력 게이트 ────────────────────────────────────────────────
//
// 왜 필요한가: scenario.md 의 카메라 필드는 "영상 연출 지시"다. 시나리오 단계에서는
// 그게 옳지만, 그대로 정지 이미지 프롬프트로 흘러들면 모델은 지시 하나당 컷 하나를
// 그린다. 2026-08-11 nano_banana_flash 6회 실측에서 상관이 4/4로 정확했다.
//
//   "full shot tracking → transitioning to a face close-up"  지시 2개 → 2패널
//   "from behind → panning to the tree → cutting back to CU"  지시 3개 → 3패널
//   "tracking shot following" + "one patch of shade after another"  → 부라봉 2마리
//   "low-angle full shot"                                     지시 1개 → 정상
//
// NEGATIVE 블록으로는 막을 수 없다. 이미지 모델에서 긍정 지시가 부정 지시를 이기기
// 때문이다. 실제로 global_negative_en 에 "no comic panels, no split frames" 를 넣은
// v1.1 생성분도 그대로 2패널이 나왔다. 그래서 프롬프트에 들어가기 전에 입력을 막는다.
//
// 눈의 흰자·동공 이탈도 여기서 같이 해결된다. 흰자는 클로즈업 패널에서만 나타났다.
// 확대되면 모델이 눈 디테일을 채우기 때문이다. 컷을 하나로 묶으면 함께 사라진다.

// 샷 크기는 화이트리스트다. 정확히 하나만 허용한다. 두 개가 들어오면 그 자체가
// "샷을 전환하라"는 지시가 되므로 개수 검사만으로 분할 컷의 주원인이 걸러진다.
// 긴 표현이 짧은 표현을 포함하므로(extreme close-up ⊃ close-up) 긴 것부터 센다.
const SHOT_SIZES = [
  "extreme close-up",
  "establishing shot",
  "medium close-up",
  "close-up",
  "bust shot",
  "medium shot",
  "full shot",
  "wide shot",
];

const REJECT_RULES = [
  {
    label: "카메라 이동·샷 전환",
    hint: "정지 이미지는 카메라가 움직이지 않는다. 앵글 하나를 골라 다시 쓴다.",
    patterns: [
      /\btransition(?:s|ing|ed)?\b/i,
      /\bcut(?:s|ting)?\s+(?:back|to|away)\b/i,
      /\bjump\s*-?\s*cut\b/i,
      /\bpan(?:s|ning|ned)?\b/i,
      /\btilt(?:s|ing|ed)?\s*(?:up|down)\b/i,
      /\btrack(?:s|ing|ed)?\b/i,
      /\bfollow(?:s|ing)?\b/i,
      /\bdolly\b/i,
      /\bcrane\b/i,
      /\bzoom(?:s|ing|ed)?\b/i,
      /\bhandheld\b/i,
      /\bsway(?:s|ing)?\b/i,
      /\bstarting\s+from\b/i,
      /\bmoves?\s+(?:toward|across|along)\b/i,
    ],
  },
  {
    label: "시간 흐름·연속 동작",
    hint: "한 장면에 두 순간을 담으면 모델은 화면을 나누거나 캐릭터를 두 번 그린다. 한 순간만 고른다.",
    patterns: [
      /\bthen\b/i,
      /\bafter\s+another\b/i,
      /\bone\s+\S+(?:\s+\S+)?\s+after\b/i,
      /\bfirst\b[^.]*\bthen\b/i,
      /\bbefore\s+and\s+after\b/i,
      /\bmoments?\s+later\b/i,
      /\bsequence\b/i,
      /\bmontage\b/i,
      /\bstep\s+by\s+step\b/i,
      /\bwhile\s+\S+ing[^.]*\bthen\b/i,
    ],
  },
  {
    label: "분할 레이아웃",
    hint: "결과물은 한 프레임짜리 정지 이미지다. 시트·격자·나열 구성은 만들지 않는다.",
    patterns: [
      /\bpanels?\b/i,
      /\bsplit[\s-]?screen\b/i,
      /\bside[\s-]by[\s-]side\b/i,
      /\bcomic\b/i,
      /\bstoryboard\b/i,
      /\bcollage\b/i,
      /\bgrid\b/i,
      /\bmulti[\s-]?view\b/i,
      /\bturnaround\b/i,
      /\bcharacter\s*sheet\b/i,
      /\bcontact\s*sheet\b/i,
    ],
  },
];

/** 입력 문자열에서 금지 표현을 전부 찾아 돌려준다. 첫 건에서 멈추지 않는 이유는,
 *  한 번의 실패로 모든 문제를 보여줘야 재시도가 한 번에 끝나기 때문이다. */
function findViolations(field, value) {
  const hits = [];
  for (const rule of REJECT_RULES) {
    for (const pattern of rule.patterns) {
      const match = pattern.exec(value);
      if (match) hits.push({ field, rule, phrase: match[0] });
    }
  }
  return hits;
}

function countShotSizes(value) {
  let rest = value.toLowerCase();
  const found = [];
  for (const size of SHOT_SIZES) {
    while (rest.includes(size)) {
      found.push(size);
      rest = rest.replace(size, " ");
    }
  }
  return found;
}

/** --scene 과 --camera 를 검사한다. 통과하지 못하면 프롬프트를 아예 내주지 않는다.
 *  회피 옵션을 두지 않는다. 빠져나갈 구멍이 있으면 급할 때 반드시 그리로 간다. */
function enforceStillImageInput(scene, camera) {
  const violations = [
    ...findViolations("--scene", scene),
    ...findViolations("--camera", camera),
  ];

  const shots = countShotSizes(camera);
  if (shots.length === 0) {
    violations.push({
      field: "--camera",
      rule: {
        label: "샷 크기 누락",
        hint: `다음 중 하나를 정확히 하나만 포함해야 한다: ${SHOT_SIZES.join(", ")}`,
      },
      phrase: camera,
    });
  } else if (shots.length > 1) {
    violations.push({
      field: "--camera",
      rule: {
        label: "샷이 2개 이상",
        hint: "샷을 두 개 적으면 그 자체가 화면을 나누라는 지시가 된다. 하나만 남긴다.",
      },
      phrase: shots.join(" + "),
    });
  }

  if (violations.length === 0) return;

  console.error("ERROR: 정지 이미지 입력 게이트에 걸렸습니다. 프롬프트를 만들지 않습니다.\n");
  for (const { field, rule, phrase } of violations) {
    console.error(`  [${rule.label}] ${field} 안의 "${phrase}"`);
    console.error(`      → ${rule.hint}`);
  }
  console.error(
    [
      "",
      "시나리오의 카메라 지시는 영상용입니다. 정지 이미지로 옮길 때는 그중",
      "가장 중요한 한 순간만 골라 단일 앵글로 다시 씁니다.",
      "",
      '  나쁨: "정면 풀샷으로 따라가는 트래킹, 이후 얼굴 클로즈업으로 전환"',
      '  좋음: "low-angle full shot"      (놀라는 순간의 전신을 택한 경우)',
      '  좋음: "front-facing close-up"    (표정을 택한 경우)',
      "",
      "두 순간이 모두 필요하면 장면을 둘로 나누어 각각 생성합니다.",
    ].join("\n"),
  );
  process.exit(2);
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

// 프롬프트 조립보다 먼저 막는다. 게이트를 통과하지 못한 입력은 문자열로 만들지도 않는다.
enforceStillImageInput(String(args.scene), String(camera));

// 1인 컷에 복수형 "characters" 를 쓰면 그것만으로 캐릭터가 중복 생성된다.
// 실제로 부라봉 1인 요청에서 부라봉이 둘 그려진 적이 있다.
const subject = ids.length === 1 ? "the single character" : `all ${ids.length} characters`;

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
  `${camera}, vertical ${aspect} framing, ${subject} inside the safe area, plain uncluttered background`,
  // 분할 컷은 부정문으로 막히지 않는다. 긍정문으로 한 프레임을 못박는다.
  "one single uninterrupted frame filling the whole canvas, one camera angle, one moment in time",
  "",
  "[NEGATIVE]",
  ...negatives,
  "",
  "[OUTPUT]",
  "single still image, one frame only, no text anywhere in the image",
].join("\n");

console.log(prompt);

if (args.command) {
  // 표시명(Nano Banana 2)과 CLI job_type(nano_banana_flash)이 다르다.
  // 가이드의 model_routing 이 진실 공급원이므로 거기서 뽑고, 상수를 박지 않는다.
  // 예전 기본값 "nano_banana_2" 는 존재하지 않는 job_type 이라 호출 즉시 실패했다.
  const routed = contract.mandatory?.model_routing?.character_image ?? "";
  const model = args.model ?? routed.match(/^([a-z0-9_]+)/)?.[1] ?? "nano_banana_flash";
  // 프롬프트를 인라인으로 넣는다. 예전에는 --prompt "$(cat prompt.txt)" 였는데,
  // 명령 치환이 섞이면 에이전트 권한 검사가 이것을 cat 이 포함된 복합 명령으로 보고
  // Bash(higgsfield *) 허용 목록에 걸리지 않아 실행이 거부된다.
  // 작은따옴표는 POSIX 셸에서 줄바꿈·$·백틱을 전부 리터럴로 보존한다.
  const shellQuote = (value) => `'${String(value).replaceAll("'", `'\\''`)}'`;

  const imageFlags = referencePaths
    .map((path) => `  --image ${shellQuote(relative(projectRoot, path))} \\`)
    .join("\n");
  // 해상도를 지정하지 않으면 nano_banana_flash 는 1k 로 떨어진다. 9:16 세로 캔버스에서
  // 1k 는 캐릭터에 배정되는 픽셀이 적어 흰 하의·이파리 같은 작은 규격이 뭉개진다.
  // 가이드에 값이 생기면 그쪽을 따르고, 없으면 2k 를 쓴다.
  const resolution = args.resolution ?? contract.mandatory?.resolution_default ?? "2k";
  console.log(
    [
      "",
      "# ---- 실행 명령 (제작·비용 승인 이후에만) ----",
      `higgsfield generate create ${model} \\`,
      `  --prompt ${shellQuote(prompt)} \\`,
      imageFlags,
      `  --aspect_ratio ${aspect} \\`,
      `  --resolution ${resolution} \\`,
      "  --wait",
    ].join("\n"),
  );
}

console.error(
  `\n[게이트 통과] 캐릭터 ${ids.length}인, 레퍼런스 ${referencePaths.length}장, 네거티브 ${negatives.length}항목.` +
    `\n샷: ${countShotSizes(camera).join("")} (단일 프레임 확인됨).` +
    `\n생성 후 각 캐릭터의 사용 규칙 페이지와 결과를 1:1로 대조하십시오.`,
);

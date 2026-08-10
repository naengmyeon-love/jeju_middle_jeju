#!/usr/bin/env node
// production-log.json 을 읽어 다음 단계로 넘어가도 되는지 판정한다.
//
// 왜 스크립트인가: 대조 검수가 문서상 절차로만 있으면 "검수 메모"만 남고 그냥 넘어간다.
// 실제로 bijarim-trip A안은 '부라봉 흰 하의 누락', '고르방 눈 누락'이 스토리보드에 적힌 채
// 재생성 없이 영상 생성까지 진행됐다. 그래서 게이트를 실행 가능한 검사로 만든다.
//
// 사용법:
//   node scripts/check-production-gate.mjs <production-log.json> [--stage video|final|publish]
//
// 통과하면 exit 0, 막히면 exit 1 이다. 파이프라인은 exit 1 에서 멈춘다.

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const STAGES = ["video", "final", "publish"];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
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
  node scripts/check-production-gate.mjs <production-log.json> [--stage video|final|publish]

단계별로 막는 것:
  video    장면 컷에 미해결 위반이 남아 있으면 영상 생성 차단 (기본값)
  final    위 + 영상 검수가 통과 상태여야 최종 승인 가능
  publish  위 + 최종 승인이 명시적으로 기록되어야 외부 배포 가능

검사 항목:
  - 앵커 컷이 캐릭터마다 있고 사람이 승인했는가
  - 장면 컷마다 path·model·prompt·references 기록이 있는가
  - 장면 컷마다 postcheck.status 가 passed 인가
  - 장면 컷이 앵커·직전 컷 체이닝을 실제로 썼는가`);
}

const args = parseArgs(process.argv.slice(2));

if (args.help || args._.length === 0) {
  usage();
  process.exit(args.help ? 0 : 2);
}

const stage = args.stage === true ? "video" : (args.stage ?? "video");
if (!STAGES.includes(stage)) {
  console.error(`ERROR: --stage 는 ${STAGES.join(", ")} 중 하나여야 합니다.`);
  process.exit(2);
}

const logPath = resolve(process.cwd(), args._[0]);
let log;
try {
  log = JSON.parse(await readFile(logPath, "utf8"));
} catch (error) {
  console.error(`ERROR: production-log 를 읽지 못했습니다: ${logPath}\n  ${error.message}`);
  process.exit(2);
}

const blockers = [];
const warnings = [];

// ── 앵커 ──────────────────────────────────────────────────────────────────
// 앵커가 없으면 컷 간 일관성을 잡을 근거 자체가 없다.
const anchors = log.anchors ?? {};
const anchorIds = Object.keys(anchors);
if (anchorIds.length === 0) {
  blockers.push(
    "anchors 기록이 없습니다. 등장 캐릭터마다 앵커 컷을 만들고 승인 기록을 남겨야 합니다.",
  );
}
for (const [id, anchor] of Object.entries(anchors)) {
  if (!anchor?.path) blockers.push(`anchors.${id}.path 가 없습니다.`);
  if (anchor?.approved !== true) {
    blockers.push(
      `앵커가 승인되지 않았습니다: ${id} (approved=${JSON.stringify(anchor?.approved)}). ` +
        "사용 규칙 페이지와 1:1 대조 후 승인해야 장면 컷을 쓸 수 있습니다.",
    );
  }
  if (anchor?.approved === true && !anchor?.approved_by) {
    warnings.push(`anchors.${id}.approved_by 가 비어 있습니다. 승인자를 남기십시오.`);
  }
}

// ── 장면 컷 ───────────────────────────────────────────────────────────────
const scenes = log.scene_images ?? [];
if (scenes.length === 0) {
  blockers.push(
    "scene_images 기록이 없습니다. 장면 컷마다 경로·모델·프롬프트·레퍼런스·대조 결과를 남겨야 합니다.",
  );
}

const REQUIRED_FIELDS = ["path", "model", "prompt", "references"];

for (const scene of scenes) {
  const label = scene.id ?? scene.path ?? "(이름 없는 장면)";

  for (const field of REQUIRED_FIELDS) {
    const value = scene[field];
    const empty =
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0);
    if (empty) blockers.push(`${label}: ${field} 기록이 없습니다.`);
  }

  const postcheck = scene.postcheck;
  if (!postcheck?.status) {
    blockers.push(`${label}: postcheck.status 가 없습니다. 대조 검수를 하지 않았습니다.`);
    continue;
  }

  const violations = postcheck.violations ?? [];
  if (postcheck.status === "passed") {
    if (violations.length > 0) {
      blockers.push(
        `${label}: status 가 passed 인데 미해결 위반이 ${violations.length}건 남아 있습니다: ` +
          violations.join(" / "),
      );
    }
  } else if (postcheck.status === "violations_open") {
    blockers.push(
      `${label}: 미해결 위반 ${violations.length}건. ` +
        (violations.length > 0 ? violations.join(" / ") : "내용이 기록되지 않았습니다."),
    );
  } else if (postcheck.status === "blocked") {
    blockers.push(
      `${label}: 재생성 상한 도달로 차단됨. 담당자 확인이 필요합니다. ` +
        violations.join(" / "),
    );
  } else {
    blockers.push(
      `${label}: 알 수 없는 postcheck.status "${postcheck.status}". ` +
        "passed / violations_open / blocked 중 하나여야 합니다.",
    );
  }

  // 체이닝을 실제로 썼는지. 기록만 있고 안 썼으면 드리프트가 그대로 재발한다.
  if (Array.isArray(scene.references)) {
    const usedAnchor = scene.references.some((ref) => String(ref).includes("anchors/"));
    if (!usedAnchor) {
      blockers.push(`${label}: references 에 앵커 컷이 없습니다. 앵커 없이 생성된 컷입니다.`);
    }
  }
  if (scene.first !== true && !scene.prev) {
    warnings.push(
      `${label}: prev 기록이 없습니다. 시리즈 첫 컷이면 first: true 를 명시하십시오.`,
    );
  }
}

// ── 단계별 추가 조건 ──────────────────────────────────────────────────────
if (stage === "final" || stage === "publish") {
  const videoReview = log.reviews?.video;
  if (videoReview?.status !== "passed") {
    blockers.push(
      `영상 검수가 통과 상태가 아닙니다 (reviews.video.status=${JSON.stringify(videoReview?.status)}).`,
    );
  }
}

if (stage === "publish") {
  const final = log.approvals?.final;
  if (final?.status !== "approved" || final?.explicit !== true) {
    blockers.push(
      "최종 승인이 명시적으로 기록되지 않았습니다. 외부 배포는 최종 승인과 별도의 배포 승인이 모두 필요합니다.",
    );
  }
}

// ── 결과 ──────────────────────────────────────────────────────────────────
const projectId = log.project_id ?? "(project_id 없음)";

for (const warning of warnings) console.error(`  [경고] ${warning}`);

if (blockers.length > 0) {
  console.error(
    `\n게이트 차단 — ${projectId} / stage=${stage}\n` +
      blockers.map((b) => `  - ${b}`).join("\n") +
      "\n\n위반을 해소하기 전에는 다음 단계로 넘어가지 않습니다." +
      "\n재생성은 한 번에 한 가지 수정사항만 지시하십시오. 여러 항목을 한꺼번에 고치면 다른 항목이 깨집니다.\n",
  );
  process.exit(1);
}

console.log(
  `게이트 통과 — ${projectId} / stage=${stage} / 장면 ${scenes.length}컷, 앵커 ${anchorIds.length}개` +
    (warnings.length > 0 ? ` (경고 ${warnings.length}건)` : ""),
);

// 파이프라인 실행기.
//
// `claude -p` 를 띄워 skills/ 의 pongdang-pipeline 을 실제로 돌린다.
// 파이프라인 절차는 SKILL.md 가 진실 공급원이므로 여기서 단계를 다시 구현하지 않는다.
// 이 모듈이 책임지는 것은 프로세스 수명, 동시 실행 제한, 이벤트 중계뿐이다.

import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PROJECT_ROOT } from "./gate.mjs";

// ── 입력 화이트리스트 ────────────────────────────────────────────────
//
// 사용자가 입력한 문자열을 그대로 프롬프트에 넣지 않는다. 웹앱에서 온 값은 키로만 받고
// 실제 문장은 서버가 고른다. 원격 사용자가 파일 쓰기 권한을 가진 에이전트를 조종하는
// 구조라서, 자유 입력은 그 자체가 실행 경로가 된다.

// webapp-spec/02-workflow.md 1단계가 요구하는 필수 입력:
//   주제 · 캐릭터 · 상황 · 감정 · 길이 · 비율
// 전부 열거형으로 받는다. 상황은 본래 자유 서술이지만, 주제별 프리셋으로 고정해야
// 자유 입력이 프롬프트에 섞이지 않는다. 03-screen-structure.md §4.2 의 단계형 폼과
// 같은 구조이고, 초보 사용자에게도 빈 텍스트박스보다 드롭다운이 쉽다.

export const THEMES = {
  bijarim: {
    label: "비자림 숲길 산책",
    situations: [
      "더위를 피해 숲길을 걷다 수백 년 된 비자나무 앞에서 걸음을 멈춘다",
      "숲길에서 길을 잃었다가 이정표를 발견한다",
    ],
  },
  hallasan: {
    label: "한라산 등반과 구름바다",
    situations: [
      "정상에 올랐지만 안개로 아무것도 보이지 않는다",
      "구름바다가 걷히며 풍경이 드러난다",
    ],
  },
  beach: {
    label: "제주 해변 물놀이",
    situations: [
      "파도에 튜브를 놓쳐 쫓아간다",
      "모래성을 쌓다가 파도에 무너진다",
    ],
  },
  village: {
    label: "제주 마을 골목 나들이",
    situations: [
      "골목에서 만난 돌담 고양이와 눈이 마주친다",
      "감귤 상자를 옮기다 하나를 굴린다",
    ],
  },
  rain: {
    label: "비 오는 날의 작은 소동",
    situations: [
      "우산을 두고 나와 처마 밑에서 비를 피한다",
      "빗물 웅덩이를 피하려다 첨벙 밟는다",
    ],
  },
};

export const EMOTIONS = {
  comic: "즐거움 · 코믹",
  surprise: "놀람 · 반전",
  letdown: "실망 · 허탈",
  warm: "따뜻함 · 잔잔함",
};

/** 60초 미만이 가이드 제약이므로 그 이상은 아예 고를 수 없게 둔다. */
export const DURATIONS = ["15초", "30초", "45초"];

const GUIDE_PATH = resolve(PROJECT_ROOT, "data/character-guide.json");

let officialCharacters = null;

/** 공식 캐릭터 목록. 가이드가 진실 공급원이므로 하드코딩하지 않는다. */
export async function getOfficialCharacters() {
  if (!officialCharacters) {
    const guide = JSON.parse(await readFile(GUIDE_PATH, "utf8"));
    officialCharacters = guide.official_characters.map((c) => ({
      id: c.id,
      name: c.name_ko,
      nameEn: c.name_en,
      identity: c.identity,
      // 화면에서 "이 캐릭터를 고르면 무엇이 제약되는가"를 보여 주기 위한 값.
      // 초보 사용자는 말투 규칙을 모른 채 고르기 때문이다.
      speechEndings: c.speech_endings ?? [],
      pages: c.pages ?? {},
    }));
  }
  return officialCharacters;
}

// ── 작업 저장소 ──────────────────────────────────────────────────────
//
// 메모리에만 둔다. 시연 세션 단위로 살면 충분하고, 실제 산출물은 에이전트가
// unsorted/outputs/ 에 파일로 남기므로 그쪽이 영속 저장소다.

const jobs = new Map();
const queue = [];
let running = null;

const MAX_EVENTS = 500;

function publish(job, event) {
  const enriched = { ...event, at: new Date().toISOString() };
  job.events.push(enriched);
  if (job.events.length > MAX_EVENTS) job.events.shift();
  for (const send of job.subscribers) {
    try {
      send(enriched);
    } catch {
      job.subscribers.delete(send);
    }
  }
}

/**
 * claude -p 의 stream-json 한 줄을 화면이 쓸 수 있는 이벤트로 바꾼다.
 *
 * 실측한 형태:
 *   {type:"system",    subtype:"init"|"api_retry"}
 *   {type:"assistant", message:{content:[{type:"text",text}|{type:"tool_use",name}]}}
 *   {type:"result",    subtype:"success"|..., result:"..."}
 */
function normalize(line) {
  let raw;
  try {
    raw = JSON.parse(line);
  } catch {
    return null; // JSON 이 아닌 출력은 버린다 (배너·경고 등)
  }

  if (raw.type === "system") {
    return { kind: "system", subtype: raw.subtype ?? "", text: raw.subtype ?? "" };
  }

  if (raw.type === "assistant") {
    const blocks = raw.message?.content ?? [];
    const text = blocks
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    const tools = blocks.filter((b) => b.type === "tool_use").map((b) => b.name);
    if (tools.length) return { kind: "tool", tools, text };
    if (text) return { kind: "message", text };
    return null;
  }

  if (raw.type === "result") {
    return {
      kind: "result",
      subtype: raw.subtype ?? "",
      text: typeof raw.result === "string" ? raw.result : "",
    };
  }

  return null;
}

function buildPrompt({ theme, cast, situation, emotion, duration }) {
  // 에이전트에게는 id 가 아니라 공식 한글 이름을 준다. 가이드·스킬이 한글 이름으로
  // 쓰여 있어서 id 를 그대로 넣으면 캐릭터를 못 찾는다.
  // validateRequest 가 먼저 실행되므로 이 시점에 목록은 채워져 있다.
  const byId = new Map((officialCharacters ?? []).map((c) => [c.id, c.name]));
  const names = cast.map((id) => byId.get(id) ?? id);

  return [
    "pongdang-pipeline 스킬로 퐁당패밀리 숏폼을 제작한다.",
    "",
    "필수 입력은 모두 아래에 있다. 추가 질문 없이 1단계부터 진행한다.",
    "",
    `- 주제: ${theme}`,
    `- 등장 캐릭터: ${names.join(", ")}`,
    `- 핵심 상황: ${situation}`,
    `- 감정: ${emotion}`,
    `- 길이: ${duration}`,
    "- 비율: 9:16",
    "- 사용 도구: Higgsfield",
    "",
    "지켜야 할 것:",
    "- 산출물은 unsorted/outputs/ 아래에만 쓴다.",
    "- 제작·비용 승인 전에는 유료 영상 생성을 실행하지 않는다. 승인 대기 상태로 멈춘다.",
    "- 캐릭터 이미지·영상은 공식 페이지 PNG를 레퍼런스로 첨부해서만 만든다.",
    "- 각 단계를 마칠 때마다 무엇을 만들었는지 한 문장으로 보고한다.",
    "- 위 입력으로 판단할 수 없는 항목이 있으면 임의로 지어내지 말고 그 사실을 보고하고 멈춘다.",
  ].join("\n");
}

/**
 * 4단계(스토리보드)만 이어서 돌리는 프롬프트.
 *
 * 1~3단계 산출물이 이미 있는데 처음부터 다시 돌리면 토큰과 시간이 그만큼 낭비된다.
 * 범위를 문장으로 못박아 안(案) 수와 장면 수를 제한한다. 이미지 한 장이 곧 비용이라
 * "알아서 적당히"에 맡기지 않는다.
 */
function buildResumePrompt({ projectSlug, sceneLimit, variant }) {
  return [
    `unsorted/outputs/projects/${projectSlug}/ 의 4단계(스토리보드)만 진행한다.`,
    "",
    "1~3단계(기획안·가이드 주입·시나리오)는 이미 완료됐다. 다시 만들지 말고 기존 파일을 읽어 이어간다.",
    "",
    "범위 (비용이 발생하므로 초과하지 않는다):",
    `- ${variant}안만 만든다. 다른 안은 만들지 않는다.`,
    `- 장면 이미지는 정확히 ${sceneLimit}장만 생성한다.`,
    `- storyboard/images/${variant.toLowerCase()}/ 에 이미 있는 장면은 건너뛴다.`,
    "  이미 만든 것을 다시 만들면 그대로 이중 과금이다.",
    "- 이미지 생성 전 프롬프트는 반드시 unsorted/scripts/build-pongdang-prompt.mjs 로 조립하고",
    "  출력된 higgsfield 명령을 그대로 실행한다. 손으로 프롬프트를 쓰지 않는다.",
    "- 생성 결과 다운로드는 curl 을 쓰지 말고 아래 스크립트를 쓴다. curl 은 허용되지 않는다.",
    "    node unsorted/scripts/fetch-generated.mjs --latest --out <프로젝트 내 경로>",
    "  저장 경로는 storyboard/images/a/scene-NN-a.png 형식으로 한다.",
    "- 생성 후 결과를 부라봉 사용 규칙 페이지와 대조하고 production-log.json 에 기록한다.",
    "",
    "보고는 단계마다 한 줄로 짧게. 중간 설명을 길게 쓰지 않는다.",
  ].join("\n");
}

function drain() {
  if (running || queue.length === 0) return;

  const job = queue.shift();
  running = job;
  job.status = "running";
  job.startedAt = new Date().toISOString();
  publish(job, { kind: "status", text: "실행 시작" });

  // 파이프라인이 실제로 필요한 것만 연다. 이 목록이 곧 원격 사용자의 권한 상한이다.
  //
  // higgsfield 는 기본적으로 닫는다. AGENTS.md 가 "유료 영상 생성은 제작 승인 전
  // 실행하지 않는다"고 못박고 있으므로, 지출 능력은 켜는 쪽이 명시적 행동이어야 한다.
  // 승인 후 생성 단계에서 PONGDANG_ALLOW_PAID=1 로 띄운다.
  const tools = ["Read", "Write", "Glob", "Grep", "Bash(node unsorted/scripts/*)"];
  if (process.env.PONGDANG_ALLOW_PAID === "1") tools.push("Bash(higgsfield *)");

  const args = [
    "-p",
    job.kind === "resume" ? buildResumePrompt(job) : buildPrompt(job),
    "--output-format",
    "stream-json",
    "--verbose", // --print + stream-json 조합에 필수
    "--allowedTools",
    tools.join(","),
    "--permission-mode",
    process.env.PONGDANG_PERMISSION_MODE ?? "acceptEdits",
  ];

  const proc = spawn("claude", args, {
    cwd: PROJECT_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
  });
  job.proc = proc;

  let buffer = "";
  proc.stdout.setEncoding("utf8");
  proc.stdout.on("data", (chunk) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = normalize(line);
      if (event) publish(job, event);
    }
  });

  proc.stderr.setEncoding("utf8");
  proc.stderr.on("data", (chunk) => {
    const text = chunk.trim();
    if (text) publish(job, { kind: "stderr", text: text.slice(0, 2000) });
  });

  proc.on("error", (error) => {
    job.status = "failed";
    job.error =
      error.code === "ENOENT"
        ? "claude CLI 를 찾을 수 없습니다. PATH 를 확인하십시오."
        : error.message;
    publish(job, { kind: "status", text: job.error });
    finish(job);
  });

  proc.on("close", (code) => {
    if (job.status === "cancelled") {
      publish(job, { kind: "status", text: "취소됨" });
    } else if (code === 0) {
      job.status = "succeeded";
      publish(job, { kind: "status", text: "완료" });
    } else {
      job.status = "failed";
      job.error = `claude 가 exit=${code} 로 종료했습니다.`;
      publish(job, { kind: "status", text: job.error });
    }
    finish(job);
  });
}

function finish(job) {
  job.finishedAt = new Date().toISOString();
  job.proc = null;
  for (const send of job.subscribers) {
    try {
      send({ kind: "done", status: job.status, at: job.finishedAt });
    } catch {
      /* 이미 끊긴 구독자 */
    }
  }
  if (running === job) running = null;
  drain();
}

// ── 공개 API ─────────────────────────────────────────────────────────

/**
 * 작업을 큐에 넣는다. 동시 실행은 1개로 제한한다.
 *
 * 16GB 맥에서 claude 프로세스가 여러 개 뜨면 버티지 못한다. 시연 중 심사위원 몇 명이
 * 동시에 눌러도 순서대로 처리되도록 큐를 둔다.
 */
export function enqueue({ themeId, cast, situation, emotionId, duration }) {
  const job = {
    id: randomUUID(),
    themeId,
    theme: THEMES[themeId].label,
    cast,
    situation,
    emotionId,
    emotion: EMOTIONS[emotionId],
    duration,
    status: "queued",
    events: [],
    subscribers: new Set(),
    proc: null,
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
  };
  jobs.set(job.id, job);
  queue.push(job);
  publish(job, { kind: "status", text: `대기열 ${queue.length}번째` });
  drain();
  return job;
}

/**
 * 4단계를 이어서 돌린다. 유료 호출이 포함되므로 범위를 인자로 강제한다.
 * PONGDANG_ALLOW_PAID=1 로 띄운 서버에서만 실제 생성이 일어난다.
 */
export function enqueueResume({ projectSlug, sceneLimit, variant }) {
  const job = {
    id: randomUUID(),
    kind: "resume",
    projectSlug,
    sceneLimit,
    variant,
    theme: `${projectSlug} · 4단계 ${variant}안 ${sceneLimit}장`,
    cast: [],
    status: "queued",
    events: [],
    subscribers: new Set(),
    proc: null,
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    finishedAt: null,
  };
  jobs.set(job.id, job);
  queue.push(job);
  publish(job, { kind: "status", text: `대기열 ${queue.length}번째 · 유료 생성 ${sceneLimit}장` });
  drain();
  return job;
}

export function getJob(id) {
  return jobs.get(id) ?? null;
}

export function listJobs() {
  return [...jobs.values()].map(summarize).reverse();
}

export function summarize(job) {
  return {
    id: job.id,
    themeId: job.themeId,
    theme: job.theme,
    cast: job.cast,
    situation: job.situation,
    emotion: job.emotion,
    duration: job.duration,
    status: job.status,
    error: job.error,
    eventCount: job.events.length,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  };
}

export function cancelJob(id) {
  const job = jobs.get(id);
  if (!job) return { ok: false, reason: "없는 작업입니다." };
  if (job.status === "queued") {
    const index = queue.indexOf(job);
    if (index >= 0) queue.splice(index, 1);
    job.status = "cancelled";
    finish(job);
    return { ok: true };
  }
  if (job.status === "running" && job.proc) {
    job.status = "cancelled";
    job.proc.kill("SIGTERM");
    return { ok: true };
  }
  return { ok: false, reason: `취소할 수 없는 상태입니다: ${job.status}` };
}

/** SSE 구독. 구독 시점까지 쌓인 이벤트를 먼저 흘려 중간 접속도 맥락을 잃지 않게 한다. */
export function subscribe(job, send) {
  for (const event of job.events) send(event);
  if (job.finishedAt) {
    send({ kind: "done", status: job.status, at: job.finishedAt });
    return () => {};
  }
  job.subscribers.add(send);
  return () => job.subscribers.delete(send);
}

export function queueDepth() {
  return { running: running ? running.id : null, waiting: queue.length };
}

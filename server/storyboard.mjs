// 스토리보드 본문(기획안·시나리오·대사) 수정 저장.
//
// 왜 storyboard-*.md 를 직접 고치지 않는가:
// 그 파일은 생성 산출물이다. 생성 프롬프트와 이미지 생성 기록이 함께 들어 있어서,
// 화면에서 온 문장으로 다시 쓰면 무엇이 생성된 것이고 무엇이 사람이 고친 것인지
// 구분할 수 없게 된다. 재생성이 한 번 돌면 고친 내용도 같이 날아간다.
// 그래서 수정본은 옆에 따로 쌓고(edits.json), md 는 건드리지 않는다.
//
// 왜 production-log.json 에 쓰지 않는가:
// 그 파일은 승인 게이트의 입력이다. 화면에서 온 값이 게이트 입력에 섞이면
// 승인 판정을 화면이 흔들 수 있게 된다. 돈과 승인은 화면을 신뢰하지 않는다는
// 원칙(freetext.mjs 주석 참고)이 여기서도 그대로다.
//
// 저장 형식은 화면이 고치는 항목과 1:1 이고, 그 밖의 키는 검증에서 전부 떨어진다.

import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { sanitizeFreeText } from "./freetext.mjs";
import { PROJECT_ROOT } from "./gate.mjs";
import { SLUG_PATTERN } from "./projects.mjs";

const PROJECTS_DIR = resolve(PROJECT_ROOT, "unsorted/outputs/projects");

export const VARIANTS = ["A", "B", "C"];
const PLAN_FIELDS = ["summary", "start", "point", "end"];
const SCENE_FIELDS = ["time", "title", "action", "line"];

/** 글자 수 상한. 화면도 같은 값을 받아 쓰므로 다 쓴 뒤에 400 을 보지 않는다. */
export const CONTENT_LIMITS = {
  summary: 300,
  start: 300,
  point: 300,
  end: 300,
  time: 24,
  title: 120,
  action: 300,
  line: 200,
  note: 200,
  boardLine: 200,
};

const MAX_SCENES = 24;
const MAX_BOARD_LINES = 12;
/** 이력은 무한히 자라면 안 된다. 오래된 것부터 버린다. */
const MAX_HISTORY = 200;

const EMPTY_DOC = { revision: 0, updatedAt: null, content: null, history: [] };

/**
 * 슬러그를 수정본 경로로 바꾼다. logPathForSlug 와 같은 이유로 경로는 서버만 만든다.
 * 화면이 경로를 만들어 보낼 수 있으면 그것이 곧 임의 파일 쓰기가 된다.
 */
export function storyboardPathForSlug(slug) {
  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) return null;
  const relative = `unsorted/outputs/projects/${slug}/storyboard/edits.json`;
  const absolute = resolve(PROJECT_ROOT, relative);
  // 패턴을 통과해도 한 번 더 확인한다. 검증이 하나뿐이면 그 하나가 곧 단일 장애점이다.
  if (!absolute.startsWith(`${PROJECTS_DIR}/`)) return null;
  return relative;
}

/** 빈 값을 허용하는 자리(이전 값 등)에 쓴다. sanitizeFreeText 는 빈 문자열을 막는다. */
function optionalText(raw, label, max) {
  if (raw === undefined || raw === null || raw === "") return { value: "" };
  return sanitizeFreeText(raw, { label, max });
}

/**
 * 화면이 보낸 본문을 검증한다.
 *
 * 받은 객체를 그대로 쓰지 않고 새 객체에 옮겨 담는 것이 핵심이다. 화면이 보낸
 * 다른 키는 전부 여기서 떨어져 나가므로, 디스크에는 아는 모양만 남는다.
 *
 * 문장 정제는 자유 입력과 같은 규칙(sanitizeFreeText)을 쓴다. 이 문장들도 결국
 * 생성 프롬프트로 들어가므로 줄바꿈·제어문자·입력 태그를 똑같이 막아야 한다.
 */
export function validateContent(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "content 가 필요합니다." };
  }

  if (!raw.plan || typeof raw.plan !== "object" || Array.isArray(raw.plan)) {
    return { error: "content.plan 이 필요합니다." };
  }
  const plan = {};
  for (const key of PLAN_FIELDS) {
    const result = sanitizeFreeText(raw.plan[key], { label: `기획안 ${key}`, max: CONTENT_LIMITS[key] });
    if (result.error) return { error: result.error };
    plan[key] = result.value;
  }

  if (!Array.isArray(raw.scenes)) return { error: "content.scenes 는 배열이어야 합니다." };
  if (raw.scenes.length === 0 || raw.scenes.length > MAX_SCENES) {
    return { error: `장면은 1~${MAX_SCENES}개여야 합니다.` };
  }
  const scenes = [];
  const seenIds = new Set();
  for (const raw_scene of raw.scenes) {
    if (!raw_scene || typeof raw_scene !== "object") {
      return { error: "장면 형식이 올바르지 않습니다." };
    }
    const id = Number(raw_scene.id);
    if (!Number.isInteger(id) || id < 1 || id > MAX_SCENES) {
      return { error: `장면 id 는 1~${MAX_SCENES} 사이 정수여야 합니다.` };
    }
    // 같은 id 가 둘이면 어느 쪽이 진짜인지 정할 수 없다. 화면 버그를 조용히 삼키지 않는다.
    if (seenIds.has(id)) return { error: `장면 id 가 중복됩니다: ${id}` };
    seenIds.add(id);

    const scene = { id };
    for (const key of SCENE_FIELDS) {
      const result = sanitizeFreeText(raw_scene[key], {
        label: `장면 ${id} ${key}`,
        max: CONTENT_LIMITS[key],
      });
      if (result.error) return { error: result.error };
      scene[key] = result.value;
    }
    scenes.push(scene);
  }

  const boardNotes = {};
  const boardLines = {};
  for (const variant of VARIANTS) {
    const note = sanitizeFreeText(raw.boardNotes?.[variant], {
      label: `${variant}안 연출 노트`,
      max: CONTENT_LIMITS.note,
    });
    if (note.error) return { error: note.error };
    boardNotes[variant] = note.value;

    const lines = raw.boardLines?.[variant];
    if (!Array.isArray(lines) || lines.length === 0 || lines.length > MAX_BOARD_LINES) {
      return { error: `${variant}안 대사는 1~${MAX_BOARD_LINES}줄이어야 합니다.` };
    }
    boardLines[variant] = [];
    for (const [index, line] of lines.entries()) {
      const result = sanitizeFreeText(line, {
        label: `${variant}안 ${index + 1}번 대사`,
        max: CONTENT_LIMITS.boardLine,
      });
      if (result.error) return { error: result.error };
      boardLines[variant].push(result.value);
    }
  }

  return { value: { plan, scenes, boardNotes, boardLines } };
}

/** 이력 한 줄. 무엇을, 무엇에서 무엇으로, 누가 바꿨는지만 받는다. */
function validateEdit(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "edit 이 필요합니다." };
  }
  const field = sanitizeFreeText(raw.field, { label: "수정 항목", max: 120 });
  if (field.error) return { error: field.error };

  const before = optionalText(raw.before, "이전 값", 400);
  if (before.error) return { error: before.error };
  const after = optionalText(raw.after, "바뀐 값", 400);
  if (after.error) return { error: after.error };
  const by = optionalText(raw.by, "수정자", 40);
  if (by.error) return { error: by.error };

  return { value: { field: field.value, before: before.value, after: after.value, by: by.value } };
}

/**
 * 저장된 수정본을 읽는다.
 *
 * 파일이 없는 것과 깨진 것을 구분한다. 깨진 JSON 을 "없음"으로 취급하면 다음
 * 저장이 그 위를 덮어써서, 고칠 수 있었던 파일이 조용히 사라진다.
 */
export async function readStoryboard(slug) {
  const relative = storyboardPathForSlug(slug);
  if (!relative) return { error: "projectSlug 형식이 올바르지 않습니다.", status: 400 };

  let text;
  try {
    text = await readFile(resolve(PROJECT_ROOT, relative), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return { doc: { ...EMPTY_DOC } };
    return { error: `수정본을 읽을 수 없습니다: ${error.message}`, status: 500 };
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      error: `저장된 수정본이 손상되어 읽을 수 없습니다: ${relative}`,
      status: 409,
    };
  }

  return {
    doc: {
      revision: Number.isInteger(parsed.revision) ? parsed.revision : 0,
      updatedAt: parsed.updatedAt ?? null,
      content: parsed.content ?? null,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    },
  };
}

/** 임시 파일에 쓰고 옮긴다. 쓰는 도중 죽어도 반쯤 쓰인 파일이 남지 않는다. */
async function writeAtomic(absolute, text) {
  await mkdir(dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.tmp`;
  await writeFile(temporary, text, "utf8");
  await rename(temporary, absolute);
}

/**
 * 수정본을 저장한다.
 *
 * revision 을 함께 받아 앞선 저장을 덮어쓰지 않게 한다. 창을 두 개 열어 두면
 * 늦게 누른 쪽이 먼저 누른 쪽의 수정을 조용히 지울 수 있다.
 */
export async function saveStoryboard(slug, body) {
  const relative = storyboardPathForSlug(slug);
  if (!relative) return { error: "projectSlug 형식이 올바르지 않습니다.", status: 400 };

  // 없는 프로젝트에 폴더를 새로 만들지 않는다. 오타 한 번이 산출물 디렉터리에
  // 빈 프로젝트를 남기면, 승인 화면의 목록이 쓰레기로 늘어난다.
  try {
    const info = await stat(resolve(PROJECTS_DIR, slug));
    if (!info.isDirectory()) throw new Error("not a directory");
  } catch {
    return { error: `없는 프로젝트입니다: ${slug}`, status: 404 };
  }

  const validated = validateContent(body?.content);
  if (validated.error) return { error: validated.error, status: 400 };

  const edit = validateEdit(body?.edit);
  if (edit.error) return { error: edit.error, status: 400 };

  const revision = Number(body?.revision);
  if (!Number.isInteger(revision) || revision < 0) {
    return { error: "revision 은 0 이상의 정수여야 합니다.", status: 400 };
  }

  const current = await readStoryboard(slug);
  if (current.error) return { error: current.error, status: current.status ?? 409 };

  if (revision !== current.doc.revision) {
    return {
      error: `다른 곳에서 먼저 저장했습니다. 현재 버전은 ${current.doc.revision} 입니다.`,
      status: 409,
      doc: current.doc,
    };
  }

  const now = new Date().toISOString();
  const nextRevision = current.doc.revision + 1;
  const doc = {
    version: 1,
    slug,
    revision: nextRevision,
    updatedAt: now,
    content: validated.value,
    history: [...current.doc.history, { ...edit.value, revision: nextRevision, at: now }].slice(-MAX_HISTORY),
  };

  await writeAtomic(resolve(PROJECT_ROOT, relative), `${JSON.stringify(doc, null, 2)}\n`);
  return { doc: { revision: doc.revision, updatedAt: doc.updatedAt, content: doc.content, history: doc.history } };
}

// 퐁당패밀리 파이프라인 사이드카.
//
// 왜 별도 서버인가: unsorted/workflow-web 은 Cloudflare Workers(workerd) 런타임에서
// 돌아 child_process 와 파일시스템을 쓸 수 없다. claude CLI 실행, higgsfield CLI 실행,
// unsorted/outputs/ 읽기는 전부 Node 가 필요하므로 이쪽에 둔다.
//
// UI 는 Vite dev 서버의 프록시를 통해 동일 출처 /api/* 로 이 서버를 부른다.
// 의존성은 0개다. 시연 당일 npm install 이 실패할 여지를 만들지 않는다.
//
// 실행: node server/index.mjs   (기본 포트 8787, PORT 로 변경)

import { createServer } from "node:http";

import {
  listAssetProjects,
  readAssetManifest,
  resolveAsset,
  resolveThumbnail,
  sendAsset,
} from "./assets.mjs";
import { readDocument, readDocumentManifest } from "./documents.mjs";
import { checkGate, STAGES } from "./gate.mjs";
import {
  GITHUB_REPOSITORY,
  createPipelineIssue,
  pullPipelineOutputs,
  readPipelineStatus,
} from "./github.mjs";
import { LIMITS, sanitizeFreeText } from "./freetext.mjs";
import { listProjects, logPathForSlug } from "./projects.mjs";
import { CONTENT_LIMITS, readStoryboard, saveStoryboard } from "./storyboard.mjs";
import {
  enqueueResume,
  DURATIONS,
  EMOTIONS,
  THEMES,
  cancelJob,
  enqueue,
  getJob,
  getOfficialCharacters,
  listJobs,
  queueDepth,
  subscribe,
  summarize,
} from "./jobs.mjs";

const PORT = Number(process.env.PORT ?? 8787);
const HOST = process.env.HOST ?? "127.0.0.1";

/** 프리셋 대신 담당자가 직접 쓰겠다는 표시. 프리셋 id 와 겹치지 않는 값이어야 한다. */
const CUSTOM_ID = "custom";

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(payload);
}

async function readJsonBody(req, limit = 64 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("요청 본문이 너무 큽니다.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

/**
 * 감정·길이·캐릭터는 키로만 받는다. 주제와 핵심 상황은 프리셋이 기본이고,
 * themeId 가 "custom" 이면 담당자가 직접 쓴 문장을 받는다.
 *
 * 직접 입력은 정제해서 프롬프트의 별도 데이터 블록에 들어간다(freetext.mjs).
 * 프리셋 경로는 기존 동작 그대로다.
 */
async function validateRequest(body) {
  const themeId = String(body.themeId ?? "");
  const custom = themeId === CUSTOM_ID;
  const theme = THEMES[themeId];

  if (!custom && !theme) {
    return {
      error: `themeId 가 올바르지 않습니다. 가능한 값: ${[...Object.keys(THEMES), CUSTOM_ID].join(", ")}`,
    };
  }

  const official = await getOfficialCharacters();
  const allowed = new Set(official.map((c) => c.id));
  const cast = Array.isArray(body.cast) ? body.cast.filter((c) => allowed.has(c)) : [];

  if (!cast.length) {
    return { error: "공식 캐릭터를 최소 한 명 선택해야 합니다." };
  }
  if (cast.length > 3) {
    return { error: "한 번에 3인까지만 선택할 수 있습니다." };
  }

  // 주제와 상황. 프리셋이면 인덱스로, 직접 입력이면 정제한 문장으로 받는다.
  // 상황만 직접 쓰는 경우도 있으므로 둘을 따로 판정한다.
  let themeText;
  let situation;

  if (custom) {
    const topic = sanitizeFreeText(body.customTheme, { label: "콘텐츠 주제", max: LIMITS.theme });
    if (topic.error) return { error: topic.error };
    themeText = topic.value;
  } else {
    themeText = theme.label;
  }

  const wantsCustomSituation = custom || body.situationIndex === CUSTOM_ID;

  if (wantsCustomSituation) {
    const text = sanitizeFreeText(body.customSituation, { label: "핵심 상황", max: LIMITS.situation });
    if (text.error) return { error: text.error };
    situation = text.value;
  } else {
    const situationIndex = Number(body.situationIndex ?? 0);
    situation = theme.situations[situationIndex];
    if (!situation) {
      return { error: `situationIndex 는 0~${theme.situations.length - 1} 또는 "${CUSTOM_ID}" 이어야 합니다.` };
    }
  }

  const emotionId = String(body.emotionId ?? "comic");
  if (!EMOTIONS[emotionId]) {
    return { error: `emotionId 가 올바르지 않습니다. 가능한 값: ${Object.keys(EMOTIONS).join(", ")}` };
  }

  const duration = String(body.duration ?? "30초");
  if (!DURATIONS.includes(duration)) {
    return { error: `duration 은 ${DURATIONS.join(", ")} 중 하나여야 합니다.` };
  }

  // theme 은 프롬프트에 들어갈 문장, themeId 는 기록용 키다. custom 이면 둘이 다르다.
  return { themeId, theme: themeText, custom, cast, situation, emotionId, duration };
}

const routes = [
  // ── 조회 ───────────────────────────────────────────────────────────
  {
    method: "GET",
    pattern: /^\/api\/health$/,
    handler: (_req, res) =>
      json(res, 200, { ok: true, service: "pongdang-sidecar", ...queueDepth() }),
  },
  {
    method: "GET",
    pattern: /^\/api\/options$/,
    handler: async (_req, res) => {
      // 화면의 드롭다운을 채우는 유일한 출처. 화이트리스트와 같은 데이터를 쓴다.
      // 화면이 여기 없는 값을 보내면 반드시 400 이 나므로 두 목록이 갈라질 수 없다.
      json(res, 200, {
        themes: Object.entries(THEMES).map(([id, t]) => ({
          id,
          label: t.label,
          situations: t.situations,
        })),
        characters: await getOfficialCharacters(),
        emotions: Object.entries(EMOTIONS).map(([id, label]) => ({ id, label })),
        durations: DURATIONS,
        aspectRatio: "9:16",
        // 화면이 직접 입력 칸의 글자 수 제한을 서버와 맞추도록 함께 내려준다.
        // 두 값이 갈라지면 사용자는 다 쓴 뒤에야 400 을 본다.
        customId: CUSTOM_ID,
        limits: LIMITS,
        // 스토리보드 본문 수정의 글자 수 상한도 같은 이유로 함께 내려준다.
        storyboardLimits: CONTENT_LIMITS,
      });
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/jobs$/,
    handler: (_req, res) => json(res, 200, { jobs: listJobs(), ...queueDepth() }),
  },
  {
    method: "GET",
    pattern: /^\/api\/projects$/,
    handler: async (_req, res) => json(res, 200, { projects: await listProjects() }),
  },
  {
    // 승인 화면이 세 단계 상태를 한 번에 보여줄 수 있도록 판정만 한다.
    // 조회이므로 승인 기록을 남기지 않는다. 승인은 POST /api/approve 뿐이다.
    method: "GET",
    pattern: /^\/api\/projects\/([a-z0-9][a-z0-9-]*)\/gate$/,
    handler: async (_req, res, [slug]) => {
      const logPath = logPathForSlug(slug);
      if (!logPath) return json(res, 400, { error: "projectSlug 형식이 올바르지 않습니다." });
      const stages = {};
      for (const stage of STAGES) {
        const gate = await checkGate(logPath, stage);
        stages[stage] = { ok: gate.ok, reason: gate.reason, detail: gate.output };
      }
      json(res, 200, { slug, logPath, stages });
    },
  },

  // ── 스토리보드 본문 수정 ────────────────────────────────────────────
  // 담당자가 화면에서 고친 대사·상황을 저장한다. storyboard-*.md 와
  // production-log.json 은 건드리지 않는다(이유는 storyboard.mjs 주석).
  {
    method: "GET",
    pattern: /^\/api\/projects\/([a-z0-9][a-z0-9-]*)\/storyboard$/,
    handler: async (_req, res, [slug]) => {
      const result = await readStoryboard(slug);
      if (result.error) return json(res, result.status ?? 400, { error: result.error });
      json(res, 200, { slug, ...result.doc });
    },
  },
  {
    method: "PUT",
    pattern: /^\/api\/projects\/([a-z0-9][a-z0-9-]*)\/storyboard$/,
    handler: async (req, res, [slug]) => {
      const body = await readJsonBody(req);
      const result = await saveStoryboard(slug, body);
      if (result.error) {
        // 충돌이면 서버가 아는 최신본을 함께 준다. 화면이 다시 물어보지 않아도
        // 무엇과 부딪혔는지 그 자리에서 보여줄 수 있다.
        return json(res, result.status ?? 400, { error: result.error, ...(result.doc ? { current: result.doc } : {}) });
      }
      json(res, 200, { slug, ...result.doc });
    },
  },

  // ── 실행 ───────────────────────────────────────────────────────────
  {
    method: "POST",
    pattern: /^\/api\/jobs$/,
    handler: async (req, res) => {
      const body = await readJsonBody(req);
      const validated = await validateRequest(body);
      if (validated.error) return json(res, 400, { error: validated.error });
      const job = enqueue(validated);
      json(res, 202, summarize(job));
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/jobs\/resume$/,
    handler: async (req, res) => {
      const body = await readJsonBody(req);
      const projectSlug = String(body.projectSlug ?? "");
      // 경로 조작을 막는다. 산출물 디렉터리 이름은 슬러그 형태만 허용한다.
      if (!/^[a-z0-9-]+$/.test(projectSlug)) {
        return json(res, 400, { error: "projectSlug 형식이 올바르지 않습니다." });
      }
      const sceneLimit = Number(body.sceneLimit ?? 1);
      if (!Number.isInteger(sceneLimit) || sceneLimit < 1 || sceneLimit > 5) {
        return json(res, 400, { error: "sceneLimit 은 1~5 사이 정수여야 합니다." });
      }
      const variant = String(body.variant ?? "A").toUpperCase();
      if (!["A", "B", "C"].includes(variant)) {
        return json(res, 400, { error: "variant 는 A, B, C 중 하나여야 합니다." });
      }
      json(res, 202, summarize(enqueueResume({ projectSlug, sceneLimit, variant })));
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/jobs\/([\w-]+)$/,
    handler: (_req, res, [id]) => {
      const job = getJob(id);
      if (!job) return json(res, 404, { error: "없는 작업입니다." });
      json(res, 200, { ...summarize(job), events: job.events });
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/jobs\/([\w-]+)\/cancel$/,
    handler: (_req, res, [id]) => {
      const result = cancelJob(id);
      json(res, result.ok ? 200 : 409, result);
    },
  },

  // ── 진행 상황 스트리밍 ──────────────────────────────────────────────
  {
    method: "GET",
    pattern: /^\/api\/jobs\/([\w-]+)\/events$/,
    handler: (req, res, [id]) => {
      const job = getJob(id);
      if (!job) return json(res, 404, { error: "없는 작업입니다." });

      res.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      });

      const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
      const unsubscribe = subscribe(job, send);

      // 프록시가 유휴 연결을 끊지 않도록 주기적으로 주석 프레임을 보낸다.
      const keepAlive = setInterval(() => res.write(": keep-alive\n\n"), 15_000);

      req.on("close", () => {
        clearInterval(keepAlive);
        unsubscribe();
      });
    },
  },

  // ── GitHub 경로 (Timely Agent 포함) ─────────────────────────────────
  //
  // 로컬 경로는 Claude Code 단독으로 전 단계를 돌린다. 이쪽은 GitHub 워크플로를
  // 태워 Timely Agent(Solar Pro 4)가 문안을 맡는 선언대로 실행한다.
  //
  // gh·git 실패에 502 를 쓰지 않는다. 502 는 게이트웨이가 자기 것으로 간주하는
  // 코드다. 시연용 공개 링크인 cloudflared 터널은 오리진이 502 를 내면 본문을
  // 자기 HTML 오류 페이지로 갈아치우고, 그러면 화면은 진짜 원인 대신 JSON 파싱
  // 실패만 보게 된다. 요청은 도달했고 실행이 거절된 것이므로 409 로 답한다.
  {
    method: "POST",
    pattern: /^\/api\/github\/pipeline$/,
    handler: async (req, res) => {
      const body = await readJsonBody(req);
      // 로컬 실행과 똑같은 검증을 통과시킨다. 경로가 둘이라고 검증이 둘이면,
      // 느슨한 쪽이 곧 그 시스템의 실제 기준이 된다.
      const validated = await validateRequest(body);
      if (validated.error) return json(res, 400, { error: validated.error });

      const created = await createPipelineIssue({
        topic: validated.theme,
        situation: validated.situation,
        characters: validated.cast,
        duration: validated.duration,
        emotion: EMOTIONS[validated.emotionId] ?? validated.emotionId,
      });
      if (created.error) return json(res, 409, created);
      json(res, 202, created);
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/github\/pipeline\/(\d+)$/,
    handler: async (_req, res, [number]) => {
      const status = await readPipelineStatus(Number(number));
      if (status.error) return json(res, 409, status);
      json(res, 200, status);
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/github\/pipeline\/(\d+)\/pull$/,
    handler: async (_req, res, [number]) => {
      const pulled = await pullPipelineOutputs(Number(number));
      if (pulled.error) return json(res, 409, pulled);
      json(res, 200, pulled);
    },
  },

  // ── 문안(기획안·시나리오·스토리보드·프롬프트) ───────────────────────
  {
    method: "GET",
    pattern: /^\/api\/projects\/([a-z0-9][a-z0-9-]*)\/documents$/,
    handler: async (_req, res, [slug]) => {
      const manifest = await readDocumentManifest(slug);
      if (!manifest) return json(res, 400, { error: "projectSlug 형식이 올바르지 않습니다." });
      json(res, 200, manifest);
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/projects\/([a-z0-9][a-z0-9-]*)\/documents\/(.+)$/,
    handler: async (_req, res, [slug, encoded]) => {
      const doc = await readDocument(slug, decodeURIComponent(encoded));
      if (!doc) return json(res, 404, { error: "문안을 찾을 수 없습니다." });
      json(res, doc.error ? 409 : 200, doc);
    },
  },

  // ── 산출물(이미지·영상) ─────────────────────────────────────────────
  {
    method: "GET",
    pattern: /^\/api\/assets$/,
    handler: async (_req, res) => json(res, 200, { projects: await listAssetProjects() }),
  },
  {
    method: "GET",
    pattern: /^\/api\/projects\/([a-z0-9][a-z0-9-]*)\/assets$/,
    handler: async (_req, res, [slug]) => {
      const manifest = await readAssetManifest(slug);
      if (!manifest) return json(res, 400, { error: "projectSlug 형식이 올바르지 않습니다." });
      json(res, 200, manifest);
    },
  },
  {
    // 파일 전송. 매니페스트에 없는 경로는 resolveAsset 이 거절하므로 여기서
    // 경로를 따로 검사하지 않는다. 검사가 두 곳에 흩어지면 한쪽만 고치게 된다.
    method: "GET",
    pattern: /^\/api\/projects\/([a-z0-9][a-z0-9-]*)\/assets\/(.+)$/,
    handler: async (req, res, [slug, encoded]) => {
      const { searchParams } = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
      const asset = await resolveAsset(slug, decodeURIComponent(encoded));
      if (!asset) return json(res, 404, { error: "산출물을 찾을 수 없습니다." });

      // 축소본을 만들지 못하면 원본을 보낸다. 느린 것과 안 나오는 것은 다르다.
      const width = Number(searchParams.get("w"));
      const thumbnail = width ? await resolveThumbnail(asset, width) : null;
      sendAsset(req, res, thumbnail ?? asset);
    },
  },

  // ── 승인 (서버측 강제) ──────────────────────────────────────────────
  {
    method: "POST",
    pattern: /^\/api\/approve$/,
    handler: async (req, res) => {
      const body = await readJsonBody(req);
      const stage = String(body.stage ?? "video");

      if (!STAGES.includes(stage)) {
        return json(res, 400, { error: `stage 는 ${STAGES.join(", ")} 중 하나여야 합니다.` });
      }

      // 경로가 아니라 슬러그만 받는다. 화면이 경로를 만들어 보낼 수 있으면
      // 그것이 곧 임의 파일 지정 경로가 된다. 경로는 서버만 만든다.
      const logPath = logPathForSlug(String(body.projectSlug ?? ""));
      if (!logPath) {
        return json(res, 400, { error: "projectSlug 형식이 올바르지 않습니다." });
      }

      // 프론트엔드가 승인 버튼을 눌렀다는 사실만으로는 통과시키지 않는다.
      // 제작 이력을 다시 읽어 게이트를 직접 실행한다.
      const gate = await checkGate(logPath, stage);
      json(res, gate.ok ? 200 : 409, {
        approved: gate.ok,
        stage,
        logPath,
        reason: gate.reason,
        detail: gate.output,
      });
    },
  },
];

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    return res.end();
  }
  // Vite 프록시를 쓰면 동일 출처라 CORS 가 필요 없지만, 브라우저에서 직접
  // 8787 을 찔러 볼 때를 위해 허용해 둔다. 로컬 시연 전용 서버다.
  res.setHeader("access-control-allow-origin", "*");

  for (const route of routes) {
    if (route.method !== req.method) continue;
    const match = route.pattern.exec(pathname);
    if (!match) continue;
    try {
      return await route.handler(req, res, match.slice(1));
    } catch (error) {
      if (!res.headersSent) return json(res, 500, { error: error.message });
      return res.end();
    }
  }

  json(res, 404, { error: `경로를 찾을 수 없습니다: ${req.method} ${pathname}` });
});

server.listen(PORT, HOST, () => {
  console.log(`퐁당패밀리 사이드카  http://${HOST}:${PORT}`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/options          주제·캐릭터 화이트리스트`);
  console.log(`  POST /api/jobs             {themeId, cast[]} → 파이프라인 실행`);
  console.log(`  GET  /api/jobs/:id/events  SSE 진행 상황`);
  console.log(`  GET  /api/projects         프로젝트 목록`);
  console.log(`  GET  /api/projects/:slug/gate  3단계 게이트 판정 (조회)`);
  console.log(`  GET  /api/projects/:slug/storyboard  저장된 본문 수정본`);
  console.log(`  PUT  /api/projects/:slug/storyboard  {revision, content, edit} → 수정 저장`);
  console.log(`  POST /api/approve          {stage, projectSlug} → 게이트 재검증`);
});

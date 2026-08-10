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

import { checkGate, STAGES } from "./gate.mjs";
import {
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
 * 웹앱에서 온 값은 키로만 받고 실제 문장은 서버가 고른다.
 * 자유 입력을 그대로 프롬프트에 넣으면 그것이 곧 원격 실행 경로가 된다.
 */
async function validateRequest(body) {
  const themeId = String(body.themeId ?? "");
  if (!THEMES[themeId]) {
    return { error: `themeId 가 올바르지 않습니다. 가능한 값: ${Object.keys(THEMES).join(", ")}` };
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
  return { themeId, cast };
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
      json(res, 200, {
        themes: Object.entries(THEMES).map(([id, label]) => ({ id, label })),
        characters: await getOfficialCharacters(),
      });
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/jobs$/,
    handler: (_req, res) => json(res, 200, { jobs: listJobs(), ...queueDepth() }),
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

  // ── 승인 (서버측 강제) ──────────────────────────────────────────────
  {
    method: "POST",
    pattern: /^\/api\/approve$/,
    handler: async (req, res) => {
      const body = await readJsonBody(req);
      const stage = String(body.stage ?? "video");
      const logPath = String(body.logPath ?? "");

      if (!STAGES.includes(stage)) {
        return json(res, 400, { error: `stage 는 ${STAGES.join(", ")} 중 하나여야 합니다.` });
      }
      if (!logPath) {
        return json(res, 400, { error: "logPath 가 필요합니다." });
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
      "access-control-allow-methods": "GET,POST,OPTIONS",
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
  console.log(`  POST /api/approve          {stage, logPath} → 게이트 재검증`);
});

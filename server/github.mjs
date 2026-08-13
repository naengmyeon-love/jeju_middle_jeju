// GitHub 경로 연결.
//
// 왜 필요한가: model-policy.json 은 기획·시나리오·스토리보드 문안을 Timely Agent
// (Solar Pro 4)가 맡는다고 선언한다. 그런데 Timely 는 GitHub 커넥터로만 동작해서
// 로컬 사이드카 경로에는 존재하지 않는다. 로컬에서만 돌리면 선언과 실제가 갈라진다.
//
// 그리고 queue-pipeline-request.yml 은 OWNER|MEMBER|COLLABORATOR 가 아닌 요청자의
// 이슈를 자동으로 닫는다. 즉 심사위원이 직접 이슈를 열면 거부된다. 이 사이드카는
// 저장소 소유자로 인증된 gh 를 들고 있으므로, 화면의 요청을 대신 등록해 준다.
// 권한은 서버가 갖고, 화면은 무엇을 만들지만 고른다.

import { spawn } from "node:child_process";

import { PROJECT_ROOT } from "./gate.mjs";

const REPOSITORY = process.env.PONGDANG_REPOSITORY ?? "naengmyeon-love/jeju_middle_jeju";

/** 이슈 본문이 반드시 담아야 하는 문장. 워크플로가 이 문장으로 폼 스키마를 확인한다. */
const CONSENT =
  "무료 기획 문안까지만 자동 실행되며 유료 생성·외부 배포는 별도 승인임을 확인했습니다.";

/**
 * gh 를 인자 배열로 실행한다. 셸을 거치지 않는다.
 *
 * 화면에서 온 문자열이 셸을 통과하면 그 순간 주제 입력란이 명령 실행 통로가 된다.
 * spawn 에 배열로 넘기면 인자는 언제나 인자로만 남는다.
 */
function run(command, args, { timeoutMs = 30_000, input } = {}) {
  return new Promise((resolve) => {
    const proc = spawn(command, args, { cwd: PROJECT_ROOT });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => proc.kill("SIGKILL"), timeoutMs);

    proc.stdout.on("data", (chunk) => (stdout += chunk));
    proc.stderr.on("data", (chunk) => (stderr += chunk));
    proc.on("error", (error) => {
      clearTimeout(timer);
      resolve({ ok: false, stdout, stderr: error.message });
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ ok: code === 0, code, stdout: stdout.trim(), stderr: stderr.trim() });
    });

    if (input !== undefined) {
      proc.stdin.write(input);
      proc.stdin.end();
    }
  });
}

/** 이슈 폼이 제출됐을 때와 같은 모양의 본문을 만든다. 헤더 문구가 곧 계약이다. */
function buildBody({ topic, situation, characters, duration, emotion }) {
  const checked = characters.map((name) => `- [x] ${name}`).join("\n");
  return [
    "### 콘텐츠 주제",
    "",
    topic,
    "",
    "### 핵심 상황",
    "",
    situation,
    "",
    "### 등장 캐릭터",
    "",
    checked,
    "",
    "### 길이",
    "",
    duration,
    "",
    "### 감정",
    "",
    emotion,
    "",
    "### 실행 범위 확인",
    "",
    `- [x] ${CONSENT}`,
    "",
    "---",
    "",
    "제작실 웹앱에서 등록된 요청입니다.",
  ].join("\n");
}

export async function createPipelineIssue(request) {
  const title = `[Pipeline] ${request.topic}`;
  const body = buildBody(request);

  const created = await run("gh", [
    "issue",
    "create",
    "--repo",
    REPOSITORY,
    "--title",
    title,
    "--body-file",
    "-",
  ], { input: body });

  if (!created.ok) {
    return { error: created.stderr || "이슈를 등록하지 못했습니다." };
  }

  // gh 는 생성된 이슈 URL 을 출력한다. 번호는 그 마지막 조각이다.
  const match = /\/issues\/(\d+)\s*$/.exec(created.stdout);
  if (!match) return { error: `이슈 번호를 읽지 못했습니다: ${created.stdout}` };

  return { number: Number(match[1]), url: created.stdout, repository: REPOSITORY };
}

/**
 * 라벨과 코멘트로 진행 단계를 판정한다.
 *
 * 워크플로가 남기는 라벨이 곧 상태다. 코멘트 문구를 파싱해 단계를 추측하지 않는다.
 * 문구는 사람이 읽으라고 있는 것이고 언제든 바뀐다.
 */
export async function readPipelineStatus(issueNumber) {
  if (!Number.isInteger(issueNumber) || issueNumber < 1) {
    return { error: "이슈 번호가 올바르지 않습니다." };
  }

  const viewed = await run("gh", [
    "issue",
    "view",
    String(issueNumber),
    "--repo",
    REPOSITORY,
    "--json",
    "number,title,url,state,labels,comments,createdAt",
  ]);
  if (!viewed.ok) return { error: viewed.stderr || "이슈를 읽지 못했습니다." };

  let issue;
  try {
    issue = JSON.parse(viewed.stdout);
  } catch {
    return { error: "이슈 응답을 해석하지 못했습니다." };
  }

  const labels = (issue.labels ?? []).map((label) => label.name);
  const has = (name) => labels.includes(name);

  const steps = [
    { id: "queued", label: "요청 인증", done: has("pipeline-request") },
    { id: "timely", label: "Timely Agent(Solar Pro 4) 문안", done: has("timely-complete") },
    { id: "claude", label: "Claude Code 가이드·검수", done: has("claude-complete") },
  ];
  if (has("pipeline-rejected")) {
    steps.push({ id: "rejected", label: "요청 거부됨", done: true });
  }

  return {
    number: issue.number,
    title: issue.title,
    url: issue.url,
    state: issue.state,
    createdAt: issue.createdAt,
    labels,
    steps,
    // 코멘트는 그대로 내려보낸다. 화면이 "무슨 일이 있었는지"를 사람 말로 보여준다.
    comments: (issue.comments ?? []).map((comment) => ({
      createdAt: comment.createdAt,
      body: comment.body ?? "",
    })),
  };
}

/**
 * Timely·Claude 가 만든 산출물을 로컬로 가져온다.
 *
 * 브랜치를 체크아웃하지 않는다. 시연 중 작업 트리가 바뀌면 지금 돌고 있는 실행과
 * 열려 있는 화면이 동시에 흔들린다. 필요한 것은 파일뿐이므로 fetch 후 그 커밋에서
 * 산출물 경로만 꺼내 쓴다.
 */
export async function pullPipelineOutputs(issueNumber) {
  if (!Number.isInteger(issueNumber) || issueNumber < 1) {
    return { error: "이슈 번호가 올바르지 않습니다." };
  }
  const branch = `pipeline/issue-${issueNumber}`;

  const fetched = await run("git", ["fetch", "origin", branch], { timeoutMs: 60_000 });
  if (!fetched.ok) return { error: fetched.stderr || `${branch} 를 가져오지 못했습니다.` };

  const listed = await run("git", [
    "ls-tree",
    "-r",
    "--name-only",
    "FETCH_HEAD",
    "unsorted/outputs/projects",
  ]);
  if (!listed.ok) return { error: listed.stderr || "산출물 목록을 읽지 못했습니다." };

  const paths = listed.stdout.split("\n").filter(Boolean);
  if (!paths.length) return { error: `${branch} 에 산출물이 없습니다.` };

  const checkedOut = await run("git", ["checkout", "FETCH_HEAD", "--", ...paths], {
    timeoutMs: 60_000,
  });
  if (!checkedOut.ok) return { error: checkedOut.stderr || "산출물을 꺼내지 못했습니다." };

  // 스테이징에 올라간 채로 두지 않는다. 시연 중 커밋 상태를 건드리지 않기 위해서다.
  await run("git", ["reset", "--", ...paths]);

  const slugs = [
    ...new Set(
      paths
        .map((path) => /^unsorted\/outputs\/projects\/([^/]+)\//.exec(path)?.[1])
        .filter(Boolean),
    ),
  ];

  return { branch, files: paths.length, slugs };
}

export const GITHUB_REPOSITORY = REPOSITORY;

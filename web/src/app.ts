import type { Approval, Artifact, DashboardData, ExecutionRun, Project } from "./types.js";

const app = document.querySelector<HTMLElement>("#app");

function escapeHtml(value: unknown): string {
  return String(value ?? "—")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "기록 없음";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return escapeHtml(value);
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(parsed);
}

function badge(value: string): string {
  const normalized = value.toLowerCase();
  const tone = /approved|passed|published|scheduled|succeeded|complete/.test(normalized)
    ? "good"
    : /failed|blocked|hold|conditional|need|pending|not_requested|not.started/.test(normalized)
      ? "warn"
      : "neutral";
  return `<span class="badge ${tone}">${escapeHtml(value.replaceAll("_", " "))}</span>`;
}

function completionBadge(project: Project): string {
  if (project.completion.complete) return '<span class="badge good">완주</span>';
  if (/blocked|failed|hold/i.test(project.status)) return '<span class="badge warn">중단·차단</span>';
  return '<span class="badge neutral">진행 중</span>';
}

function artifactLink(artifact: Artifact): string {
  const name = escapeHtml(artifact.label);
  if (artifact.public && artifact.href) {
    return `<a class="file-link" href="${encodeURI(artifact.href)}" target="_blank" rel="noopener">${name}<span aria-hidden="true">↗</span></a>`;
  }
  const note = artifact.note ? ` · ${escapeHtml(artifact.note)}` : "";
  return `<span class="file-missing">${name}${note}</span>`;
}

function approvalRows(approvals: Project["approvals"]): string {
  const rows: [string, Approval][] = [
    ["제작·비용", approvals.production],
    ["최종 영상", approvals.final],
    ["외부 배포", approvals.distribution],
  ];
  return rows.map(([label, approval]) => `<div class="status-row"><span>${label}</span>${badge(approval.status)}<small>${approval.explicit ? "명시적 승인 기록" : "명시적 승인 없음"}</small></div>`).join("");
}

function pipeline(project: Project): string {
  const stages = [
    ["기획안 3종", `${project.completion.planVariants.completed}/${project.completion.planVariants.expected}`, project.completion.planVariants.completed === project.completion.planVariants.expected],
    ["시나리오", project.completion.scenario ? "완료" : "대기", project.completion.scenario],
    ["스토리보드 문안", `${project.completion.storyboard.completed}/${project.completion.storyboard.expected}`, project.completion.storyboard.completed === project.completion.storyboard.expected],
    ["장면 이미지", project.completion.referencedImageCount > project.completion.imageCount
      ? `실제 ${project.completion.imageCount}개 / 로그 ${project.completion.referencedImageCount}개`
      : `실제 ${project.completion.imageCount}개`, project.completion.imageCount > 0],
    ["영상 초안", project.completion.draftVideo ? "존재" : "없음", project.completion.draftVideo],
    ["최종 영상", project.completion.finalVideo ? "존재" : "없음", project.completion.finalVideo],
  ] as const;

  return stages.map(([label, value, done]) => `<li class="pipeline-step ${done ? "done" : ""}"><span aria-hidden="true">${done ? "✓" : "·"}</span><div><strong>${label}</strong><small>${value}</small></div></li>`).join("");
}

function runRows(runs: ExecutionRun[], recorded: boolean): string {
  if (!recorded) {
    return `<p class="empty">이 프로젝트의 기존 이력에는 실행 ID·시각·채택 여부가 없습니다. <code>model_versions</code>는 설정 메모일 뿐 실행 이력으로 간주하지 않습니다.</p>`;
  }
  if (!runs.length) return '<p class="empty">실행 이력이 기록되었지만 아직 실행 건이 없습니다.</p>';
  return `<div class="run-table" role="table">
    <div class="run-head" role="row"><span>모델·단계</span><span>실행 시각 / ID</span><span>결과 파일</span><span>채택</span></div>
    ${runs.map((run) => `<div class="run-row" role="row">
      <div><strong>${escapeHtml(run.model)}</strong><small>${escapeHtml(run.agent)} · ${escapeHtml(run.stageLabel)}</small>${badge(run.status)}</div>
      <div><strong>${formatDate(run.startedAt)}</strong><small>${escapeHtml(run.id)}</small></div>
      <div>${run.outputFiles.length ? run.outputFiles.map(artifactLink).join("") : '<span class="file-missing">결과 파일 없음</span>'}</div>
      <div>${run.adopted ? '<span class="adopted">채택</span>' : '<span class="not-adopted">미채택</span>'}</div>
    </div>`).join("")}
  </div>`;
}

function projectView(project: Project): string {
  const artifacts = project.artifacts.map((artifact) => `<li class="artifact ${artifact.exists ? "exists" : ""}">${artifactLink(artifact)}${artifact.sourcePath ? `<small>${escapeHtml(artifact.sourcePath)}</small>` : ""}</li>`).join("");
  const errors = project.errors.length
    ? `<ul class="errors">${project.errors.slice(0, 3).map((error) => `<li><strong>${escapeHtml(error.stage ?? "기록된 오류")}</strong><span>${escapeHtml(error.message ?? error.impact ?? "상세 없음")}</span></li>`).join("")}</ul>`
    : '<p class="empty">오류가 기록되지 않았습니다.</p>';
  const publications = project.publications.length
    ? project.publications.map((item) => `<li>${escapeHtml(item.platform ?? "플랫폼")} ${badge(item.status ?? "unknown")} ${item.url ? `<a href="${encodeURI(item.url)}" target="_blank" rel="noopener">게시물 보기 ↗</a>` : ""}</li>`).join("")
    : '<li class="empty">외부 배포 실행 기록 없음</li>';

  return `<section class="project-overview" id="project" aria-labelledby="project-title">
    <div class="project-title">
      <p class="eyebrow">선택된 실제 프로젝트</p>
      <h2 id="project-title">${escapeHtml(project.topic)}</h2>
      <p>${escapeHtml(project.characters.join(" · ") || "등장 캐릭터 미기록")} <span>·</span> ${escapeHtml(project.id)}</p>
    </div>
    <div class="project-state">
      ${completionBadge(project)}
      <strong>${escapeHtml(project.completion.summary)}</strong>
      <small>마지막 기록 ${formatDate(project.updatedAt)}</small>
    </div>
  </section>
  <div class="content-grid">
    <section class="panel"><div class="panel-heading"><div><p class="eyebrow">실행 상태</p><h3>완주 체크</h3></div>${badge(project.completion.phase)}</div><ol class="pipeline">${pipeline(project)}</ol><p class="empty">원본 상태 코드 · <code>${escapeHtml(project.status)}</code></p></section>
    <section class="panel"><div class="panel-heading"><div><p class="eyebrow">승인 게이트</p><h3>유료 생성·외부 배포</h3></div></div>${approvalRows(project.approvals)}<p class="gate-note">공개 페이지는 읽기 전용입니다. 이 화면에서 유료 Higgsfield 생성이나 외부 게시를 실행할 수 없습니다.</p></section>
  </div>
  <section class="panel full" id="history"><div class="panel-heading"><div><p class="eyebrow">실행 이력</p><h3>모델별 추적</h3></div><span class="muted">모델명 · 시각 · 실행 ID · 결과 파일 · 채택 여부</span></div>${runRows(project.executionHistory, project.executionHistoryRecorded)}</section>
  <div class="content-grid detail-grid" id="results">
    <section class="panel"><div class="panel-heading"><div><p class="eyebrow">결과물</p><h3>공개 가능한 산출물</h3></div></div><ul class="artifact-list">${artifacts}</ul></section>
    <section class="panel"><div class="panel-heading"><div><p class="eyebrow">검수·예외</p><h3>실제 기록</h3></div></div><div class="review-grid"><div><span>기획 검수</span>${badge(project.reviews.planning)}</div><div><span>영상 검수</span>${badge(project.reviews.video)}</div></div>${errors}</section>
  </div>
  <section class="panel full"><div class="panel-heading"><div><p class="eyebrow">배포 결과</p><h3>외부 공개 이력</h3></div></div><ul class="publication-list">${publications}</ul></section>
  <details class="panel model-note"><summary>기존 모델 설정 메모 보기</summary><pre>${escapeHtml(JSON.stringify(project.modelVersions, null, 2))}</pre></details>`;
}

type GitHubIssue = {
  html_url?: string;
  number?: number;
  title?: string;
  created_at?: string;
  pull_request?: unknown;
  labels?: ({ name?: string } | string)[];
};

function issueStatus(issue: GitHubIssue): string {
  const labels = new Set((issue.labels ?? []).map((label) => typeof label === "string" ? label : label.name ?? ""));
  if (labels.has("pipeline-rejected")) return "요청 거부";
  if (labels.has("claude-complete")) return "Claude 완료";
  if (labels.has("timely-complete")) return "Claude 인계";
  if (labels.has("timely-processing")) return "Timely 실행 중";
  return "대기 중";
}

async function loadQueue(data: DashboardData): Promise<void> {
  const target = document.querySelector<HTMLElement>("#live-queue");
  if (!target) return;
  try {
    const response = await fetch(`https://api.github.com/repos/${data.control.repository}/issues?state=all&labels=pipeline-request&per_page=10`, { cache: "no-store" });
    if (!response.ok) throw new Error(`GitHub ${response.status}`);
    const issues = (await response.json() as GitHubIssue[]).filter((issue) => !issue.pull_request);
    target.innerHTML = issues.length ? issues.map((issue) => `<a class="queue-item" href="${escapeHtml(issue.html_url)}" target="_blank" rel="noopener"><span><strong>#${escapeHtml(issue.number)} ${escapeHtml(issue.title)}</strong><small>${formatDate(issue.created_at)}</small></span>${badge(issueStatus(issue))}</a>`).join("") : '<p class="empty">등록된 실행 요청이 없습니다.</p>';
  } catch {
    target.innerHTML = `<p class="empty">GitHub 실시간 큐를 불러오지 못했습니다. <a class="file-link" href="${escapeHtml(data.control.queueUrl)}" target="_blank" rel="noopener">GitHub에서 확인 ↗</a></p>`;
  }
}

function render(data: DashboardData, selectedId: string): void {
  if (!app) return;
  const selected = data.projects.find((project) => project.id === selectedId) ?? data.projects[0];
  if (!selected) {
    app.innerHTML = '<section class="shell"><p class="empty">공개 가능한 제작 이력이 아직 없습니다.</p></section>';
    return;
  }

  const projectButtons = data.projects.map((project) => `<button class="approval-list-card project-select ${project.id === selected.id ? "selected" : ""}" type="button" data-project="${escapeHtml(project.id)}"><span>${escapeHtml(project.topic)}</span>${completionBadge(project)}</button>`).join("");
  const policy = data.policy.agents.map((agent) => `<li><strong>${escapeHtml(agent.agent)}</strong><span>${escapeHtml(agent.model)}</span><small>${agent.allowedStages.map((stage) => escapeHtml(data.policy.stages[stage] ?? stage)).join(" · ")}</small></li>`).join("");

  app.innerHTML = `<div class="app-root">
    <header class="app-header">
      <button class="brand" type="button" data-scroll="overview"><span class="brand-fruit" aria-hidden="true"></span><span>애퐁당패밀리</span><small>숏폼 제작실</small></button>
      <nav class="global-nav" aria-label="주 메뉴"><button class="active" type="button" data-scroll="overview">홈</button><button type="button" data-scroll="project">프로젝트</button><button type="button" data-scroll="history">제작 이력</button><button type="button" data-scroll="results">결과물</button></nav>
      <div class="role-switcher"><span>공개 상태</span><b>읽기 전용</b></div>
    </header>
    <div class="demo-bar"><span><b>실제 이력 스냅샷</b> ${formatDate(data.generatedAt)} · API 키 없음 · 유료 생성·외부 게시 실행 없음</span><div><button type="button" data-scroll="history">모델 이력</button><button type="button" data-scroll="results">결과물 보기</button></div></div>
    <main class="workspace" id="overview">
      <section class="page-heading"><div><p class="eyebrow">공개 제작 현황</p><h1>실제 프로젝트 상태를<br />있는 그대로 보여드립니다.</h1><p>GitHub Actions 빌드 시점의 제작 이력과 공개 가능한 결과물만 표시합니다.</p></div><div class="snapshot"><span>완주</span><strong>${data.summary.complete} / ${data.summary.projects}건</strong><small>실행 이력 ${data.summary.executionRuns}건</small></div></section>
      <section class="dashboard-grid"><div class="panel feature-panel"><div class="section-head"><div><span class="section-kicker">현재 현황</span><h2>${escapeHtml(selected.topic)}</h2></div>${completionBadge(selected)}</div><p>${escapeHtml(selected.completion.summary)}</p><div class="metric-grid"><div><span>진행·대기</span><strong>${data.summary.active}건</strong></div><div><span>차단·실패</span><strong>${data.summary.blocked}건</strong></div><div><span>완주</span><strong>${data.summary.complete}건</strong></div><div><span>실행 기록</span><strong>${data.summary.executionRuns}건</strong></div></div></div><section class="panel policy"><div class="section-head"><div><span class="section-kicker">역할 경계</span><h2>모델 사용 정책</h2></div><span class="status-badge info">정책 v1</span></div><ul>${policy}</ul></section></section>
      <section class="panel launch-panel"><div><p class="eyebrow">인증된 실행</p><h2>새 제작을 GitHub에서 시작합니다.</h2><p>GitHub 로그인 후 요청서를 제출하면 Timely Agent가 무료 문안을 만들고 Claude Code가 가이드 적용·검수·승인 대기까지 이어갑니다.</p></div><div class="launch-actions"><a class="launch-primary" href="${escapeHtml(data.control.requestUrl)}" target="_blank" rel="noopener">새 제작 실행 ↗</a><a class="launch-secondary" href="${escapeHtml(data.control.actionsUrl)}" target="_blank" rel="noopener">Actions 보기</a></div><div class="queue"><div class="panel-heading"><div><p class="eyebrow">실시간 요청 큐</p><h3>GitHub Issues</h3></div><a class="file-link" href="${escapeHtml(data.control.queueUrl)}" target="_blank" rel="noopener">전체 보기 ↗</a></div><div id="live-queue"><p class="empty">GitHub 실행 큐를 불러오는 중입니다.</p></div></div></section>
      <section class="public-workspace"><aside><p class="eyebrow">실제 프로젝트</p><div class="project-list">${projectButtons}</div></aside><div class="project-content">${projectView(selected)}</div></section>
    </main>
    <footer class="public-footer">공개 배포본은 실행·승인·게시 기능을 제공하지 않습니다. 유료 Higgsfield 호출과 외부 배포는 로컬 파이프라인의 명시적 승인 게이트에서만 가능합니다.</footer>
  </div>`;

  app.querySelectorAll<HTMLButtonElement>("[data-project]").forEach((button) => {
    button.addEventListener("click", () => render(data, button.dataset.project ?? selected.id));
  });
  app.querySelectorAll<HTMLButtonElement>("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => document.getElementById(button.dataset.scroll ?? "overview")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  });
  void loadQueue(data);
}

async function init(): Promise<void> {
  if (!app) return;
  try {
    const response = await fetch("./data/pipeline-data.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`데이터 응답 ${response.status}`);
    const data = await response.json() as DashboardData;
    render(data, data.projects[0]?.id ?? "");
  } catch (error) {
    app.innerHTML = `<section class="shell"><div class="fatal"><p class="eyebrow">데이터를 불러오지 못했습니다</p><h1>공개 상태 스냅샷이 없습니다.</h1><p>${escapeHtml(error instanceof Error ? error.message : "알 수 없는 오류")}</p></div></section>`;
  }
}

void init();

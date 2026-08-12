import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";

import { validateModelRun } from "../../scripts/model-policy.mjs";

const ROOT = resolve(import.meta.dirname, "../..");
const WEB_ROOT = resolve(ROOT, "web");
const PROJECTS_DIR = resolve(ROOT, "unsorted/outputs/projects");
const PUBLIC_ROOT = resolve(WEB_ROOT, "public");
const DATA_DIR = resolve(PUBLIC_ROOT, "data");
const ARTIFACTS_DIR = resolve(PUBLIC_ROOT, "artifacts");
const POLICY = JSON.parse(await readFile(resolve(ROOT, "config/model-policy.json"), "utf8"));
const SAFE_EXTENSIONS = new Set([".md", ".json", ".txt", ".png", ".jpg", ".jpeg", ".webp", ".mp4"]);
const MAX_ASSET_BYTES = 50 * 1024 * 1024;
const SECRET_VALUE = /(?:api[_ -]?key|secret|token|password)\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,}/i;

function pathInside(parent, child) {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith(`..${sep}`) && rel !== "..";
}

function valueAt(object, path) {
  return path.split(".").reduce((value, key) => (value && typeof value === "object" ? value[key] : undefined), object);
}

function isOutputPath(value) {
  return typeof value === "string" && value.length > 0 && !value.includes("없음");
}

function normalizeRelative(projectId, sourcePath) {
  if (!isOutputPath(sourcePath)) return null;
  const candidates = [resolve(ROOT, sourcePath), resolve(PROJECTS_DIR, projectId, sourcePath)];
  const expectedPrefix = resolve(PROJECTS_DIR, projectId);
  const absolute = candidates.find((candidate) => pathInside(expectedPrefix, candidate));
  if (!absolute || !pathInside(expectedPrefix, absolute)) return null;
  return absolute;
}

async function publishArtifact(projectId, key, label, sourcePath, fallbacks = [], canPublish = true) {
  const candidates = [sourcePath, ...fallbacks].filter(isOutputPath);
  const initialPath = candidates[0] ?? null;
  const resolved = [];
  for (const candidate of candidates) {
    const absolute = normalizeRelative(projectId, candidate);
    if (!absolute) continue;
    const info = await stat(absolute).catch(() => null);
    if (info?.isFile()) resolved.push({ absolute, sourcePath: candidate, info });
  }
  const base = { key, label, sourcePath: initialPath, href: null, exists: false, public: false };
  const source = resolved[0];
  if (!source) return base;
  const { absolute, sourcePath: actualSourcePath, info } = source;
  const actualBase = { ...base, sourcePath: actualSourcePath, exists: true };
  if (!canPublish) return { ...actualBase, note: "승인 전 비공개" };
  const extension = extname(absolute).toLowerCase();
  if (!SAFE_EXTENSIONS.has(extension)) return { ...actualBase, note: "공개 형식 아님" };
  if (info.size > MAX_ASSET_BYTES) return { ...actualBase, note: "공개 크기 제한 초과" };
  if ([".md", ".json", ".txt"].includes(extension)) {
    const content = await readFile(absolute, "utf8");
    if (SECRET_VALUE.test(content)) return { ...actualBase, note: "비밀값 탐지로 제외" };
  }
  const sourceProjectRoot = resolve(PROJECTS_DIR, projectId);
  const projectRelative = relative(sourceProjectRoot, absolute).split(sep).join("/");
  const destination = resolve(ARTIFACTS_DIR, projectId, projectRelative);
  await mkdir(resolve(destination, ".."), { recursive: true });
  await cp(absolute, destination);
  return { ...actualBase, public: true, href: `./artifacts/${projectId}/${projectRelative}` };
}

function outputValue(log, key) {
  return valueAt(log.outputs ?? {}, key);
}

function arrayPaths(value) {
  return Array.isArray(value) ? value.filter(isOutputPath) : [];
}

function statusOr(value) {
  return typeof value === "string" ? value : "not_recorded";
}

function approvals(log) {
  const input = log.approvals ?? {};
  const map = (item) => ({ status: statusOr(item?.status), explicit: Boolean(item?.explicit), reviewer: item?.reviewer ?? null, approvedAt: item?.approved_at ?? null });
  return { production: map(input.production), final: map(input.final), distribution: map(input.distribution ?? input.external_distribution) };
}

function stageLabel(stage) {
  return POLICY.stages[stage] ?? stage;
}

async function buildProject(projectId, log) {
  const rawArtifacts = [
    ["request", "제작 요청", outputValue(log, "request"), `input/request.json`],
    ["plan", "기획안", outputValue(log, "plan"), `planning/plan.md`],
    ["scenario", "시나리오", outputValue(log, "scenario"), `planning/scenario.md`],
    ["storyboardA", "스토리보드 A", outputValue(log, "storyboard_a"), `storyboard/storyboard-a.md`],
    ["storyboardB", "스토리보드 B", outputValue(log, "storyboard_b"), `storyboard/storyboard-b.md`],
    ["storyboardC", "스토리보드 C", outputValue(log, "storyboard_c"), `storyboard/storyboard-c.md`],
    ["planningReview", "기획 검수", log.reviews?.planning?.path, `review/planning-review.md`],
    ["videoReview", "영상 검수", log.reviews?.video?.path, `review/video-review.md`],
    ["draftVideo", "영상 초안", outputValue(log, "video_draft"), undefined, false],
    ["finalVideo", "최종 영상", outputValue(log, "video_final"), undefined, log.approvals?.final?.status === "approved" && log.approvals?.distribution?.status === "approved"],
    ["publicationManifest", "배포 매니페스트", outputValue(log, "publication_manifest"), undefined, log.approvals?.distribution?.status === "approved"],
  ];
  const artifacts = await Promise.all(rawArtifacts.map(([key, label, path, fallback, canPublish]) => publishArtifact(projectId, key, label, path, fallback ? [fallback] : [], canPublish ?? true)));
  const byKey = new Map(artifacts.map((artifact) => [artifact.key, artifact]));
  const planVariants = [outputValue(log, "plan_a"), outputValue(log, "plan_b"), outputValue(log, "plan_c")].filter(isOutputPath).length || (byKey.get("plan")?.exists ? 1 : 0);
  const storyboard = ["storyboardA", "storyboardB", "storyboardC"].filter((key) => byKey.get(key)?.exists).length;
  const imagePaths = ["storyboard_images_a", "storyboard_images_b", "storyboard_images_c", "storyboard_images"].flatMap((key) => arrayPaths(outputValue(log, key)));
  const sceneImages = Array.isArray(log.scene_images) ? log.scene_images.filter((item) => item?.path).length : 0;
  const history = Array.isArray(log.execution_history) ? log.execution_history : [];
  for (const run of history) {
    const issues = validateModelRun({
      agent: run?.agent,
      model: run?.model,
      stage: run?.stage,
      status: run?.status,
      runId: run?.id,
      outputFiles: run?.output_files ?? [],
    });
    if (issues.length) throw new Error(`${projectId}의 실행 이력 ${run?.id ?? "unknown"}이 정책을 위반했습니다: ${issues.join(" ")}`);
  }
  const runs = await Promise.all(history.map(async (run) => ({
    id: String(run.id ?? "unknown"),
    agent: String(run.agent ?? "unknown"),
    model: String(run.model ?? "unknown"),
    stage: String(run.stage ?? "unknown"),
    stageLabel: stageLabel(String(run.stage ?? "unknown")),
    startedAt: run.started_at ?? null,
    finishedAt: run.finished_at ?? null,
    status: statusOr(run.status),
    outputFiles: await Promise.all(arrayPaths(run.output_files).map((file, index) => publishArtifact(projectId, `run-${run.id}-${index}`, file.split("/").at(-1) ?? file, file))),
    adopted: Boolean(run.adopted),
  })));
  const finalVideo = Boolean(byKey.get("finalVideo")?.exists);
  const complete = planVariants >= 3 && Boolean(byKey.get("scenario")?.exists) && storyboard === 3 && finalVideo && log.reviews?.video?.status === "passed" && log.approvals?.final?.status === "approved";
  const phase = complete ? "완주" : planVariants < 3 ? "기획안 3종 보완 필요" : !byKey.get("scenario")?.exists ? "시나리오 생성 중" : storyboard < 3 ? "스토리보드 문안 생성 중" : finalVideo ? "최종 검수·배포 대기" : "제작·비용 승인 대기";
  return {
    id: projectId,
    topic: log.input?.topic ?? log.project_id ?? projectId,
    characters: Array.isArray(log.input?.characters) ? log.input.characters : [],
    createdAt: log.created_at ?? null,
    updatedAt: log.updated_at ?? log.created_at ?? null,
    status: log.status ?? "status_not_recorded",
    completion: { phase, summary: complete ? "필수 문서·최종 영상·최종 승인이 모두 기록되었습니다." : "현재 저장된 이력 기준으로 아직 완주 조건이 충족되지 않았습니다.", planVariants: { completed: planVariants, expected: 3 }, scenario: Boolean(byKey.get("scenario")?.exists), storyboard: { completed: storyboard, expected: 3 }, imageCount: Math.max(imagePaths.length, sceneImages), draftVideo: Boolean(byKey.get("draftVideo")?.exists), finalVideo, complete },
    artifacts,
    reviews: { planning: statusOr(log.reviews?.planning?.status), video: statusOr(log.reviews?.video?.status) },
    approvals: approvals(log),
    modelVersions: log.model_versions && typeof log.model_versions === "object" ? log.model_versions : {},
    executionHistory: runs,
    executionHistoryRecorded: Array.isArray(log.execution_history),
    errors: Array.isArray(log.errors) ? log.errors.map((error) => ({ at: error?.at, stage: error?.stage, message: error?.message, impact: error?.impact, resolution: error?.resolution_path })) : [],
    publications: Array.isArray(log.publications) ? log.publications.map((item) => ({ platform: item?.platform, status: item?.status, url: item?.url ?? null, publishedAt: item?.published_at ?? null })) : [],
  };
}

async function main() {
  await rm(ARTIFACTS_DIR, { recursive: true, force: true });
  await mkdir(DATA_DIR, { recursive: true });
  const entries = await readdir(PROJECTS_DIR, { withFileTypes: true }).catch(() => []);
  const projects = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || !/^[a-z0-9][a-z0-9-]*$/.test(entry.name)) continue;
    const logPath = resolve(PROJECTS_DIR, entry.name, "metadata/production-log.json");
    try {
      projects.push(await buildProject(entry.name, JSON.parse(await readFile(logPath, "utf8"))));
    } catch (error) {
      // 프로젝트 폴더만 만들고 메타데이터를 아직 기록하지 않은 경우는 공개 목록에서 제외한다.
      // 그 외 오류를 숨기면 실제 이력의 정책 위반이나 손상이 공개 보드에서 사라져 버린다.
      if (error?.code === "ENOENT") continue;
      throw new Error(`공개 스냅샷을 만들 수 없습니다 (${entry.name}): ${error.message}`);
    }
  }
  projects.sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")) || a.id.localeCompare(b.id));
  const data = { generatedAt: new Date().toISOString(), policy: { agents: POLICY.agents.map((agent) => ({ agent: agent.agent, model: agent.model, allowedStages: agent.allowed_stages })), stages: POLICY.stages }, summary: { projects: projects.length, complete: projects.filter((project) => project.completion.complete).length, active: projects.filter((project) => !project.completion.complete && !/blocked|failed|hold/i.test(project.status)).length, blocked: projects.filter((project) => /blocked|failed|hold/i.test(project.status)).length, executionRuns: projects.reduce((count, project) => count + project.executionHistory.length, 0) }, projects };
  await writeFile(resolve(DATA_DIR, "pipeline-data.json"), `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`공개 스냅샷 생성: 프로젝트 ${projects.length}건`);
}

await main();

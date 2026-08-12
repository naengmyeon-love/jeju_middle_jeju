#!/usr/bin/env node

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");
const PROJECTS = resolve(ROOT, "unsorted/outputs/projects");

export function validateProductionApproval({ log, storyboard, credits, clips, regenerationLimit, referencesConfirmed, promptsConfirmed, phrase }) {
  const issues = [];
  if (!/^[ABC]$/.test(storyboard)) issues.push("storyboard는 A/B/C 중 하나여야 합니다.");
  if (!(Number.isFinite(credits) && credits > 0)) issues.push("credits는 양수여야 합니다.");
  if (!(Number.isInteger(clips) && clips > 0)) issues.push("clips는 양의 정수여야 합니다.");
  if (!(Number.isInteger(regenerationLimit) && regenerationLimit >= 0)) issues.push("regeneration-limit은 0 이상의 정수여야 합니다.");
  if (referencesConfirmed !== true) issues.push("공식 레퍼런스 확인이 필요합니다.");
  if (promptsConfirmed !== true) issues.push("최종 프롬프트 확인이 필요합니다.");
  if (phrase !== "APPROVE HIGGSFIELD COST") issues.push("명시 승인 문구가 일치하지 않습니다.");
  if (!["passed", "conditional", "conditional_pass"].includes(log?.reviews?.planning?.status)) issues.push("기획 자동 검수가 통과 또는 조건부 통과 상태가 아닙니다.");
  if (!Array.isArray(log?.guide_applied?.verified_pages) || log.guide_applied.verified_pages.length === 0) issues.push("공식 가이드 확인 페이지 기록이 없습니다.");
  return issues;
}

function parse(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error(`잘못된 인자: ${key ?? "(없음)"}`);
    values[key.slice(2)] = value;
  }
  return values;
}

async function atomicWrite(path, text) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, text, "utf8");
  await rename(temporary, path);
}

async function main() {
  const args = parse(process.argv.slice(2));
  if (!/^[a-z0-9][a-z0-9-]*$/.test(args.project ?? "")) throw new Error("project는 안전한 슬러그여야 합니다.");
  const projectRoot = resolve(PROJECTS, args.project);
  if (!projectRoot.startsWith(`${PROJECTS}/`)) throw new Error("프로젝트 경로가 올바르지 않습니다.");
  const logPath = resolve(projectRoot, "metadata/production-log.json");
  const log = JSON.parse(await readFile(logPath, "utf8"));
  const input = {
    log,
    storyboard: String(args.storyboard ?? "").toUpperCase(),
    credits: Number(args.credits),
    clips: Number(args.clips),
    regenerationLimit: Number(args["regeneration-limit"]),
    referencesConfirmed: args["references-confirmed"] === "true",
    promptsConfirmed: args["prompts-confirmed"] === "true",
    phrase: args.phrase,
  };
  const issues = validateProductionApproval(input);
  if (issues.length) throw new Error(issues.join("\n"));
  const approvedAt = new Date().toISOString();
  log.approvals ??= {};
  log.approvals.production = {
    status: "approved",
    explicit: true,
    reviewer: args.reviewer,
    approved_at: approvedAt,
    selected_storyboard: input.storyboard,
    estimated_credits: input.credits,
    clip_count: input.clips,
    regeneration_limit: input.regenerationLimit,
    cost_usage_approved: true,
    references_confirmed: true,
    prompts_confirmed: true,
    notes: `GitHub protected environment approval · ${args["run-url"]}`,
  };
  log.updated_at = approvedAt;
  await atomicWrite(logPath, `${JSON.stringify(log, null, 2)}\n`);

  const approvalPath = resolve(projectRoot, "review/approval-log.md");
  await mkdir(dirname(approvalPath), { recursive: true });
  const markdown = `# 담당자 승인 기록\n\n## A. 제작·비용 승인\n\n- 상태: 승인\n- 명시적 승인: 예\n- 승인 담당자: ${args.reviewer}\n- 승인 일시: ${approvedAt}\n- 선택 스토리보드: ${input.storyboard}\n- 공식 레퍼런스 확인: 예\n- 최종 프롬프트 확인: 예\n- 예상 Higgsfield 크레딧: ${input.credits}\n- 생성 클립 수: ${input.clips}\n- 재생성 상한: ${input.regenerationLimit}\n- 비용 사용 승인: 예\n- 승인 근거: ${args["run-url"]}\n\n## B. 최종 영상 승인\n\n- 상태: 대기\n- 명시적 승인: 아니오\n\n## C. 외부 배포 승인\n\n- 상태: 대기\n- 명시적 승인: 아니오\n`;
  await atomicWrite(approvalPath, markdown);
  console.log(JSON.stringify({ project: args.project, approvedAt, approvalPath: `review/approval-log.md` }));
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exitCode = 2; });
}

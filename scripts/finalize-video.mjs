#!/usr/bin/env node

import { copyFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(import.meta.dirname, "..");
const PROJECTS = resolve(ROOT, "unsorted/outputs/projects");

export function validateFinalApproval({ phrase, reviewStatus }) {
  const issues = [];
  if (phrase !== "APPROVE FINAL VIDEO") issues.push("명시적 최종 승인 문구가 일치하지 않습니다.");
  if (reviewStatus !== "passed") issues.push("영상 자동 검수가 passed 상태가 아닙니다.");
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

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function main() {
  const args = parse(process.argv.slice(2));
  if (!/^[a-z0-9][a-z0-9-]*$/.test(args.project ?? "")) throw new Error("project는 안전한 슬러그여야 합니다.");
  const projectRoot = resolve(PROJECTS, args.project);
  if (!projectRoot.startsWith(`${PROJECTS}/`)) throw new Error("프로젝트 경로가 올바르지 않습니다.");
  const logPath = resolve(projectRoot, "metadata/production-log.json");
  const log = JSON.parse(await readFile(logPath, "utf8"));
  const issues = validateFinalApproval({ phrase: args.phrase, reviewStatus: log.reviews?.video?.status });
  if (issues.length) throw new Error(issues.join("\n"));
  const draftPath = resolve(projectRoot, "video/draft.mp4");
  const finalPath = resolve(projectRoot, "video/final.mp4");
  if (!(await stat(draftPath).catch(() => null))?.isFile()) throw new Error("video/draft.mp4가 없습니다.");
  const draftHash = await sha256(draftPath);
  const existingFinal = await stat(finalPath).catch(() => null);
  if (existingFinal?.isFile() && await sha256(finalPath) !== draftHash) throw new Error("다른 final.mp4가 이미 존재합니다. 자동으로 덮어쓰지 않습니다.");
  await mkdir(dirname(finalPath), { recursive: true });
  if (!existingFinal) await copyFile(draftPath, finalPath);
  const approvedAt = new Date().toISOString();
  log.approvals ??= {};
  log.approvals.final = { status: "approved", explicit: true, reviewer: args.reviewer, approved_at: approvedAt, content_sha256: draftHash, notes: `GitHub protected environment approval · ${args["run-url"]}` };
  log.outputs ??= {};
  log.outputs.video_final = "video/final.mp4";
  log.updated_at = approvedAt;
  await atomicWrite(logPath, `${JSON.stringify(log, null, 2)}\n`);
  const approvalPath = resolve(projectRoot, "review/approval-log.md");
  const previous = await readFile(approvalPath, "utf8").catch(() => "# 담당자 승인 기록\n");
  const withoutFinal = previous.replace(/\n## B\. 최종 영상 승인[\s\S]*?(?=\n## C\.|$)/, "");
  const section = `\n## B. 최종 영상 승인\n\n- 상태: 승인\n- 명시적 승인: 예\n- 승인 담당자: ${args.reviewer}\n- 승인 일시: ${approvedAt}\n- 검수 대상 SHA-256: ${draftHash}\n- 승인 근거: ${args["run-url"]}\n`;
  const marker = "\n## C. 외부 배포 승인";
  const merged = withoutFinal.includes(marker) ? withoutFinal.replace(marker, `${section}${marker}`) : `${withoutFinal.trimEnd()}${section}\n## C. 외부 배포 승인\n\n- 상태: 대기\n- 명시적 승인: 아니오\n`;
  await atomicWrite(approvalPath, merged);
  console.log(JSON.stringify({ project: args.project, approvedAt, sha256: draftHash }));
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exitCode = 2; });
}

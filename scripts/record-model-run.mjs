#!/usr/bin/env node

import { access, readFile, rename, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, relative, sep } from "node:path";

import { RUN_STATUSES, validateModelRun } from "./model-policy.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const PROJECTS_DIR = resolve(ROOT, "unsorted/outputs/projects");

function usage() {
  return `Usage:
  node scripts/record-model-run.mjs \\
    --project <project-id> --agent <Timely Agent|Claude Code> --model <model-name> \\
    --stage <stage> --run-id <id> --started-at <ISO-8601> --status <status> \\
    [--finished-at <ISO-8601>] [--output <project-relative-file>]... [--adopted true|false]

This writes one execution_history entry to the project's production-log.json.
Allowed statuses: ${[...RUN_STATUSES].join(", ")}`;
}

function parseArgs(argv) {
  const values = { output: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key.startsWith("--")) throw new Error(`알 수 없는 인자: ${key}`);
    const name = key.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${key} 값이 필요합니다.`);
    index += 1;
    if (name === "output") values.output.push(value);
    else values[name] = value;
  }
  return values;
}

function isIsoDate(value) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isInside(parent, child) {
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith(`..${sep}`) && rel !== "..";
}

async function assertOutputFiles(projectDir, files) {
  const safeFiles = [];
  for (const file of files) {
    const absolute = resolve(projectDir, file);
    if (!isInside(projectDir, absolute)) throw new Error(`프로젝트 밖 결과 파일은 기록할 수 없습니다: ${file}`);
    const info = await stat(absolute).catch(() => null);
    if (!info?.isFile()) throw new Error(`결과 파일을 찾을 수 없습니다: ${file}`);
    safeFiles.push(relative(projectDir, absolute).split(sep).join("/"));
  }
  return safeFiles;
}

async function writeAtomic(path, text) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, text, "utf8");
  await rename(temporary, path);
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage());
    return;
  }

  const args = parseArgs(process.argv.slice(2));
  const required = ["project", "agent", "model", "stage", "run-id", "started-at", "status"];
  const missing = required.filter((key) => !args[key]);
  if (missing.length) throw new Error(`필수 인자가 없습니다: ${missing.map((key) => `--${key}`).join(", ")}`);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(args.project)) throw new Error("project는 안전한 슬러그여야 합니다.");
  if (!isIsoDate(args["started-at"])) throw new Error("started-at은 ISO-8601 시각이어야 합니다.");
  if (args["finished-at"] && !isIsoDate(args["finished-at"])) throw new Error("finished-at은 ISO-8601 시각이어야 합니다.");
  if (args.adopted && !["true", "false"].includes(args.adopted)) throw new Error("adopted는 true 또는 false여야 합니다.");

  const projectDir = resolve(PROJECTS_DIR, args.project);
  if (!isInside(PROJECTS_DIR, projectDir)) throw new Error("프로젝트 경로가 올바르지 않습니다.");
  await access(projectDir);
  const logPath = resolve(projectDir, "metadata/production-log.json");
  const log = JSON.parse(await readFile(logPath, "utf8"));
  const outputFiles = await assertOutputFiles(projectDir, args.output);
  const issues = validateModelRun({
    agent: args.agent,
    model: args.model,
    stage: args.stage,
    status: args.status,
    runId: args["run-id"],
    outputFiles,
  });
  if (issues.length) throw new Error(issues.join("\n"));

  const entry = {
    id: args["run-id"],
    agent: args.agent,
    model: args.model,
    stage: args.stage,
    started_at: args["started-at"],
    finished_at: args["finished-at"] ?? null,
    status: args.status,
    output_files: outputFiles,
    adopted: args.adopted === "true",
    recorded_at: new Date().toISOString(),
  };
  const history = Array.isArray(log.execution_history) ? log.execution_history : [];
  if (history.some((run) => run?.id === entry.id)) throw new Error(`같은 실행 ID가 이미 있습니다: ${entry.id}`);
  log.execution_history = [...history, entry];
  log.updated_at = entry.recorded_at;
  await writeAtomic(logPath, `${JSON.stringify(log, null, 2)}\n`);
  console.log(`실행 이력을 기록했습니다: ${log.project_id} / ${entry.id}`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  console.error(usage());
  process.exitCode = 2;
});

#!/usr/bin/env node
// Higgsfield 생성 결과를 프로젝트 안으로 내려받는다.
//
// 왜 이 스크립트가 필요한가: 에이전트에게 Bash(curl *) 를 열면 임의 URL 요청을
// 허용하는 셈이라, 원격 사용자가 조종하는 에이전트에게는 위험하다. 대신 이미 허용된
// Bash(node unsorted/scripts/*) 범위 안에 두고, 내려받을 수 있는 대상을
// "이 계정의 생성 작업 결과" 하나로 못박는다. URL 은 인자로 받지 않는다.
//
// 사용법:
//   node unsorted/scripts/fetch-generated.mjs --job <job-id> --out <프로젝트 내 경로>
//   node unsorted/scripts/fetch-generated.mjs --latest --out <경로>   가장 최근 완료 작업

import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = resolve(import.meta.dirname, "../..");

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(2);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (!args.out || args.out === true) {
  fail("--out <프로젝트 내 경로> 가 필요합니다.");
}
if (!args.job && !args.latest) {
  fail("--job <id> 또는 --latest 중 하나가 필요합니다.");
}

// 산출물은 프로젝트 밖으로 나갈 수 없다.
const destination = resolve(projectRoot, String(args.out));
if (!destination.startsWith(`${projectRoot}/`)) {
  fail("--out 은 프로젝트 안이어야 합니다.");
}

let listing;
try {
  const { stdout } = await execFileAsync("higgsfield", ["generate", "list", "--json"], {
    maxBuffer: 32 * 1024 * 1024,
  });
  listing = JSON.parse(stdout);
} catch (error) {
  fail(`higgsfield generate list 실패: ${error.message}`);
}

const jobs = Array.isArray(listing) ? listing : (listing.jobs ?? listing.items ?? []);
const completed = jobs.filter((j) => j.status === "completed" && j.result_url);

const job = args.latest
  ? completed[0]
  : completed.find((j) => j.id === String(args.job));

if (!job) {
  fail(
    args.latest
      ? "완료된 생성 작업이 없습니다."
      : `작업을 찾을 수 없거나 아직 완료되지 않았습니다: ${args.job}`,
  );
}

// URL 은 인자가 아니라 작업 기록에서만 나온다. 임의 주소를 받지 않는 것이 요점이다.
const url = job.result_url;
if (!/^https:\/\//.test(url)) {
  fail(`결과 URL 이 https 가 아닙니다: ${url}`);
}

const response = await fetch(url);
if (!response.ok) {
  fail(`다운로드 실패 ${response.status}: ${url}`);
}

await mkdir(dirname(destination), { recursive: true });
await writeFile(destination, Buffer.from(await response.arrayBuffer()));

console.log(
  JSON.stringify(
    {
      saved: destination.slice(projectRoot.length + 1),
      job_id: job.id,
      job_type: job.job_type,
      created_at: job.created_at,
      source_url: url,
    },
    null,
    2,
  ),
);

// 서버측 승인 게이트.
//
// 프론트엔드의 버튼 잠금은 UI 편의일 뿐이고, 유료 호출과 외부 게시를 실제로 막는 것은
// 여기다. webapp-spec/06 이 남긴 경고를 그대로 구현한다:
//   "프론트엔드 버튼 잠금만으로 유료 호출과 외부 게시를 보호하지 않는다."
//
// 판정 자체는 unsorted/scripts/check-production-gate.mjs 가 한다. 이 모듈은 그것을
// 호출할 뿐이며 판정 규칙을 다시 쓰지 않는다. 규칙이 두 곳에 있으면 반드시 갈라진다.

import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const GATE_SCRIPT = resolve(PROJECT_ROOT, "unsorted/scripts/check-production-gate.mjs");

/** check-production-gate.mjs 가 아는 단계. 그 외 값은 받지 않는다. */
export const STAGES = ["video", "final", "publish"];

/**
 * 제작 이력을 게이트에 통과시킨다.
 *
 * exit 0 = 통과, 1 = 차단, 2 = 인자·파일 오류.
 * 차단과 오류를 구분하지 않으면 "파일을 못 찾아서 통과"가 생긴다.
 */
export async function checkGate(logPath, stage = "video") {
  if (!STAGES.includes(stage)) {
    return { ok: false, code: 2, reason: `알 수 없는 stage: ${stage}`, output: "" };
  }

  const absolute = resolve(PROJECT_ROOT, logPath);
  if (!absolute.startsWith(`${PROJECT_ROOT}/`)) {
    return { ok: false, code: 2, reason: "프로젝트 밖 경로는 검사하지 않습니다.", output: "" };
  }

  try {
    await access(absolute);
  } catch {
    return { ok: false, code: 2, reason: `제작 이력이 없습니다: ${logPath}`, output: "" };
  }

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [GATE_SCRIPT, absolute, "--stage", stage],
      { cwd: PROJECT_ROOT, timeout: 30_000 },
    );
    return { ok: true, code: 0, reason: "게이트 통과", output: stdout.trim() };
  } catch (error) {
    const code = typeof error.code === "number" ? error.code : 1;
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim();
    return {
      ok: false,
      code,
      reason: code === 2 ? "게이트를 실행할 수 없습니다." : "게이트가 차단했습니다.",
      output,
    };
  }
}

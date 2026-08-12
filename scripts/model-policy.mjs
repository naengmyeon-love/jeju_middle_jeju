import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const MODEL_POLICY = require("../config/model-policy.json");
export const RUN_STATUSES = new Set(["queued", "running", "succeeded", "failed", "blocked", "cancelled"]);

export function stageLabel(stage) {
  return MODEL_POLICY.stages[stage] ?? stage;
}

/**
 * 실행자를 역할 경계에 맞게 검사한다. 이 검사는 API 호출을 대신하지 않으며,
 * production-log에 남길 사실이 정책과 맞는지만 보장한다.
 */
export function validateModelRun({ agent, model, stage, status, runId, outputFiles = [] }) {
  const issues = [];
  const policy = MODEL_POLICY.agents.find((entry) => entry.agent === agent);

  if (!policy) issues.push(`허용되지 않은 실행자입니다: ${agent}`);
  if (!MODEL_POLICY.stages[stage]) issues.push(`알 수 없는 단계입니다: ${stage}`);
  if (!RUN_STATUSES.has(status)) issues.push(`알 수 없는 실행 상태입니다: ${status}`);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{5,127}$/.test(runId)) {
    issues.push("실행 ID는 6~128자의 영문·숫자·점·밑줄·하이픈만 사용할 수 있습니다.");
  }
  if (typeof model !== "string" || model.trim().length === 0) issues.push("모델명을 기록해야 합니다.");

  if (policy) {
    if (policy.agent === "Timely Agent" && model !== policy.model) {
      issues.push(`Timely Agent에는 ${policy.model}만 기록할 수 있습니다.`);
    }
    if (!policy.allowed_stages.includes(stage)) {
      issues.push(`${policy.agent}는 ${stageLabel(stage)} 단계를 담당하지 않습니다.`);
    }
  }

  if (!Array.isArray(outputFiles) || outputFiles.some((file) => typeof file !== "string" || file.length === 0)) {
    issues.push("결과 파일은 비어 있지 않은 경로 배열이어야 합니다.");
  }

  return issues;
}

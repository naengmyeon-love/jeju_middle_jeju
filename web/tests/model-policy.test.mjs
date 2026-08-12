import test from "node:test";
import assert from "node:assert/strict";

import policy from "../../config/model-policy.json" with { type: "json" };
import { validateModelRun } from "../../scripts/model-policy.mjs";

const base = { status: "succeeded", runId: "run_20260812_001", outputFiles: ["planning/plan-a.md"] };

test("Solar Pro 4 can only record planning-copy stages", () => {
  assert.deepEqual(validateModelRun({ ...base, agent: "Timely Agent", model: "Solar Pro 4", stage: "plan" }), []);
  assert.match(validateModelRun({ ...base, agent: "Timely Agent", model: "Solar Pro 4", stage: "image_generation" }).join("\n"), /담당하지 않습니다/);
});

test("Timely connector targets the approved upstage-jnu agent workspace", () => {
  assert.deepEqual(policy.timely_connector, {
    provider: "Timely Agent",
    workspace_url: "https://timelyai.io/upstage-jnu/timely-agent",
    model: "Solar Pro 4",
    execution_mode: "external_github_connector",
    secret_environment_variable: "TIMELY_AGENT_API_KEY",
  });
});

test("Timely Agent rejects a different model", () => {
  assert.match(validateModelRun({ ...base, agent: "Timely Agent", model: "Solar Lite", stage: "scenario" }).join("\n"), /Solar Pro 4/);
});

test("Claude Code cannot take planning-copy stages", () => {
  assert.match(validateModelRun({ ...base, agent: "Claude Code", model: "Claude Sonnet", stage: "storyboard_copy" }).join("\n"), /담당하지 않습니다/);
  assert.deepEqual(validateModelRun({ ...base, agent: "Claude Code", model: "Claude Sonnet", stage: "scene_review" }), []);
});

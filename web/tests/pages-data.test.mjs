import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");

test("public snapshot reflects files on disk and preserves approval gates", async () => {
  execFileSync(process.execPath, [resolve(root, "web/scripts/build-pages-data.mjs")], {
    cwd: root,
    stdio: "pipe",
  });
  const data = JSON.parse(await readFile(resolve(root, "web/public/data/pipeline-data.json"), "utf8"));

  assert.ok(data.projects.length > 0, "actual project logs should be exposed");
  assert.equal(data.control.repository, "naengmyeon-love/jeju_middle_jeju");
  assert.match(data.control.requestUrl, /pipeline-request\.yml$/);
  assert.ok(data.projects.every((project) => !project.id.includes("fixture")), "fixtures must never be published");
  assert.deepEqual(data.policy.agents.find((entry) => entry.agent === "Timely Agent"), {
    agent: "Timely Agent",
    model: "Solar Pro 4",
    allowedStages: ["plan", "scenario", "storyboard_copy"],
  });

  const blocked = data.projects.find((project) => project.id === "boorabong-bijarim-forest-walk-20260811-15s");
  assert.ok(blocked, "known real blocked project should be present");
  assert.equal(blocked.completion.imageCount, 0, "missing image files must not be counted as completed");
  assert.equal(blocked.completion.referencedImageCount, 0);

  const generated = data.projects.find((project) => project.id === "boorabong-golebang-bijarim-trip-20260801");
  assert.ok(generated, "known real image project should be present");
  assert.equal(generated.completion.imageCount, 15);
  assert.equal(generated.completion.referencedImageCount, 15);
  assert.equal(generated.completion.planVariants.completed, 1, "a consolidated legacy plan is not three Timely variants");

  for (const project of data.projects) {
    const finalVideo = project.artifacts.find((artifact) => artifact.key === "finalVideo");
    if (finalVideo?.public) {
      assert.equal(project.approvals.final.status, "approved");
      assert.equal(project.approvals.distribution.status, "approved");
    }
  }
});

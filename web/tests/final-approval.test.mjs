import test from "node:test";
import assert from "node:assert/strict";
import { validateFinalApproval } from "../../scripts/finalize-video.mjs";

test("final approval is separate and requires passed review", () => {
  assert.deepEqual(validateFinalApproval({ phrase: "APPROVE FINAL VIDEO", reviewStatus: "passed" }), []);
  assert.match(validateFinalApproval({ phrase: "APPROVE HIGGSFIELD COST", reviewStatus: "passed" }).join("\n"), /최종 승인 문구/);
  assert.match(validateFinalApproval({ phrase: "APPROVE FINAL VIDEO", reviewStatus: "failed" }).join("\n"), /자동 검수/);
});

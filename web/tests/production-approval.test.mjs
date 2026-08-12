import test from "node:test";
import assert from "node:assert/strict";
import { validateProductionApproval } from "../../scripts/production-approval.mjs";

const valid = {
  log: { reviews: { planning: { status: "passed" } }, guide_applied: { verified_pages: [8, 9, 10] } },
  storyboard: "A",
  credits: 42,
  clips: 4,
  regenerationLimit: 1,
  referencesConfirmed: true,
  promptsConfirmed: true,
  phrase: "APPROVE HIGGSFIELD COST",
};

test("production approval requires every explicit cost field", () => {
  assert.deepEqual(validateProductionApproval(valid), []);
  assert.match(validateProductionApproval({ ...valid, phrase: "approve" }).join("\n"), /승인 문구/);
  assert.match(validateProductionApproval({ ...valid, referencesConfirmed: false }).join("\n"), /레퍼런스/);
});

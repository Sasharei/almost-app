const assert = require("node:assert/strict");
const test = require("node:test");

const {
  resolveGoalProgressPercentLabel,
} = require("../../src/utils/goalProgress");

test("keeps an almost-complete goal below 100 percent", () => {
  assert.equal(resolveGoalProgressPercentLabel(978 / 980, false), 99);
  assert.equal(resolveGoalProgressPercentLabel(0.9999, false), 99);
});

test("shows 100 percent only for a completed goal", () => {
  assert.equal(resolveGoalProgressPercentLabel(1, false), 99);
  assert.equal(resolveGoalProgressPercentLabel(1, true), 100);
  assert.equal(resolveGoalProgressPercentLabel(1.2, true), 100);
});

test("preserves normal rounded percentages below completion", () => {
  assert.equal(resolveGoalProgressPercentLabel(0.634, false), 63);
  assert.equal(resolveGoalProgressPercentLabel(0.636, false), 64);
  assert.equal(resolveGoalProgressPercentLabel(-1, false), 0);
});

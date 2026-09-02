const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyRatingPromptDecisionAction,
  applyRatingPromptSeriesCompletion,
  isRatingPromptTriggerEligible,
} = require("../../src/engagement/ratingPrompt");

const createState = (overrides = {}) => ({
  completed: false,
  lastAction: null,
  actionCount: 0,
  seriesCompletionCount: 0,
  ...overrides,
});

test("every save/spend ordering is eligible on the second successful decision", () => {
  [
    ["save", "save"],
    ["save", "spend"],
    ["spend", "save"],
    ["spend", "spend"],
  ].forEach(([firstAction, secondAction]) => {
    const first = applyRatingPromptDecisionAction(createState(), { action: firstAction });
    assert.equal(first.recorded, true);
    assert.equal(first.state.actionCount, 1);
    assert.equal(first.eligible, false);

    const second = applyRatingPromptDecisionAction(first.state, { action: secondAction });
    assert.equal(second.recorded, true);
    assert.equal(second.state.actionCount, 2);
    assert.equal(second.eligible, true);
  });
});

test("non-decision series actions do not advance the rating action counter", () => {
  ["pause", "skip", "archive"].forEach((action) => {
    const result = applyRatingPromptDecisionAction(createState(), { action });
    assert.equal(result.recorded, false);
    assert.equal(result.state.actionCount, 0);
    assert.equal(result.eligible, false);
  });
});

test("the first claimed series reward makes the prompt eligible", () => {
  const result = applyRatingPromptSeriesCompletion(createState());

  assert.equal(result.recorded, true);
  assert.equal(result.state.seriesCompletionCount, 1);
  assert.equal(result.eligible, true);
});

test("a completed rating flow ignores later actions and series rewards", () => {
  const completed = createState({ completed: true, lastAction: "rate" });
  const actionResult = applyRatingPromptDecisionAction(completed, { action: "save" });
  const seriesResult = applyRatingPromptSeriesCompletion(completed);

  assert.equal(actionResult.recorded, false);
  assert.equal(actionResult.state.actionCount, 0);
  assert.equal(seriesResult.recorded, false);
  assert.equal(seriesResult.state.seriesCompletionCount, 0);
  assert.equal(isRatingPromptTriggerEligible(completed), false);
});

test("Later keeps the already reached threshold eligible for a future decision", () => {
  const laterState = createState({ actionCount: 2, lastAction: "later" });
  const result = applyRatingPromptDecisionAction(laterState, { action: "save" });

  assert.equal(result.recorded, true);
  assert.equal(result.state.actionCount, 3);
  assert.equal(result.eligible, true);
});

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  NEXT_DECISION_COACH_STATUS,
  buildNextDecisionCoachScrollRequest,
  normalizeNextDecisionCoachState,
  resolveNextDecisionCoachTarget,
  serializeNextDecisionCoachState,
  shouldQueueNextDecisionCoach,
} = require("../../src/engagement/nextDecisionCoach");

test("a new user's first resolved temptation queues the next-decision coach", () => {
  assert.equal(
    shouldQueueNextDecisionCoach({
      coachStatus: NEXT_DECISION_COACH_STATUS.ELIGIBLE,
      lifetimeDecisionCount: 0,
      previousResolutionCount: 0,
      action: "save",
      result: { isFirstResolution: true, progress: { remaining: 2 } },
      availableTemptationCount: 3,
    }),
    true
  );
});

test("existing decision history and repeated actions never queue the coach", () => {
  const base = {
    coachStatus: NEXT_DECISION_COACH_STATUS.ELIGIBLE,
    lifetimeDecisionCount: 0,
    previousResolutionCount: 0,
    action: "save",
    result: { isFirstResolution: true, progress: { remaining: 2 } },
    availableTemptationCount: 3,
  };
  assert.equal(shouldQueueNextDecisionCoach({ ...base, lifetimeDecisionCount: 1 }), false);
  assert.equal(shouldQueueNextDecisionCoach({ ...base, previousResolutionCount: 1 }), false);
  assert.equal(
    shouldQueueNextDecisionCoach({
      ...base,
      result: { isFirstResolution: false, progress: { remaining: 2 } },
    }),
    false
  );
});

test("attribution and monetization install flags cannot suppress the first-decision coach", () => {
  const firstDecision = {
    coachStatus: NEXT_DECISION_COACH_STATUS.ELIGIBLE,
    lifetimeDecisionCount: 0,
    previousResolutionCount: 0,
    action: "save",
    result: { isFirstResolution: true, progress: { remaining: 2 } },
    availableTemptationCount: 3,
  };

  assert.equal(
    shouldQueueNextDecisionCoach({
      ...firstDecision,
      isNewInstall: false,
      hasInfrastructureInstallId: true,
    }),
    true
  );
});

test("target selection skips the completed source and keeps feed order", () => {
  const target = resolveNextDecisionCoachTarget({
    products: [
      { id: "coffee" },
      { id: "delivery" },
      { id: "taxi" },
    ],
    resolvedTemptationIds: ["coffee"],
    sourceTemptationId: "coffee",
  });
  assert.equal(target.id, "delivery");
});

test("coach scrolling targets the virtualized feed index instead of a cell-local offset", () => {
  const request = buildNextDecisionCoachScrollRequest({
    index: 1,
    animated: true,
  });

  assert.deepEqual(request, {
    index: 1,
    animated: true,
    viewPosition: 0.06,
  });
  assert.equal(Object.hasOwn(request, "offset"), false);
  assert.equal(buildNextDecisionCoachScrollRequest({ index: -1 }), null);
});

test("a visible coach restores as pending until the user acts or dismisses it", () => {
  const stored = serializeNextDecisionCoachState({
    status: NEXT_DECISION_COACH_STATUS.VISIBLE,
    sourceTemptationId: "coffee",
    targetTemptationId: "delivery",
    requestId: 42,
  });
  assert.deepEqual(normalizeNextDecisionCoachState(stored), {
    status: NEXT_DECISION_COACH_STATUS.PENDING,
    sourceTemptationId: "coffee",
    targetTemptationId: "delivery",
    requestId: 42,
  });
});

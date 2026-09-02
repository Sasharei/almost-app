const assert = require("node:assert/strict");
const test = require("node:test");

const {
  isGoalCompletionLocked,
  resolveGoalProgressState,
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

test("locks a completed goal against negative history adjustments", () => {
  assert.deepEqual(
    resolveGoalProgressState({
      currentSavedUSD: 100,
      targetUSD: 100,
      currentStatus: "done",
      completedAt: 123,
      requestedSavedUSD: 75,
      requestedStatus: "active",
    }),
    {
      savedUSD: 100,
      status: "done",
      completedAt: 123,
      completionLocked: true,
    }
  );
});

test("repairs a persisted completed goal whose saved amount fell below its target", () => {
  assert.deepEqual(
    resolveGoalProgressState({
      currentSavedUSD: 75,
      targetUSD: 100,
      currentStatus: "done",
      requestedSavedUSD: 75,
      occurredAt: 321,
    }),
    {
      savedUSD: 100,
      status: "done",
      completedAt: 321,
      completionLocked: true,
    }
  );
});

test("a durable completion marker repairs an accidentally active goal", () => {
  assert.deepEqual(
    resolveGoalProgressState({
      currentSavedUSD: 90,
      targetUSD: 100,
      currentStatus: "active",
      completedAt: 456,
      requestedSavedUSD: 80,
    }),
    {
      savedUSD: 100,
      status: "done",
      completedAt: 456,
      completionLocked: true,
    }
  );
});

test("a profile completion lock repairs legacy completed goals", () => {
  assert.equal(
    isGoalCompletionLocked({
      savedUSD: 20,
      targetUSD: 100,
      status: "active",
      completionLocked: true,
    }),
    true
  );
  assert.equal(
    resolveGoalProgressState({
      currentSavedUSD: 20,
      targetUSD: 100,
      currentStatus: "active",
      completionLocked: true,
      requestedSavedUSD: 10,
    }).savedUSD,
    100
  );
});

test("an active goal still follows ordinary positive and negative adjustments", () => {
  const increased = resolveGoalProgressState({
    currentSavedUSD: 40,
    targetUSD: 100,
    currentStatus: "active",
    requestedSavedUSD: 65,
  });
  assert.equal(increased.savedUSD, 65);
  assert.equal(increased.status, "active");

  const decreased = resolveGoalProgressState({
    currentSavedUSD: increased.savedUSD,
    targetUSD: 100,
    currentStatus: increased.status,
    requestedSavedUSD: 25,
  });
  assert.equal(decreased.savedUSD, 25);
  assert.equal(decreased.status, "active");
});

test("reaching the target creates a durable completion marker", () => {
  assert.deepEqual(
    resolveGoalProgressState({
      currentSavedUSD: 90,
      targetUSD: 100,
      currentStatus: "active",
      requestedSavedUSD: 100,
      occurredAt: 789,
    }),
    {
      savedUSD: 100,
      status: "done",
      completedAt: 789,
      completionLocked: true,
    }
  );
});

test("only an explicit manual reset can reopen a completed goal", () => {
  assert.deepEqual(
    resolveGoalProgressState({
      currentSavedUSD: 100,
      targetUSD: 200,
      currentStatus: "done",
      completedAt: 789,
      requestedSavedUSD: 100,
      requestedStatus: "active",
      allowCompletedReset: true,
    }),
    {
      savedUSD: 100,
      status: "active",
      completedAt: null,
      completionLocked: false,
    }
  );
});

test("a history delta affects only its active goal in a multi-goal collection", () => {
  const goals = [
    { id: "trip", savedUSD: 100, targetUSD: 100, status: "done", completedAt: 1000 },
    { id: "laptop", savedUSD: 40, targetUSD: 100, status: "active", completedAt: null },
  ];
  const applyDelta = (goalId, deltaUSD) =>
    goals.map((goal) => {
      if (goal.id !== goalId) return goal;
      const next = resolveGoalProgressState({
        currentSavedUSD: goal.savedUSD,
        targetUSD: goal.targetUSD,
        currentStatus: goal.status,
        completedAt: goal.completedAt,
        requestedSavedUSD: goal.savedUSD + deltaUSD,
      });
      return { ...goal, ...next };
    });

  const afterCompletedGoalHistoryDelete = applyDelta("trip", -25);
  assert.equal(afterCompletedGoalHistoryDelete[0].savedUSD, 100);
  assert.equal(afterCompletedGoalHistoryDelete[0].status, "done");
  assert.deepEqual(afterCompletedGoalHistoryDelete[1], goals[1]);

  const afterActiveGoalHistoryDelete = applyDelta("laptop", -10);
  assert.deepEqual(afterActiveGoalHistoryDelete[0], goals[0]);
  assert.equal(afterActiveGoalHistoryDelete[1].savedUSD, 30);
  assert.equal(afterActiveGoalHistoryDelete[1].status, "active");
});

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  advanceAnchoredTemptationSchedule,
  isManualTemptationCycleAlreadyConsumed,
  resolveTemptationActionSchedulePolicy,
  shouldPreserveTemptationScheduleOnAction,
} = require("../../src/engagement/temptationSchedule");

test("a manually configured monthly schedule is immutable during later actions", () => {
  const now = new Date(2026, 7, 14, 9, 0, 0).getTime();
  const nextCheckAt = now + 30 * 24 * 60 * 60 * 1000;

  assert.equal(
    shouldPreserveTemptationScheduleOnAction({
      entries: [
        {
          frequency: "monthly",
          frequencyReminderManualConfigured: true,
          nextCheckAt,
        },
      ],
    }),
    true
  );
});

test("an unconfigured first action can still create its initial schedule", () => {
  assert.equal(
    shouldPreserveTemptationScheduleOnAction({
      entries: [{ frequencyReminderManualConfigured: false, nextCheckAt: null }],
    }),
    false
  );
});

test("system actions can explicitly preserve a timer before manual setup", () => {
  assert.equal(
    shouldPreserveTemptationScheduleOnAction({
      explicitlyPreserve: true,
      entries: [],
    }),
    true
  );
});

test("a manual action advances an anchored schedule and invalidates pending autosave", () => {
  const dayMs = 24 * 60 * 60 * 1000;
  const scheduledNextCheckAt = new Date(2026, 7, 20, 9, 0, 0).getTime();
  const policy = resolveTemptationActionSchedulePolicy({
    entries: [
      {
        frequency: "monthly",
        frequencyReminderManualConfigured: true,
        nextCheckAt: scheduledNextCheckAt,
      },
    ],
  });

  assert.deepEqual(policy, {
    preserveConfiguredTimer: true,
    shouldAdvanceAnchoredSchedule: true,
    shouldInvalidatePendingAutosave: true,
    shouldResetReminderRegistration: true,
  });
  assert.equal(
    advanceAnchoredTemptationSchedule({
      scheduledNextCheckAt,
      now: new Date(2026, 7, 17, 10, 0, 0).getTime(),
      resolveNextCheckAt: (timestamp) => timestamp + 30 * dayMs,
    }),
    scheduledNextCheckAt + 30 * dayMs
  );
});

test("a manual action clears reconciled missed cycles without skipping the next occurrence", () => {
  const nextFutureCheckAt = new Date(2026, 8, 20, 9, 0, 0).getTime();
  assert.equal(
    advanceAnchoredTemptationSchedule({
      scheduledNextCheckAt: nextFutureCheckAt,
      missedCycles: 2,
      now: new Date(2026, 7, 17, 10, 0, 0).getTime(),
      resolveNextCheckAt: () => {
        throw new Error("an already reconciled schedule must not advance again");
      },
    }),
    nextFutureCheckAt
  );
});

test("repeated manual actions in one cycle do not skip another future occurrence", () => {
  const nextFutureCheckAt = new Date(2026, 7, 20, 9, 0, 0).getTime();
  assert.equal(
    advanceAnchoredTemptationSchedule({
      scheduledNextCheckAt: nextFutureCheckAt,
      alreadyConsumedCurrentCycle: true,
      now: new Date(2026, 7, 17, 10, 10, 0).getTime(),
      resolveNextCheckAt: () => {
        throw new Error("a repeated action must keep the already advanced occurrence");
      },
    }),
    nextFutureCheckAt
  );
});

test("the consumed-cycle marker expires at a scheduled boundary but survives an overdue action", () => {
  const hourMs = 60 * 60 * 1000;
  const targetAt = new Date(2026, 7, 20, 9, 0, 0).getTime();
  const actionBeforeTargetAt = targetAt - hourMs;
  assert.equal(
    isManualTemptationCycleAlreadyConsumed({
      skipTargetAt: targetAt,
      skipCreatedAt: actionBeforeTargetAt,
      timerResetAt: actionBeforeTargetAt,
      now: targetAt - 30 * 60 * 1000,
      intervalMs: 24 * hourMs,
    }),
    true
  );
  assert.equal(
    isManualTemptationCycleAlreadyConsumed({
      skipTargetAt: targetAt,
      skipCreatedAt: actionBeforeTargetAt,
      timerResetAt: actionBeforeTargetAt,
      now: targetAt + hourMs,
      intervalMs: 24 * hourMs,
    }),
    false
  );
  assert.equal(
    isManualTemptationCycleAlreadyConsumed({
      skipTargetAt: targetAt,
      skipCreatedAt: targetAt + hourMs,
      timerResetAt: targetAt + hourMs,
      now: targetAt + 2 * hourMs,
      intervalMs: 24 * hourMs,
    }),
    true
  );
});

test("an automatic confirmation preserves its current timer and pending ledger entry", () => {
  assert.deepEqual(
    resolveTemptationActionSchedulePolicy({ explicitlyPreserve: true, entries: [] }),
    {
      preserveConfiguredTimer: true,
      shouldAdvanceAnchoredSchedule: false,
      shouldInvalidatePendingAutosave: false,
      shouldResetReminderRegistration: false,
    }
  );
});

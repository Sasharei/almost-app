const test = require("node:test");
const assert = require("node:assert/strict");

const {
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

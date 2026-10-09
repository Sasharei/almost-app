const test = require('node:test');
const assert = require('node:assert/strict');
const { shouldIncludeUnscheduledInToday, countExplicitSchedules, classifyScheduledDecision } = require('../../src/engagement/todayOverview');

test('only selected starter suggestions fill Today before timers are configured', () => {
  assert.equal(shouldIncludeUnscheduledInToday(), false);
  assert.equal(shouldIncludeUnscheduledInToday({ isStarter: true }), true);
  assert.equal(shouldIncludeUnscheduledInToday({ isStarter: true, scheduledCount: 1 }), false);
  assert.equal(shouldIncludeUnscheduledInToday({ scheduledCount: 3 }), false);
});
test('first decisions on user-created cards remain discoverable until four schedules exist', () => {
  for (const scheduledCount of [0, 1, 2, 3]) {
    assert.equal(shouldIncludeUnscheduledInToday({ scheduledCount, isCustom: true }), true);
  }
  assert.equal(shouldIncludeUnscheduledInToday({ scheduledCount: 4, isCustom: true }), false);
});
test('four schedules suppress unscheduled cards with prior saved or spent decisions', () => {
  for (const interaction of [{ saveCount: 2 }, { spendCount: 1 }]) {
    assert.equal(shouldIncludeUnscheduledInToday({ scheduledCount: 3, interaction }), true);
    assert.equal(shouldIncludeUnscheduledInToday({ scheduledCount: 4, interaction }), false);
  }
});
test('schedule count includes future schedules, reads either persisted source, and counts once', () => {
  assert.equal(countExplicitSchedules([
    { interaction: { frequencyReminderManualConfigured: true, nextCheckAt: Date.now() + 9999999 } },
    { item: { frequencyReminderManualConfigured: true } },
    { item: { frequencyReminderManualConfigured: true }, interaction: { frequencyReminderManualConfigured: true } },
    { interaction: { frequency: 'daily' } },
    { item: {} },
  ]), 3);
});

test('a future explicit check stays upcoming even after previously missed cycles', () => {
  const now = new Date(2026, 9, 1, 12).getTime();
  const dayEnd = new Date(2026, 9, 1, 23, 59, 59, 999).getTime();
  const tomorrow = new Date(2026, 9, 2, 9).getTime();
  assert.equal(classifyScheduledDecision({ dueAt: tomorrow, now, dayEnd, missedCycles: 4 }), 'upcoming');
  assert.equal(classifyScheduledDecision({ dueAt: dayEnd, now, dayEnd }), 'later');
  assert.equal(classifyScheduledDecision({ dueAt: now, now, dayEnd }), 'due');
  assert.equal(classifyScheduledDecision({ dueAt: now - 1000, now, dayEnd }), 'due');
});
test('Today uses local calendar midnight rather than the next 24 hours', () => {
  const now = new Date(2026, 9, 1, 23, 55).getTime();
  const dayEnd = new Date(2026, 9, 1, 23, 59, 59, 999).getTime();
  const dueAt = new Date(2026, 9, 2, 0, 5).getTime();
  assert.equal(classifyScheduledDecision({ dueAt, now, dayEnd }), 'upcoming');
});

test('completed decisions use local day boundaries; edits and resets are not completion', () => {
  const { isDecisionRecordedToday } = require('../../src/engagement/todayOverview');
  const now = new Date(2026, 9, 1, 12).getTime();
  assert.equal(isDecisionRecordedToday({ lastSavedAt: new Date(2026, 9, 1, 0).getTime() }, now), true);
  assert.equal(isDecisionRecordedToday({ lastSpentAt: now - 1000 }, now), true);
  assert.equal(isDecisionRecordedToday({ lastSavedAt: new Date(2026, 8, 30, 23, 59).getTime() }, now), false);
  assert.equal(isDecisionRecordedToday({ lastInteractionAt: now, lastTimerResetAt: now }, now), false);
  assert.equal(isDecisionRecordedToday({ lastSpentAt: now + 1000 }, now), false);
});
test('detail date and queue use the same authoritative scheduled check', () => {
  const { resolveScheduledDecisionAt } = require('../../src/engagement/todayOverview');
  assert.equal(resolveScheduledDecisionAt({ frequencyReminderManualConfigured: true, nextCheckAt: 900, lastInteractionAt: 500, intervalMs: 1000 }), 900);
  assert.equal(resolveScheduledDecisionAt({ nextCheckAt: 900, lastInteractionAt: 500, intervalMs: 1000 }), 1500);
  assert.equal(resolveScheduledDecisionAt({ lastTimerResetAt: 1000 }, 500), 1500);
});

test('cadence advancement preserves an unanswered elapsed check without reviving stale misses', () => {
  const { resolveScheduledDecisionAt } = require('../../src/engagement/todayOverview');
  const schedule = { frequencyReminderManualConfigured: true, nextCheckAt: 3000,
    lastInteractionAt: 1000, lastTimerResetAt: 2100, intervalMs: 1000,
    missedCycles: 1, lastMissedCheckAt: 2000 };
  assert.equal(resolveScheduledDecisionAt(schedule), 2000);
  assert.equal(resolveScheduledDecisionAt({ ...schedule, lastSavedAt: 2200 }), 3000);
  assert.equal(resolveScheduledDecisionAt({ ...schedule, lastInteractionAt: 2200 }), 3000);
  assert.equal(resolveScheduledDecisionAt({ ...schedule, missedCycles: 0 }), 3000);
  assert.equal(resolveScheduledDecisionAt({ ...schedule, lastMissedCheckAt: null }), 3000);
});


test("untouched catalog cards accept a null interaction without inventing a schedule", () => {
  const { resolveScheduledDecisionAt, isDecisionRecordedToday } = require("../../src/engagement/todayOverview");
  assert.equal(resolveScheduledDecisionAt(null, 86400000), 0);
  assert.equal(resolveScheduledDecisionAt(undefined), 0);
  assert.equal(isDecisionRecordedToday(null), false);
  assert.equal(shouldIncludeUnscheduledInToday({ isCustom: false, interaction: null }), false);
});

test('a just-committed decision leaves Today immediately, before the minute ticker advances', () => {
  const { resolveTodayQueueNow, isDecisionRecordedToday } = require('../../src/engagement/todayOverview');
  const ticker = new Date(2026, 9, 1, 14, 45, 0).getTime();
  const savedAt = ticker + 20000;
  const now = resolveTodayQueueNow(ticker, savedAt + 1);
  assert.equal(isDecisionRecordedToday({ lastSavedAt: savedAt }, now), true);
  assert.equal(isDecisionRecordedToday({ lastSpentAt: savedAt }, now), true);
  assert.equal(isDecisionRecordedToday({ lastTimerResetAt: savedAt }, now), false);
});

test('a future schedule alias preserves the newest completion without changing its schedule', () => {
  const { mergeDecisionTimestamps, isDecisionRecordedToday } = require('../../src/engagement/todayOverview');
  const now = new Date(2026, 9, 1, 14, 45).getTime();
  const schedule = { nextCheckAt: now + 3600000, frequencyReminderManualConfigured: true };
  const merged = mergeDecisionTimestamps(schedule, [schedule, { lastSavedAt: now - 1000 }, { lastSavedAt: now - 2000, lastSpentAt: now - 3000 }]);
  assert.equal(merged.nextCheckAt, schedule.nextCheckAt);
  assert.equal(merged.lastSavedAt, now - 1000);
  assert.equal(merged.lastSpentAt, now - 3000);
  assert.equal(isDecisionRecordedToday(merged, now), true);
  assert.equal(isDecisionRecordedToday(merged, new Date(2026, 9, 2, 0, 1).getTime()), false);
});

test('starting the first timer preserves unchecked targets in the active starter series', () => {
  assert.equal(shouldIncludeUnscheduledInToday({ scheduledCount: 1, isStarter: true, isActiveSeries: true }), true);
  assert.equal(shouldIncludeUnscheduledInToday({ scheduledCount: 1, isStarter: false, isActiveSeries: true }), false);
  assert.equal(shouldIncludeUnscheduledInToday({ scheduledCount: 1, isStarter: true, isActiveSeries: false }), false);
});

test('decision picker leads with due scheduled checks and keeps every remaining card', () => {
  const { buildDecisionQueue } = require('../../src/engagement/todayOverview');
  const card = (id, scheduled = false) => ({ id, interaction: { frequencyReminderManualConfigured: scheduled } });
  const daily = card('daily', true), weekly = card('weekly', true), starter = card('starter'), later = card('later', true), future = card('future', true), checked = card('checked');
  const entries = [starter, checked, future, weekly, later, daily];
  assert.deepEqual(buildDecisionQueue({due:[starter, daily, weekly], later:[later], upcoming:[future]}, entries).map((e) => e.id), ['daily','weekly','later','starter','future','checked']);
  assert.deepEqual(buildDecisionQueue({}, []).map((e) => e.id), []);
  assert.deepEqual(buildDecisionQueue({}, entries).map((e) => e.id), entries.map((e) => e.id));
});

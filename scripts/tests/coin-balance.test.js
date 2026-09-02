const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  DEFERRED_COIN_REWARD_INCIDENT_STARTED_AT,
  buildCoinDenominationEntries,
  getCoinBreakdown,
  getIncidentHistoryRewardFloor,
  getVisibleCoinDenominationEntries,
  isCoinBalanceIncidentRepairApplied,
  parseCoinBalanceBackup,
  parseLegacyTamagotchiCoinBalance,
  parseStoredCoinBalance,
  resolveCoinBalance,
  resolveCoinBalanceIncidentRepair,
  serializeCoinBalanceBackup,
  serializeCoinBalanceIncidentRepair,
} = require("../../src/engagement/coinBalance");

const HEALTH_COIN_TIERS = [
  { id: "green", value: 1 },
  { id: "blue", value: 10 },
  { id: "orange", value: 100 },
  { id: "red", value: 1000 },
  { id: "pink", value: 10000 },
];

const appSource = fs.readFileSync(path.resolve(__dirname, "../../App.js"), "utf8");

const getSourceSection = (start, end) => {
  const startIndex = appSource.indexOf(start);
  const endIndex = appSource.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `missing source section start: ${start}`);
  assert.notEqual(endIndex, -1, `missing source section end: ${end}`);
  return appSource.slice(startIndex, endIndex);
};

test("coin denominations roll over at every hierarchy boundary", () => {
  const cases = [
    [0, { pink: 0, red: 0, orange: 0, blue: 0, green: 0 }],
    [9, { pink: 0, red: 0, orange: 0, blue: 0, green: 9 }],
    [10, { pink: 0, red: 0, orange: 0, blue: 1, green: 0 }],
    [99, { pink: 0, red: 0, orange: 0, blue: 9, green: 9 }],
    [100, { pink: 0, red: 0, orange: 1, blue: 0, green: 0 }],
    [999, { pink: 0, red: 0, orange: 9, blue: 9, green: 9 }],
    [1000, { pink: 0, red: 1, orange: 0, blue: 0, green: 0 }],
    [9999, { pink: 0, red: 9, orange: 9, blue: 9, green: 9 }],
    [10000, { pink: 1, red: 0, orange: 0, blue: 0, green: 0 }],
  ];

  cases.forEach(([amount, expected]) => {
    assert.deepEqual(getCoinBreakdown(amount, HEALTH_COIN_TIERS), expected);
    const entries = buildCoinDenominationEntries(amount, HEALTH_COIN_TIERS);
    const reconstructedAmount = entries.reduce(
      (total, entry) => total + entry.value * entry.count,
      0
    );
    assert.equal(reconstructedAmount, amount);
  });
});

test("visible balance tokens replace lower denominations and never collapse to an empty zero", () => {
  assert.deepEqual(
    getVisibleCoinDenominationEntries(100, HEALTH_COIN_TIERS).map(({ id, count }) => ({
      id,
      count,
    })),
    [{ id: "orange", count: 1 }]
  );
  assert.deepEqual(
    getVisibleCoinDenominationEntries(99, HEALTH_COIN_TIERS).map(({ id, count }) => ({
      id,
      count,
    })),
    [
      { id: "blue", count: 9 },
      { id: "green", count: 9 },
    ]
  );
  assert.deepEqual(
    getVisibleCoinDenominationEntries(0, HEALTH_COIN_TIERS).map(({ id, count }) => ({
      id,
      count,
    })),
    [{ id: "green", count: 0 }]
  );
  assert.deepEqual(getCoinBreakdown(Number.POSITIVE_INFINITY, HEALTH_COIN_TIERS), {
    pink: 0,
    red: 0,
    orange: 0,
    blue: 0,
    green: 0,
  });
});

test("the Almi balance uses the same complete denomination resolver as other balance surfaces", () => {
  const balanceSection = getSourceSection(
    "const tamagotchiCoins = healthPoints;",
    "const tamagotchiDesiredFood ="
  );

  assert.match(balanceSection, /getVisibleCoinDenominationEntries\(tamagotchiCoins, HEALTH_COIN_TIERS\)/);
  assert.doesNotMatch(balanceSection, /id: "blue"|id: "green"/);
});

test("a valid zero balance wins over an older non-zero backup", () => {
  const backupRaw = serializeCoinBalanceBackup(18, 100);
  const result = resolveCoinBalance({ primaryRaw: "0", backupRaw });

  assert.equal(result.balance, 0);
  assert.equal(result.source, "primary");
  assert.equal(result.needsPrimaryRepair, false);
});

test("a missing primary balance is recovered from the versioned backup", () => {
  const backupRaw = serializeCoinBalanceBackup(18, 100);
  const result = resolveCoinBalance({ primaryRaw: null, backupRaw });

  assert.equal(result.balance, 18);
  assert.equal(result.source, "backup");
  assert.equal(result.needsPrimaryRepair, true);
});

test("a corrupt primary balance is recovered from the backup instead of becoming zero", () => {
  const backupRaw = serializeCoinBalanceBackup(23, 100);
  const result = resolveCoinBalance({ primaryRaw: "not-a-number", backupRaw });

  assert.equal(result.balance, 23);
  assert.equal(result.source, "backup");
  assert.equal(parseStoredCoinBalance("not-a-number"), null);
});

test("legacy pet coins remain a fallback when no backup exists", () => {
  const legacyCoins = parseLegacyTamagotchiCoinBalance('{"coins":11,"hunger":72}');
  const result = resolveCoinBalance({
    primaryRaw: "broken",
    backupRaw: null,
    fallbackBalance: legacyCoins,
  });

  assert.equal(result.balance, 11);
  assert.equal(result.source, "fallback");
  assert.equal(result.needsPrimaryRepair, true);
});

test("legacy pending series coins are added once to the recovered balance", () => {
  const result = resolveCoinBalance({
    primaryRaw: "7",
    backupRaw: serializeCoinBalanceBackup(7, 100),
    recoveredCoins: 9,
  });

  assert.equal(result.balance, 16);
  assert.equal(result.recoveredCoins, 9);
});

test("invalid backups are rejected", () => {
  assert.equal(parseCoinBalanceBackup("{}"), null);
  assert.equal(parseCoinBalanceBackup("not-json"), null);
  assert.equal(parseCoinBalanceBackup('{"version":1,"balance":-3}'), null);
  assert.equal(parseLegacyTamagotchiCoinBalance("not-json"), null);
});

test("the incident repair restores the shortfall from vulnerable save history once", () => {
  const vulnerableHistory = [
    {
      id: "lost-save",
      kind: "refuse_spend",
      timestamp: DEFERRED_COIN_REWARD_INCIDENT_STARTED_AT + 1_000,
      meta: { coinReward: 7 },
    },
    {
      id: "already-fixed-save",
      kind: "refuse_spend",
      timestamp: DEFERRED_COIN_REWARD_INCIDENT_STARTED_AT + 2_000,
      meta: { coinReward: 4, coinCredited: true },
    },
    {
      id: "old-save",
      kind: "refuse_spend",
      timestamp: DEFERRED_COIN_REWARD_INCIDENT_STARTED_AT - 1_000,
      meta: { coinReward: 20 },
    },
  ];
  const historyRewardFloor = getIncidentHistoryRewardFloor(vulnerableHistory);
  const repair = resolveCoinBalanceIncidentRepair({
    balance: 2,
    historyRewardFloor,
  });

  assert.equal(historyRewardFloor, 7);
  assert.equal(repair.restoredCoins, 5);
  assert.equal(repair.balance, 7);
  const marker = serializeCoinBalanceIncidentRepair(repair, 100);
  assert.equal(isCoinBalanceIncidentRepairApplied(marker), true);
  assert.equal(
    resolveCoinBalanceIncidentRepair({
      balance: repair.balance,
      historyRewardFloor,
      alreadyApplied: true,
    }).restoredCoins,
    0
  );
});

test("the incident repair deduplicates repeated history records", () => {
  const entry = {
    id: "same-save",
    kind: "refuse_spend",
    timestamp: DEFERRED_COIN_REWARD_INCIDENT_STARTED_AT + 1_000,
    meta: { coinReward: 3 },
  };
  assert.equal(getIncidentHistoryRewardFloor([entry, { ...entry }]), 3);
});

test("history deletion and same-day spend cleanup never claw back earned coins", () => {
  const historyDelete = getSourceSection(
    "const handleHistoryDelete = useCallback(",
    "useEffect(() => {\n    recomputeHistoryAggregates"
  );
  const sameDayCleanup = getSourceSection(
    "const revokeSameDaySavingsForSpend = useCallback(",
    "const priceEditorTemplateId ="
  );

  assert.doesNotMatch(historyDelete, /setHealthPoints|coinRefund/);
  assert.doesNotMatch(sameDayCleanup, /setHealthPoints|coinRefund/);
});

test("same-day spend cleanup is bounded by the local calendar day", () => {
  const sameDayCleanup = getSourceSection(
    "const revokeSameDaySavingsForSpend = useCallback(",
    "const priceEditorTemplateId ="
  );

  assert.match(sameDayCleanup, /isTimestampInLocalCalendarDay/);
  assert.doesNotMatch(sameDayCleanup, /resolveCycleWindow|nextCheckAt|intervalMs/);
});

test("save rewards are credited before the cosmetic reward overlay", () => {
  const saveAction = getSourceSection(
    'if (type === "save") {',
    'if (type === "maybe" || type === "pause") {'
  );
  const rewardIndex = saveAction.indexOf("const creditedCoinReward");
  const creditIndex = saveAction.indexOf("setHealthPoints((prev) => prev + creditedCoinReward);");
  const overlayIndex = saveAction.indexOf("onRevealReward: null");

  assert.ok(rewardIndex >= 0);
  assert.ok(creditIndex > rewardIndex);
  assert.ok(overlayIndex > creditIndex);
});

test("closing a cosmetic reward overlay cannot be the step that changes the balance", () => {
  assert.doesNotMatch(
    appSource,
    /onRevealReward:\s*\(\)\s*=>\s*\{[\s\S]{0,320}?setHealthPoints/
  );
});

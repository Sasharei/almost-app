const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildTemptationPressureMap,
  resolveDailyChallengeDrawTemplateIds,
} = require("../../src/engagement/dailyChallenge");

const keepOrder = () => 0.999999;

test("one previous-day spend is enough to build a full daily challenge draw", () => {
  const pressure = buildTemptationPressureMap([
    { templateId: "coffee", action: "spend", timestamp: 100 },
  ]);

  const result = resolveDailyChallengeDrawTemplateIds(
    pressure,
    1,
    () => true,
    {
      minUniqueTemplates: 1,
      drawCount: 3,
      fallbackTemplateIds: ["coffee", "delivery", "games"],
      random: keepOrder,
    }
  );

  assert.deepEqual(result, ["coffee", "delivery", "games"]);
});

test("a daily challenge is not created without a previous-day spend", () => {
  const result = resolveDailyChallengeDrawTemplateIds(
    {},
    1,
    () => true,
    {
      minUniqueTemplates: 1,
      drawCount: 3,
      fallbackTemplateIds: ["coffee", "delivery", "games"],
      random: keepOrder,
    }
  );

  assert.deepEqual(result, []);
});

test("the draw prioritizes repeated spends and filters invalid templates", () => {
  const pressure = buildTemptationPressureMap([
    { templateId: "coffee", action: "spend", timestamp: 100 },
    { templateId: "delivery", action: "spend", timestamp: 200 },
    { templateId: "delivery", action: "spend", timestamp: 300 },
    { templateId: "excluded", action: "spend", timestamp: 400 },
  ]);

  const result = resolveDailyChallengeDrawTemplateIds(
    pressure,
    1,
    (templateId) => templateId !== "excluded",
    {
      minUniqueTemplates: 1,
      drawCount: 3,
      fallbackTemplateIds: ["games"],
      random: keepOrder,
    }
  );

  assert.deepEqual(result, ["delivery", "coffee", "games"]);
});

test("previous-day saves never become daily challenge candidates", () => {
  const pressure = buildTemptationPressureMap([
    { templateId: "coffee", action: "save", timestamp: 100 },
  ]);

  const result = resolveDailyChallengeDrawTemplateIds(
    pressure,
    1,
    () => true,
    {
      minUniqueTemplates: 1,
      drawCount: 3,
      fallbackTemplateIds: ["coffee", "delivery", "games"],
      random: keepOrder,
    }
  );

  assert.deepEqual(result, []);
});

test("the previous challenge target is avoided when another pressure candidate exists", () => {
  const pressure = buildTemptationPressureMap([
    { templateId: "coffee", action: "spend", timestamp: 100 },
    { templateId: "delivery", action: "spend", timestamp: 200 },
  ]);

  const result = resolveDailyChallengeDrawTemplateIds(
    pressure,
    1,
    () => true,
    {
      minUniqueTemplates: 1,
      previousTemplateId: "delivery",
      drawCount: 3,
      fallbackTemplateIds: ["delivery", "games", "music"],
      random: keepOrder,
    }
  );

  assert.deepEqual(result, ["coffee", "games", "music"]);
});

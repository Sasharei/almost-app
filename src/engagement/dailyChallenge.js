const DEFAULT_DRAW_COUNT = 3;

const buildTemptationPressureMap = (events = []) => {
  const map = {};
  (Array.isArray(events) ? events : []).forEach((event) => {
    if (!event?.templateId) return;
    if (event.action !== "spend") return;
    const entry = map[event.templateId] || {
      spend: 0,
      lastTimestamp: 0,
    };
    entry.spend += 1;
    if (event.timestamp && event.timestamp > entry.lastTimestamp) {
      entry.lastTimestamp = event.timestamp;
    }
    map[event.templateId] = entry;
  });
  return map;
};

const resolveDailyChallengeDrawTemplateIds = (
  pressureMap = {},
  minSpendEvents = 1,
  isValidTemplate = null,
  options = {}
) => {
  const normalizedMinSpends = Math.max(1, Math.floor(Number(minSpendEvents) || 0));
  const normalizedMinUniqueTemplates = Math.max(
    1,
    Math.floor(Number(options?.minUniqueTemplates) || 0)
  );
  const normalizedPreviousTemplateId =
    typeof options?.previousTemplateId === "string"
      ? options.previousTemplateId.trim()
      : "";
  const normalizedDrawCount = Math.max(
    1,
    Math.floor(Number(options?.drawCount) || DEFAULT_DRAW_COUNT)
  );
  const fallbackTemplateIds = Array.isArray(options?.fallbackTemplateIds)
    ? options.fallbackTemplateIds
    : [];
  const random = typeof options?.random === "function" ? options.random : Math.random;
  const ranked = Object.entries(pressureMap || {})
    .map(([templateId, stats]) => ({
      templateId,
      spend: stats?.spend || 0,
      lastTimestamp: stats?.lastTimestamp || 0,
      score: stats?.spend || 0,
    }))
    .filter((entry) => entry.spend >= normalizedMinSpends)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.spend !== a.spend) return b.spend - a.spend;
      return b.lastTimestamp - a.lastTimestamp;
    });
  const eligible = ranked.filter(
    (entry) => typeof isValidTemplate !== "function" || isValidTemplate(entry.templateId)
  );
  if (eligible.length < normalizedMinUniqueTemplates) return [];
  let drawPool = eligible;
  let avoidsPreviousTemplate = false;
  if (normalizedPreviousTemplateId) {
    const withoutPrevious = eligible.filter(
      (entry) => entry.templateId !== normalizedPreviousTemplateId
    );
    if (withoutPrevious.length >= normalizedMinUniqueTemplates) {
      drawPool = withoutPrevious;
      avoidsPreviousTemplate = true;
    }
  }
  const drawIds = [];
  const seen = new Set();
  const isValid = (templateId) =>
    typeof isValidTemplate !== "function" || isValidTemplate(templateId);
  const appendTemplateId = (templateId, allowPrevious = false) => {
    const normalizedId = typeof templateId === "string" ? templateId.trim() : "";
    if (!normalizedId || seen.has(normalizedId)) return false;
    if (
      avoidsPreviousTemplate &&
      !allowPrevious &&
      normalizedId === normalizedPreviousTemplateId
    ) {
      return false;
    }
    if (!isValid(normalizedId)) return false;
    seen.add(normalizedId);
    drawIds.push(normalizedId);
    return true;
  };
  drawPool.forEach((entry) => {
    if (drawIds.length >= normalizedDrawCount) return;
    appendTemplateId(entry.templateId, true);
  });
  fallbackTemplateIds.forEach((templateId) => {
    if (drawIds.length >= normalizedDrawCount) return;
    appendTemplateId(templateId);
  });
  if (drawIds.length < normalizedDrawCount && avoidsPreviousTemplate) {
    fallbackTemplateIds.forEach((templateId) => {
      if (drawIds.length >= normalizedDrawCount) return;
      appendTemplateId(templateId, true);
    });
  }
  for (let index = drawIds.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [drawIds[index], drawIds[swapIndex]] = [drawIds[swapIndex], drawIds[index]];
  }
  return drawIds;
};

module.exports = {
  buildTemptationPressureMap,
  resolveDailyChallengeDrawTemplateIds,
};

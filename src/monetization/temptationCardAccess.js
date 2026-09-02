const normalizeCardLimit = (value) =>
  Math.max(0, Math.floor(Number(value) || 0));

const selectPlanVisibleTemptations = ({
  temptations = [],
  isPremium = false,
  freeFeedLimit = 0,
  defaultFeedLimit = freeFeedLimit,
  freeDefaultLimit = freeFeedLimit,
  isCustomCard = () => false,
  isArchivedCard = () => false,
} = {}) => {
  const source = (Array.isArray(temptations) ? temptations : []).filter(Boolean);
  if (isPremium) {
    let defaultSlotsRemaining = normalizeCardLimit(defaultFeedLimit);
    return source.filter((item) => {
      if (isArchivedCard(item) || isCustomCard(item)) return true;
      if (defaultSlotsRemaining <= 0) return false;
      defaultSlotsRemaining -= 1;
      return true;
    });
  }

  const feedLimit = normalizeCardLimit(freeFeedLimit);
  const defaultLimit = normalizeCardLimit(freeDefaultLimit);
  const visibleCustomCards = new Set(
    source
      .filter((item) => !isArchivedCard(item) && isCustomCard(item))
      .slice(0, feedLimit)
  );
  let defaultSlotsRemaining = Math.min(
    defaultLimit,
    Math.max(0, feedLimit - visibleCustomCards.size)
  );

  return source.filter((item) => {
    // Archived cards stay resolvable by the archive screen but do not consume
    // active free-feed slots.
    if (isArchivedCard(item)) return true;
    if (isCustomCard(item)) return visibleCustomCards.has(item);
    if (defaultSlotsRemaining <= 0) return false;
    defaultSlotsRemaining -= 1;
    return true;
  });
};

const getFreeCustomCardSlotsRemaining = ({
  cards = [],
  freeFeedLimit = 0,
  isCustomCard = () => false,
} = {}) => {
  const activeCustomCount = (Array.isArray(cards) ? cards : []).reduce(
    (count, item) => count + (item && isCustomCard(item) ? 1 : 0),
    0
  );
  return Math.max(0, normalizeCardLimit(freeFeedLimit) - activeCustomCount);
};

module.exports = {
  getFreeCustomCardSlotsRemaining,
  selectPlanVisibleTemptations,
};

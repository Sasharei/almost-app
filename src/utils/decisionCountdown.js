// Count down without rounding to zero before the actual deadline. Native labels
// describe the ready/expired state; this helper formats only the remaining time.
const formatDecisionCountdown = (remainingMs, language = 'en') => {
  const seconds = Math.max(0, Math.ceil((Number(remainingMs) || 0) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  const digits = new Intl.NumberFormat(language, { minimumIntegerDigits: 2, useGrouping: false });
  return [hours, minutes, remainder].map((value) => digits.format(value)).join(':');
};
module.exports = { formatDecisionCountdown };

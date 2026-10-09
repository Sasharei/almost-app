export const pauseCountForm = (language, count) => {
  const n = Math.max(0, Math.trunc(Number(count) || 0));
  const locale = String(language || "en").split("-")[0];
  if (locale === "ru") {
    if (n % 10 === 1 && n % 100 !== 11) return "one";
    if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) return "few";
    return "other";
  }
  if (locale === "ar") {
    if (n === 1) return "one";
    if (n === 2) return "two";
    if (n % 100 >= 3 && n % 100 <= 10) return "few";
    return "other";
  }
  if (["zh", "ko", "ja"].includes(locale)) return "other";
  if (["fr", "pt"].includes(locale)) return n <= 1 ? "one" : "other";
  return n === 1 ? "one" : "other";
};

export const pauseCountTranslationKey = (language, count) =>
  `redesignPauseCount_${pauseCountForm(language, count)}`;

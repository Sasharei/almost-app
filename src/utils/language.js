import React from "react";
import { NativeModules } from "react-native";
import { LANGUAGE_MAP_FALLBACK_TRANSLATIONS } from "../constants/languageMapFallback.generated.js";

export const DEFAULT_LANGUAGE = "en";
export const FALLBACK_LANGUAGE = "en";
const DEFAULT_ARABIC_LANGUAGE = "ar-sa";
export const SUPPORTED_LANGUAGES = ["en", "es", "fr", "ru", "de", "ar-sa", "ar-ae", "zh"];
const RTL_LANGUAGES = new Set(["ar-sa", "ar-ae"]);
const LANGUAGE_ALIASES = {
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  "en-au": "en",
  "en-ca": "en",
  es: "es",
  "es-es": "es",
  "es-mx": "es",
  fr: "fr",
  "fr-fr": "fr",
  "fr-ca": "fr",
  ru: "ru",
  "ru-ru": "ru",
  de: "de",
  "de-de": "de",
  "de-at": "de",
  "de-ch": "de",
  deu: "de",
  ger: "de",
  german: "de",
  ar: DEFAULT_ARABIC_LANGUAGE,
  "ar-sa": "ar-sa",
  "ar-ae": "ar-ae",
  ara: DEFAULT_ARABIC_LANGUAGE,
  arabic: DEFAULT_ARABIC_LANGUAGE,
  "arabic-saudi": "ar-sa",
  "arabic-uae": "ar-ae",
  zh: "zh",
  "zh-cn": "zh",
  "zh-hans": "zh",
  "zh-sg": "zh",
  "zh-hk": "zh",
  "zh-tw": "zh",
  "zh-hant": "zh",
  "zh-hant-hk": "zh",
  "zh-hant-tw": "zh",
  zho: "zh",
  chi: "zh",
  chinese: "zh",
};
const LANGUAGE_LABEL_KEYS = {
  ru: "languageRussian",
  en: "languageEnglish",
  es: "languageSpanish",
  fr: "languageFrench",
  de: "languageGerman",
  "ar-sa": "languageArabicSaudi",
  "ar-ae": "languageArabicUAE",
  zh: "languageChinese",
};
export const LANGUAGE_NATIVE_LABELS = {
  ru: "Русский",
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  "ar-sa": "العربية (السعودية)",
  "ar-ae": "العربية (الإمارات)",
  zh: "中文",
};
const FORMAT_LOCALES = {
  ru: "ru-RU",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  "ar-sa": "ar-SA",
  "ar-ae": "ar-AE",
  zh: "zh-CN",
};
const SHORT_LANGUAGE_MAP = {
  ru: "ru",
  en: "en",
  es: "es",
  fr: "fr",
  de: "de",
  "ar-sa": "ar",
  "ar-ae": "ar",
  zh: "zh",
};
const ARABIC_INDIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const EASTERN_ARABIC_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const ARABIC_DIGIT_TO_WESTERN = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};
const LANGUAGE_DEFAULT_CURRENCY_BY_CODE = {
  de: "EUR",
  "ar-sa": "SAR",
  "ar-ae": "AED",
};

const canonicalizeLanguageCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

export const normalizeLanguage = (value) => {
  const normalized = canonicalizeLanguageCode(value);
  if (!normalized) return DEFAULT_LANGUAGE;
  const aliased = LANGUAGE_ALIASES[normalized] || normalized;
  if (SUPPORTED_LANGUAGES.includes(aliased)) return aliased;
  const base = aliased.split("-")[0];
  if (base === "ar") return DEFAULT_ARABIC_LANGUAGE;
  return SUPPORTED_LANGUAGES.includes(base) ? base : DEFAULT_LANGUAGE;
};

export const resolveTranslationLanguage = (language) => {
  const normalized = normalizeLanguage(language);
  if (normalized === "ar-sa" || normalized === "ar-ae") return "ar";
  return normalized;
};

export const isRtlLanguage = (language) => RTL_LANGUAGES.has(normalizeLanguage(language));

export const getLanguageDirection = (language) => (isRtlLanguage(language) ? "rtl" : "ltr");

export const getLanguageLabelKey = (language) =>
  LANGUAGE_LABEL_KEYS[normalizeLanguage(language)] || LANGUAGE_LABEL_KEYS[FALLBACK_LANGUAGE];

export const getFormatLocale = (language) =>
  FORMAT_LOCALES[normalizeLanguage(language)] || FORMAT_LOCALES[FALLBACK_LANGUAGE];

export const getShortLanguageKey = (language) =>
  SHORT_LANGUAGE_MAP[normalizeLanguage(language)] || SHORT_LANGUAGE_MAP[FALLBACK_LANGUAGE];

export const localizeFallbackTextByLanguage = (text, language = DEFAULT_LANGUAGE) => {
  if (typeof text !== "string" || !text.length) return text;
  const normalizedLanguage = normalizeLanguage(language);
  const translationLanguage = resolveTranslationLanguage(normalizedLanguage);
  const fallbackDictionary =
    LANGUAGE_MAP_FALLBACK_TRANSLATIONS?.[translationLanguage] ||
    LANGUAGE_MAP_FALLBACK_TRANSLATIONS?.[normalizedLanguage] ||
    null;
  if (!fallbackDictionary || typeof fallbackDictionary !== "object") {
    return text;
  }
  return fallbackDictionary[text] || text;
};

const normalizeArabicDigitsToWestern = (value = "") =>
  String(value || "")
    .replace(/[٠-٩۰-۹]/g, (digit) => ARABIC_DIGIT_TO_WESTERN[digit] || digit)
    .replace(/٪/g, "%");

export const localizeDigitsForLanguage = (value, language = DEFAULT_LANGUAGE) => {
  if (typeof value !== "string" || !value.length) return value;
  const normalizedLanguage = normalizeLanguage(language);
  const westernDigits = normalizeArabicDigitsToWestern(value);
  if (normalizedLanguage !== "ar-sa" && normalizedLanguage !== "ar-ae") {
    return westernDigits;
  }
  return westernDigits
    .replace(/\d/g, (digit) => ARABIC_INDIC_DIGITS[Number(digit)] || EASTERN_ARABIC_DIGITS[Number(digit)] || digit)
    .replace(/%/g, "٪");
};

const LOCALIZE_TEXT_TREE_MAX_DEPTH = 80;

const localizeTextTreeDigitsInternal = (
  value,
  language = DEFAULT_LANGUAGE,
  visited = null,
  depth = 0
) => {
  if (typeof value === "string") {
    return localizeDigitsForLanguage(value, language);
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return localizeDigitsForLanguage(String(value), language);
  }
  if (depth >= LOCALIZE_TEXT_TREE_MAX_DEPTH) {
    return value;
  }
  if (Array.isArray(value)) {
    const seen = visited || new WeakSet();
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
    let changed = false;
    const localized = value.map((entry) => {
      const next = localizeTextTreeDigitsInternal(entry, language, seen, depth + 1);
      if (next !== entry) {
        changed = true;
      }
      return next;
    });
    seen.delete(value);
    return changed ? localized : value;
  }
  if (React.isValidElement(value) && value.props && "children" in value.props) {
    const seen = visited || new WeakSet();
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
    const localizedChildren = localizeTextTreeDigitsInternal(
      value.props.children,
      language,
      seen,
      depth + 1
    );
    seen.delete(value);
    if (localizedChildren === value.props.children) return value;
    return React.cloneElement(value, { ...value.props, children: localizedChildren });
  }
  return value;
};

export const localizeTextTreeDigits = (value, language = DEFAULT_LANGUAGE) =>
  localizeTextTreeDigitsInternal(value, language, new WeakSet(), 0);

export const getDefaultCurrencyForLanguage = (language, fallbackCurrency = "USD") => {
  const normalizedLanguage = normalizeLanguage(language);
  return LANGUAGE_DEFAULT_CURRENCY_BY_CODE[normalizedLanguage] || fallbackCurrency;
};

export const getPreferredDeviceLanguage = () => {
  let intlLocale = "";
  try {
    intlLocale = Intl?.DateTimeFormat?.().resolvedOptions?.().locale || "";
  } catch {
    intlLocale = "";
  }
  const settings = NativeModules?.SettingsManager?.settings || {};
  const appleLanguages = Array.isArray(settings?.AppleLanguages) ? settings.AppleLanguages : [];
  const rawCandidates = [
    intlLocale,
    appleLanguages[0],
    settings?.AppleLocale,
    NativeModules?.I18nManager?.localeIdentifier,
  ];
  const candidate = rawCandidates.find((entry) => typeof entry === "string" && entry.trim().length > 0);
  return normalizeLanguage(candidate || DEFAULT_LANGUAGE);
};

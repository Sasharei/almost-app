import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Text as RNText,
  TouchableOpacity,
  View,
} from "react-native";

const pickDefaultPlanId = (planCards = []) => {
  const availableCards = planCards.filter((card) => card?.available !== false);
  const yearly = availableCards.find((card) => card?.id === "yearly");
  if (yearly?.id) return yearly.id;
  const preferred = availableCards.find((card) => card?.recommended);
  if (preferred?.id) return preferred.id;
  const monthly = availableCards.find((card) => card?.id === "monthly");
  if (monthly?.id) return monthly.id;
  if (availableCards[0]?.id) return availableCards[0].id;
  return planCards[0]?.id || "yearly";
};

const ARABIC_INDIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const EASTERN_ARABIC_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const ARABIC_INDIC_TO_WESTERN_DIGIT = {
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
const normalizePaywallLanguage = (value = "en") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
const isArabicLanguage = (language = "en") => normalizePaywallLanguage(language).startsWith("ar");
const PAYWALL_SCROLL_TRACK_THRESHOLD = 48;
const PAYWALL_CLOSE_COOLDOWN_MS = 5000;
const normalizeWesternDigits = (value) => {
  if (typeof value !== "string" || !value.length) return value;
  return value
    .replace(/[٠-٩۰-۹]/g, (digit) => ARABIC_INDIC_TO_WESTERN_DIGIT[digit] || digit)
    .replace(/٪/g, "%");
};
const localizePaywallDigits = (value, language = "en") => {
  if (typeof value !== "string" || !value.length) return value;
  if (!isArabicLanguage(language)) return normalizeWesternDigits(value);
  const normalizedValue = normalizeWesternDigits(value);
  return normalizedValue
    .replace(/\d/g, (digit) => ARABIC_INDIC_DIGITS[Number(digit)] || EASTERN_ARABIC_DIGITS[Number(digit)] || digit)
    .replace(/%/g, "٪");
};
const LOCALIZE_PAYWALL_TREE_MAX_DEPTH = 80;

const localizePaywallTextTree = (value, language = "en", visited = null, depth = 0) => {
  if (typeof value === "string") {
    return localizePaywallDigits(value, language);
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return localizePaywallDigits(String(value), language);
  }
  if (depth >= LOCALIZE_PAYWALL_TREE_MAX_DEPTH) {
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
      const next = localizePaywallTextTree(entry, language, seen, depth + 1);
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
    const localizedChildren = localizePaywallTextTree(
      value.props.children,
      language,
      seen,
      depth + 1
    );
    seen.delete(value);
    if (localizedChildren === value.props.children) return value;
    return React.cloneElement(value, { ...value.props, children: localizedChildren });
  }
  if (value && Object.prototype.toString.call(value) === "[object Object]") {
    const seen = visited || new WeakSet();
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
    let changed = false;
    const localized = {};
    Object.keys(value).forEach((key) => {
      const next = localizePaywallTextTree(value[key], language, seen, depth + 1);
      if (next !== value[key]) {
        changed = true;
      }
      localized[key] = next;
    });
    seen.delete(value);
    return changed ? localized : value;
  }
  return value;
};
const localizePaywallStringTree = (value, language = "en", visited = null, depth = 0) => {
  if (typeof value === "string") {
    return localizePaywallDigits(value, language);
  }
  if (depth >= LOCALIZE_PAYWALL_TREE_MAX_DEPTH) {
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
      const next = localizePaywallStringTree(entry, language, seen, depth + 1);
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
    const localizedChildren = localizePaywallStringTree(
      value.props.children,
      language,
      seen,
      depth + 1
    );
    seen.delete(value);
    if (localizedChildren === value.props.children) return value;
    return React.cloneElement(value, { ...value.props, children: localizedChildren });
  }
  if (value && Object.prototype.toString.call(value) === "[object Object]") {
    const seen = visited || new WeakSet();
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
    let changed = false;
    const localized = {};
    Object.keys(value).forEach((key) => {
      const next = localizePaywallStringTree(value[key], language, seen, depth + 1);
      if (next !== value[key]) {
        changed = true;
      }
      localized[key] = next;
    });
    seen.delete(value);
    return changed ? localized : value;
  }
  return value;
};
const resolvePaywallCopyLanguage = (language = "en") => {
  const normalized = normalizePaywallLanguage(language);
  if (normalized.startsWith("ru")) return "ru";
  if (normalized.startsWith("es")) return "es";
  if (normalized.startsWith("fr")) return "fr";
  if (normalized.startsWith("de")) return "de";
  if (normalized.startsWith("ar")) return "ar";
  if (normalized.startsWith("zh")) return "zh";
  if (normalized.startsWith("en")) return "en";
  return "en";
};
const SAVE_LIMIT_HEADER_COPY_BY_LANGUAGE = {
  ru: {
    title: "Лимит сохранений обновится через {{timeLeft}}.",
    subtitle: "На сегодня лимит действий сохранения исчерпан.",
  },
  en: {
    title: "Save-action limit resets in {{timeLeft}}.",
    subtitle: "Today's save-action limit is reached.",
  },
  es: {
    title: "El límite se restablece en {{timeLeft}}.",
    subtitle: "El límite de guardados de hoy ya se agotó.",
  },
  fr: {
    title: "La limite se réinitialise dans {{timeLeft}}.",
    subtitle: "La limite de sauvegardes d'aujourd'hui est atteinte.",
  },
  de: {
    title: "Limit wird in {{timeLeft}} zurückgesetzt.",
    subtitle: "Das heutige Speicherlimit ist erreicht.",
  },
  ar: {
    title: "سيُعاد ضبط حد الحفظ بعد {{timeLeft}}.",
    subtitle: "تم الوصول إلى حد الحفظ لليوم فقط.",
  },
  zh: {
    title: "保存额度将在 {{timeLeft}} 后重置。",
    subtitle: "今日保存操作额度已用完。",
  },
};
const SAVE_LIMIT_PRO_NOW_BY_LANGUAGE = {
  ru: { before: "С Premium можно разблокировать прямо ", accent: "СЕЙЧАС", after: "!" },
  en: { before: "With Premium, unlock right ", accent: "NOW", after: "!" },
  es: { before: "Con Premium, desbloquea ahora mismo ", accent: "AHORA", after: "!" },
  fr: { before: "Avec Premium, débloque tout de suite ", accent: "MAINTENANT", after: " !" },
  de: { before: "Mit Premium jetzt sofort entsperren: ", accent: "JETZT", after: "!" },
  ar: { before: "مع Premium يمكنك الفتح مباشرة ", accent: "الآن", after: "!" },
  zh: { before: "使用 Premium 可立即解锁 ", accent: "现在", after: "！" },
};
const formatCountdownToMidnight = (timestamp = Date.now()) => {
  const now = new Date(Number(timestamp) || Date.now());
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const diffMs = Math.max(0, midnight.getTime() - now.getTime());
  const totalMinutes = Math.max(0, Math.ceil(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h${String(minutes).padStart(2, "0")}m`;
};
const SOCIAL_PROOF_FALLBACK_BY_LANGUAGE = {
  ru: "Присоединяйся к 5K+ людей, которые уже экономят.",
  en: "Join 5K+ savers",
  es: "Únete a más de 5K ahorradores",
  fr: "Rejoins 5K+ personnes qui économisent",
  de: "Schließe dich 5K+ Sparern an",
  ar: "انضم إلى أكثر من 5 آلاف شخص يدّخرون",
  zh: "加入 5K+ 省钱用户",
};
const BENEFITS_TITLE_FALLBACK_BY_LANGUAGE = {
  ru: "Что входит в Premium",
  en: "What you unlock with Premium",
  es: "Lo que desbloqueas con Premium",
  fr: "Ce que Premium débloque",
  de: "Was Premium freischaltet",
  ar: "ما الذي يفتحه Premium",
  zh: "Premium 解锁内容",
};
const BENEFITS_FOOTNOTE_FALLBACK_BY_LANGUAGE = {
  ru: "и многое другое",
  en: "and much more",
  es: "y mucho más",
  fr: "et bien plus",
  de: "und vieles mehr",
  ar: "والمزيد",
  zh: "以及更多",
};
const SAVINGS_FORECAST_TITLE_BY_LANGUAGE = {
  ru: "Прогноз экономии",
  en: "Savings forecast",
  es: "Pronóstico de ahorro",
  fr: "Prévision d'économies",
  de: "Sparprognose",
  ar: "توقع التوفير",
  zh: "节省预测",
};
const SAVINGS_FORECAST_DAYS_TEMPLATE_BY_LANGUAGE = {
  ru: "{{days}} дн.",
  en: "{{days}}d",
  es: "{{days}} d",
  fr: "{{days}} j",
  de: "{{days}} T",
  ar: "{{days}} يوم",
  zh: "{{days}}天",
};
const AMOUNT_TOKEN_REGEX = /-?[0-9٠-٩۰-۹][0-9٠-٩۰-۹\s.,]*/;
const SAVINGS_FORECAST_MULTIPLIER = 0.85;
const fillPaywallTemplate = (value = "", replacements = {}) =>
  String(value || "").replace(/\{\{(\w+)\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(replacements, key) ? String(replacements[key]) : match
  );
const parseAmountTemplate = (amountLabel = "") => {
  const rawLabel = typeof amountLabel === "string" ? amountLabel : "";
  if (!rawLabel.trim().length) return null;
  const match = rawLabel.match(AMOUNT_TOKEN_REGEX);
  if (!match || typeof match.index !== "number") return null;
  const rawToken = normalizeWesternDigits(match[0]).replace(/\s/g, "");
  if (!rawToken.length) return null;
  const lastDotIndex = rawToken.lastIndexOf(".");
  const lastCommaIndex = rawToken.lastIndexOf(",");
  const decimalIndex = Math.max(lastDotIndex, lastCommaIndex);
  let normalizedNumberToken = rawToken.replace(/[.,]/g, "");
  let decimals = 0;
  if (decimalIndex >= 0) {
    const integerPart = rawToken.slice(0, decimalIndex).replace(/[.,]/g, "");
    const fractionalPart = rawToken.slice(decimalIndex + 1).replace(/[.,]/g, "");
    normalizedNumberToken = `${integerPart || "0"}${fractionalPart ? `.${fractionalPart}` : ""}`;
    decimals = Math.min(2, fractionalPart.length);
  }
  const parsedValue = Number(normalizedNumberToken);
  if (!Number.isFinite(parsedValue)) return null;
  const tokenStart = match.index;
  const tokenEnd = tokenStart + match[0].length;
  return {
    value: Math.max(0, parsedValue),
    decimals,
    prefix: rawLabel.slice(0, tokenStart),
    suffix: rawLabel.slice(tokenEnd),
  };
};
const formatAmountFromTemplate = (template, value = 0) => {
  if (!template || !Number.isFinite(value)) return "";
  const normalizedValue = Math.max(0, Number(value) || 0);
  const roundedValue = Math.max(0, Math.round(normalizedValue));
  const formattedNumber = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(roundedValue);
  return `${template.prefix}${formattedNumber}${template.suffix}`;
};
const buildSavingsForecastPoints = ({
  savedAmountLabel = "",
  amountLabel = "",
  lossWindowDays = 30,
  language = "en",
  copyLanguage = "en",
} = {}) => {
  const normalizedDays = Math.min(180, Math.max(7, Math.round(Number(lossWindowDays) || 30)));
  const savedTemplateCandidate = parseAmountTemplate(savedAmountLabel);
  const fallbackTemplate = parseAmountTemplate(amountLabel);
  const shouldUseSavedTemplate =
    !!savedTemplateCandidate && Number(savedTemplateCandidate.value) > 0;
  const amountTemplate = shouldUseSavedTemplate
    ? savedTemplateCandidate
    : fallbackTemplate || savedTemplateCandidate;
  if (!amountTemplate) return [];
  const dailyAmount = shouldUseSavedTemplate
    ? savedTemplateCandidate.value
    : amountTemplate.value / normalizedDays;
  const checkpoints = Array.from(new Set([7, normalizedDays, Math.min(180, normalizedDays * 3)]));
  const dayTemplate =
    SAVINGS_FORECAST_DAYS_TEMPLATE_BY_LANGUAGE[copyLanguage] ||
    SAVINGS_FORECAST_DAYS_TEMPLATE_BY_LANGUAGE.en;
  return checkpoints.map((days, index) => {
    const projectedAmount = dailyAmount * days * SAVINGS_FORECAST_MULTIPLIER;
    return {
      id: `forecast_${days}_${index}`,
      days,
      amountLabel: localizePaywallDigits(formatAmountFromTemplate(amountTemplate, projectedAmount), language),
      daysLabel: localizePaywallDigits(
        fillPaywallTemplate(dayTemplate, { days }),
        language
      ),
    };
  });
};
const DEVELOPER_AVATAR = require("../../assets/paywall/developer_alexandr.jpg");

const PremiumPaywallModal = ({
  visible = false,
  dismissible = true,
  copy: copyProp = null,
  planCards: planCardsProp = [],
  purchaseLoadingPlan = null,
  restoring = false,
  onPlanSelect = () => {},
  onPlanPress = () => {},
  onFeatureInsightPress = () => {},
  onRestorePress = () => {},
  onManagePress = () => {},
  onTermsPress = () => {},
  onPrivacyPress = () => {},
  onScrollPastThreshold = () => {},
  onClose = () => {},
  language = "en",
  safeAreaTopInset = 0,
  safeAreaBottomInset = 0,
  colors,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState(() => pickDefaultPlanId(planCardsProp));
  const [selectedComparisonRowId, setSelectedComparisonRowId] = useState(null);
  const [showTransactionAbandonedPopup, setShowTransactionAbandonedPopup] = useState(false);
  const [supportIntroStage, setSupportIntroStage] = useState("plans");
  const [isCloseCooldownComplete, setIsCloseCooldownComplete] = useState(false);
  const hasTrackedScrollRef = useRef(false);
  const closeCooldownTimerRef = useRef(null);
  const openProgress = useRef(new Animated.Value(0)).current;
  const ctaPulse = useRef(new Animated.Value(0)).current;
  const abandonedPopupProgress = useRef(new Animated.Value(0)).current;
  const supportMessageProgress = useRef(new Animated.Value(0)).current;

  const cardBg = colors?.card || "#FFFFFF";
  const textColor = colors?.text || "#0F1635";
  const mutedColor = colors?.muted || "#6C7289";
  const borderColor = colors?.border || "rgba(11,22,48,0.12)";
  const accent = "#4353FF";
  const isAndroid = Platform.OS === "android";
  const isNativeMobile = Platform.OS === "android" || Platform.OS === "ios";
  const { height: viewportHeight } = useWindowDimensions();
  const resolvedSafeTopInset = Math.max(0, Number(safeAreaTopInset) || 0);
  const resolvedSafeBottomInset = Math.max(0, Number(safeAreaBottomInset) || 0);
  const headerSafeTopExtra = Math.min(24, Math.round(resolvedSafeTopInset));
  const footerSafeBottomExtra = Math.min(22, Math.round(resolvedSafeBottomInset));
  const isCompactAndroid = isNativeMobile && viewportHeight <= 860;
  const isVeryCompactAndroid = isNativeMobile && viewportHeight <= 760;
  const baseHeaderPaddingTop = isVeryCompactAndroid ? 10 : isCompactAndroid ? 12 : isNativeMobile ? 14 : 18;
  const headerPaddingTop = baseHeaderPaddingTop + headerSafeTopExtra;
  const baseFooterPaddingBottom = isVeryCompactAndroid ? (isAndroid ? 14 : 10) : isCompactAndroid ? (isAndroid ? 14 : 10) : isAndroid ? 20 : 12;
  const footerPaddingBottom = baseFooterPaddingBottom + footerSafeBottomExtra;
  const supportIntroCardMinHeight = isVeryCompactAndroid
    ? 0
    : Math.min(
        500,
        Math.round(viewportHeight * (isCompactAndroid ? 0.36 : 0.44))
      );
  const showSecondaryLegalNotice = !isVeryCompactAndroid;
  const disableAndroidMotion = Platform.OS === "android";
  const normalizedLanguage = normalizePaywallLanguage(language);
  const copy = useMemo(() => {
    const localized = localizePaywallStringTree(copyProp, normalizedLanguage);
    if (localized && typeof localized === "object") return localized;
    return copyProp || null;
  }, [copyProp, normalizedLanguage]);
  const planCards = useMemo(() => {
    const localized = localizePaywallStringTree(planCardsProp, normalizedLanguage);
    if (Array.isArray(localized)) return localized;
    return Array.isArray(planCardsProp) ? planCardsProp : [];
  }, [normalizedLanguage, planCardsProp]);
  const copyLanguage = resolvePaywallCopyLanguage(normalizedLanguage);
  const isRtlLanguage = isArabicLanguage(normalizedLanguage);
  const normalizedTrigger =
    typeof copy?.trigger === "string" && copy.trigger.trim().length
      ? copy.trigger.trim().toLowerCase()
      : "";
  const isTransactionAbandonedTrigger = normalizedTrigger === "transaction_abandoned";
  const isGroupCSupportTrigger = normalizedTrigger === "group_c_support_after_5_saves";
  const isDailySaveLimitTrigger =
    normalizedTrigger === "save_daily_limit_reached" ||
    normalizedTrigger === "save_daily_limit_blocked";
  const isSaveLimitReachedTrigger =
    isDailySaveLimitTrigger ||
    normalizedTrigger === "trial_10_saves_reached";
  const isNoFreeAccessTrigger =
    normalizedTrigger === "trial_10_saves_reached" ||
    normalizedTrigger === "onboarding_completed_hard_gate";
  const isSupportIntroStageVisible = isGroupCSupportTrigger && supportIntroStage === "intro";
  const isPaywallDismissible = dismissible && !isSupportIntroStageVisible && isCloseCooldownComplete;
  const shouldShowHeaderMetaChips = !isGroupCSupportTrigger;
  const Text = useCallback(
    ({ style, children, ...props }) => {
      const localizedChildren = localizePaywallTextTree(children, normalizedLanguage);
      const rtlStyle = isRtlLanguage ? { writingDirection: "rtl", textAlign: "right" } : null;
      const resolvedStyle = rtlStyle ? [rtlStyle, style] : style;
      return (
        <RNText {...props} style={resolvedStyle}>
          {localizedChildren}
        </RNText>
      );
    },
    [isRtlLanguage, normalizedLanguage]
  );
  useEffect(() => {
    if (!visible) {
      setShowTransactionAbandonedPopup(false);
      return;
    }
    if (isTransactionAbandonedTrigger) {
      setShowTransactionAbandonedPopup(true);
      return;
    }
    setShowTransactionAbandonedPopup(false);
  }, [isTransactionAbandonedTrigger, visible]);
  useEffect(() => {
    if (!visible) {
      setSupportIntroStage("plans");
      return;
    }
    setSupportIntroStage(isGroupCSupportTrigger ? "intro" : "plans");
  }, [isGroupCSupportTrigger, visible]);
  useEffect(() => {
    if (closeCooldownTimerRef.current) {
      clearTimeout(closeCooldownTimerRef.current);
      closeCooldownTimerRef.current = null;
    }
    if (!visible) {
      setIsCloseCooldownComplete(false);
      return;
    }
    setIsCloseCooldownComplete(false);
    closeCooldownTimerRef.current = setTimeout(() => {
      closeCooldownTimerRef.current = null;
      setIsCloseCooldownComplete(true);
    }, PAYWALL_CLOSE_COOLDOWN_MS);
    return () => {
      if (closeCooldownTimerRef.current) {
        clearTimeout(closeCooldownTimerRef.current);
        closeCooldownTimerRef.current = null;
      }
    };
  }, [visible]);
  useEffect(() => {
    if (!visible || !isSupportIntroStageVisible) {
      supportMessageProgress.setValue(0);
      return;
    }
    supportMessageProgress.setValue(0);
    const introAnimation = Animated.sequence([
      Animated.delay(220),
      Animated.timing(supportMessageProgress, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    introAnimation.start();
    return () => {
      introAnimation.stop();
    };
  }, [isSupportIntroStageVisible, supportMessageProgress, visible]);

  const comparisonRows = Array.isArray(copy?.comparisonRows) ? copy.comparisonRows : [];
  const benefitBullets = useMemo(() => {
    const source = Array.isArray(copy?.benefitBullets) ? copy.benefitBullets : [];
    if (source.length) return source.slice(0, 4);
    return comparisonRows
      .filter(
        (row) =>
          row?.premium &&
          !row?.free &&
          !row?.isCosmetic &&
          typeof row?.label === "string" &&
          row.label.trim().length
      )
      .slice(0, 4)
      .map((row, index) => ({
        id: row?.id || `benefit_${index}`,
        label: row.label,
        featureKey: row?.featureKey || null,
        featureKeys: Array.isArray(row?.featureKeys) ? row.featureKeys : [],
        interactive: !!row?.interactive,
      }));
  }, [comparisonRows, copy?.benefitBullets]);

  const activeInsightRow = useMemo(() => {
    if (!selectedComparisonRowId) return null;
    return (
      comparisonRows.find(
        (row) =>
          row?.interactive &&
          String(row?.id || "") === selectedComparisonRowId
      ) || null
    );
  }, [comparisonRows, selectedComparisonRowId]);

  const [saveLimitCountdownNow, setSaveLimitCountdownNow] = useState(() => Date.now());
  useEffect(() => {
    if (!visible || !isDailySaveLimitTrigger) return undefined;
    setSaveLimitCountdownNow(Date.now());
    const timer = setInterval(() => {
      setSaveLimitCountdownNow(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, [isDailySaveLimitTrigger, visible]);
  const saveLimitCountdownLabel = useMemo(
    () => localizePaywallDigits(formatCountdownToMidnight(saveLimitCountdownNow), normalizedLanguage),
    [normalizedLanguage, saveLimitCountdownNow]
  );
  const saveLimitHeaderCopy = useMemo(() => {
    if (!isDailySaveLimitTrigger) return null;
    const fallback = SAVE_LIMIT_HEADER_COPY_BY_LANGUAGE.en;
    const localizedCopy = SAVE_LIMIT_HEADER_COPY_BY_LANGUAGE[copyLanguage] || fallback;
    return {
      title: fillPaywallTemplate(localizedCopy.title, { timeLeft: saveLimitCountdownLabel }),
      subtitle: fillPaywallTemplate(localizedCopy.subtitle, { timeLeft: saveLimitCountdownLabel }),
    };
  }, [copyLanguage, isDailySaveLimitTrigger, saveLimitCountdownLabel]);
  const saveLimitProNowCopy = useMemo(() => {
    if (!isDailySaveLimitTrigger) return null;
    const fallback = SAVE_LIMIT_PRO_NOW_BY_LANGUAGE.en;
    const localizedCopy = SAVE_LIMIT_PRO_NOW_BY_LANGUAGE[copyLanguage] || fallback;
    return {
      before: localizePaywallDigits(localizedCopy.before || fallback.before, normalizedLanguage),
      accent: localizePaywallDigits(localizedCopy.accent || fallback.accent, normalizedLanguage),
      after: localizePaywallDigits(localizedCopy.after || fallback.after, normalizedLanguage),
    };
  }, [copyLanguage, isDailySaveLimitTrigger, normalizedLanguage]);
  const baseHeaderTitle = localizePaywallDigits(copy?.title || "", normalizedLanguage);
  const baseHeaderSubtitle = localizePaywallDigits(copy?.subtitle || "", normalizedLanguage);
  const resolvedBaseHeaderTitle = localizePaywallDigits(
    isDailySaveLimitTrigger ? saveLimitHeaderCopy?.title || baseHeaderTitle : baseHeaderTitle,
    normalizedLanguage
  );
  const resolvedBaseHeaderSubtitle = localizePaywallDigits(
    isDailySaveLimitTrigger ? saveLimitHeaderCopy?.subtitle || baseHeaderSubtitle : baseHeaderSubtitle,
    normalizedLanguage
  );
  const headerTitle = resolvedBaseHeaderTitle;
  const headerSubtitle = resolvedBaseHeaderSubtitle;
  const showPsychologyChip = !!copy?.psychologyLine && !activeInsightRow;
  const headerTitleHighlightToken = localizePaywallDigits(copy?.titleHighlightToken || "", normalizedLanguage);
  const socialProofLine = localizePaywallDigits(
    copy?.socialProofLine ||
      SOCIAL_PROOF_FALLBACK_BY_LANGUAGE[copyLanguage] ||
      SOCIAL_PROOF_FALLBACK_BY_LANGUAGE.en,
    normalizedLanguage
  );
  const benefitsTitle = localizePaywallDigits(
    copy?.benefitsTitle ||
      BENEFITS_TITLE_FALLBACK_BY_LANGUAGE[copyLanguage] ||
      BENEFITS_TITLE_FALLBACK_BY_LANGUAGE.en,
    normalizedLanguage
  );
  const benefitsFootnote = localizePaywallDigits(
    copy?.benefitsFootnote ||
      BENEFITS_FOOTNOTE_FALLBACK_BY_LANGUAGE[copyLanguage] ||
      BENEFITS_FOOTNOTE_FALLBACK_BY_LANGUAGE.en,
    normalizedLanguage
  );
  const headerTitleWithExclamation = useMemo(() => {
    const title = String(headerTitle || "").trim();
    if (!title.length) return title;
    return /[.!?…！？؟。]$/.test(title) ? title : `${title}!`;
  }, [headerTitle]);
  const saveLimitHeaderHighlightStyle = isSaveLimitReachedTrigger
    ? [
        styles.headerSavedAmountHighlight,
        isNativeMobile ? styles.headerSavedAmountHighlightAndroid : null,
        isCompactAndroid ? styles.headerSavedAmountHighlightCompactAndroid : null,
        isVeryCompactAndroid ? styles.headerSavedAmountHighlightVeryCompactAndroid : null,
      ]
    : null;
  const saveLimitTimerHighlightStyle = isDailySaveLimitTrigger
    ? [
        styles.saveLimitTimerHighlight,
        isNativeMobile ? styles.saveLimitTimerHighlightAndroid : null,
        isCompactAndroid ? styles.saveLimitTimerHighlightCompactAndroid : null,
        isVeryCompactAndroid ? styles.saveLimitTimerHighlightVeryCompactAndroid : null,
      ]
    : null;
  const headerPrimaryHighlightToken = isDailySaveLimitTrigger
    ? saveLimitCountdownLabel
    : headerTitleHighlightToken;
  const headerPrimaryHighlightStyle = isDailySaveLimitTrigger
    ? saveLimitTimerHighlightStyle
    : saveLimitHeaderHighlightStyle;
  const headerForecastTitle = localizePaywallDigits(
    SAVINGS_FORECAST_TITLE_BY_LANGUAGE[copyLanguage] ||
      SAVINGS_FORECAST_TITLE_BY_LANGUAGE.en,
    normalizedLanguage
  );
  const savingsForecastPoints = useMemo(
    () =>
      buildSavingsForecastPoints({
        savedAmountLabel: copy?.savedAmountLabel || "",
        amountLabel: copy?.lossAmountLabel || "",
        lossWindowDays: copy?.lossWindowDays,
        language: normalizedLanguage,
        copyLanguage,
      }),
    [
      copy?.savedAmountLabel,
      copy?.lossAmountLabel,
      copy?.lossWindowDays,
      copyLanguage,
      normalizedLanguage,
    ]
  );
  const normalizedForecastWindowDays = Math.min(
    180,
    Math.max(7, Math.round(Number(copy?.lossWindowDays) || 30))
  );
  const baselineLossAmountToken = localizePaywallDigits(copy?.lossAmountLabel || "", normalizedLanguage);
  const forecastWindowAmountLabel = useMemo(() => {
    const matchedPoint = savingsForecastPoints.find((point) => point.days === normalizedForecastWindowDays);
    return matchedPoint?.amountLabel || "";
  }, [normalizedForecastWindowDays, savingsForecastPoints]);
  const headerSubtitleWithForecast = useMemo(() => {
    const sourceSubtitle = String(headerSubtitle || "");
    const baselineToken = String(baselineLossAmountToken || "");
    const replacementAmount = String(forecastWindowAmountLabel || "");
    if (!sourceSubtitle || !baselineToken || !replacementAmount) return sourceSubtitle;
    if (!sourceSubtitle.includes(baselineToken)) return sourceSubtitle;
    return sourceSubtitle.replace(baselineToken, replacementAmount);
  }, [baselineLossAmountToken, forecastWindowAmountLabel, headerSubtitle]);

  const renderBenefitHighlight = useCallback((value = "", benefitValue = "", highlightStyle = null) => {
    const text = String(value || "");
    const token = String(benefitValue || "");
    if (!token || !text.includes(token)) return text;
    const chunks = text.split(token);
    return chunks.map((chunk, index) => (
      <React.Fragment key={`benefit_chunk_${index}`}>
        {chunk}
        {index < chunks.length - 1 ? (
          <Text style={[styles.headerBenefitHighlight, highlightStyle]}>{token}</Text>
        ) : null}
      </React.Fragment>
    ));
  }, []);
  const renderNumericHighlights = useCallback((value = "", highlightStyle = null) => {
    const text = String(value || "");
    if (!text) return text;
    const splitRegex = /([0-9٠-٩۰-۹]+(?:[.,][0-9٠-٩۰-۹]+)?(?:\s*[xX٪%])?)/g;
    const matchRegex = /^[0-9٠-٩۰-۹]+(?:[.,][0-9٠-٩۰-۹]+)?(?:\s*[xX٪%])?$/;
    const chunks = text.split(splitRegex);
    if (chunks.length <= 1) return text;
    return chunks.map((chunk, index) => (
      <React.Fragment key={`numeric_chunk_${index}`}>
        {matchRegex.test(chunk) ? (
          <Text style={[styles.headerBenefitHighlight, highlightStyle]}>{chunk}</Text>
        ) : (
          chunk
        )}
      </React.Fragment>
    ));
  }, []);

  useEffect(() => {
    if (!visible) return;
    const availableCards = planCards.filter((card) => card?.available !== false);
    if (isNoFreeAccessTrigger) {
      const trialCard = availableCards.find((card) => card?.hasTrial);
      if (trialCard?.id) {
        setSelectedPlanId(trialCard.id);
        return;
      }
    }
    setSelectedPlanId(pickDefaultPlanId(planCards));
  }, [isNoFreeAccessTrigger, planCards, visible]);
  useEffect(() => {
    hasTrackedScrollRef.current = false;
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setSelectedComparisonRowId(null);
      return;
    }
    const activeFeatureKey =
      typeof copy?.activeFeatureKey === "string" && copy.activeFeatureKey.trim().length
        ? copy.activeFeatureKey.trim()
        : "";
    if (!activeFeatureKey) {
      setSelectedComparisonRowId(null);
      return;
    }
    const matchingRow =
      comparisonRows.find((row) => {
        if (!row?.interactive) return false;
        if (Array.isArray(row?.featureKeys) && row.featureKeys.includes(activeFeatureKey)) return true;
        return row?.featureKey === activeFeatureKey;
      }) || null;
    setSelectedComparisonRowId(matchingRow ? String(matchingRow.id || "") : null);
  }, [comparisonRows, copy?.activeFeatureKey, visible]);

  useEffect(() => {
    if (!visible) {
      openProgress.setValue(0);
      return;
    }
    openProgress.setValue(0);
    const open = Animated.timing(openProgress, {
      toValue: 1,
      duration: 620,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    open.start();
    return () => open.stop();
  }, [openProgress, visible]);

  useEffect(() => {
    if (!visible) {
      ctaPulse.setValue(0);
      return;
    }
    ctaPulse.setValue(0);

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, {
          toValue: 1,
          duration: 1050,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ctaPulse, {
          toValue: 0,
          duration: 1050,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [ctaPulse, visible]);
  useEffect(() => {
    if (!showTransactionAbandonedPopup) {
      abandonedPopupProgress.setValue(0);
      return;
    }
    abandonedPopupProgress.setValue(0);
    const popupIn = Animated.timing(abandonedPopupProgress, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    popupIn.start();
    return () => popupIn.stop();
  }, [abandonedPopupProgress, showTransactionAbandonedPopup]);

  const selectedPlan = useMemo(
    () => planCards.find((plan) => plan.id === selectedPlanId) || null,
    [planCards, selectedPlanId]
  );
  const paywallHasAnyTrialPlan = useMemo(
    () =>
      planCards.some(
        (plan) => plan?.available !== false && plan?.hasTrial === true
      ),
    [planCards]
  );

  const purchaseDisabled =
    restoring ||
    !!purchaseLoadingPlan ||
    !selectedPlan ||
    selectedPlan.available === false;

  const selectedPlanCtaPrice = localizePaywallDigits(
    selectedPlan?.ctaPriceLabel || selectedPlan?.priceLabel || "",
    normalizedLanguage
  );
  const selectedPlanTrialNotice = localizePaywallDigits(
    paywallHasAnyTrialPlan ? selectedPlan?.trialNoticeLabel || "" : "",
    normalizedLanguage
  );
  const noCommitmentLine = localizePaywallDigits(
    copy?.noCommitmentLine || "No commitment cancel any time",
    normalizedLanguage
  );
  const selectedPlanCurrencyCode =
    (typeof selectedPlan?.currencyCode === "string" && selectedPlan.currencyCode.trim().toUpperCase()) ||
    (planCards.find((entry) => typeof entry?.currencyCode === "string" && entry.currencyCode.trim())?.currencyCode
      ?.trim()
      .toUpperCase()) ||
    (typeof selectedPlanCtaPrice === "string" && (selectedPlanCtaPrice.match(/[A-Z]{3}/) || [])[0]) ||
    "USD";
  const selectedPlanHasTrial = paywallHasAnyTrialPlan && !!selectedPlan?.hasTrial;
  const normalizedSelectedPlanId =
    typeof selectedPlan?.id === "string" ? selectedPlan.id.trim().toLowerCase() : "";
  const isLifetimeSelected = normalizedSelectedPlanId === "lifetime";
  const shouldUseTrialCta = !isLifetimeSelected && selectedPlanHasTrial;
  const selectedPlanTrialCta = selectedPlan?.ctaTrialLabel || copy?.ctaPrimaryTrial || copy?.ctaPrimary || "";
  const selectedPlanRegularCta = copy?.ctaPrimaryRegular || copy?.ctaPrimary || "";
  const primaryButtonActiveColor = "#18B45B";
  const primaryButtonDisabledColor = "rgba(24,180,91,0.45)";
  const primaryButtonShadowColor = "#18B45B";
  const selectedPlanTrialPriceCandidate =
    typeof selectedPlan?.ctaTrialPriceLabel === "string" ? selectedPlan.ctaTrialPriceLabel.trim() : "";
  const selectedPlanTrialPriceHasZero =
    !!selectedPlanTrialPriceCandidate &&
    /\b0(?:[.,]0+)?\b/.test(normalizeWesternDigits(selectedPlanTrialPriceCandidate));
  const selectedPlanTrialPrice = localizePaywallDigits(
    selectedPlanTrialPriceHasZero ? selectedPlanTrialPriceCandidate : `${selectedPlanCurrencyCode} 0`,
    normalizedLanguage
  );
  const primaryButtonTitle = shouldUseTrialCta
    ? selectedPlanTrialCta || copy?.ctaPrimary || ""
    : selectedPlanRegularCta || copy?.ctaPrimary || selectedPlanCtaPrice || "";

  const handlePrimaryPress = () => {
    if (purchaseDisabled || !selectedPlan?.id) return;
    onPlanPress(selectedPlan.id, { source: "primary_button" });
  };
  const handleSheetScroll = useCallback(
    (event) => {
      if (!visible || hasTrackedScrollRef.current) return;
      const offsetY = Number(event?.nativeEvent?.contentOffset?.y || 0);
      if (!Number.isFinite(offsetY) || offsetY < PAYWALL_SCROLL_TRACK_THRESHOLD) return;
      hasTrackedScrollRef.current = true;
      onScrollPastThreshold({ offsetY: Math.max(0, Math.round(offsetY)) });
    },
    [onScrollPastThreshold, visible]
  );
  const dismissTransactionAbandonedPopup = useCallback(() => {
    setShowTransactionAbandonedPopup(false);
  }, []);

  const backdropOpacity = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const shellOpacity = openProgress.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0.45, 1],
  });

  const shellTranslateY = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [34, 0],
  });

  const headerTranslateY = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const sheetTranslateY = openProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [52, 0],
  });

  const ctaScale = ctaPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });
  const abandonedPopupOpacity = abandonedPopupProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const abandonedPopupScale = abandonedPopupProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.88, 1],
  });
  const abandonedPopupTranslateY = abandonedPopupProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [24, 0],
  });
  const transactionAbandonedPopupBadge = localizePaywallDigits(
    copy?.transactionAbandonedPopupBadge || "ONE-TIME OFFER",
    normalizedLanguage
  );
  const transactionAbandonedPopupTitle = localizePaywallDigits(
    copy?.transactionAbandonedPopupTitle || "35% OFF",
    normalizedLanguage
  );
  const transactionAbandonedPopupSubtitle = localizePaywallDigits(
    copy?.transactionAbandonedPopupSubtitle ||
      "You almost subscribed to Premium. Claim your discount now while it is active.",
    normalizedLanguage
  );
  const transactionAbandonedPopupPrimaryCta = localizePaywallDigits(
    copy?.transactionAbandonedPopupPrimaryCta || "Claim discount",
    normalizedLanguage
  );
  const transactionAbandonedPopupSecondaryCta = localizePaywallDigits(
    copy?.transactionAbandonedPopupSecondaryCta || "Maybe later",
    normalizedLanguage
  );
  const supportIntroBadge = localizePaywallDigits(
    copy?.supportIntroBadge || "PERSONAL NOTE",
    normalizedLanguage
  );
  const supportIntroTitle = localizePaywallDigits(
    copy?.supportIntroTitle || copy?.title || "",
    normalizedLanguage
  );
  const supportIntroSubtitle = localizePaywallDigits(
    copy?.supportIntroSubtitle || "",
    normalizedLanguage
  );
  const supportIntroSubtitleWithForecast = useMemo(() => {
    const sourceSubtitle = String(supportIntroSubtitle || "");
    const baselineToken = String(baselineLossAmountToken || "");
    const replacementAmount = String(forecastWindowAmountLabel || "");
    if (!sourceSubtitle || !baselineToken || !replacementAmount) return sourceSubtitle;
    if (!sourceSubtitle.includes(baselineToken)) return sourceSubtitle;
    return sourceSubtitle.replace(baselineToken, replacementAmount);
  }, [baselineLossAmountToken, forecastWindowAmountLabel, supportIntroSubtitle]);
  const supportIntroAuthor = localizePaywallDigits(
    copy?.supportIntroAuthor || "Alexander, creator of Almost",
    normalizedLanguage
  );
  const supportIntroMessage = localizePaywallDigits(
    copy?.supportIntroMessage || "",
    normalizedLanguage
  );
  const supportIntroPrimaryCta = localizePaywallDigits(
    copy?.supportIntroPrimaryCta || "Support Almost",
    normalizedLanguage
  );
  const supportIntroHint = localizePaywallDigits(
    copy?.supportIntroHint || "",
    normalizedLanguage
  );
  const supportIntroStatus = localizePaywallDigits(
    copy?.supportIntroStatus || "now",
    normalizedLanguage
  );
  const supportIntroSavedHighlight = localizePaywallDigits(
    copy?.supportIntroSavedHighlight || "",
    normalizedLanguage
  );
  const supportIntroTitleWithExclamation = useMemo(() => {
    const title = String(supportIntroTitle || "").trim();
    if (!title.length) return title;
    return /[.!?…！？؟。]$/.test(title) ? title : `${title}!`;
  }, [supportIntroTitle]);
  const supportIntroHeaderHighlightStyle = [
    styles.supportIntroHeaderBenefitHighlight,
    isNativeMobile ? styles.supportIntroHeaderBenefitHighlightAndroid : null,
    isCompactAndroid ? styles.supportIntroHeaderBenefitHighlightCompactAndroid : null,
    isVeryCompactAndroid ? styles.supportIntroHeaderBenefitHighlightVeryCompactAndroid : null,
  ];
  const supportMessageOpacity = supportMessageProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });
  const supportMessageTranslateY = supportMessageProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
  });
  const supportMessageScale = supportMessageProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  const getRowAnimatedStyle = (index, total) => {
    if (disableAndroidMotion) return null;
    const safeTotal = Math.max(1, total);
    const start = 0.3 + (index / safeTotal) * 0.42;
    const end = Math.min(1, start + 0.18);
    return {
      opacity: openProgress.interpolate({
        inputRange: [start, end],
        outputRange: [0, 1],
        extrapolate: "clamp",
      }),
      transform: [
        {
          translateY: openProgress.interpolate({
            inputRange: [start, end],
            outputRange: [10, 0],
            extrapolate: "clamp",
          }),
        },
      ],
    };
  };

  if (!copy) return null;

  const regularFooterContent = (
    <>
      {!!noCommitmentLine && (
        <View style={[styles.commitmentRow, isCompactAndroid ? styles.commitmentRowCompactAndroid : null]}>
          <View
            style={[
              styles.commitmentIconWrap,
              isCompactAndroid ? styles.commitmentIconWrapCompactAndroid : null,
            ]}
          >
            <Text style={[styles.commitmentIcon, isCompactAndroid ? styles.commitmentIconCompactAndroid : null]}>
              ✓
            </Text>
          </View>
          <Text
            style={[styles.commitmentText, isCompactAndroid ? styles.commitmentTextCompactAndroid : null, { color: textColor }]}
          >
            {noCommitmentLine}
          </Text>
        </View>
      )}

      <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            isCompactAndroid ? styles.primaryButtonCompactAndroid : null,
            {
              backgroundColor: purchaseDisabled ? primaryButtonDisabledColor : primaryButtonActiveColor,
              shadowColor: primaryButtonShadowColor,
            },
          ]}
          onPress={handlePrimaryPress}
          disabled={purchaseDisabled}
          activeOpacity={0.9}
        >
          {purchaseLoadingPlan ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={[styles.primaryButtonText, isCompactAndroid ? styles.primaryButtonTextCompactAndroid : null]}>
              {primaryButtonTitle}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      <View style={[styles.footerRow, isCompactAndroid ? styles.footerRowCompactAndroid : null]}>
        <TouchableOpacity
          style={[
            styles.footerSecondaryButton,
            isCompactAndroid ? styles.footerSecondaryButtonCompactAndroid : null,
            { borderColor },
          ]}
          onPress={() => onRestorePress({ source: "restore_button" })}
          disabled={!!purchaseLoadingPlan || restoring}
          activeOpacity={0.85}
        >
          {restoring ? (
            <ActivityIndicator size="small" color={textColor} />
          ) : (
            <Text
              style={[
                styles.footerSecondaryButtonText,
                isCompactAndroid ? styles.footerSecondaryButtonTextCompactAndroid : null,
                { color: textColor },
              ]}
            >
              {copy.ctaRestore}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerGhostButton, isCompactAndroid ? styles.footerGhostButtonCompactAndroid : null, { borderColor }]}
          onPress={() => onManagePress({ source: "manage_button" })}
          disabled={!!purchaseLoadingPlan || restoring}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.footerGhostButtonText,
              isCompactAndroid ? styles.footerGhostButtonTextCompactAndroid : null,
              { color: textColor },
            ]}
          >
            {copy?.ctaManage || "Manage subscription"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.footerLegalBlock, isCompactAndroid ? styles.footerLegalBlockCompactAndroid : null]}>
        {!!copy?.billingNotice && (
          <Text
            style={[styles.footerLegalNotice, isCompactAndroid ? styles.footerLegalNoticeCompactAndroid : null, { color: mutedColor }]}
            numberOfLines={isCompactAndroid ? 2 : undefined}
          >
            {copy.billingNotice}
          </Text>
        )}
        {!!selectedPlanTrialNotice && (
          <Text
            style={[styles.footerLegalNotice, isCompactAndroid ? styles.footerLegalNoticeCompactAndroid : null, { color: mutedColor }]}
            numberOfLines={isCompactAndroid ? 3 : undefined}
          >
            {selectedPlanTrialNotice}
          </Text>
        )}
        {!!copy?.legalNotice && showSecondaryLegalNotice && (
          <Text
            style={[styles.footerLegalNotice, isCompactAndroid ? styles.footerLegalNoticeCompactAndroid : null, { color: mutedColor }]}
            numberOfLines={isCompactAndroid ? 2 : undefined}
          >
            {copy.legalNotice}
          </Text>
        )}

        <View style={[styles.footerLegalLinksRow, isCompactAndroid ? styles.footerLegalLinksRowCompactAndroid : null]}>
          <TouchableOpacity
            onPress={() => onTermsPress({ source: "terms_link" })}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.footerLegalLinkText, isCompactAndroid ? styles.footerLegalLinkTextCompactAndroid : null, { color: textColor }]}>
              {copy?.legalTermsLabel || "Terms"}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.footerLegalDot, isCompactAndroid ? styles.footerLegalDotCompactAndroid : null, { color: mutedColor }]}>
            •
          </Text>
          <TouchableOpacity
            onPress={() => onPrivacyPress({ source: "privacy_link" })}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.footerLegalLinkText, isCompactAndroid ? styles.footerLegalLinkTextCompactAndroid : null, { color: textColor }]}>
              {copy?.legalPrivacyLabel || "Privacy"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
  const supportIntroFooterContent = (
    <View style={styles.supportIntroFooter}>
      <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
        <TouchableOpacity
          style={[
            styles.primaryButton,
            isCompactAndroid ? styles.primaryButtonCompactAndroid : null,
            { backgroundColor: accent },
          ]}
          onPress={() => setSupportIntroStage("plans")}
          activeOpacity={0.9}
        >
          <Text style={[styles.primaryButtonText, isCompactAndroid ? styles.primaryButtonTextCompactAndroid : null]}>
            {supportIntroPrimaryCta}
          </Text>
        </TouchableOpacity>
      </Animated.View>
      {!!supportIntroHint && (
        <Text style={[styles.supportIntroFooterHint, { color: mutedColor }]}>
          {supportIntroHint}
        </Text>
      )}
    </View>
  );
  const footerContent = isSupportIntroStageVisible ? supportIntroFooterContent : regularFooterContent;

  const regularHeaderContent = (
    <Animated.View
      style={[
        styles.header,
        !shouldShowHeaderMetaChips ? styles.headerWithoutMeta : null,
        isNativeMobile ? styles.headerCompactAndroid : null,
        !shouldShowHeaderMetaChips && isNativeMobile ? styles.headerWithoutMetaAndroid : null,
        isCompactAndroid ? styles.headerCompactAndroidSmall : null,
        !shouldShowHeaderMetaChips && isCompactAndroid ? styles.headerWithoutMetaCompactAndroid : null,
        isVeryCompactAndroid ? styles.headerCompactAndroidTiny : null,
        !shouldShowHeaderMetaChips && isVeryCompactAndroid ? styles.headerWithoutMetaVeryCompactAndroid : null,
        { paddingTop: headerPaddingTop },
        disableAndroidMotion ? null : { transform: [{ translateY: headerTranslateY }] },
      ]}
    >
      <View
        style={[
          styles.headerTopRow,
          isNativeMobile ? styles.headerTopRowAndroid : null,
          isCompactAndroid ? styles.headerTopRowCompactAndroid : null,
          isVeryCompactAndroid ? styles.headerTopRowVeryCompactAndroid : null,
        ]}
      >
        {isPaywallDismissible ? (
          <Pressable
            style={[
              styles.closeButton,
              isNativeMobile ? styles.closeButtonAndroid : null,
              isCompactAndroid ? styles.closeButtonCompactAndroid : null,
              isVeryCompactAndroid ? styles.closeButtonVeryCompactAndroid : null,
            ]}
            onPress={() => onClose("header_close")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text
              style={[
                styles.closeButtonText,
                isCompactAndroid ? styles.closeButtonTextCompactAndroid : null,
              ]}
            >
              ✕
            </Text>
          </Pressable>
        ) : (
          <View
            style={[
              styles.headerTopPlaceholder,
              isNativeMobile ? styles.headerTopPlaceholderAndroid : null,
              isCompactAndroid ? styles.headerTopPlaceholderCompactAndroid : null,
              isVeryCompactAndroid ? styles.headerTopPlaceholderVeryCompactAndroid : null,
            ]}
          />
        )}
        <View
          style={[
            styles.headerBadge,
            isNativeMobile ? styles.headerBadgeAndroid : null,
            isCompactAndroid ? styles.headerBadgeCompactAndroid : null,
            isVeryCompactAndroid ? styles.headerBadgeVeryCompactAndroid : null,
          ]}
        >
          <Text
            style={[
              styles.headerBadgeText,
              isCompactAndroid ? styles.headerBadgeTextCompactAndroid : null,
            ]}
          >
            {copy.badgeLabel}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.headerTextWrap,
          !shouldShowHeaderMetaChips ? styles.headerTextWrapWithoutMeta : null,
          isNativeMobile ? styles.headerTextWrapAndroid : null,
          isCompactAndroid ? styles.headerTextWrapCompactAndroid : null,
          isVeryCompactAndroid ? styles.headerTextWrapVeryCompactAndroid : null,
        ]}
      >
        <Text
          style={[
            styles.headerTitle,
            isNativeMobile ? styles.headerTitleAndroid : null,
            isCompactAndroid ? styles.headerTitleCompactAndroid : null,
            isVeryCompactAndroid ? styles.headerTitleVeryCompactAndroid : null,
          ]}
        >
          {renderBenefitHighlight(
            headerTitleWithExclamation,
            headerPrimaryHighlightToken,
            headerPrimaryHighlightStyle
          )}
        </Text>
        {!!headerSubtitle && !showPsychologyChip && (
          <Text
            style={[
              styles.headerSubtitle,
              isCompactAndroid ? styles.headerSubtitleCompactAndroid : null,
              isVeryCompactAndroid ? styles.headerSubtitleVeryCompactAndroid : null,
            ]}
          >
            {renderNumericHighlights(headerSubtitleWithForecast)}
          </Text>
        )}
        {isDailySaveLimitTrigger && saveLimitProNowCopy && (
          <Text
            style={[
              styles.saveLimitUnlockLine,
              isCompactAndroid ? styles.saveLimitUnlockLineCompactAndroid : null,
              isVeryCompactAndroid ? styles.saveLimitUnlockLineVeryCompactAndroid : null,
            ]}
          >
            {saveLimitProNowCopy.before}
            <Text
              style={[
                styles.saveLimitUnlockNow,
                isCompactAndroid ? styles.saveLimitUnlockNowCompactAndroid : null,
                isVeryCompactAndroid ? styles.saveLimitUnlockNowVeryCompactAndroid : null,
              ]}
            >
              {saveLimitProNowCopy.accent}
            </Text>
            {saveLimitProNowCopy.after}
          </Text>
        )}
        {!!savingsForecastPoints.length && !showPsychologyChip && (
          <View
            style={[
              styles.headerForecastCard,
              isCompactAndroid ? styles.headerForecastCardCompactAndroid : null,
              isVeryCompactAndroid ? styles.headerForecastCardVeryCompactAndroid : null,
            ]}
          >
            <Text
              style={[
                styles.headerForecastTitle,
                isCompactAndroid ? styles.headerForecastTitleCompactAndroid : null,
              ]}
            >
              {headerForecastTitle}
            </Text>
            <View
              style={[
                styles.headerForecastRow,
                isCompactAndroid ? styles.headerForecastRowCompactAndroid : null,
              ]}
            >
              {savingsForecastPoints.map((point) => (
                <View
                  key={point.id}
                  style={[
                    styles.headerForecastItem,
                    isCompactAndroid ? styles.headerForecastItemCompactAndroid : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.headerForecastAmount,
                      isCompactAndroid ? styles.headerForecastAmountCompactAndroid : null,
                    ]}
                    numberOfLines={1}
                  >
                    {point.amountLabel}
                  </Text>
                  <Text
                    style={[
                      styles.headerForecastDays,
                      isCompactAndroid ? styles.headerForecastDaysCompactAndroid : null,
                    ]}
                    numberOfLines={1}
                  >
                    {point.daysLabel}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {showPsychologyChip && (
          <View
            style={[
              styles.psychologyChip,
              isCompactAndroid ? styles.psychologyChipCompactAndroid : null,
              isVeryCompactAndroid ? styles.psychologyChipVeryCompactAndroid : null,
            ]}
          >
            <Text
              style={[
                styles.psychologyChipText,
                isCompactAndroid ? styles.psychologyChipTextCompactAndroid : null,
              ]}
            >
              {copy.psychologyLine}
            </Text>
          </View>
        )}
      </View>

    </Animated.View>
  );
  const supportIntroHeaderContent = (
    <Animated.View
      style={[
        styles.header,
        styles.supportIntroHeader,
        !shouldShowHeaderMetaChips ? styles.headerWithoutMeta : null,
        isNativeMobile ? styles.headerCompactAndroid : null,
        !shouldShowHeaderMetaChips && isNativeMobile ? styles.headerWithoutMetaAndroid : null,
        isCompactAndroid ? styles.headerCompactAndroidSmall : null,
        !shouldShowHeaderMetaChips && isCompactAndroid ? styles.headerWithoutMetaCompactAndroid : null,
        isVeryCompactAndroid ? styles.headerCompactAndroidTiny : null,
        !shouldShowHeaderMetaChips && isVeryCompactAndroid ? styles.headerWithoutMetaVeryCompactAndroid : null,
        { paddingTop: headerPaddingTop },
        disableAndroidMotion ? null : { transform: [{ translateY: headerTranslateY }] },
      ]}
    >
      <View
        style={[
          styles.headerTopRow,
          isNativeMobile ? styles.headerTopRowAndroid : null,
          isCompactAndroid ? styles.headerTopRowCompactAndroid : null,
          isVeryCompactAndroid ? styles.headerTopRowVeryCompactAndroid : null,
        ]}
      >
        {isPaywallDismissible ? (
          <Pressable
            style={[
              styles.closeButton,
              isNativeMobile ? styles.closeButtonAndroid : null,
              isCompactAndroid ? styles.closeButtonCompactAndroid : null,
              isVeryCompactAndroid ? styles.closeButtonVeryCompactAndroid : null,
            ]}
            onPress={() => onClose("header_close")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text
              style={[
                styles.closeButtonText,
                isCompactAndroid ? styles.closeButtonTextCompactAndroid : null,
              ]}
            >
              ✕
            </Text>
          </Pressable>
        ) : (
          <View
            style={[
              styles.headerTopPlaceholder,
              isNativeMobile ? styles.headerTopPlaceholderAndroid : null,
              isCompactAndroid ? styles.headerTopPlaceholderCompactAndroid : null,
              isVeryCompactAndroid ? styles.headerTopPlaceholderVeryCompactAndroid : null,
            ]}
          />
        )}
        <View
          style={[
            styles.headerBadge,
            styles.supportIntroBadge,
            isNativeMobile ? styles.headerBadgeAndroid : null,
            isCompactAndroid ? styles.headerBadgeCompactAndroid : null,
            isVeryCompactAndroid ? styles.headerBadgeVeryCompactAndroid : null,
          ]}
        >
          <Text
            style={[
              styles.headerBadgeText,
              isCompactAndroid ? styles.headerBadgeTextCompactAndroid : null,
            ]}
          >
            {supportIntroBadge}
          </Text>
        </View>
      </View>
      <View
        style={[
          styles.headerTextWrap,
          !shouldShowHeaderMetaChips ? styles.headerTextWrapWithoutMeta : null,
          isNativeMobile ? styles.headerTextWrapAndroid : null,
          isCompactAndroid ? styles.headerTextWrapCompactAndroid : null,
          isVeryCompactAndroid ? styles.headerTextWrapVeryCompactAndroid : null,
        ]}
      >
        <Text
          style={[
            styles.headerTitle,
            isNativeMobile ? styles.headerTitleAndroid : null,
            isCompactAndroid ? styles.headerTitleCompactAndroid : null,
            isVeryCompactAndroid ? styles.headerTitleVeryCompactAndroid : null,
            styles.supportIntroHeaderTitle,
            isNativeMobile ? styles.supportIntroHeaderTitleAndroid : null,
            isCompactAndroid ? styles.supportIntroHeaderTitleCompactAndroid : null,
            isVeryCompactAndroid ? styles.supportIntroHeaderTitleVeryCompactAndroid : null,
          ]}
        >
          {renderBenefitHighlight(
            supportIntroTitleWithExclamation,
            supportIntroSavedHighlight || headerTitleHighlightToken,
            supportIntroHeaderHighlightStyle
          )}
        </Text>
        {!!supportIntroSubtitle && (
          <Text
            style={[
              styles.headerSubtitle,
              styles.supportIntroHeaderSubtitle,
              isCompactAndroid ? styles.headerSubtitleCompactAndroid : null,
              isVeryCompactAndroid ? styles.headerSubtitleVeryCompactAndroid : null,
            ]}
          >
            {renderNumericHighlights(supportIntroSubtitleWithForecast)}
          </Text>
        )}
      </View>
    </Animated.View>
  );
  const headerContent = isSupportIntroStageVisible ? supportIntroHeaderContent : regularHeaderContent;

  const regularSheetContent = (
    <>
      <View style={[styles.benefitsCard, isCompactAndroid ? styles.benefitsCardCompactAndroid : null, { borderColor }]}>
        <Text style={[styles.benefitsCardTitle, { color: textColor }]}>
          {benefitsTitle}
        </Text>
        <View style={styles.benefitsList}>
          {benefitBullets.map((row, index) => {
            const rowId = String(row?.id || `${row?.label || "benefit"}_${index}`);
            const isInteractive = !!row?.interactive;
            const isSelected = rowId === selectedComparisonRowId;
            const bulletRow = (
              <>
                <View
                  style={[
                    styles.benefitBulletIconWrap,
                    isSelected ? styles.benefitBulletIconWrapSelected : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.benefitBulletIcon,
                      isSelected ? styles.benefitBulletIconSelected : null,
                    ]}
                  >
                    ✓
                  </Text>
                </View>
                <Text
                  style={[
                    styles.benefitBulletText,
                    isCompactAndroid ? styles.benefitBulletTextCompactAndroid : null,
                    { color: isSelected ? "#2F3ADE" : textColor },
                  ]}
                >
                  {row.label}
                </Text>
              </>
            );
            return (
              <Animated.View key={rowId} style={getRowAnimatedStyle(index, benefitBullets.length)}>
                {isInteractive ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[
                      styles.benefitBulletRow,
                      isCompactAndroid ? styles.benefitBulletRowCompactAndroid : null,
                      index === benefitBullets.length - 1 ? styles.benefitBulletRowLast : null,
                    ]}
                    onPress={() => {
                      setSelectedComparisonRowId(rowId);
                      onFeatureInsightPress(row?.featureKey || rowId, {
                        source: "benefit_bullet",
                        rowId,
                      });
                    }}
                  >
                    {bulletRow}
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[
                      styles.benefitBulletRow,
                      isCompactAndroid ? styles.benefitBulletRowCompactAndroid : null,
                      index === benefitBullets.length - 1 ? styles.benefitBulletRowLast : null,
                    ]}
                  >
                    {bulletRow}
                  </View>
                )}
              </Animated.View>
            );
          })}
        </View>
        {!!benefitsFootnote && (
          <Text
            style={[
              styles.benefitsFootnote,
              isCompactAndroid ? styles.benefitsFootnoteCompactAndroid : null,
              { color: mutedColor },
            ]}
          >
            {benefitsFootnote}
          </Text>
        )}
      </View>

      <View style={styles.planSection}>
        <View
          style={[
            styles.planSectionHeaderRow,
            isCompactAndroid ? styles.planSectionHeaderRowCompactAndroid : null,
          ]}
        >
          <Text
            style={[
              styles.planSectionTitle,
              styles.planSectionTitleInRow,
              isCompactAndroid ? styles.planSectionTitleCompactAndroid : null,
              isCompactAndroid ? styles.planSectionTitleInRowCompactAndroid : null,
              { color: textColor },
            ]}
          >
            {copy.planSectionTitle || "Choose your Premium plan"}
          </Text>
          {!!socialProofLine && (
            <View
              style={[
                styles.planSocialProofWrap,
                styles.planSocialProofWrapInline,
                isCompactAndroid ? styles.planSocialProofWrapCompactAndroid : null,
              ]}
            >
              <View
                style={[
                  styles.planSocialProofChip,
                  styles.planSocialProofChipInline,
                  isCompactAndroid ? styles.planSocialProofChipCompactAndroid : null,
                ]}
              >
                <Text
                  style={[
                    styles.planSocialProofText,
                    styles.planSocialProofTextInline,
                    isCompactAndroid ? styles.planSocialProofTextCompactAndroid : null,
                  ]}
                  numberOfLines={1}
                >
                  {socialProofLine}
                </Text>
              </View>
            </View>
          )}
        </View>
        {!isVeryCompactAndroid && (
          <Text style={[styles.planSectionHint, isCompactAndroid ? styles.planSectionHintCompactAndroid : null, { color: mutedColor }]}>
            {copy.planHint || "Select a plan and tap the button below"}
          </Text>
        )}

        <View style={[styles.planList, isCompactAndroid ? styles.planListCompactAndroid : null]}>
          {planCards.map((plan) => {
            const selected = plan.id === selectedPlanId;
            const unavailable = plan.available === false;
            const loading = purchaseLoadingPlan === plan.id;
            const isYearlyPlan = plan.id === "yearly";
            const topBadgeLabel =
              !unavailable && typeof plan.topBadge === "string" && plan.topBadge.trim().length
                ? plan.topBadge.trim()
                : "";
            const topBadgeKind =
              typeof plan.topBadgeKind === "string" && plan.topBadgeKind.trim().length
                ? plan.topBadgeKind.trim().toLowerCase()
                : "";
            const normalizedTopBadgeKind =
              !paywallHasAnyTrialPlan && topBadgeKind === "trial" ? "" : topBadgeKind;
            const showExternalYearlySaveBadge =
              isYearlyPlan && !unavailable && !!topBadgeLabel && normalizedTopBadgeKind !== "trial";
            const inlineTopBadgeLabel = showExternalYearlySaveBadge ? "" : topBadgeLabel;
            const inlineTopBadgeKind = showExternalYearlySaveBadge ? "" : normalizedTopBadgeKind;
            let primaryBadgeLabel = unavailable
              ? copy.planUnavailableLabel || "Unavailable"
              : typeof plan.badge === "string" && plan.badge.trim().length
              ? plan.badge.trim()
              : "";
            let primaryBadgeKind = unavailable
              ? "unavailable"
              : typeof plan.badgeKind === "string" && plan.badgeKind.trim().length
              ? plan.badgeKind.trim().toLowerCase()
              : "";
            if (!paywallHasAnyTrialPlan && primaryBadgeKind === "trial") {
              primaryBadgeKind = "";
              primaryBadgeLabel = "";
            }
            const resolveBadgeTone = (kind = "", fallbackYearlyStyle = false) => {
              if (kind === "save") {
                return {
                  backgroundColor: selected ? "#18B45B" : "rgba(24,180,91,0.18)",
                  borderWidth: 1,
                  borderColor: "rgba(24,180,91,0.4)",
                  textColor: selected ? "#FFFFFF" : "#137A42",
                };
              }
              if (kind === "trial") {
                return {
                  backgroundColor: selected ? "#18B45B" : "rgba(24,180,91,0.18)",
                  borderWidth: 1,
                  borderColor: "rgba(24,180,91,0.4)",
                  textColor: selected ? "#FFFFFF" : "#137A42",
                };
              }
              if (kind === "unavailable") {
                return {
                  backgroundColor: "rgba(11,22,48,0.08)",
                  borderWidth: 0,
                  borderColor: "transparent",
                  textColor: textColor,
                };
              }
              return {
                backgroundColor: fallbackYearlyStyle
                  ? selected
                    ? "#18B45B"
                    : "rgba(24,180,91,0.18)"
                  : selected
                  ? accent
                  : "rgba(11,22,48,0.08)",
                borderWidth: fallbackYearlyStyle ? 1 : 0,
                borderColor: fallbackYearlyStyle ? "rgba(24,180,91,0.4)" : "transparent",
                textColor: fallbackYearlyStyle
                  ? selected
                    ? "#FFFFFF"
                    : "#137A42"
                  : selected
                  ? "#FFFFFF"
                  : textColor,
              };
            };
            const topBadgeTone = resolveBadgeTone(inlineTopBadgeKind, isYearlyPlan);
            const primaryBadgeTone = resolveBadgeTone(primaryBadgeKind, isYearlyPlan);
            const showBillingMeta =
              !!plan.billingLabel &&
              plan.billingLabel !== plan.secondaryLabel &&
              plan.billingLabel !== plan.secondarySubLabel;
            return (
              <View
                key={plan.id}
                style={[
                  styles.planCardItemWrap,
                  showExternalYearlySaveBadge ? styles.planCardItemWrapWithTopBadge : null,
                ]}
              >
                {showExternalYearlySaveBadge && (
                  <View
                    style={[
                      styles.planExternalSaveBadgeWrap,
                      isCompactAndroid ? styles.planExternalSaveBadgeWrapCompactAndroid : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.planExternalSaveBadge,
                        isCompactAndroid ? styles.planExternalSaveBadgeCompactAndroid : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.planExternalSaveBadgeText,
                          isCompactAndroid ? styles.planExternalSaveBadgeTextCompactAndroid : null,
                        ]}
                      >
                        {topBadgeLabel}
                      </Text>
                    </View>
                  </View>
                )}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedPlanId(plan.id);
                  onPlanSelect(plan.id, { source: "plan_card" });
                }}
                disabled={!!purchaseLoadingPlan || restoring}
                style={[
                  styles.planCard,
                  isCompactAndroid ? styles.planCardCompactAndroid : null,
                  {
                    borderColor: isYearlyPlan ? "#18B45B" : selected ? accent : borderColor,
                    borderWidth: 1,
                    backgroundColor: selected
                      ? isYearlyPlan
                        ? "rgba(24,180,91,0.1)"
                        : "rgba(67,83,255,0.1)"
                      : "#FFFFFF",
                    opacity: unavailable ? 0.52 : 1,
                  },
                ]}
              >
                <View style={styles.planTopRow}>
                  <Text style={[styles.planTitle, isCompactAndroid ? styles.planTitleCompactAndroid : null, { color: textColor }]}>
                    {plan.label}
                  </Text>
                  {!!(inlineTopBadgeLabel || primaryBadgeLabel) && (
                    <View
                      style={[
                        styles.planBadgeStack,
                        isCompactAndroid ? styles.planBadgeStackCompactAndroid : null,
                      ]}
                    >
                      {!!inlineTopBadgeLabel && (
                        <View
                          style={[
                            styles.planBadge,
                            styles.planBadgeSecondary,
                            isCompactAndroid ? styles.planBadgeCompactAndroid : null,
                            isCompactAndroid ? styles.planBadgeSecondaryCompactAndroid : null,
                            {
                              backgroundColor: topBadgeTone.backgroundColor,
                              borderWidth: topBadgeTone.borderWidth,
                              borderColor: topBadgeTone.borderColor,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.planBadgeText,
                              isCompactAndroid ? styles.planBadgeTextCompactAndroid : null,
                              { color: topBadgeTone.textColor },
                            ]}
                          >
                            {inlineTopBadgeLabel}
                          </Text>
                        </View>
                      )}
                      {!!primaryBadgeLabel && (
                        <View
                          style={[
                            styles.planBadge,
                            isCompactAndroid ? styles.planBadgeCompactAndroid : null,
                            {
                              backgroundColor: primaryBadgeTone.backgroundColor,
                              borderWidth: primaryBadgeTone.borderWidth,
                              borderColor: primaryBadgeTone.borderColor,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.planBadgeText,
                              isCompactAndroid ? styles.planBadgeTextCompactAndroid : null,
                              { color: primaryBadgeTone.textColor },
                            ]}
                          >
                            {primaryBadgeLabel}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                <View style={styles.planBottomRow}>
                  <Text
                    style={[
                      styles.planPrice,
                      isCompactAndroid ? styles.planPriceCompactAndroid : null,
                      plan.displayAsEquivalent ? styles.planPriceEquivalent : null,
                      isCompactAndroid && plan.displayAsEquivalent ? styles.planPriceEquivalentCompactAndroid : null,
                      { color: textColor },
                    ]}
                    numberOfLines={plan.displayAsEquivalent ? 2 : 1}
                  >
                    {plan.priceLabel}
                  </Text>
                  <View style={[styles.planPriceMeta, plan.displayAsEquivalent ? styles.planPriceMetaEquivalent : null]}>
                    {!!plan.secondaryLabel && (
                      <Text
                        style={[
                          styles.planSecondary,
                          isCompactAndroid ? styles.planSecondaryCompactAndroid : null,
                          { color: mutedColor },
                          plan.secondaryKind === "strike" && styles.planSecondaryStrike,
                        ]}
                      >
                        {plan.secondaryLabel}
                      </Text>
                    )}
                    {!!plan.secondarySubLabel && (
                      <Text
                        style={[
                          styles.planSecondarySub,
                          isCompactAndroid ? styles.planSecondarySubCompactAndroid : null,
                          { color: mutedColor },
                        ]}
                      >
                        {plan.secondarySubLabel}
                      </Text>
                    )}
                    {showBillingMeta && (
                      <Text
                        style={[
                          styles.planBillingMeta,
                          isCompactAndroid ? styles.planBillingMetaCompactAndroid : null,
                          { color: mutedColor },
                        ]}
                      >
                        {plan.billingLabel}
                      </Text>
                    )}
                  </View>
                </View>
                {!!plan.equivalentLabel && !plan.displayAsEquivalent && (
                  <Text
                    style={[
                      styles.planEquivalent,
                      isCompactAndroid ? styles.planEquivalentCompactAndroid : null,
                      { color: selected ? "#313EEA" : mutedColor },
                    ]}
                  >
                    {plan.equivalentLabel}
                  </Text>
                )}
                {loading && (
                  <View style={styles.planLoader}>
                    <ActivityIndicator size="small" color={accent} />
                  </View>
                )}
              </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    </>
  );
  const supportIntroSheetContent = (
    <View
      style={[
        styles.supportIntroCard,
        { borderColor },
        supportIntroCardMinHeight > 0 ? { minHeight: supportIntroCardMinHeight } : null,
      ]}
    >
      <View style={styles.supportIntroMessageRow}>
        <View style={styles.supportIntroAvatarWrap}>
          <Image source={DEVELOPER_AVATAR} style={styles.supportIntroAvatar} resizeMode="cover" />
        </View>
        <View style={styles.supportIntroAuthorBlock}>
          <Text style={[styles.supportIntroAuthorName, { color: textColor }]}>{supportIntroAuthor}</Text>
          <Text style={[styles.supportIntroIncoming, { color: mutedColor }]}>{supportIntroStatus}</Text>
        </View>
      </View>
      <Animated.View
        style={[
          styles.supportIntroBubbleWrap,
          {
            opacity: supportMessageOpacity,
            transform: [{ translateY: supportMessageTranslateY }, { scale: supportMessageScale }],
          },
        ]}
      >
        <View style={styles.supportIntroBubble}>
          <Text style={[styles.supportIntroBubbleText, { color: textColor }]}>{supportIntroMessage}</Text>
        </View>
      </Animated.View>
    </View>
  );
  const sheetContent = isSupportIntroStageVisible ? supportIntroSheetContent : regularSheetContent;

  return (
    <Modal
      visible={visible}
      transparent
      presentationStyle={Platform.OS === "ios" ? "overFullScreen" : undefined}
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (isPaywallDismissible) {
          onClose("system_back");
        }
      }}
    >
      <View style={styles.root}>
        <Pressable
          style={styles.backdropPressable}
          onPress={isPaywallDismissible ? () => onClose("backdrop") : undefined}
          disabled={!isPaywallDismissible}
        >
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>

        <Animated.View
          style={[
            styles.shell,
            disableAndroidMotion
              ? null
              : {
                  opacity: shellOpacity,
                  transform: [{ translateY: shellTranslateY }],
                },
          ]}
        >
          {headerContent}
          <Animated.View
            style={[
              styles.sheet,
              isCompactAndroid ? styles.sheetCompactAndroid : null,
              {
                backgroundColor: cardBg,
              },
              disableAndroidMotion ? null : { transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            <ScrollView
              style={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
              scrollEnabled
              nestedScrollEnabled={isAndroid}
              onScroll={handleSheetScroll}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[
                styles.sheetScrollContent,
                isCompactAndroid ? styles.sheetScrollContentCompactAndroid : null,
                isVeryCompactAndroid ? styles.sheetScrollContentVeryCompactAndroid : null,
                isSupportIntroStageVisible ? styles.sheetScrollContentSupportIntro : null,
              ]}
            >
              {sheetContent}
            </ScrollView>
            <View
              style={[
                styles.footer,
                styles.footerSticky,
                isCompactAndroid ? styles.footerCompactAndroid : null,
                isVeryCompactAndroid ? styles.footerVeryCompactAndroid : null,
                { borderTopColor: borderColor, paddingBottom: footerPaddingBottom },
              ]}
            >
              {footerContent}
            </View>
          </Animated.View>
        </Animated.View>

        {showTransactionAbandonedPopup && (
          <View style={styles.abandonedPopupLayer}>
            <Pressable
              style={styles.abandonedPopupLayerBackdrop}
              onPress={dismissTransactionAbandonedPopup}
            />
            <Animated.View
              style={[
                styles.abandonedPopupCard,
                isCompactAndroid ? styles.abandonedPopupCardCompactAndroid : null,
                isVeryCompactAndroid ? styles.abandonedPopupCardVeryCompactAndroid : null,
                {
                  opacity: abandonedPopupOpacity,
                  transform: [{ translateY: abandonedPopupTranslateY }, { scale: abandonedPopupScale }],
                },
              ]}
            >
              <View style={styles.abandonedPopupGlowLarge} />
              <View style={styles.abandonedPopupGlowSmall} />

              <Pressable
                style={styles.abandonedPopupCloseButton}
                onPress={dismissTransactionAbandonedPopup}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.abandonedPopupCloseButtonText}>✕</Text>
              </Pressable>

              <View style={styles.abandonedPopupBadge}>
                <Text style={styles.abandonedPopupBadgeText}>{transactionAbandonedPopupBadge}</Text>
              </View>

              <Text
                style={[
                  styles.abandonedPopupTitle,
                  isCompactAndroid ? styles.abandonedPopupTitleCompactAndroid : null,
                  isVeryCompactAndroid ? styles.abandonedPopupTitleVeryCompactAndroid : null,
                ]}
              >
                {transactionAbandonedPopupTitle}
              </Text>
              <Text
                style={[
                  styles.abandonedPopupSubtitle,
                  isCompactAndroid ? styles.abandonedPopupSubtitleCompactAndroid : null,
                ]}
              >
                {transactionAbandonedPopupSubtitle}
              </Text>

              <TouchableOpacity
                style={[
                  styles.abandonedPopupPrimaryButton,
                  isCompactAndroid ? styles.abandonedPopupPrimaryButtonCompactAndroid : null,
                ]}
                onPress={dismissTransactionAbandonedPopup}
                activeOpacity={0.9}
              >
                <Text
                  style={[
                    styles.abandonedPopupPrimaryButtonText,
                    isCompactAndroid ? styles.abandonedPopupPrimaryButtonTextCompactAndroid : null,
                  ]}
                >
                  {transactionAbandonedPopupPrimaryCta}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.abandonedPopupSecondaryButton}
                onPress={dismissTransactionAbandonedPopup}
                activeOpacity={0.85}
              >
                <Text style={styles.abandonedPopupSecondaryButtonText}>
                  {transactionAbandonedPopupSecondaryCta}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(1,7,30,0.76)",
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  shell: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    minHeight: 0,
    zIndex: 2,
    backgroundColor: "#0A1E72",
  },
  abandonedPopupLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 22,
  },
  abandonedPopupLayerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,10,30,0.72)",
  },
  abandonedPopupCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#FF3B30",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    shadowColor: "#FF3B30",
    shadowOpacity: 0.52,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 18,
  },
  abandonedPopupCardCompactAndroid: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  abandonedPopupCardVeryCompactAndroid: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  abandonedPopupGlowLarge: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    top: -64,
    right: -36,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  abandonedPopupGlowSmall: {
    position: "absolute",
    width: 128,
    height: 128,
    borderRadius: 64,
    bottom: -44,
    left: -24,
    backgroundColor: "rgba(255,188,127,0.44)",
  },
  abandonedPopupCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    zIndex: 4,
  },
  abandonedPopupCloseButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 18,
    fontWeight: "800",
  },
  abandonedPopupBadge: {
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.36)",
  },
  abandonedPopupBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "800",
    letterSpacing: 0.45,
    textAlign: "center",
  },
  abandonedPopupTitle: {
    marginTop: 12,
    color: "#FFFFFF",
    fontSize: 44,
    lineHeight: 47,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.4,
  },
  abandonedPopupTitleCompactAndroid: {
    marginTop: 10,
    fontSize: 37,
    lineHeight: 40,
  },
  abandonedPopupTitleVeryCompactAndroid: {
    marginTop: 8,
    fontSize: 32,
    lineHeight: 36,
  },
  abandonedPopupSubtitle: {
    marginTop: 10,
    color: "rgba(255,255,255,0.95)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 6,
  },
  abandonedPopupSubtitleCompactAndroid: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 2,
  },
  abandonedPopupPrimaryButton: {
    width: "100%",
    minHeight: 50,
    marginTop: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  abandonedPopupPrimaryButtonCompactAndroid: {
    minHeight: 46,
    marginTop: 12,
    borderRadius: 13,
  },
  abandonedPopupPrimaryButtonText: {
    color: "#E72F2F",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  abandonedPopupPrimaryButtonTextCompactAndroid: {
    fontSize: 15,
    lineHeight: 18,
  },
  abandonedPopupSecondaryButton: {
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  abandonedPopupSecondaryButtonText: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
    textAlign: "center",
    textDecorationLine: "underline",
  },
  header: {
    backgroundColor: "#0A1E72",
    paddingTop: 18,
    paddingHorizontal: 20,
    paddingBottom: 24,
    minHeight: 246,
    position: "relative",
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    overflow: "hidden",
  },
  headerCompactAndroid: {
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 220,
  },
  headerCompactAndroidSmall: {
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 198,
  },
  headerCompactAndroidTiny: {
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 184,
  },
  headerWithoutMeta: {
    minHeight: 214,
    paddingBottom: 16,
  },
  headerWithoutMetaAndroid: {
    minHeight: 196,
    paddingBottom: 13,
  },
  headerWithoutMetaCompactAndroid: {
    minHeight: 178,
    paddingBottom: 11,
  },
  headerWithoutMetaVeryCompactAndroid: {
    minHeight: 166,
    paddingBottom: 9,
  },
  supportIntroHeader: {
    backgroundColor: "#0E2F8F",
  },
  headerTopRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 40,
    marginTop: 6,
  },
  headerTopRowAndroid: {
    minHeight: 38,
    marginTop: 5,
  },
  headerTopRowCompactAndroid: {
    minHeight: 36,
    marginTop: 4,
  },
  headerTopRowVeryCompactAndroid: {
    minHeight: 34,
    marginTop: 3,
  },
  closeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  closeButtonAndroid: {},
  closeButtonCompactAndroid: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  closeButtonVeryCompactAndroid: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "500",
    lineHeight: 10,
  },
  closeButtonTextCompactAndroid: {
    fontSize: 8,
    lineHeight: 9,
  },
  headerTopPlaceholder: {
    width: 20,
    height: 20,
  },
  headerTopPlaceholderAndroid: {
    width: 20,
    height: 20,
  },
  headerTopPlaceholderCompactAndroid: {
    width: 18,
    height: 18,
  },
  headerTopPlaceholderVeryCompactAndroid: {
    width: 16,
    height: 16,
  },
  headerBadge: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "rgba(136,103,255,0.95)",
  },
  headerBadgeAndroid: {
    paddingHorizontal: 13,
    paddingVertical: 6,
  },
  headerBadgeCompactAndroid: {
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  headerBadgeVeryCompactAndroid: {},
  supportIntroBadge: {
    backgroundColor: "rgba(57,232,172,0.95)",
  },
  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  headerBadgeTextCompactAndroid: {
    fontSize: 10,
    letterSpacing: 0.3,
  },
  headerTextWrap: {
    width: "100%",
    alignItems: "center",
    marginTop: 18,
    paddingHorizontal: 4,
  },
  headerTextWrapWithoutMeta: {
    marginTop: 12,
  },
  headerTextWrapAndroid: {
    marginTop: 16,
  },
  headerTextWrapCompactAndroid: {
    marginTop: 13,
  },
  headerTextWrapVeryCompactAndroid: {
    marginTop: 10,
  },
  headerMetaRow: {
    marginTop: 10,
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  headerMetaRowCompactAndroid: {
    marginTop: 8,
    gap: 6,
  },
  headerMetaRowVeryCompactAndroid: {
    marginTop: 6,
  },
  headerMetaChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    justifyContent: "center",
  },
  headerMetaChipCompactAndroid: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  socialProofChip: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor: "rgba(255,255,255,0.22)",
  },
  socialProofChipNarrow: {
    flex: 0,
    alignSelf: "center",
    minWidth: 168,
    maxWidth: 232,
    paddingHorizontal: 14,
  },
  socialProofChipNarrowCompactAndroid: {
    minWidth: 152,
    maxWidth: 210,
    paddingHorizontal: 12,
  },
  socialProofText: {
    color: "#F1F5FF",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  socialProofTextCompactAndroid: {
    fontSize: 10,
    lineHeight: 13,
  },
  headerTitle: {
    width: "100%",
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    maxWidth: "95%",
  },
  headerTitleAndroid: {
    fontSize: 25,
    lineHeight: 31,
  },
  headerTitleCompactAndroid: {
    fontSize: 22,
    lineHeight: 28,
  },
  headerTitleVeryCompactAndroid: {
    fontSize: 20,
    lineHeight: 25,
  },
  supportIntroHeaderTitle: {
    color: "#E8F8FF",
    fontWeight: "900",
    fontSize: 31,
    lineHeight: 37,
    letterSpacing: 0.1,
  },
  supportIntroHeaderTitleAndroid: {
    fontSize: 28,
    lineHeight: 34,
  },
  supportIntroHeaderTitleCompactAndroid: {
    fontSize: 24,
    lineHeight: 30,
  },
  supportIntroHeaderTitleVeryCompactAndroid: {
    fontSize: 22,
    lineHeight: 27,
  },
  headerBenefitHighlight: {
    color: "#8AF3BC",
    fontWeight: "900",
  },
  headerSavedAmountHighlight: {
    color: "#59E58A",
    fontSize: 35,
    lineHeight: 40,
    fontWeight: "900",
  },
  headerSavedAmountHighlightAndroid: {
    fontSize: 32,
    lineHeight: 36,
  },
  headerSavedAmountHighlightCompactAndroid: {
    fontSize: 29,
    lineHeight: 33,
  },
  headerSavedAmountHighlightVeryCompactAndroid: {
    fontSize: 26,
    lineHeight: 30,
  },
  saveLimitTimerHighlight: {
    color: "#FF5E69",
    fontSize: 35,
    lineHeight: 40,
    fontWeight: "900",
  },
  saveLimitTimerHighlightAndroid: {
    fontSize: 32,
    lineHeight: 36,
  },
  saveLimitTimerHighlightCompactAndroid: {
    fontSize: 29,
    lineHeight: 33,
  },
  saveLimitTimerHighlightVeryCompactAndroid: {
    fontSize: 26,
    lineHeight: 30,
  },
  supportIntroHeaderBenefitHighlight: {
    color: "#61F29C",
    fontSize: 33,
    lineHeight: 37,
  },
  supportIntroHeaderBenefitHighlightAndroid: {
    fontSize: 30,
    lineHeight: 34,
  },
  supportIntroHeaderBenefitHighlightCompactAndroid: {
    fontSize: 27,
    lineHeight: 32,
  },
  supportIntroHeaderBenefitHighlightVeryCompactAndroid: {
    fontSize: 24,
    lineHeight: 29,
  },
  headerSubtitle: {
    marginTop: 10,
    width: "100%",
    color: "rgba(239,244,255,0.9)",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    maxWidth: "93%",
  },
  supportIntroHeaderSubtitle: {
    marginTop: 10,
    color: "rgba(236,248,255,0.97)",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    maxWidth: "93%",
  },
  headerSubtitleCompactAndroid: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 18,
  },
  headerSubtitleVeryCompactAndroid: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
  },
  saveLimitUnlockLine: {
    marginTop: 8,
    width: "100%",
    textAlign: "center",
    color: "rgba(236,245,255,0.92)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    maxWidth: "95%",
  },
  saveLimitUnlockLineCompactAndroid: {
    marginTop: 7,
    fontSize: 13,
    lineHeight: 18,
  },
  saveLimitUnlockLineVeryCompactAndroid: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
  },
  saveLimitUnlockNow: {
    color: "#59E58A",
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900",
  },
  saveLimitUnlockNowCompactAndroid: {
    fontSize: 20,
    lineHeight: 24,
  },
  saveLimitUnlockNowVeryCompactAndroid: {
    fontSize: 18,
    lineHeight: 22,
  },
  headerForecastCard: {
    marginTop: 9,
    width: "100%",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    gap: 6,
  },
  headerForecastCardCompactAndroid: {
    marginTop: 7,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 5,
  },
  headerForecastCardVeryCompactAndroid: {
    marginTop: 6,
    paddingVertical: 5,
    gap: 4,
  },
  headerForecastTitle: {
    color: "rgba(239,244,255,0.92)",
    textAlign: "center",
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  headerForecastTitleCompactAndroid: {
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.1,
  },
  headerForecastRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "stretch",
    gap: 6,
  },
  headerForecastRowCompactAndroid: {
    gap: 5,
  },
  headerForecastItem: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 5,
    backgroundColor: "rgba(9,19,76,0.36)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerForecastItemCompactAndroid: {
    borderRadius: 7,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  headerForecastAmount: {
    color: "#DFFFEF",
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  headerForecastAmountCompactAndroid: {
    fontSize: 10,
    lineHeight: 12,
  },
  headerForecastDays: {
    marginTop: 2,
    color: "rgba(239,244,255,0.9)",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  headerForecastDaysCompactAndroid: {
    marginTop: 1,
    fontSize: 9,
    lineHeight: 11,
  },
  headerSaveLimitNow: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: "rgba(239,244,255,0.95)",
  },
  headerSaveLimitNowCompactAndroid: {
    marginTop: 5,
    fontSize: 16,
    lineHeight: 22,
  },
  headerSaveLimitNowVeryCompactAndroid: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 19,
  },
  headerSaveLimitNowAccent: {
    color: "#59E58A",
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  psychologyChip: {
    alignSelf: "center",
    marginTop: 10,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(21,225,141,0.48)",
    backgroundColor: "rgba(21,225,141,0.18)",
  },
  psychologyChipCompactAndroid: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  psychologyChipVeryCompactAndroid: {
    marginTop: 6,
  },
  psychologyChipText: {
    color: "#B9FFE3",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  psychologyChipTextCompactAndroid: {
    fontSize: 11,
    lineHeight: 14,
  },
  sheet: {
    flex: 1,
    minHeight: 0,
    marginTop: -2,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
  },
  sheetCompactAndroid: {
    marginTop: -2,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  sheetScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    gap: 12,
  },
  sheetScrollContentSupportIntro: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 10,
    paddingBottom: 10,
  },
  sheetScrollContentCompactAndroid: {
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
  sheetScrollContentVeryCompactAndroid: {
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
  },
  sheetScroll: {
    flex: 1,
    minHeight: 0,
  },
  supportIntroCard: {
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 16,
    overflow: "hidden",
  },
  supportIntroMessageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  supportIntroAvatarWrap: {
    width: 86,
    height: 86,
    borderRadius: 43,
    overflow: "hidden",
    backgroundColor: "#E7ECFF",
    borderWidth: 1,
    borderColor: "rgba(67,83,255,0.24)",
  },
  supportIntroAvatar: {
    width: "100%",
    height: "100%",
  },
  supportIntroAuthorBlock: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  supportIntroAuthorName: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "900",
  },
  supportIntroIncoming: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  supportIntroBubbleWrap: {
    width: "100%",
  },
  supportIntroBubble: {
    borderRadius: 20,
    backgroundColor: "#F4F7FF",
    borderWidth: 1,
    borderColor: "rgba(67,83,255,0.18)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  supportIntroBubbleText: {
    fontSize: 17,
    lineHeight: 25,
    fontWeight: "600",
  },
  comparisonCard: {
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  comparisonCardCompactAndroid: {
    borderRadius: 16,
  },
  comparisonHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: "#F5F7FF",
  },
  comparisonHeaderNoFree: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: "#F5F7FF",
    gap: 8,
  },
  comparisonHeaderNoFreeTextWrap: {
    flex: 1,
    gap: 2,
    paddingRight: 4,
  },
  comparisonNoFreeTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
  },
  comparisonNoFreeHint: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
  },
  comparisonTapHint: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 8,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
  },
  comparisonTapHintCompactAndroid: {
    paddingTop: 4,
    paddingBottom: 6,
    fontSize: 10,
    lineHeight: 13,
  },
  comparisonFeatureColumn: {
    flex: 1,
  },
  comparisonHeaderText: {
    width: 54,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  proHeaderPill: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#4A57FF",
    paddingVertical: 4,
    marginLeft: 8,
  },
  proHeaderPillNoFree: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#4A57FF",
    paddingVertical: 4,
    marginTop: 2,
  },
  proHeaderPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(18,28,58,0.12)",
  },
  comparisonRowNoFree: {
    paddingVertical: 9,
  },
  comparisonRowInteractive: {
    backgroundColor: "rgba(67,83,255,0.035)",
  },
  comparisonRowSelected: {
    backgroundColor: "rgba(67,83,255,0.12)",
    borderTopColor: "rgba(67,83,255,0.42)",
  },
  comparisonRowCompactAndroid: {
    paddingVertical: 8,
  },
  comparisonRowLast: {
    paddingBottom: 12,
  },
  comparisonFeatureText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
    paddingRight: 8,
  },
  comparisonFeatureTextActive: {
    fontWeight: "700",
  },
  comparisonFeatureTextCompactAndroid: {
    fontSize: 12,
    lineHeight: 16,
  },
  comparisonFeatureTextNoFree: {
    paddingRight: 12,
  },
  comparisonMark: {
    width: 54,
    textAlign: "center",
    fontSize: 24,
    lineHeight: 24,
    fontWeight: "500",
  },
  comparisonMarkActive: {
    color: "#3643D7",
  },
  proMarkWrap: {
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  proMarkWrapNoFree: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
  },
  proMark: {
    color: "#4353FF",
    fontSize: 27,
    lineHeight: 27,
    fontWeight: "600",
  },
  proMarkActive: {
    color: "#2D38CC",
  },
  unlockLevelCard: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(67,83,255,0.24)",
    backgroundColor: "rgba(67,83,255,0.08)",
  },
  unlockLevelCardCompactAndroid: {
    paddingVertical: 8,
  },
  unlockLevelCardText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  benefitsCard: {
    borderRadius: 18,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 8,
  },
  benefitsCardCompactAndroid: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 5,
    gap: 6,
  },
  benefitsCardTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },
  benefitsList: {
    gap: 0,
  },
  benefitsFootnote: {
    marginTop: 6,
    textAlign: "left",
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "600",
  },
  benefitsFootnoteCompactAndroid: {
    marginTop: 5,
    fontSize: 11,
    lineHeight: 14,
  },
  benefitBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(18,28,58,0.12)",
    paddingVertical: 9,
  },
  benefitBulletRowCompactAndroid: {
    paddingVertical: 8,
  },
  benefitBulletRowLast: {
    paddingBottom: 10,
  },
  benefitBulletIconWrap: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginTop: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(67,83,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(67,83,255,0.26)",
  },
  benefitBulletIconWrapSelected: {
    backgroundColor: "rgba(67,83,255,0.22)",
    borderColor: "rgba(67,83,255,0.54)",
  },
  benefitBulletIcon: {
    color: "#4353FF",
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "900",
  },
  benefitBulletIconSelected: {
    color: "#2D38CC",
  },
  benefitBulletText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  benefitBulletTextCompactAndroid: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 8,
  },
  planSection: {
    gap: 8,
  },
  planSectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  planSectionHeaderRowCompactAndroid: {
    gap: 6,
  },
  planSocialProofWrap: {
    alignItems: "center",
    marginTop: 2,
    marginBottom: 1,
  },
  planSocialProofWrapInline: {
    marginTop: 0,
    marginBottom: 0,
    alignItems: "flex-end",
  },
  planSocialProofWrapCompactAndroid: {
    marginTop: 1,
    marginBottom: 0,
  },
  planSocialProofChip: {
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(55,86,180,0.26)",
    backgroundColor: "rgba(62,94,198,0.12)",
    maxWidth: "100%",
  },
  planSocialProofChipInline: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  planSocialProofChipCompactAndroid: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  planSocialProofText: {
    color: "#2E4FAF",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
  },
  planSocialProofTextInline: {
    fontSize: 11,
    lineHeight: 13,
  },
  planSocialProofTextCompactAndroid: {
    fontSize: 11,
    lineHeight: 14,
  },
  planSectionTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
  },
  planSectionTitleInRow: {
    flex: 1,
    marginRight: 8,
  },
  planSectionTitleCompactAndroid: {
    fontSize: 16,
    lineHeight: 21,
  },
  planSectionTitleInRowCompactAndroid: {
    marginRight: 6,
  },
  planSectionHint: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
  },
  planSectionHintCompactAndroid: {
    fontSize: 11,
    lineHeight: 14,
  },
  planList: {
    marginTop: 2,
    gap: 8,
  },
  planListCompactAndroid: {
    gap: 7,
  },
  planCardItemWrap: {
    position: "relative",
  },
  planCardItemWrapWithTopBadge: {
    marginTop: 18,
  },
  planExternalSaveBadgeWrap: {
    position: "absolute",
    top: -18,
    right: 14,
    zIndex: 3,
    alignItems: "flex-end",
  },
  planExternalSaveBadgeWrapCompactAndroid: {
    top: -15,
    right: 12,
  },
  planExternalSaveBadge: {
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#DDF8E9",
    borderWidth: 2,
    borderColor: "#18B45B",
  },
  planExternalSaveBadgeCompactAndroid: {
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  planExternalSaveBadgeText: {
    color: "#137A42",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  planExternalSaveBadgeTextCompactAndroid: {
    fontSize: 9,
    lineHeight: 11,
  },
  planCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  planCardCompactAndroid: {
    borderRadius: 12,
    paddingVertical: 8,
    gap: 6,
  },
  planTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  planBottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  planPriceMeta: {
    alignItems: "flex-end",
    gap: 2,
  },
  planPriceMetaEquivalent: {
    minWidth: 112,
  },
  planTitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "800",
  },
  planTitleCompactAndroid: {
    fontSize: 14,
    lineHeight: 17,
  },
  planBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  planBadgeStack: {
    alignItems: "flex-end",
    gap: 4,
  },
  planBadgeStackCompactAndroid: {
    gap: 3,
  },
  planBadgeSecondary: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  planBadgeSecondaryCompactAndroid: {
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  planBadgeCompactAndroid: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  planBadgeText: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "800",
  },
  planBadgeTextCompactAndroid: {
    fontSize: 9,
    lineHeight: 11,
  },
  planPrice: {
    fontSize: 24,
    lineHeight: 26,
    fontWeight: "900",
  },
  planPriceEquivalent: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
    paddingRight: 6,
  },
  planPriceCompactAndroid: {
    fontSize: 21,
    lineHeight: 23,
  },
  planPriceEquivalentCompactAndroid: {
    fontSize: 14,
    lineHeight: 18,
  },
  planSecondary: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  planSecondaryCompactAndroid: {
    fontSize: 11,
    lineHeight: 14,
  },
  planSecondaryStrike: {
    textDecorationLine: "line-through",
  },
  planSecondarySub: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  planSecondarySubCompactAndroid: {
    fontSize: 10,
    lineHeight: 13,
  },
  planBillingMeta: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
  },
  planBillingMetaCompactAndroid: {
    fontSize: 9,
    lineHeight: 12,
  },
  planEquivalent: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  planEquivalentCompactAndroid: {
    fontSize: 11,
    lineHeight: 14,
  },
  planLoader: {
    position: "absolute",
    right: 10,
    bottom: 8,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "android" ? 20 : 12,
    gap: 10,
    backgroundColor: "#FFFFFF",
    marginTop: 4,
  },
  footerCompactAndroid: {
    paddingTop: 9,
    paddingBottom: 14,
    gap: 8,
  },
  footerVeryCompactAndroid: {
    paddingTop: 8,
    gap: 7,
  },
  footerSticky: {
    flexShrink: 0,
  },
  supportIntroFooter: {
    gap: 8,
  },
  supportIntroFooterHint: {
    textAlign: "center",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
  },
  commitmentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 2,
  },
  commitmentRowCompactAndroid: {
    gap: 6,
    marginBottom: 1,
  },
  commitmentIconWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(24,180,91,0.42)",
    backgroundColor: "rgba(24,180,91,0.16)",
  },
  commitmentIconWrapCompactAndroid: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  commitmentIcon: {
    color: "#18B45B",
    fontSize: 11,
    lineHeight: 12,
    fontWeight: "900",
  },
  commitmentIconCompactAndroid: {
    fontSize: 10,
    lineHeight: 11,
  },
  commitmentText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  commitmentTextCompactAndroid: {
    fontSize: 11,
    lineHeight: 14,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4353FF",
    shadowOpacity: 0.38,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 9,
  },
  primaryButtonCompactAndroid: {
    minHeight: 48,
    borderRadius: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  primaryButtonTextCompactAndroid: {
    fontSize: 14,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: "row",
    gap: 10,
  },
  footerRowCompactAndroid: {
    gap: 8,
  },
  footerSecondaryButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  footerSecondaryButtonCompactAndroid: {
    minHeight: 38,
    borderRadius: 11,
  },
  footerSecondaryButtonText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
  },
  footerSecondaryButtonTextCompactAndroid: {
    fontSize: 12,
    lineHeight: 16,
  },
  footerGhostButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  footerGhostButtonCompactAndroid: {
    minHeight: 38,
    borderRadius: 11,
  },
  footerGhostButtonText: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
  },
  footerGhostButtonTextCompactAndroid: {
    fontSize: 12,
    lineHeight: 16,
  },
  footerLegalBlock: {
    gap: 4,
    marginTop: 0,
  },
  footerLegalBlockCompactAndroid: {
    gap: 3,
    marginTop: 0,
  },
  footerLegalNotice: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "500",
    textAlign: "center",
  },
  footerLegalNoticeCompactAndroid: {
    fontSize: 8,
    lineHeight: 11,
  },
  footerLegalLinksRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerLegalLinksRowCompactAndroid: {
    gap: 6,
  },
  footerLegalDot: {
    fontSize: 10,
    lineHeight: 11,
    fontWeight: "600",
  },
  footerLegalDotCompactAndroid: {
    fontSize: 9,
    lineHeight: 10,
  },
  footerLegalLinkText: {
    fontSize: 10,
    lineHeight: 11,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  footerLegalLinkTextCompactAndroid: {
    fontSize: 9,
    lineHeight: 10,
  },
});

export default PremiumPaywallModal;

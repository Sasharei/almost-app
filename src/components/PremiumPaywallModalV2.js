import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

const HERO_REFERENCE_VISUAL = require("../../assets/paywall/v2/hero_reference.jpg");
const BULLET_ICON_IMAGES = [
  require("../../assets/paywall/v2/bullet_icon_1.jpg"),
  require("../../assets/paywall/v2/bullet_icon_2.jpg"),
  require("../../assets/paywall/v2/bullet_icon_3.jpg"),
  require("../../assets/paywall/v2/bullet_icon_4.jpg"),
];

const PRIMARY_PLAN_IDS = ["weekly"];
const FALLBACK_FEATURES_BY_LANGUAGE = {
  ru: [
    "Неограниченное использование",
    "Неограниченные цели накоплений",
    "Умный трекинг искушений",
    "Глубокая аналитика прогресса",
  ],
  en: [
    "Unlimited usage",
    "Unlimited savings goals",
    "Smart temptation tracking",
    "Deep progress insights",
  ],
  es: [
    "Uso ilimitado",
    "Metas de ahorro ilimitadas",
    "Seguimiento inteligente de tentaciones",
    "Insights de progreso profundos",
  ],
  fr: [
    "Utilisation illimitée",
    "Objectifs d'épargne illimités",
    "Suivi intelligent des tentations",
    "Analyse approfondie des progrès",
  ],
  de: [
    "Unbegrenzte Nutzung",
    "Unbegrenzte Sparziele",
    "Smartes Versuchungs-Tracking",
    "Tiefere Fortschrittsanalysen",
  ],
  ar: [
    "استخدام غير محدود",
    "أهداف ادخار غير محدودة",
    "تتبع ذكي للإغراءات",
    "تحليلات عميقة للتقدم",
  ],
  zh: [
    "无限使用",
    "无限储蓄目标",
    "智能欲望追踪",
    "深度进度分析",
  ],
};

const PLAN_TITLES_BY_LANGUAGE = {
  yearly: {
    ru: "Годовой",
    en: "Yearly",
    es: "Anual",
    fr: "Annuel",
    de: "Jährlich",
    ar: "سنوي",
    zh: "年付",
  },
  monthly: {
    ru: "Ежемесячный",
    en: "Monthly",
    es: "Mensual",
    fr: "Mensuel",
    de: "Monatlich",
    ar: "شهري",
    zh: "月付",
  },
  weekly: {
    ru: "Еженедельный",
    en: "Weekly",
    es: "Semanal",
    fr: "Hebdomadaire",
    de: "Wöchentlich",
    ar: "أسبوعي",
    zh: "周付",
  },
  lifetime: {
    ru: "Навсегда",
    en: "Lifetime",
    es: "De por vida",
    fr: "À vie",
    de: "Lebenslang",
    ar: "مدى الحياة",
    zh: "终身",
  },
  premium: {
    ru: "Premium",
    en: "Premium",
    es: "Premium",
    fr: "Premium",
    de: "Premium",
    ar: "Premium",
    zh: "Premium",
  },
};

const FALLBACK_UI_COPY_BY_LANGUAGE = {
  ru: {
    title: "Выберите план Premium",
    trialHeadline: "Мы хотим, чтобы вы попробовали Almost бесплатно",
    socialProof: "Более 5000 человек уже экономят с Almost",
    ctaPrimary: "Разблокировать Premium",
    freeTrialToggleTitle: "Free Trial",
    freeTrialToggleSubtitle: "Включите, чтобы выбрать месячный план с пробным периодом.",
    showAllPlans: "Показать все планы",
    hideExtraPlans: "Скрыть дополнительные планы",
    brandBadge: "Almost Premium",
    bestValueBadge: "ЛУЧШАЯ ЦЕНА",
    freeTrialLabel: "Бесплатный пробный",
    tryForFree: "Попробовать бесплатно",
    thenPriceTemplate: "Затем {{price}}",
    yearlyPerMonthTemplate: "Всего {{price}}",
    continueLimited: "Продолжить с ограниченной версией",
    restore: "Восстановить покупки",
    manage: "Управлять подпиской",
    terms: "Условия",
    privacy: "Конфиденциальность",
  },
  en: {
    title: "Choose your Premium plan",
    trialHeadline: "We want you to try almost for free",
    socialProof: "More than 5000 people are already saving with Almost",
    ctaPrimary: "Unlock Premium",
    freeTrialToggleTitle: "Free Trial",
    freeTrialToggleSubtitle: "Turn on to select the monthly plan with a trial.",
    showAllPlans: "Show all plans",
    hideExtraPlans: "Hide extra plans",
    brandBadge: "Almost Premium",
    bestValueBadge: "BEST VALUE",
    freeTrialLabel: "Free trial",
    tryForFree: "Try for free",
    thenPriceTemplate: "Then {{price}}",
    yearlyPerMonthTemplate: "Just {{price}}",
    continueLimited: "Continue with limited version",
    restore: "Restore purchases",
    manage: "Manage subscription",
    terms: "Terms",
    privacy: "Privacy",
  },
  es: {
    title: "Elige tu plan Premium",
    trialHeadline: "Queremos que pruebes Almost gratis",
    socialProof: "Más de 5000 personas ya ahorran con Almost",
    ctaPrimary: "Desbloquear Premium",
    freeTrialToggleTitle: "Free Trial",
    freeTrialToggleSubtitle: "Actívalo para elegir el plan mensual con prueba.",
    showAllPlans: "Mostrar todos los planes",
    hideExtraPlans: "Ocultar planes adicionales",
    brandBadge: "Almost Premium",
    bestValueBadge: "MEJOR VALOR",
    freeTrialLabel: "Prueba gratis",
    tryForFree: "Probar gratis",
    thenPriceTemplate: "Después {{price}}",
    yearlyPerMonthTemplate: "Solo {{price}}",
    continueLimited: "Continuar con versión limitada",
    restore: "Restaurar compras",
    manage: "Gestionar suscripción",
    terms: "Términos",
    privacy: "Privacidad",
  },
  fr: {
    title: "Choisis ton plan Premium",
    trialHeadline: "Nous voulons que vous essayiez Almost gratuitement",
    socialProof: "Plus de 5000 personnes économisent déjà avec Almost",
    ctaPrimary: "Débloquer Premium",
    freeTrialToggleTitle: "Free Trial",
    freeTrialToggleSubtitle: "Active-le pour choisir l'offre mensuelle avec essai.",
    showAllPlans: "Afficher toutes les offres",
    hideExtraPlans: "Masquer les offres supplémentaires",
    brandBadge: "Almost Premium",
    bestValueBadge: "MEILLEURE OFFRE",
    freeTrialLabel: "Essai gratuit",
    tryForFree: "Essayer gratuitement",
    thenPriceTemplate: "Puis {{price}}",
    yearlyPerMonthTemplate: "Seulement {{price}}",
    continueLimited: "Continuer avec la version limitée",
    restore: "Restaurer les achats",
    manage: "Gérer l'abonnement",
    terms: "Conditions",
    privacy: "Confidentialité",
  },
  de: {
    title: "Wähle deinen Premium-Plan",
    trialHeadline: "Wir möchten, dass du Almost kostenlos ausprobierst",
    socialProof: "Mehr als 5000 Menschen sparen bereits mit Almost",
    ctaPrimary: "Premium freischalten",
    freeTrialToggleTitle: "Free Trial",
    freeTrialToggleSubtitle: "Aktivieren, um den Monatsplan mit Testphase zu wählen.",
    showAllPlans: "Alle Pläne anzeigen",
    hideExtraPlans: "Zusätzliche Pläne ausblenden",
    brandBadge: "Almost Premium",
    bestValueBadge: "BESTER PREIS",
    freeTrialLabel: "Kostenlos testen",
    tryForFree: "Kostenlos testen",
    thenPriceTemplate: "Dann {{price}}",
    yearlyPerMonthTemplate: "Nur {{price}}",
    continueLimited: "Mit eingeschränkter Version fortfahren",
    restore: "Käufe wiederherstellen",
    manage: "Abo verwalten",
    terms: "AGB",
    privacy: "Datenschutz",
  },
  ar: {
    title: "اختر خطة Premium الخاصة بك",
    trialHeadline: "نريدك أن تجرّب Almost مجاناً",
    socialProof: "أكثر من 5000 شخص يدّخرون بالفعل مع Almost",
    ctaPrimary: "افتح Premium",
    freeTrialToggleTitle: "Free Trial",
    freeTrialToggleSubtitle: "فعّله لاختيار الخطة الشهرية مع الفترة التجريبية.",
    showAllPlans: "إظهار جميع الخطط",
    hideExtraPlans: "إخفاء الخطط الإضافية",
    brandBadge: "Almost Premium",
    bestValueBadge: "أفضل قيمة",
    freeTrialLabel: "تجربة مجانية",
    tryForFree: "جرّب مجاناً",
    thenPriceTemplate: "ثم {{price}}",
    yearlyPerMonthTemplate: "فقط {{price}}",
    continueLimited: "المتابعة بالإصدار المحدود",
    restore: "استعادة المشتريات",
    manage: "إدارة الاشتراك",
    terms: "الشروط",
    privacy: "الخصوصية",
  },
  zh: {
    title: "选择你的 Premium 方案",
    trialHeadline: "我们希望你免费试用 Almost",
    socialProof: "已有超过 5000 人在 Almost 上省钱",
    ctaPrimary: "解锁 Premium",
    freeTrialToggleTitle: "Free Trial",
    freeTrialToggleSubtitle: "开启后选择带试用的月付方案。",
    showAllPlans: "显示全部方案",
    hideExtraPlans: "隐藏更多方案",
    brandBadge: "Almost Premium",
    bestValueBadge: "超值推荐",
    freeTrialLabel: "免费试用",
    tryForFree: "免费试用",
    thenPriceTemplate: "然后 {{price}}",
    yearlyPerMonthTemplate: "仅 {{price}}",
    continueLimited: "继续使用受限版本",
    restore: "恢复购买",
    manage: "管理订阅",
    terms: "条款",
    privacy: "隐私",
  },
};

const normalizeLanguage = (value = "en") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");

const resolveLanguageKey = (language = "en") => normalizeLanguage(language).split("-")[0];

const isRtlLanguage = (language = "en") => normalizeLanguage(language).startsWith("ar");

const normalizeText = (value = "") => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const isUnavailableLabel = (value = "") => {
  const normalized = normalizeText(value).toLowerCase();
  return normalized === "unavailable" || normalized === "not available";
};

const sanitizeLabel = (value = "") => {
  const normalized = normalizeText(value);
  if (!normalized || isUnavailableLabel(normalized)) return "";
  return normalized;
};

const pickFirstLabel = (values = []) => {
  for (let index = 0; index < values.length; index += 1) {
    const normalized = sanitizeLabel(values[index]);
    if (normalized) return normalized;
  }
  return "";
};

const sortPlanCards = (planCards = []) => {
  const priority = {
    weekly: 0,
    monthly: 1,
    yearly: 2,
    lifetime: 3,
  };

  return (Array.isArray(planCards) ? planCards : [])
    .filter((card) => card && typeof card === "object" && normalizeText(card?.id))
    .sort((left, right) => {
      const leftId = String(left?.id || "").toLowerCase();
      const rightId = String(right?.id || "").toLowerCase();
      const leftWeight = Object.prototype.hasOwnProperty.call(priority, leftId)
        ? priority[leftId]
        : 99;
      const rightWeight = Object.prototype.hasOwnProperty.call(priority, rightId)
        ? priority[rightId]
        : 99;
      if (leftWeight !== rightWeight) return leftWeight - rightWeight;
      return leftId.localeCompare(rightId);
    });
};

const pickDefaultPlanId = (planCards = []) => {
  const available = (Array.isArray(planCards) ? planCards : []).filter(
    (card) => card?.available !== false
  );
  const weekly = available.find((card) => String(card?.id || "").toLowerCase() === "weekly");
  if (weekly?.id) return weekly.id;
  if (available[0]?.id) return available[0].id;
  return planCards[0]?.id || "weekly";
};

const applyTemplate = (template = "", replacements = {}) => {
  let result = String(template || "");
  Object.entries(replacements || {}).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), String(value ?? ""));
  });
  return result;
};

const stripLeadingApprox = (value = "") => String(value || "").replace(/^[≈~]\s*/u, "").trim();

const resolvePlanTitle = (plan = null, language = "en") => {
  const explicit = normalizeText(plan?.label || "");
  if (explicit) return explicit;

  const lang = resolveLanguageKey(language);
  const id = String(plan?.id || "").toLowerCase();
  const bundle = PLAN_TITLES_BY_LANGUAGE[id] || PLAN_TITLES_BY_LANGUAGE.premium;
  return bundle?.[lang] || bundle?.en || "Premium";
};

const resolvePlanDisplay = (plan = null, thenPriceTemplate = "Then {{price}}") => {
  const hasTrial = plan?.hasTrial === true;
  const recurringPrice = pickFirstLabel([
    plan?.postTrialPriceLabel,
    plan?.ctaPriceLabel,
    plan?.priceLabel,
  ]);

  const currentPrice = pickFirstLabel([
    plan?.ctaPriceLabel,
    plan?.priceLabel,
    plan?.postTrialPriceLabel,
  ]);

  let oldPrice = pickFirstLabel([
    plan?.secondaryKind === "strike" ? plan?.secondaryLabel : "",
    plan?.trialOriginalPriceLabel,
  ]);

  if (oldPrice && currentPrice && oldPrice === currentPrice) oldPrice = "";

  const helperCandidates = [];
  if (hasTrial && recurringPrice) {
    helperCandidates.push(applyTemplate(thenPriceTemplate, { price: recurringPrice }));
  }
  helperCandidates.push(plan?.periodEquivalentLabel, plan?.billingLabel, plan?.secondarySubLabel);
  if (plan?.secondaryKind !== "strike") {
    helperCandidates.push(plan?.secondaryLabel);
  }
  const helper = pickFirstLabel(helperCandidates);

  const savingsBadge = pickFirstLabel([
    plan?.topBadge,
    plan?.badge,
    plan?.trialDiscountLabel,
  ]);

  return {
    hasTrial,
    currentPrice,
    oldPrice,
    helper: helper && helper !== currentPrice && helper !== oldPrice ? helper : "",
    savingsBadge,
  };
};

const resolveFeatureBullets = (copy = null, language = "en", maxItems = 4) => {
  const incoming = Array.isArray(copy?.benefitBullets) ? copy.benefitBullets : [];
  const lang = resolveLanguageKey(language);
  const fallbackRows = FALLBACK_FEATURES_BY_LANGUAGE[lang] || FALLBACK_FEATURES_BY_LANGUAGE.en;

  const normalized = incoming
    .map((row) => {
      if (typeof row === "string") return normalizeText(row);
      return normalizeText(row?.label || "");
    })
    .filter(Boolean);

  const base = normalized.length ? normalized : fallbackRows;

  const unique = [];
  const seen = new Set();
  base.forEach((entry) => {
    const token = entry.toLowerCase();
    if (!token || seen.has(token)) return;
    seen.add(token);
    unique.push(entry);
  });

  const safeMax = Math.max(4, Math.round(Number(maxItems) || 4));
  const fallbackQueue = fallbackRows.filter(
    (entry) => !unique.some((item) => item.toLowerCase() === entry.toLowerCase())
  );
  while (unique.length < safeMax && fallbackQueue.length > 0) {
    unique.push(fallbackQueue.shift());
  }
  return unique.slice(0, safeMax);
};

const resolvePlanTextScale = (language = "en") => {
  const lang = resolveLanguageKey(language);
  if (lang === "de") return 0.9;
  if (lang === "fr") return 0.92;
  if (lang === "es") return 0.94;
  if (lang === "ru") return 0.93;
  if (lang === "ar") return 0.92;
  if (lang === "zh") return 0.95;
  return 1;
};

const collectTextContent = (value) => {
  if (value === null || value === undefined || typeof value === "boolean") return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(collectTextContent).join("");
  if (React.isValidElement(value)) return collectTextContent(value.props?.children);
  return "";
};

const getTextLengthUnits = (value = "") =>
  Array.from(String(value || "")).reduce((total, char) => {
    if (/\s/u.test(char)) return total + 0.35;
    if (/[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/u.test(char)) return total + 1.4;
    if (/[\u0600-\u06FF]/u.test(char)) return total + 1.05;
    if (/[A-ZА-ЯЁÄÖÜÀ-Þ]/u.test(char)) return total + 1.08;
    return total + 1;
  }, 0);

const clampNumber = (value, min, max) => Math.max(min, Math.min(max, value));

const getAdaptiveTextMetrics = ({
  children,
  style,
  numberOfLines = 1,
  minFontSize = 12,
  maxUnitsPerLine = 18,
}) => {
  const flattened = StyleSheet.flatten(style) || {};
  const baseFontSize = Number(flattened.fontSize) || 14;
  const baseLineHeight = Number(flattened.lineHeight) || Math.round(baseFontSize * 1.2);
  const safeLineCount = Math.max(1, Number(numberOfLines) || 1);
  const textUnitsPerLine = getTextLengthUnits(collectTextContent(children)) / safeLineCount;
  const safeMaxUnits = Math.max(1, Number(maxUnitsPerLine) || 1);
  const minScale = clampNumber(minFontSize / baseFontSize, 0.01, 1);
  const scale =
    textUnitsPerLine <= safeMaxUnits
      ? 1
      : clampNumber(safeMaxUnits / textUnitsPerLine, minScale, 1);
  const fontSize = Math.max(minFontSize, Math.round(baseFontSize * scale));
  const lineHeightScale = fontSize / baseFontSize;
  const lineHeight = Math.max(fontSize + 2, Math.round(baseLineHeight * lineHeightScale));

  return { fontSize, lineHeight };
};

const AdaptivePaywallText = ({
  children,
  style,
  numberOfLines = 1,
  minFontSize = 12,
  maxUnitsPerLine = 18,
  ...props
}) => (
  <Text
    {...props}
    style={[
      style,
      getAdaptiveTextMetrics({ children, style, numberOfLines, minFontSize, maxUnitsPerLine }),
    ]}
    numberOfLines={numberOfLines}
  >
    {children}
  </Text>
);

const PremiumPaywallModalV2 = ({
  visible = false,
  dismissible = true,
  copy: copyProp = null,
  planCards: planCardsProp = [],
  statusMessage = "",
  statusKind = null,
  purchaseLoadingPlan = null,
  restoring = false,
  onPlanSelect = () => {},
  onPlanPress = () => {},
  onFeatureInsightPress = () => {},
  onRestorePress = () => {},
  onManagePress = () => {},
  onTermsPress = () => {},
  onPrivacyPress = () => {},
  onClose = () => {},
  language = "en",
  safeAreaTopInset = 0,
  safeAreaBottomInset = 0,
  colors,
  statusBarOverlay = null,
}) => {
  const { height: viewportHeight } = useWindowDimensions();
  const [selectedPlanId, setSelectedPlanId] = useState(() => pickDefaultPlanId(planCardsProp));
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(false);

  const copy = useMemo(() => {
    if (copyProp && typeof copyProp === "object") return copyProp;
    return null;
  }, [copyProp]);

  const rtl = isRtlLanguage(language);
  const resolvedSafeTopInset = Math.max(0, Number(safeAreaTopInset) || 0);
  const resolvedSafeBottomInset = Math.max(0, Number(safeAreaBottomInset) || 0);
  const normalizedStatusMessage = sanitizeLabel(statusMessage);

  const compactTier = useMemo(() => {
    if (viewportHeight <= 730) {
      return {
        heroHeight: 132,
        featureCount: 4,
        featureVerticalPad: 5,
        planVerticalPad: 5,
        ctaHeight: 46,
      };
    }
    if (viewportHeight <= 820) {
      return {
        heroHeight: 144,
        featureCount: 4,
        featureVerticalPad: 6,
        planVerticalPad: 6,
        ctaHeight: 48,
      };
    }
    if (viewportHeight <= 900) {
      return {
        heroHeight: 154,
        featureCount: 4,
        featureVerticalPad: 7,
        planVerticalPad: 7,
        ctaHeight: 50,
      };
    }
    return {
      heroHeight: 166,
      featureCount: 4,
      featureVerticalPad: 8,
      planVerticalPad: 8,
      ctaHeight: 52,
    };
  }, [viewportHeight]);

  const isDarkMode = String(colors?.background || "")
    .trim()
    .toLowerCase() === "#05070d";

  const palette = useMemo(
    () => ({
      backdrop: "rgba(12,12,16,0.58)",
      sheetBg: isDarkMode ? "#11141C" : "#F7F3EC",
      heroBg: isDarkMode ? "#1A2030" : "#F3E8D5",
      cardBg: isDarkMode ? "#1A2030" : "#FFFFFF",
      cardBorder: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(16,24,40,0.11)",
      cardSelectedBg: isDarkMode ? "#222C40" : "#FFF5E9",
      cardSelectedBorder: "#F3983F",
      text: isDarkMode ? "#F2F5FF" : "#183733",
      muted: isDarkMode ? "#B2BCD8" : "#5F6E66",
      accent: "#F3983F",
      accentText: "#B56C1D",
      success: "#1FA561",
      ctaBg: "#F88D39",
      ctaText: "#FFFFFF",
      subtleButtonBg: isDarkMode ? "#1C2436" : "#FFFFFF",
      subtleButtonText: isDarkMode ? "#E7EDFF" : "#1D322E",
      divider: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(23,50,45,0.12)",
      chipBg: isDarkMode ? "rgba(255,176,76,0.2)" : "#FDE8CC",
      chipText: isDarkMode ? "#9B5B11" : "#9B5B11",
      bestValueBg: "#F3983F",
      bestValueText: "#FFF7EC",
      trialAccent: "#F07D1F",
    }),
    [isDarkMode]
  );

  const sortedPlans = useMemo(() => sortPlanCards(planCardsProp), [planCardsProp]);

  const primaryPlans = useMemo(() => {
    const byId = new Map(sortedPlans.map((plan) => [String(plan?.id || "").toLowerCase(), plan]));
    const primary = PRIMARY_PLAN_IDS.map((id) => byId.get(id)).filter(Boolean);
    if (primary.length > 0) return primary;
    return sortedPlans.slice(0, 1);
  }, [sortedPlans]);

  const additionalPlans = useMemo(() => {
    const primaryIds = new Set(primaryPlans.map((plan) => String(plan?.id || "").toLowerCase()));
    return sortedPlans.filter((plan) => !primaryIds.has(String(plan?.id || "").toLowerCase()));
  }, [primaryPlans, sortedPlans]);
  const monthlyTrialPlan = useMemo(
    () =>
      sortedPlans.find(
        (plan) => String(plan?.id || "").toLowerCase() === "monthly"
      ) || null,
    [sortedPlans]
  );

  const displayedPlans = useMemo(() => {
    if (showAllPlans) return [...primaryPlans, ...additionalPlans];
    if (freeTrialEnabled && monthlyTrialPlan?.id) {
      const ordered = [...primaryPlans, monthlyTrialPlan];
      const seen = new Set();
      return ordered.filter((plan) => {
        const planId = String(plan?.id || "").toLowerCase();
        if (!planId || seen.has(planId)) return false;
        seen.add(planId);
        return true;
      });
    }
    return primaryPlans;
  }, [additionalPlans, freeTrialEnabled, monthlyTrialPlan, primaryPlans, showAllPlans]);

  useEffect(() => {
    if (!visible) {
      setSelectedPlanId(pickDefaultPlanId(sortedPlans));
      setShowAllPlans(false);
      setFreeTrialEnabled(false);
      return;
    }
    const exists = sortedPlans.some((plan) => String(plan?.id || "") === String(selectedPlanId));
    if (!exists) {
      setSelectedPlanId(pickDefaultPlanId(sortedPlans));
    }
  }, [selectedPlanId, sortedPlans, visible]);
  useEffect(() => {
    if (!visible) return;
    const additionalIds = new Set(
      additionalPlans.map((plan) => String(plan?.id || "").toLowerCase())
    );
    const normalizedSelectedPlanId = String(selectedPlanId || "").toLowerCase();
    if (
      additionalIds.has(normalizedSelectedPlanId) &&
      !(freeTrialEnabled && normalizedSelectedPlanId === "monthly")
    ) {
      setShowAllPlans(true);
    }
  }, [additionalPlans, freeTrialEnabled, selectedPlanId, visible]);
  useEffect(() => {
    if (!visible || !freeTrialEnabled || monthlyTrialPlan?.id) return;
    setFreeTrialEnabled(false);
    setSelectedPlanId(pickDefaultPlanId(sortedPlans));
  }, [freeTrialEnabled, monthlyTrialPlan, sortedPlans, visible]);

  const selectedPlan = useMemo(() => {
    const fromState =
      sortedPlans.find((plan) => String(plan?.id || "") === String(selectedPlanId)) || null;
    if (fromState) return fromState;
    return primaryPlans[0] || null;
  }, [selectedPlanId, sortedPlans, primaryPlans]);

  const languageKey = resolveLanguageKey(language);
  const localizedUi = useMemo(
    () => FALLBACK_UI_COPY_BY_LANGUAGE[languageKey] || FALLBACK_UI_COPY_BY_LANGUAGE.en,
    [languageKey]
  );
  const planTextScale = useMemo(() => resolvePlanTextScale(language), [language]);
  const planTypography = useMemo(() => {
    const calc = (fontSize, lineHeight) => ({
      fontSize: Math.round(fontSize * planTextScale),
      lineHeight: Math.round(lineHeight * planTextScale),
    });
    return {
      yearlyPrimary: calc(22, 26),
      yearlyThen: calc(15, 18),
      yearlyPerMonth: calc(15, 18),
      monthlySingle: calc(20, 24),
      planTitle: calc(14, 17),
      planCurrentPrice: calc(15, 18),
      planOldPrice: calc(11, 13),
    };
  }, [planTextScale]);

  const features = useMemo(
    () => resolveFeatureBullets(copy, language, compactTier.featureCount),
    [compactTier.featureCount, copy, language]
  );

  const purchaseDisabled =
    restoring ||
    !!purchaseLoadingPlan ||
    !selectedPlan ||
    selectedPlan.available === false;

  const hasAnyTrialOffer = useMemo(
    () =>
      sortedPlans.some((plan) => {
        const planId = String(plan?.id || "").toLowerCase();
        return (
          (planId === "yearly" || planId === "monthly") &&
          plan?.available !== false &&
          plan?.hasTrial === true
        );
      }),
    [sortedPlans]
  );
  const selectedPlanTrialNotice = sanitizeLabel(
    hasAnyTrialOffer && selectedPlan?.hasTrial === true ? selectedPlan?.trialNoticeLabel : ""
  );
  const billingNotice = sanitizeLabel(copy?.billingNotice || "");
  const legalNotice = sanitizeLabel(copy?.legalNotice || "");
  const defaultTitle = sanitizeLabel(copy?.title || copy?.planSectionTitle || localizedUi.title);
  const trialHeadline = sanitizeLabel(copy?.v2TrialHeadline || localizedUi.trialHeadline);
  const title = hasAnyTrialOffer && trialHeadline ? trialHeadline : defaultTitle;
  const titleNumberOfLines = hasAnyTrialOffer ? 3 : 2;
  const socialProof = sanitizeLabel(
    copy?.v2SocialProofLine || copy?.socialProofLine || localizedUi.socialProof
  );
  const continueLimitedLabel = sanitizeLabel(
    copy?.v2ContinueLimitedLabel || localizedUi.continueLimited
  );
  const showAllPlansLabel = sanitizeLabel(copy?.v2ShowAllPlansLabel || localizedUi.showAllPlans);
  const hidePlansLabel = sanitizeLabel(copy?.v2HideExtraPlansLabel || localizedUi.hideExtraPlans);
  const freeTrialToggleTitle = sanitizeLabel(
    copy?.v2FreeTrialToggleTitle || localizedUi.freeTrialToggleTitle
  );
  const freeTrialToggleSubtitle = sanitizeLabel(
    copy?.v2FreeTrialToggleSubtitle || localizedUi.freeTrialToggleSubtitle
  );
  const shouldShowFreeTrialToggle = !!monthlyTrialPlan?.id;

  const primaryButtonLabel = useMemo(() => {
    if (!selectedPlan) return sanitizeLabel(copy?.ctaPrimary || localizedUi.ctaPrimary);
    if (selectedPlan?.hasTrial === true) {
      return sanitizeLabel(
        copy?.ctaPrimaryTrial ||
          copy?.ctaPrimary ||
          selectedPlan?.ctaTrialLabel ||
          localizedUi.ctaPrimary
      );
    }
    return sanitizeLabel(copy?.ctaPrimaryRegular || copy?.ctaPrimary || localizedUi.ctaPrimary);
  }, [copy?.ctaPrimary, copy?.ctaPrimaryRegular, copy?.ctaPrimaryTrial, localizedUi.ctaPrimary, selectedPlan]);

  const handleBackdropPress = useCallback(() => {
    if (!dismissible) return;
    onClose("backdrop");
  }, [dismissible, onClose]);

  const handlePrimaryPress = useCallback(() => {
    if (!selectedPlan?.id || purchaseDisabled) return;
    onPlanPress(selectedPlan.id, { source: "primary_button" });
  }, [onPlanPress, purchaseDisabled, selectedPlan]);

  const handlePlanSelect = useCallback(
    (plan) => {
      if (!plan?.id || plan?.available === false) return;
      setSelectedPlanId(plan.id);
      setFreeTrialEnabled(
        String(plan?.id || "").toLowerCase() === "monthly"
      );
      onPlanSelect(plan.id, { source: "plan_card" });
    },
    [onPlanSelect]
  );

  const handleLimitedContinue = useCallback(() => {
    if (!dismissible) return;
    onClose("continue_limited");
  }, [dismissible, onClose]);

  const handleTogglePlans = useCallback(() => {
    setShowAllPlans((prev) => {
      const next = !prev;
      if (!next) {
        const additionalIds = new Set(
          additionalPlans.map((plan) => String(plan?.id || "").toLowerCase())
        );
        const normalizedSelectedPlanId = String(selectedPlanId || "").toLowerCase();
        const keepFreeTrialMonthlySelected =
          freeTrialEnabled && normalizedSelectedPlanId === "monthly";
        if (additionalIds.has(normalizedSelectedPlanId) && !keepFreeTrialMonthlySelected) {
          const fallbackPlan = pickDefaultPlanId(primaryPlans);
          setSelectedPlanId(fallbackPlan);
          if (fallbackPlan) {
            onPlanSelect(fallbackPlan, { source: "collapse_plans" });
          }
        }
      }
      return next;
    });
  }, [additionalPlans, freeTrialEnabled, onPlanSelect, primaryPlans, selectedPlanId]);
  const handleFreeTrialToggle = useCallback(() => {
    if (!monthlyTrialPlan?.id) return;
    setFreeTrialEnabled((prev) => {
      const next = !prev;
      const nextPlanId = next ? monthlyTrialPlan.id : pickDefaultPlanId(primaryPlans.length ? primaryPlans : sortedPlans);
      if (nextPlanId) {
        setSelectedPlanId(nextPlanId);
        onPlanSelect(nextPlanId, { source: "free_trial_toggle" });
      }
      if (!next) {
        setShowAllPlans(false);
      }
      return next;
    });
  }, [monthlyTrialPlan, onPlanSelect, primaryPlans, sortedPlans]);

  const textAlignStyle = rtl ? styles.textRtl : null;

  if (!copy) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        if (!dismissible) return;
        onClose("system_back");
      }}
    >
      {statusBarOverlay}
      <View style={[styles.backdrop, { backgroundColor: palette.backdrop }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress} />

        <View
          style={[
            styles.sheet,
            {
              backgroundColor: palette.sheetBg,
              paddingTop: 2 + Math.min(8, resolvedSafeTopInset),
              paddingBottom: 6 + Math.min(10, resolvedSafeBottomInset),
            },
          ]}
        >
          {dismissible ? (
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.headerDismissTextButton}
                onPress={handleLimitedContinue}
                activeOpacity={0.72}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <AdaptivePaywallText
                  style={[styles.headerDismissButtonText, { color: palette.text }, textAlignStyle]}
                  numberOfLines={1}
                  minFontSize={10}
                  maxUnitsPerLine={28}
                >
                  {continueLimitedLabel}
                </AdaptivePaywallText>
              </TouchableOpacity>
            </View>
          ) : null}

          <ScrollView
            style={styles.mainScroll}
            contentContainerStyle={styles.mainScrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View
              style={[
                styles.hero,
                {
                  backgroundColor: palette.heroBg,
                  height: compactTier.heroHeight,
                  borderColor: palette.cardBorder,
                },
              ]}
            >
              <Image source={HERO_REFERENCE_VISUAL} style={styles.heroVisual} resizeMode="cover" />
            </View>

            <View style={styles.copyBlock}>
              <AdaptivePaywallText
                style={[styles.title, { color: palette.text }, textAlignStyle]}
                numberOfLines={titleNumberOfLines}
                minFontSize={14}
                maxUnitsPerLine={22}
              >
                {title}
              </AdaptivePaywallText>
              {!!socialProof ? (
                <View
                  style={[
                    styles.socialProofPill,
                    { backgroundColor: palette.chipBg, borderColor: palette.accent },
                  ]}
                >
                  <AdaptivePaywallText
                    style={[styles.socialProofText, { color: palette.accentText }, textAlignStyle]}
                    numberOfLines={1}
                    minFontSize={10}
                    maxUnitsPerLine={38}
                  >
                    {socialProof}
                  </AdaptivePaywallText>
                </View>
              ) : null}
              {!!normalizedStatusMessage ? (
                <View
                  style={[
                    styles.statusBanner,
                    {
                      backgroundColor:
                        statusKind === "warning" ? "rgba(248,185,83,0.18)" : "rgba(255,122,94,0.16)",
                      borderColor:
                        statusKind === "warning" ? "rgba(248,185,83,0.32)" : "rgba(255,122,94,0.28)",
                    },
                  ]}
                >
                  <AdaptivePaywallText
                    style={[styles.statusBannerText, { color: palette.text }, textAlignStyle]}
                    numberOfLines={2}
                    minFontSize={10}
                    maxUnitsPerLine={38}
                  >
                    {normalizedStatusMessage}
                  </AdaptivePaywallText>
                </View>
              ) : null}
            </View>

            <View style={styles.featuresWrap}>
              {features.map((label, index) => {
                const sourceRow = Array.isArray(copy?.benefitBullets) ? copy.benefitBullets[index] : null;
                const rowId = sanitizeLabel(sourceRow?.id || "");
                const featureKey = sanitizeLabel(sourceRow?.featureKey || "");
                const interactive = !!sourceRow?.interactive && !!featureKey;
                const RowComponent = interactive ? TouchableOpacity : View;

                return (
                  <RowComponent
                    key={`${label}_${index}`}
                    style={[
                      styles.featureRow,
                      {
                        backgroundColor: palette.cardBg,
                        borderColor: palette.cardBorder,
                        paddingVertical: compactTier.featureVerticalPad,
                      },
                    ]}
                    onPress={
                      interactive
                        ? () => onFeatureInsightPress(featureKey, { rowId: rowId || featureKey })
                        : undefined
                    }
                    activeOpacity={0.86}
                  >
                    <View
                      style={[
                        styles.featureToken,
                        { borderColor: palette.cardBorder },
                      ]}
                    >
                      <Image
                        source={BULLET_ICON_IMAGES[index % BULLET_ICON_IMAGES.length]}
                        style={styles.featureTokenImage}
                        resizeMode="cover"
                      />
                    </View>

                    <Text style={[styles.featureLabel, { color: palette.text }, textAlignStyle]} numberOfLines={2}>
                      {label}
                    </Text>
                  </RowComponent>
                );
              })}
            </View>

            {shouldShowFreeTrialToggle ? (
              <TouchableOpacity
                style={[
                  styles.freeTrialToggleCard,
                  {
                    backgroundColor: freeTrialEnabled ? palette.cardSelectedBg : palette.cardBg,
                    borderColor: freeTrialEnabled ? palette.cardSelectedBorder : palette.cardBorder,
                  },
                ]}
                onPress={handleFreeTrialToggle}
                disabled={restoring || !!purchaseLoadingPlan}
                activeOpacity={0.88}
              >
                <View style={[styles.freeTrialToggleTextBlock, rtl ? styles.freeTrialToggleTextBlockRtl : null]}>
                  <Text
                    style={[styles.freeTrialToggleTitle, { color: palette.text }, textAlignStyle]}
                    numberOfLines={1}
                  >
                    {freeTrialToggleTitle}
                  </Text>
                  <Text
                    style={[styles.freeTrialToggleSubtitle, { color: palette.muted }, textAlignStyle]}
                    numberOfLines={2}
                  >
                    {freeTrialToggleSubtitle}
                  </Text>
                </View>
                <View
                  style={[
                    styles.freeTrialSwitchTrack,
                    {
                      backgroundColor: freeTrialEnabled ? palette.ctaBg : palette.chipBg,
                      borderColor: freeTrialEnabled ? palette.cardSelectedBorder : palette.cardBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.freeTrialSwitchThumb,
                      freeTrialEnabled ? styles.freeTrialSwitchThumbOn : null,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            ) : null}

            <View style={styles.planList}>
              {displayedPlans.map((plan) => {
              const planId = String(plan?.id || "").toLowerCase();
              const isYearly = planId === "yearly";
              const isMonthly = planId === "monthly";
              const selected = String(plan?.id || "") === String(selectedPlan?.id || "");
              const thenPriceTemplate = sanitizeLabel(
                copy?.v2ThenPriceTemplate || localizedUi.thenPriceTemplate
              );
              const yearlyPerMonthTemplate = sanitizeLabel(
                copy?.v2YearlyPerMonthTemplate || localizedUi.yearlyPerMonthTemplate
              );
              const display = resolvePlanDisplay(plan, thenPriceTemplate);
              const titleLabel = resolvePlanTitle(plan, language);
              const freeTrialLabel = sanitizeLabel(
                plan?.trialDurationLabel ||
                  copy?.v2FreeTrialLabel ||
                  localizedUi.freeTrialLabel ||
                  copy?.v2TryForFreeLabel ||
                  localizedUi.tryForFree
              );
              const showMonthlyFreeTrialBadge = freeTrialEnabled && isMonthly && !!freeTrialLabel;
              const showTrialBadge =
                showMonthlyFreeTrialBadge ||
                (isYearly && plan?.hasTrial === true && !!freeTrialLabel);
              const yearlyPrice = pickFirstLabel([
                plan?.postTrialPriceLabel,
                plan?.ctaPriceLabel,
                plan?.priceLabel,
              ]);
              const yearlyPrimaryLine = plan?.hasTrial === true
                ? freeTrialLabel
                : titleLabel;
              const yearlyThenLine = yearlyPrice
                ? plan?.hasTrial === true
                  ? applyTemplate(thenPriceTemplate, { price: yearlyPrice })
                  : yearlyPrice
                : "";
              const yearlyPerMonthPrice = stripLeadingApprox(
                pickFirstLabel([plan?.periodEquivalentLabel])
              );
              const yearlyPerMonthLine = yearlyPerMonthPrice
                ? applyTemplate(yearlyPerMonthTemplate, { price: yearlyPerMonthPrice })
                : "";
              const monthlyPrice = pickFirstLabel([
                plan?.ctaPriceLabel,
                plan?.priceLabel,
                plan?.postTrialPriceLabel,
              ]);
              const monthlyLine = monthlyPrice ? `${titleLabel} — ${monthlyPrice}` : titleLabel;
              const showLegacyLayout = !isYearly && !isMonthly;

              return (
                <TouchableOpacity
                  key={String(plan?.id || "")}
                  style={[
                    styles.planCard,
                    {
                      backgroundColor: selected ? palette.cardSelectedBg : palette.cardBg,
                      borderColor: selected ? palette.cardSelectedBorder : palette.cardBorder,
                      paddingVertical: compactTier.planVerticalPad,
                    },
                  ]}
                  activeOpacity={0.9}
                  onPress={() => handlePlanSelect(plan)}
                  disabled={plan?.available === false}
                >
                  <View style={[styles.planMainRow, rtl ? styles.planMainRowRtl : null]}>
                    <View
                      style={[
                        styles.planIconWrap,
                        rtl ? styles.planIconWrapRtl : null,
                        isYearly ? styles.planIconWrapYearly : null,
                        isMonthly ? styles.planIconWrapMonthly : null,
                        { borderColor: palette.cardBorder },
                      ]}
                    >
                      <Text style={styles.planIconText}>{isYearly ? "👑" : isMonthly ? "📅" : "✨"}</Text>
                    </View>

                    <View style={[styles.planContent, rtl ? styles.planContentRtl : null]}>
                      {isYearly || showTrialBadge ? (
                        <View style={[styles.planBadgeRow, rtl ? styles.planBadgeRowRtl : null]}>
                          {isYearly ? (
                            <View style={[styles.bestValueBadge, { backgroundColor: palette.bestValueBg }]}>
                              <Text style={[styles.bestValueBadgeText, { color: palette.bestValueText }]}>
                                {copy?.v2BestValueBadge || localizedUi.bestValueBadge}
                              </Text>
                            </View>
                          ) : null}
                          {showTrialBadge ? (
                            <View
                              style={[
                                styles.trialBadge,
                                isYearly ? styles.trialBadgeWithBestValue : null,
                                {
                                  backgroundColor: showMonthlyFreeTrialBadge
                                    ? palette.success
                                    : palette.accent,
                                },
                              ]}
                            >
                              <AdaptivePaywallText
                                style={styles.trialBadgeText}
                                numberOfLines={1}
                                minFontSize={10}
                                maxUnitsPerLine={18}
                              >
                                {freeTrialLabel}
                              </AdaptivePaywallText>
                            </View>
                          ) : null}
                        </View>
                      ) : null}

                      {showLegacyLayout && display.savingsBadge ? (
                        <View style={styles.planBadgeRow}>
                          <View style={[styles.secondaryBadge, { backgroundColor: palette.chipBg }]}>
                            <Text style={[styles.secondaryBadgeText, { color: palette.chipText }]} numberOfLines={1}>
                              {display.savingsBadge}
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      {isYearly ? (
                        <>
                          {!!yearlyPrimaryLine ? (
                            <AdaptivePaywallText
                              style={[
                                styles.planYearlyPrimaryLine,
                                planTypography.yearlyPrimary,
                                { color: palette.text },
                                textAlignStyle,
                              ]}
                              numberOfLines={1}
                              minFontSize={16}
                              maxUnitsPerLine={18}
                            >
                              {yearlyPrimaryLine}
                            </AdaptivePaywallText>
                          ) : null}
                          {!!yearlyThenLine ? (
                            <AdaptivePaywallText
                              style={[
                                styles.planYearlyThenLine,
                                planTypography.yearlyThen,
                                { color: palette.text },
                                textAlignStyle,
                              ]}
                              numberOfLines={1}
                              minFontSize={12}
                              maxUnitsPerLine={24}
                            >
                              {yearlyThenLine}
                            </AdaptivePaywallText>
                          ) : null}
                          {!!yearlyPerMonthLine ? (
                            <AdaptivePaywallText
                              style={[
                                styles.planYearlyPerMonthLine,
                                planTypography.yearlyPerMonth,
                                { color: palette.trialAccent },
                                textAlignStyle,
                              ]}
                              numberOfLines={1}
                              minFontSize={12}
                              maxUnitsPerLine={24}
                            >
                              {yearlyPerMonthLine}
                            </AdaptivePaywallText>
                          ) : null}
                        </>
                      ) : null}

                      {isMonthly ? (
                        <AdaptivePaywallText
                          style={[
                            styles.planMonthlySingleLine,
                            planTypography.monthlySingle,
                            { color: palette.text },
                            textAlignStyle,
                          ]}
                          numberOfLines={1}
                          minFontSize={14}
                          maxUnitsPerLine={26}
                        >
                          {monthlyLine}
                        </AdaptivePaywallText>
                      ) : null}

                      {showLegacyLayout ? (
                        <>
                          <AdaptivePaywallText
                            style={[
                              styles.planTitle,
                              planTypography.planTitle,
                              { color: palette.text },
                              textAlignStyle,
                            ]}
                            numberOfLines={1}
                            minFontSize={12}
                            maxUnitsPerLine={18}
                          >
                            {titleLabel}
                          </AdaptivePaywallText>
                          {!!display.oldPrice ? (
                            <AdaptivePaywallText
                              style={[
                                styles.planOldPrice,
                                planTypography.planOldPrice,
                                { color: palette.muted },
                                textAlignStyle,
                              ]}
                              numberOfLines={1}
                              minFontSize={10}
                              maxUnitsPerLine={18}
                            >
                              {display.oldPrice}
                            </AdaptivePaywallText>
                          ) : null}
                          {!!display.currentPrice ? (
                            <AdaptivePaywallText
                              style={[
                                styles.planCurrentPrice,
                                planTypography.planCurrentPrice,
                                {
                                  color: display.hasTrial ? palette.trialAccent : palette.accentText,
                                },
                                textAlignStyle,
                              ]}
                              numberOfLines={1}
                              minFontSize={12}
                              maxUnitsPerLine={18}
                            >
                              {display.currentPrice}
                            </AdaptivePaywallText>
                          ) : null}
                        </>
                      ) : null}
                    </View>

                    <View style={styles.planRightSide}>
                      <View
                        style={[
                          styles.planSelector,
                          {
                            borderColor: selected ? palette.cardSelectedBorder : palette.cardBorder,
                            backgroundColor: selected ? palette.cardSelectedBorder : "transparent",
                          },
                        ]}
                      >
                        {selected ? <Text style={styles.planSelectorTick}>✓</Text> : null}
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
              })}
            </View>

            {additionalPlans.length > 0 ? (
              <TouchableOpacity
                style={[
                  styles.showAllPlansButton,
                  { backgroundColor: palette.cardBg, borderColor: palette.cardBorder },
                ]}
                onPress={handleTogglePlans}
                activeOpacity={0.86}
              >
                <Text style={[styles.showAllPlansText, { color: palette.text }, textAlignStyle]}>
                  {showAllPlans ? hidePlansLabel : showAllPlansLabel}
                </Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                {
                  backgroundColor: purchaseDisabled ? "rgba(248,141,57,0.48)" : palette.ctaBg,
                  minHeight: compactTier.ctaHeight,
                },
              ]}
              onPress={handlePrimaryPress}
              disabled={purchaseDisabled}
              activeOpacity={0.9}
            >
              {purchaseLoadingPlan ? (
                <ActivityIndicator color={palette.ctaText} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.offerDisclosureBlock}>
              {!!billingNotice ? (
                <Text
                  style={[styles.offerDisclosureText, { color: palette.muted }, textAlignStyle]}
                  numberOfLines={2}
                >
                  {billingNotice}
                </Text>
              ) : null}
              {!!selectedPlanTrialNotice ? (
                <Text
                  style={[styles.offerDisclosureText, { color: palette.muted }, textAlignStyle]}
                  numberOfLines={3}
                >
                  {selectedPlanTrialNotice}
                </Text>
              ) : null}
              {!!legalNotice ? (
                <Text
                  style={[styles.offerDisclosureText, { color: palette.muted }, textAlignStyle]}
                  numberOfLines={2}
                >
                  {legalNotice}
                </Text>
              ) : null}
            </View>

            <View style={styles.secondaryButtonsRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: palette.subtleButtonBg,
                    borderColor: palette.cardBorder,
                  },
                ]}
                onPress={() => onRestorePress({ source: "restore_button" })}
                disabled={!!purchaseLoadingPlan || restoring}
                activeOpacity={0.85}
              >
                {restoring ? (
                  <ActivityIndicator size="small" color={palette.subtleButtonText} />
                ) : (
                  <Text style={[styles.secondaryButtonText, { color: palette.subtleButtonText }, textAlignStyle]}>
                    {copy?.ctaRestore || localizedUi.restore}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: palette.subtleButtonBg,
                    borderColor: palette.cardBorder,
                  },
                ]}
                onPress={() => onManagePress({ source: "manage_button" })}
                disabled={!!purchaseLoadingPlan || restoring}
                activeOpacity={0.85}
              >
                <Text style={[styles.secondaryButtonText, { color: palette.subtleButtonText }, textAlignStyle]}>
                  {copy?.ctaManage || localizedUi.manage}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.legalLinksRow, { borderTopColor: palette.divider }]}>
              <TouchableOpacity onPress={() => onTermsPress({ source: "terms_link" })} activeOpacity={0.82}>
                <Text style={[styles.legalLinkText, { color: palette.muted }, textAlignStyle]}>
                  {copy?.legalTermsLabel || localizedUi.terms}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.legalSeparator, { color: palette.muted }]}>|</Text>

              <TouchableOpacity onPress={() => onPrivacyPress({ source: "privacy_link" })} activeOpacity={0.82}>
                <Text style={[styles.legalLinkText, { color: palette.muted }, textAlignStyle]}>
                  {copy?.legalPrivacyLabel || localizedUi.privacy}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: "relative",
    flex: 1,
    justifyContent: "flex-end",
    zIndex: 1,
    elevation: 1,
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: "95%",
    paddingHorizontal: 16,
  },
  mainScroll: {
    flex: 1,
    minHeight: 0,
  },
  mainScrollContent: {
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 3,
  },
  headerDismissTextButton: {
    maxWidth: "72%",
    minHeight: 20,
    paddingHorizontal: 2,
    paddingVertical: 1,
    justifyContent: "center",
    alignItems: "flex-end",
    alignSelf: "flex-end",
    flexShrink: 1,
  },
  headerDismissButtonText: {
    textAlign: "right",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: "700",
  },
  hero: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 6,
  },
  heroVisual: {
    width: "100%",
    height: "100%",
  },
  copyBlock: {
    alignItems: "center",
    marginBottom: 6,
  },
  title: {
    textAlign: "center",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  socialProofPill: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  socialProofText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "700",
  },
  statusBanner: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusBannerText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  featuresWrap: {
    marginBottom: 6,
  },
  featureRow: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  featureToken: {
    width: 28,
    height: 28,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  featureTokenImage: {
    width: "100%",
    height: "100%",
  },
  featureLabel: {
    flex: 1,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
  },
  freeTrialToggleCard: {
    borderWidth: 2,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  freeTrialToggleTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  freeTrialToggleTextBlockRtl: {
    alignItems: "flex-end",
  },
  freeTrialToggleTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900",
  },
  freeTrialToggleSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "700",
  },
  freeTrialSwitchTrack: {
    width: 58,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
    justifyContent: "center",
  },
  freeTrialSwitchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  freeTrialSwitchThumbOn: {
    alignSelf: "flex-end",
  },
  planList: {
    marginBottom: 6,
  },
  planCard: {
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  planMainRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
  },
  planMainRowRtl: {
    flexDirection: "row-reverse",
  },
  planIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "#F7F1E5",
  },
  planIconWrapRtl: {
    marginRight: 0,
    marginLeft: 10,
  },
  planIconWrapYearly: {
    borderRadius: 22,
  },
  planIconWrapMonthly: {
    borderRadius: 12,
  },
  planIconText: {
    fontSize: 21,
    lineHeight: 23,
  },
  planContent: {
    flex: 1,
    minWidth: 0,
    paddingRight: 6,
  },
  planContentRtl: {
    paddingRight: 0,
    paddingLeft: 8,
    alignItems: "flex-end",
  },
  planLeading: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  planBadgeRow: {
    minHeight: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 1,
  },
  planBadgeRowRtl: {
    flexDirection: "row-reverse",
  },
  bestValueBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bestValueBadgeText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  trialBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: "92%",
  },
  trialBadgeWithBestValue: {
    marginStart: 6,
  },
  trialBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  secondaryBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    maxWidth: "90%",
  },
  secondaryBadgeText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "800",
  },
  planTitle: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "900",
  },
  planYearlyPrimaryLine: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  planYearlyThenLine: {
    marginTop: 0,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "600",
  },
  planYearlyPerMonthLine: {
    marginTop: 1,
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "800",
  },
  planMonthlySingleLine: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  planPriceGroup: {
    minWidth: 112,
    alignItems: "flex-start",
    paddingRight: 8,
  },
  planOldPrice: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "600",
    textDecorationLine: "line-through",
  },
  planCurrentPrice: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "900",
  },
  planRightSide: {
    minWidth: 46,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  planSelector: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  planSelectorTick: {
    fontSize: 13,
    lineHeight: 15,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  showAllPlansButton: {
    borderWidth: 1,
    borderRadius: 14,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    paddingHorizontal: 12,
  },
  showAllPlansText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
  },
  footer: {
    paddingTop: 1,
    alignItems: "stretch",
  },
  primaryButton: {
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    width: "100%",
    alignSelf: "stretch",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "900",
    letterSpacing: -0.2,
    textAlign: "center",
  },
  offerDisclosureBlock: {
    marginTop: 5,
    rowGap: 2,
  },
  offerDisclosureText: {
    textAlign: "center",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
  },
  secondaryButtonsRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    columnGap: 8,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  secondaryButtonText: {
    textAlign: "center",
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  legalLinksRow: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  legalLinkText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
  },
  legalSeparator: {
    marginHorizontal: 10,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
  },
  textRtl: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});

export default React.memo(PremiumPaywallModalV2);

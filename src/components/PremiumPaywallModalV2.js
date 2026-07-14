import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Platform,
  useWindowDimensions,
} from "react-native";

const HERO_REFERENCE_VISUAL = require("../../assets/paywall/v2/hero_reference.jpg");

const ANDROID_PRIMARY_PLAN_IDS = ["monthly", "yearly", "weekly"];
const DEFAULT_PRIMARY_PLAN_IDS = ["monthly", "yearly", "weekly"];
const PRIMARY_PLAN_IDS =
  Platform.OS === "android" ? ANDROID_PRIMARY_PLAN_IDS : DEFAULT_PRIMARY_PLAN_IDS;
const FREE_TRIAL_DISPLAY_PLAN_ID = "yearly";
const FALLBACK_FEATURES_BY_LANGUAGE = {
  ru: [
    "Неограниченные сохранения без дневного лимита",
    "Больше целей, чтобы видеть реальный прогресс накоплений",
    "Умный трекинг искушений показывает, где деньги утекают чаще всего",
    "Глубокая аналитика помогает закреплять привычки и экономить осознаннее",
  ],
  en: [
    "Unlimited saves without the daily free limit",
    "More savings goals so every resisted purchase has a destination",
    "Smart temptation tracking shows where money leaks most often",
    "Deeper progress insights help turn saved impulses into better habits",
  ],
  es: [
    "Ahorros ilimitados sin el límite diario gratis",
    "Más metas para que cada compra resistida tenga destino",
    "El seguimiento inteligente muestra dónde se escapa más dinero",
    "Insights más profundos ayudan a convertir impulsos evitados en hábitos",
  ],
  fr: [
    "Épargnes illimitées sans limite quotidienne gratuite",
    "Plus d'objectifs pour donner une destination à chaque achat évité",
    "Le suivi intelligent montre où l'argent s'échappe le plus",
    "Des analyses plus profondes transforment les impulsions évitées en habitudes",
  ],
  de: [
    "Unbegrenztes Sparen ohne tägliches Gratislimit",
    "Mehr Sparziele, damit jeder widerstandene Kauf ein Ziel hat",
    "Smartes Tracking zeigt, wo Geld am häufigsten verloren geht",
    "Tiefere Analysen machen aus widerstandenen Impulsen bessere Gewohnheiten",
  ],
  pt: [
    "Poupanças ilimitadas sem o limite diário grátis",
    "Mais metas para cada compra evitada ter destino",
    "O acompanhamento inteligente mostra onde o dinheiro escapa mais",
    "Insights mais profundos ajudam a transformar impulsos evitados em hábitos",
  ],
  it: [
    "Risparmi illimitati senza il limite giornaliero gratuito",
    "Più obiettivi così ogni acquisto evitato ha una destinazione",
    "Il tracking intelligente mostra dove il denaro scappa più spesso",
    "Insight più profondi aiutano a trasformare gli impulsi evitati in abitudini",
  ],
  ar: [
    "ادخار غير محدود بلا حد يومي مجاني",
    "أهداف أكثر ليصبح لكل شراء تم مقاومته وجهة واضحة",
    "التتبع الذكي يوضح أين يتسرّب المال غالباً",
    "رؤى أعمق تساعد على تحويل مقاومة الاندفاعات إلى عادات أفضل",
  ],
  zh: [
    "不受每日免费次数限制，持续记录省下的钱",
    "更多储蓄目标，让每次克制消费都有去处",
    "智能追踪帮你看清钱最常流失在哪里",
    "更深入的进度洞察，把克制冲动变成稳定习惯",
  ],
  ko: [
    "일일 무료 제한 없이 절약 기록을 계속 남기기",
    "더 많은 목표로 참아낸 소비마다 목적지를 만들기",
    "스마트 유혹 추적으로 돈이 새는 지점을 확인하기",
    "깊은 진행 인사이트로 절약 행동을 습관으로 바꾸기",
  ],
};

const PLAN_TITLES_BY_LANGUAGE = {
  yearly: {
    ru: "Годовой",
    en: "Yearly",
    es: "Anual",
    fr: "Annuel",
    de: "Jährlich",
    pt: "Anual",
    it: "Annuale",
    ar: "سنوي",
    zh: "年付",
    ko: "연간",
  },
  monthly: {
    ru: "Ежемесячный",
    en: "Monthly",
    es: "Mensual",
    fr: "Mensuel",
    de: "Monatlich",
    pt: "Mensal",
    it: "Mensile",
    ar: "شهري",
    zh: "月付",
    ko: "월간",
  },
  weekly: {
    ru: "Еженедельный",
    en: "Weekly",
    es: "Semanal",
    fr: "Hebdomadaire",
    de: "Wöchentlich",
    pt: "Semanal",
    it: "Settimanale",
    ar: "أسبوعي",
    zh: "周付",
    ko: "주간",
  },
  lifetime: {
    ru: "Навсегда",
    en: "Lifetime",
    es: "De por vida",
    fr: "À vie",
    de: "Lebenslang",
    pt: "Vitalício",
    it: "A vita",
    ar: "مدى الحياة",
    zh: "终身",
    ko: "평생",
  },
  premium: {
    ru: "Premium",
    en: "Premium",
    es: "Premium",
    fr: "Premium",
    de: "Premium",
    pt: "Premium",
    it: "Premium",
    ar: "Premium",
    zh: "Premium",
    ko: "Premium",
  },
};

const KNOWN_PLAN_IDS = ["weekly", "monthly", "yearly", "lifetime"];

const FALLBACK_UI_COPY_BY_LANGUAGE = {
  ru: {
    title: "Выберите план Premium",
    trialHeadline: "Мы хотим, чтобы вы попробовали Almost бесплатно",
    socialProof: "Больше ясности, меньше импульсивных решений",
    ctaPrimary: "Разблокировать Premium",
    freeTrialToggleTitle: "Бесплатный пробный период",
    freeTrialToggleSubtitle: "Включите, чтобы выбрать план с пробным периодом.",
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
    socialProof: "More clarity, fewer impulsive decisions",
    ctaPrimary: "Unlock Premium",
    freeTrialToggleTitle: "Free Trial",
    freeTrialToggleSubtitle: "Turn on to select the plan with a trial.",
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
    socialProof: "Más claridad, menos decisiones impulsivas",
    ctaPrimary: "Desbloquear Premium",
    freeTrialToggleTitle: "Prueba gratis",
    freeTrialToggleSubtitle: "Actívalo para elegir el plan con prueba.",
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
    socialProof: "Plus de clarté, moins de décisions impulsives",
    ctaPrimary: "Débloquer Premium",
    freeTrialToggleTitle: "Essai gratuit",
    freeTrialToggleSubtitle: "Active-le pour choisir l'offre avec essai.",
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
    socialProof: "Mehr Klarheit, weniger Impulskäufe",
    ctaPrimary: "Premium freischalten",
    freeTrialToggleTitle: "Kostenlose Testphase",
    freeTrialToggleSubtitle: "Aktivieren, um den Plan mit Testphase zu wählen.",
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
  pt: {
    title: "Escolhe o teu plano Premium",
    trialHeadline: "Experimenta Almost grátis",
    socialProof: "Mais clareza, menos decisões por impulso",
    ctaPrimary: "Desbloquear Premium",
    freeTrialToggleTitle: "Teste grátis",
    freeTrialToggleSubtitle: "Ativa para escolher um plano com teste.",
    brandBadge: "Almost Premium",
    bestValueBadge: "MELHOR VALOR",
    freeTrialLabel: "Teste grátis",
    tryForFree: "Experimentar grátis",
    thenPriceTemplate: "Depois {{price}}",
    yearlyPerMonthTemplate: "Só {{price}}",
    continueLimited: "Continuar limitado",
    restore: "Restaurar compras",
    manage: "Gerir assinatura",
    terms: "Termos",
    privacy: "Privacidade",
  },
  it: {
    title: "Scegli il piano Premium",
    trialHeadline: "Prova Almost gratis",
    socialProof: "Più chiarezza, meno decisioni impulsive",
    ctaPrimary: "Sblocca Premium",
    freeTrialToggleTitle: "Prova gratis",
    freeTrialToggleSubtitle: "Attiva per scegliere un piano con prova.",
    brandBadge: "Almost Premium",
    bestValueBadge: "MIGLIOR VALORE",
    freeTrialLabel: "Prova gratis",
    tryForFree: "Prova gratis",
    thenPriceTemplate: "Poi {{price}}",
    yearlyPerMonthTemplate: "Solo {{price}}",
    continueLimited: "Continua limitato",
    restore: "Ripristina acquisti",
    manage: "Gestisci abbonamento",
    terms: "Termini",
    privacy: "Privacy",
  },
  ar: {
    title: "اختر خطة Premium الخاصة بك",
    trialHeadline: "نريدك أن تجرّب Almost مجاناً",
    socialProof: "وضوح أكبر وقرارات اندفاعية أقل",
    ctaPrimary: "افتح Premium",
    freeTrialToggleTitle: "تجربة مجانية",
    freeTrialToggleSubtitle: "فعّله لاختيار الخطة مع الفترة التجريبية.",
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
    socialProof: "更清晰地掌控消费，减少冲动决定",
    ctaPrimary: "解锁 Premium",
    freeTrialToggleTitle: "免费试用",
    freeTrialToggleSubtitle: "开启后选择带试用的方案。",
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
  ko: {
    title: "Premium 플랜 선택",
    trialHeadline: "Almost를 무료로 체험해 보세요",
    socialProof: "더 명확하게 보고, 충동적인 결정을 줄이세요",
    ctaPrimary: "Premium 잠금 해제",
    freeTrialToggleTitle: "무료 체험",
    freeTrialToggleSubtitle: "체험 기간이 포함된 플랜을 선택하려면 켜세요.",
    brandBadge: "Almost Premium",
    bestValueBadge: "최고의 가치",
    freeTrialLabel: "무료 체험",
    tryForFree: "무료로 체험하기",
    thenPriceTemplate: "이후 {{price}}",
    yearlyPerMonthTemplate: "월 {{price}}",
    continueLimited: "제한 버전으로 계속",
    restore: "구매 복원",
    manage: "구독 관리",
    terms: "이용 약관",
    privacy: "개인정보 처리방침",
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

const normalizePlanId = (value = "") => normalizeText(value).toLowerCase();
const parsePlanPriceValue = (value = "") => {
  const normalized = String(value || "").replace(/\s/g, "").replace(/[^\d,.-]/g, "");
  if (!normalized) return null;
  const hasDot = normalized.includes(".");
  const hasComma = normalized.includes(",");
  let decimal = normalized;
  if (hasDot && hasComma) {
    decimal =
      normalized.lastIndexOf(",") > normalized.lastIndexOf(".")
        ? normalized.replace(/\./g, "").replace(",", ".")
        : normalized.replace(/,/g, "");
  } else if (hasComma) {
    decimal = normalized.replace(",", ".");
  }
  const parsed = Number.parseFloat(decimal);
  return Number.isFinite(parsed) ? parsed : null;
};
const resolvePlanKindFromToken = (value = "") => {
  const normalized = normalizePlanId(value)
    .replace(/[._-]+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!normalized) return "";
  if (KNOWN_PLAN_IDS.includes(normalized)) return normalized;
  if (normalized === "annual" || normalized === "annually" || normalized === "annuale") {
    return "yearly";
  }
  if (normalized.includes("lifetime") || normalized.includes("life time")) return "lifetime";
  if (normalized.includes("vitalicio") || normalized.includes("a vita")) return "lifetime";
  if (normalized.includes("de por vida") || normalized.includes("lebenslang")) return "lifetime";
  if (normalized.includes("annual") || normalized.includes("anual")) return "yearly";
  if (normalized.includes("year") || normalized.includes("yearly")) return "yearly";
  if (normalized.includes("annuale") || normalized.includes("jahr")) return "yearly";
  if (normalized.includes("monthly") || normalized.includes("month")) return "monthly";
  if (normalized.includes("mensal") || normalized.includes("mensile")) return "monthly";
  if (normalized.includes("monat")) return "monthly";
  if (normalized.includes("weekly") || normalized.includes("week")) return "weekly";
  if (normalized.includes("semanal") || normalized.includes("settimanale")) return "weekly";
  if (normalized.includes("woche")) return "weekly";
  return "";
};
const resolvePlanKind = (plan = null, index = -1, plans = []) => {
  const candidates = [
    plan?.planId,
    plan?.kind,
    plan?.plan,
    plan?.type,
    plan?.id,
    plan?.productIdentifier,
    plan?.productId,
    plan?.packageType,
    plan?.package?.packageType,
    plan?.package?.identifier,
    plan?.package?.product?.identifier,
  ];
  for (const candidate of candidates) {
    const resolved = resolvePlanKindFromToken(candidate);
    if (resolved) return resolved;
  }

  const text = [
    plan?.label,
    plan?.badge,
    plan?.topBadge,
    plan?.billingLabel,
    plan?.secondaryLabel,
    plan?.secondarySubLabel,
    plan?.priceLabel,
    plan?.ctaPriceLabel,
  ].join(" ");
  const fromText = resolvePlanKindFromToken(text);
  if (fromText) return fromText;

  const normalizedBadgeKind = normalizePlanId(plan?.badgeKind || plan?.topBadgeKind || "");
  if (
    normalizedBadgeKind === "save" ||
    Number(plan?.discountPercent || plan?.overallDiscountPercent || 0) > 0
  ) {
    return "yearly";
  }

  if (Array.isArray(plans) && plans.length >= 4 && index >= 0) {
    if (index === 0) return "yearly";
    if (index === plans.length - 1) return "lifetime";
    const ownPrice = parsePlanPriceValue(plan?.priceLabel || plan?.ctaPriceLabel);
    const siblingPrices = plans
      .filter((entry, entryIndex) => entryIndex !== index)
      .map((entry) => parsePlanPriceValue(entry?.priceLabel || entry?.ctaPriceLabel))
      .filter((value) => Number.isFinite(value));
    if (Number.isFinite(ownPrice) && siblingPrices.length) {
      const lowerCount = siblingPrices.filter((value) => ownPrice > value).length;
      if (lowerCount >= 1) return "monthly";
      return "weekly";
    }
    if (index === 1) return "monthly";
    if (index === 2) return "weekly";
  }

  return "";
};
const isVisiblePaywallPlan = (plan = null) =>
  (resolvePlanKind(plan) || normalizePlanId(plan?.id)) !== "lifetime";

const isTrialOfferPlan = (plan = null) => plan?.available !== false && plan?.hasTrial === true;

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
    monthly: 0,
    yearly: 1,
    weekly: 2,
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
  const preferred = available.find((card) => card?.recommended);
  if (preferred?.id) return preferred.id;
  const primary = PRIMARY_PLAN_IDS
    .map((id) => available.find((card) => normalizePlanId(card?.id) === id))
    .find(Boolean);
  if (primary?.id) return primary.id;
  if (available[0]?.id) return available[0].id;
  return planCards[0]?.id || PRIMARY_PLAN_IDS[0] || "monthly";
};

const applyTemplate = (template = "", replacements = {}) => {
  let result = String(template || "");
  Object.entries(replacements || {}).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, "g"), String(value ?? ""));
  });
  return result;
};

const stripLeadingApprox = (value = "") => String(value || "").replace(/^[≈~]\s*/u, "").trim();

const resolvePlanTitle = (plan = null, language = "en", planKind = "") => {
  const lang = resolveLanguageKey(language);
  const id = planKind || resolvePlanKind(plan) || normalizePlanId(plan?.id);
  const bundle = PLAN_TITLES_BY_LANGUAGE[id];
  if (bundle) return bundle?.[lang] || bundle?.en || "Premium";

  const explicit = sanitizeLabel(plan?.label || "");
  if (explicit) return explicit;

  const fallbackBundle = PLAN_TITLES_BY_LANGUAGE.premium;
  return fallbackBundle?.[lang] || fallbackBundle?.en || "Premium";
};

const resolvePlanDisplay = (plan = null) => {
  const currentPrice = pickFirstLabel([
    plan?.ctaPriceLabel,
    plan?.priceLabel,
    plan?.postTrialPriceLabel,
  ]);
  return { currentPrice };
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

  const safeMax = Math.max(3, Math.round(Number(maxItems) || 3));
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
  onTrialSwitchOn = () => {},
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
  const [freeTrialEnabled, setFreeTrialEnabled] = useState(false);
  const mainScrollRef = useRef(null);
  const planListOffsetYRef = useRef(0);
  const planCardOffsetsRef = useRef(new Map());

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
        featureCount: 5,
        featureVerticalPad: 5,
        planVerticalPad: 5,
        ctaHeight: 46,
      };
    }
    if (viewportHeight <= 820) {
      return {
        heroHeight: 144,
        featureCount: 6,
        featureVerticalPad: 6,
        planVerticalPad: 6,
        ctaHeight: 48,
      };
    }
    if (viewportHeight <= 900) {
      return {
        heroHeight: 154,
        featureCount: 6,
        featureVerticalPad: 7,
        planVerticalPad: 7,
        ctaHeight: 50,
      };
    }
    return {
      heroHeight: 166,
      featureCount: 6,
      featureVerticalPad: 8,
      planVerticalPad: 8,
      ctaHeight: 52,
    };
  }, [viewportHeight]);

  const isDarkMode =
    colors?.appearance === "dark" ||
    String(colors?.background || "")
      .trim()
      .toLowerCase() === "#05070d";

  const palette = useMemo(
    () => ({
      backdrop: "rgba(12,12,16,0.58)",
      sheetBg: colors?.background || (isDarkMode ? "#11141C" : "#F7F8FC"),
      heroBg: colors?.surfaceMuted || colors?.card || (isDarkMode ? "#1A2030" : "#EEF1F8"),
      cardBg: colors?.card || (isDarkMode ? "#1A2030" : "#FFFFFF"),
      cardBorder: colors?.border || (isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(16,24,40,0.11)"),
      cardSelectedBg: colors?.primarySurface || colors?.surfaceElevated || colors?.card || (isDarkMode ? "#222C40" : "#F1F3F8"),
      cardSelectedBorder: colors?.primary || "#536DFE",
      text: colors?.text || (isDarkMode ? "#F2F5FF" : "#18203A"),
      muted: colors?.muted || (isDarkMode ? "#B2BCD8" : "#62697C"),
      accent: colors?.primary || "#536DFE",
      accentText: colors?.primary || "#536DFE",
      success: colors?.success || "#1FA561",
      ctaBg: colors?.primary || "#536DFE",
      ctaText: colors?.onPrimary || "#FFFFFF",
      subtleButtonBg: colors?.surfaceMuted || colors?.card || (isDarkMode ? "#1C2436" : "#F3F5FA"),
      subtleButtonText: colors?.text || (isDarkMode ? "#E7EDFF" : "#1D2742"),
      divider: colors?.separator || colors?.border || (isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(23,50,45,0.12)"),
      chipBg: colors?.surfaceMuted || (isDarkMode ? "#1C2436" : "#EEF1F8"),
      bestValueBg: colors?.primary || "#536DFE",
      bestValueText: colors?.onPrimary || "#FFFFFF",
    }),
    [colors, isDarkMode]
  );

  const sortedPlans = useMemo(() => sortPlanCards(planCardsProp), [planCardsProp]);
  const displayedPlans = useMemo(
    () => sortedPlans.filter((plan) => isVisiblePaywallPlan(plan)),
    [sortedPlans]
  );

  const primaryPlans = useMemo(() => {
    const byId = new Map(displayedPlans.map((plan) => [normalizePlanId(plan?.id), plan]));
    const primary = PRIMARY_PLAN_IDS.map((id) => byId.get(id)).filter(Boolean);
    if (primary.length > 0) return primary;
    return displayedPlans.slice(0, 1);
  }, [displayedPlans]);

  const freeTrialDisplayPlan = useMemo(
    () =>
      displayedPlans.find(
        (plan) =>
          (resolvePlanKind(plan) || normalizePlanId(plan?.id)) === FREE_TRIAL_DISPLAY_PLAN_ID &&
          plan?.available !== false
      ) || null,
    [displayedPlans]
  );

  useEffect(() => {
    if (!visible) {
      setSelectedPlanId(pickDefaultPlanId(displayedPlans));
      setFreeTrialEnabled(false);
      return;
    }
    const normalizedSelectedPlanId = normalizePlanId(selectedPlanId);
    const exists = displayedPlans.some((plan) => normalizePlanId(plan?.id) === normalizedSelectedPlanId);
    if (!exists) {
      setSelectedPlanId(pickDefaultPlanId(displayedPlans));
    }
  }, [displayedPlans, selectedPlanId, visible]);
  useEffect(() => {
    if (!visible || !freeTrialEnabled || freeTrialDisplayPlan?.id) return;
    setFreeTrialEnabled(false);
    setSelectedPlanId(pickDefaultPlanId(displayedPlans));
  }, [displayedPlans, freeTrialDisplayPlan, freeTrialEnabled, visible]);

  const selectedPlan = useMemo(() => {
    const normalizedSelectedPlanId = normalizePlanId(selectedPlanId);
    const fromState =
      displayedPlans.find((plan) => normalizePlanId(plan?.id) === normalizedSelectedPlanId) || null;
    if (fromState) return fromState;
    return primaryPlans[0] || null;
  }, [displayedPlans, selectedPlanId, primaryPlans]);

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
      planTitle: calc(15, 18),
      planPrice: calc(16, 20),
      planDetail: calc(11, 14),
    };
  }, [planTextScale]);

  const features = useMemo(
    () => resolveFeatureBullets(copy, language, compactTier.featureCount),
    [compactTier.featureCount, copy, language]
  );
  const benefitsTitle = sanitizeLabel(copy?.benefitsTitle || "");

  const purchaseDisabled =
    restoring ||
    !!purchaseLoadingPlan ||
    !selectedPlan ||
    selectedPlan.available === false;

  const hasAnyTrialOffer = useMemo(
    () =>
      sortedPlans.some((plan) => isTrialOfferPlan(plan)),
    [sortedPlans]
  );
  const selectedPlanKind = resolvePlanKind(selectedPlan) || normalizePlanId(selectedPlan?.id);
  const selectedPlanHasActiveTrial =
    freeTrialEnabled && selectedPlanKind === FREE_TRIAL_DISPLAY_PLAN_ID;
  const selectedPlanTrialNotice = sanitizeLabel(
    selectedPlanHasActiveTrial ? selectedPlan?.trialNoticeLabel : ""
  );
  const noCommitmentLine = sanitizeLabel(copy?.noCommitmentLine || "");
  const billingNotice = sanitizeLabel(copy?.billingNotice || "");
  const legalNotice = sanitizeLabel(copy?.legalNotice || "");
  const defaultTitle = sanitizeLabel(copy?.title || copy?.planSectionTitle || localizedUi.title);
  const trialHeadline = sanitizeLabel(copy?.v2TrialHeadline || localizedUi.trialHeadline);
  const contextTitle = sanitizeLabel(copy?.v2ContextTitle || "");
  const title = contextTitle || (hasAnyTrialOffer && trialHeadline ? trialHeadline : defaultTitle);
  const titleNumberOfLines = hasAnyTrialOffer ? 3 : 2;
  const socialProof = sanitizeLabel(
    copy?.v2SocialProofLine || copy?.socialProofLine || localizedUi.socialProof
  );
  const continueLimitedLabel = sanitizeLabel(
    copy?.v2ContinueLimitedLabel || localizedUi.continueLimited
  );
  const freeTrialToggleTitle = sanitizeLabel(
    copy?.v2FreeTrialToggleTitle || localizedUi.freeTrialToggleTitle
  );
  const freeTrialToggleSubtitle = sanitizeLabel(
    copy?.v2FreeTrialToggleSubtitle || localizedUi.freeTrialToggleSubtitle
  );
  const shouldShowFreeTrialToggle = hasAnyTrialOffer && !!freeTrialDisplayPlan?.id;

  const primaryButtonLabel = useMemo(() => {
    if (!selectedPlan) return sanitizeLabel(copy?.ctaPrimary || localizedUi.ctaPrimary);
    if (selectedPlanHasActiveTrial) {
      return sanitizeLabel(
        copy?.ctaPrimaryTrial ||
          copy?.ctaPrimary ||
          selectedPlan?.ctaTrialLabel ||
          localizedUi.ctaPrimary
      );
    }
    return sanitizeLabel(copy?.ctaPrimaryRegular || copy?.ctaPrimary || localizedUi.ctaPrimary);
  }, [
    copy?.ctaPrimary,
    copy?.ctaPrimaryRegular,
    copy?.ctaPrimaryTrial,
    localizedUi.ctaPrimary,
    selectedPlan,
    selectedPlanHasActiveTrial,
  ]);

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
      const planKind = resolvePlanKind(plan) || normalizePlanId(plan?.id);
      setSelectedPlanId(plan.id);
      setFreeTrialEnabled((prev) => prev && planKind === FREE_TRIAL_DISPLAY_PLAN_ID);
      onPlanSelect(plan.id, { source: "plan_card" });
    },
    [onPlanSelect]
  );

  const handleLimitedContinue = useCallback(() => {
    if (!dismissible) return;
    onClose("continue_limited");
  }, [dismissible, onClose]);

  const scrollToPlanCard = useCallback((planId = "") => {
    const normalizedPlanId = normalizePlanId(planId);
    const scrollView = mainScrollRef.current;
    if (!normalizedPlanId || !scrollView?.scrollTo) return;
    const planOffsetY = planCardOffsetsRef.current.get(normalizedPlanId) || 0;
    const targetY = Math.max(0, planListOffsetYRef.current + planOffsetY - 12);
    const runScroll = () => {
      scrollView.scrollTo({ y: targetY, animated: true });
    };
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => {
        setTimeout(runScroll, 40);
      });
      return;
    }
    setTimeout(runScroll, 60);
  }, []);

  const handleFreeTrialToggle = useCallback(() => {
    if (!freeTrialDisplayPlan?.id) return;
    setFreeTrialEnabled((prev) => {
      const next = !prev;
      const nextPlanId = next
        ? freeTrialDisplayPlan.id
        : pickDefaultPlanId(primaryPlans.length ? primaryPlans : displayedPlans);
      if (nextPlanId) {
        setSelectedPlanId(nextPlanId);
        if (next) {
          onTrialSwitchOn(nextPlanId);
          scrollToPlanCard(nextPlanId);
        }
        onPlanSelect(nextPlanId, { source: "free_trial_toggle" });
      }
      return next;
    });
  }, [
    displayedPlans,
    freeTrialDisplayPlan,
    onPlanSelect,
    onTrialSwitchOn,
    primaryPlans,
    scrollToPlanCard,
  ]);

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
                style={[
                  styles.headerDismissIconButton,
                  { backgroundColor: palette.subtleButtonBg, borderColor: palette.cardBorder },
                ]}
                onPress={handleLimitedContinue}
                activeOpacity={0.72}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={continueLimitedLabel}
              >
                <Text style={[styles.headerDismissIconText, { color: palette.muted }]}>×</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <ScrollView
            ref={mainScrollRef}
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

            {!!benefitsTitle ? (
              <Text style={[styles.featuresTitle, { color: palette.text }, textAlignStyle]}>
                {benefitsTitle}
              </Text>
            ) : null}
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
                      rtl ? styles.featureRowRtl : null,
                      {
                        backgroundColor: "transparent",
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
                        rtl ? styles.featureTokenRtl : null,
                        {
                          borderColor: palette.accent,
                          backgroundColor: palette.cardBg,
                        },
                      ]}
                    >
                      <Text style={[styles.featureTokenCheck, { color: palette.accent }]}>✓</Text>
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
                accessibilityRole="switch"
                accessibilityLabel={freeTrialToggleTitle}
                accessibilityState={{ checked: freeTrialEnabled, disabled: restoring || !!purchaseLoadingPlan }}
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

            <View
              style={styles.planList}
              onLayout={(event) => {
                planListOffsetYRef.current = event.nativeEvent.layout.y;
              }}
            >
              {displayedPlans.map((plan, planIndex) => {
                const planId = normalizePlanId(plan?.id);
                const planKind = resolvePlanKind(plan, planIndex, displayedPlans);
                const resolvedPlanId = planKind || planId;
                const isYearly = resolvedPlanId === "yearly";
                const isBestValuePlan = isYearly;
                const planHasActiveTrial = freeTrialEnabled && isYearly;
                const selected = planId === normalizePlanId(selectedPlan?.id);
                const thenPriceTemplate = sanitizeLabel(
                  copy?.v2ThenPriceTemplate || localizedUi.thenPriceTemplate
                );
                const yearlyPerMonthTemplate = sanitizeLabel(
                  copy?.v2YearlyPerMonthTemplate || localizedUi.yearlyPerMonthTemplate
                );
                const display = resolvePlanDisplay(plan);
                const titleLabel = resolvePlanTitle(plan, language, planKind);
                const freeTrialLabel = sanitizeLabel(
                  plan?.trialDurationLabel ||
                    copy?.v2FreeTrialLabel ||
                    localizedUi.freeTrialLabel ||
                    copy?.v2TryForFreeLabel ||
                    localizedUi.tryForFree
                );
                const yearlyPrice = pickFirstLabel([
                  plan?.postTrialPriceLabel,
                  plan?.ctaPriceLabel,
                  plan?.priceLabel,
                ]);
                const postTrialPriceLine = yearlyPrice
                  ? planHasActiveTrial
                    ? applyTemplate(thenPriceTemplate, { price: yearlyPrice })
                    : yearlyPrice
                  : "";
                const yearlyPerMonthPrice = stripLeadingApprox(
                  pickFirstLabel([plan?.periodEquivalentLabel])
                );
                const yearlyPerMonthLine = yearlyPerMonthPrice
                  ? applyTemplate(yearlyPerMonthTemplate, { price: yearlyPerMonthPrice })
                  : "";
                const planPriceLine = planHasActiveTrial
                  ? freeTrialLabel
                  : display.currentPrice || postTrialPriceLine;
                const planDetailLine = planHasActiveTrial
                  ? postTrialPriceLine
                  : isYearly
                  ? yearlyPerMonthLine
                  : "";
                const planBadgeLabel = isBestValuePlan
                  ? copy?.v2BestValueBadge || localizedUi.bestValueBadge
                  : "";

                return (
                  <TouchableOpacity
                    key={String(plan?.id || "")}
                    onLayout={(event) => {
                      if (planId) {
                        planCardOffsetsRef.current.set(planId, event.nativeEvent.layout.y);
                      }
                    }}
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: selected ? palette.cardSelectedBg : palette.cardBg,
                        borderColor: selected ? palette.cardSelectedBorder : palette.cardBorder,
                        paddingVertical: compactTier.planVerticalPad + 5,
                      },
                      plan?.available === false ? styles.planCardDisabled : null,
                    ]}
                    activeOpacity={0.86}
                    onPress={() => handlePlanSelect(plan)}
                    disabled={plan?.available === false}
                    accessibilityRole="radio"
                    accessibilityLabel={`${titleLabel} ${planPriceLine || ""} ${planDetailLine || ""}`.trim()}
                    accessibilityState={{ selected, disabled: plan?.available === false }}
                  >
                    <View style={[styles.planMainRow, rtl ? styles.planMainRowRtl : null]}>
                      <View
                        style={[
                          styles.planSelector,
                          {
                            borderColor: selected ? palette.cardSelectedBorder : palette.cardBorder,
                            backgroundColor: selected ? palette.cardSelectedBorder : "transparent",
                          },
                        ]}
                      >
                        {selected ? (
                          <Text style={[styles.planSelectorTick, { color: palette.bestValueText }]}>✓</Text>
                        ) : null}
                      </View>

                      <View style={[styles.planContent, rtl ? styles.planContentRtl : null]}>
                        <View style={[styles.planTitleRow, rtl ? styles.planTitleRowRtl : null]}>
                          <AdaptivePaywallText
                            style={[
                              styles.planTitle,
                              planTypography.planTitle,
                              { color: palette.text },
                              textAlignStyle,
                            ]}
                            numberOfLines={1}
                            minFontSize={12}
                            maxUnitsPerLine={16}
                          >
                            {titleLabel}
                          </AdaptivePaywallText>
                          {!!planBadgeLabel ? (
                            <View
                              style={[
                                styles.planValueBadge,
                                {
                                  backgroundColor: palette.bestValueBg,
                                },
                              ]}
                            >
                              <AdaptivePaywallText
                                style={[styles.planValueBadgeText, { color: palette.bestValueText }]}
                                numberOfLines={1}
                                minFontSize={8}
                                maxUnitsPerLine={16}
                              >
                                {planBadgeLabel}
                              </AdaptivePaywallText>
                            </View>
                          ) : null}
                        </View>
                        {!!planDetailLine ? (
                          <AdaptivePaywallText
                            style={[
                              styles.planDetail,
                              planTypography.planDetail,
                              { color: palette.muted },
                              textAlignStyle,
                            ]}
                            numberOfLines={1}
                            minFontSize={10}
                            maxUnitsPerLine={24}
                          >
                            {planDetailLine}
                          </AdaptivePaywallText>
                        ) : null}
                      </View>

                      {!!planPriceLine ? (
                        <View style={[styles.planPriceBlock, rtl ? styles.planPriceBlockRtl : null]}>
                          <AdaptivePaywallText
                            style={[
                              styles.planPrice,
                              planTypography.planPrice,
                              {
                                color: selected ? palette.accentText : palette.text,
                                textAlign: rtl ? "left" : "right",
                              },
                            ]}
                            numberOfLines={1}
                            minFontSize={12}
                            maxUnitsPerLine={18}
                          >
                            {planPriceLine}
                          </AdaptivePaywallText>
                        </View>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

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
              accessibilityRole="button"
              accessibilityLabel={primaryButtonLabel}
              accessibilityState={{ disabled: purchaseDisabled }}
            >
              {purchaseLoadingPlan ? (
                <ActivityIndicator color={palette.ctaText} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
              )}
            </TouchableOpacity>

            {!!noCommitmentLine ? (
              <View style={[styles.trustRow, rtl ? styles.trustRowRtl : null]}>
                <View style={[styles.trustIcon, { backgroundColor: palette.chipBg }]}>
                  <Text style={[styles.trustIconText, { color: palette.success }]}>✓</Text>
                </View>
                <Text
                  style={[styles.trustText, { color: palette.text }, textAlignStyle]}
                  numberOfLines={2}
                >
                  {noCommitmentLine}
                </Text>
              </View>
            ) : null}

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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  headerDismissIconButton: {
    width: Platform.OS === "ios" ? 44 : 48,
    height: Platform.OS === "ios" ? 44 : 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "flex-end",
  },
  headerDismissIconText: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  hero: {
    borderRadius: 16,
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
    borderRadius: 12,
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
  featuresTitle: {
    marginBottom: 6,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
  },
  featuresWrap: {
    marginBottom: 8,
    gap: 2,
  },
  featureRow: {
    minHeight: 34,
    paddingHorizontal: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  featureRowRtl: {
    flexDirection: "row-reverse",
  },
  featureToken: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 7,
  },
  featureTokenRtl: {
    marginRight: 0,
    marginLeft: 7,
  },
  featureTokenCheck: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "900",
  },
  featureLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  freeTrialToggleCard: {
    borderWidth: 1,
    borderRadius: 14,
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
    marginBottom: 8,
  },
  planCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    marginBottom: 6,
    minHeight: 68,
    justifyContent: "center",
  },
  planCardDisabled: {
    opacity: 0.55,
  },
  planMainRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 10,
  },
  planMainRowRtl: {
    flexDirection: "row-reverse",
  },
  planContent: {
    flex: 1,
    minWidth: 0,
  },
  planContentRtl: {
    alignItems: "flex-end",
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
  },
  planTitleRowRtl: {
    flexDirection: "row-reverse",
  },
  planValueBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
    maxWidth: "52%",
  },
  planValueBadgeText: {
    fontSize: 8,
    lineHeight: 10,
    fontWeight: "900",
    letterSpacing: 0.15,
  },
  planTitle: {
    flexShrink: 1,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: "900",
  },
  planDetail: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
  },
  planPriceBlock: {
    minWidth: 88,
    maxWidth: 138,
    alignItems: "flex-end",
  },
  planPriceBlockRtl: {
    alignItems: "flex-start",
  },
  planPrice: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900",
  },
  planSelector: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  planSelectorTick: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "900",
  },
  footer: {
    paddingTop: 1,
    alignItems: "stretch",
  },
  primaryButton: {
    borderRadius: 14,
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
  trustRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 7,
  },
  trustRowRtl: {
    flexDirection: "row-reverse",
  },
  trustIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  trustIconText: {
    fontSize: 12,
    lineHeight: 14,
    fontWeight: "900",
  },
  trustText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
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
    minHeight: Platform.OS === "ios" ? 44 : 48,
    borderRadius: 12,
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

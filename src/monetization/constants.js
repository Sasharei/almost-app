export const PREMIUM_ENTITLEMENT_ID = "premium";

export const PREMIUM_PRODUCT_IDS = {
  monthly: "almost_premium_monthly",
  yearly: "almost_premium_yearly",
  lifetime: "almost_premium_lifetime",
};

export const PREMIUM_PLAN_ORDER = ["yearly", "monthly", "lifetime"];

export const FREE_PLAN_LIMITS = {
  activeGoals: 1,
  activePendingCards: 2,
  customTemptationCards: 10,
  historyDays: 7,
  challengeClaims: 3,
  reportsWeeks: 4,
  reportsMonths: 1,
  budgetAutoFreeDays: 30,
};

export const PREMIUM_FEATURE_KEYS = {
  catCustomization: "catCustomization",
  impulseMap: "impulseMap",
  reports: "reports",
  customCategories: "customCategories",
  thinkingQueue: "thinkingQueue",
  homeWidget: "homeWidget",
  widgetSlider: "widgetSlider",
  budgetAuto: "budgetAuto",
  multipleGoals: "multipleGoals",
  fullHistory: "fullHistory",
  customTemptationCards: "customTemptationCards",
  unlimitedChallenges: "unlimitedChallenges",
  proTheme: "proTheme",
};

export const FALLBACK_PRICES_BY_CURRENCY = {
  CAD: {
    monthly: {
      label: "CAD $6.99",
      perMonth: "CAD $6.99/mo",
      badge: null,
    },
    yearly: {
      label: "CAD $49.99",
      perMonth: "CAD $4.16/mo",
      badge: "Save 40%",
    },
    lifetime: {
      label: "CAD $99.99",
      perMonth: "One-time",
      badge: "Lifetime",
    },
  },
  USD: {
    monthly: {
      label: "USD $5.99",
      perMonth: "USD $5.99/mo",
      badge: null,
    },
    yearly: {
      label: "USD $44.99",
      perMonth: "USD $3.75/mo",
      badge: "Save 37%",
    },
    lifetime: {
      label: "USD $89.99",
      perMonth: "One-time",
      badge: "Lifetime",
    },
  },
  GBP: {
    monthly: {
      label: "GBP £4.99",
      perMonth: "GBP £4.99/mo",
      badge: null,
    },
    yearly: {
      label: "GBP £36.99",
      perMonth: "GBP £3.08/mo",
      badge: "Save 38%",
    },
    lifetime: {
      label: "GBP £74.99",
      perMonth: "One-time",
      badge: "Lifetime",
    },
  },
};

const REGION_BY_CURRENCY = {
  CAD: "CA",
  USD: "US",
  GBP: "UK",
};

const SOFT_TITLE_BY_LANGUAGE = {
  ru: "Ты только что сохранил(а) деньги. Усилим эффект?",
  en: "You just saved money. Want to multiply that win?",
};

const HARD_TITLE_BY_LANGUAGE = {
  ru: "Almost уже помог вам сэкономить. Продолжим?",
  en: "Almost has already saved you money. Keep it going?",
};

const FEATURE_TITLE_BY_LANGUAGE = {
  ru: "Эта функция доступна в Premium",
  en: "This feature is available in Premium",
};

const BASE_FEATURES_BY_LANGUAGE = {
  ru: [
    "Поддержка разработчика",
    "Impulse-карта",
    "Кастомизация кота + полная кастомизация Pro-темы",
    "Недельные и месячные умные анализы расходов с инсайтами",
    "Автоматический бюджет на месяц с умной адаптацией",
    "Home Screen виджеты и слайдер",
    "Мгновенная разблокировка всех функций, закрытых уровнем",
    "Неограниченное количество кастомных категорий",
    "Неограниченное количество целей",
    "Неограниченные карточки искушений",
  ],
  en: [
    "Support the developer",
    "Impulse map",
    "Cat customization + full Pro theme customization",
    "Weekly and monthly smart spending analysis with insights",
    "Automatic monthly budget with smart adaptation",
    "Home screen widgets and slider",
    "Instant unlock of all level-gated features",
    "Unlimited custom categories",
    "Unlimited goals",
    "Unlimited temptation cards",
  ],
};

const FEATURE_NAME_BY_KEY = {
  catCustomization: {
    ru: "кастомизация кота",
    en: "cat customization",
  },
  impulseMap: {
    ru: "impulse-карта",
    en: "impulse map",
  },
  reports: {
    ru: "умные анализы расходов",
    en: "smart spending analysis",
  },
  customCategories: {
    ru: "кастомные категории",
    en: "custom categories",
  },
  thinkingQueue: {
    ru: "больше карточек «Думаю»",
    en: "more Think cards",
  },
  homeWidget: {
    ru: "домашний виджет",
    en: "home widget",
  },
  widgetSlider: {
    ru: "слайдер виджетов",
    en: "widget slider",
  },
  budgetAuto: {
    ru: "авторасчет бюджета",
    en: "automatic budget planning",
  },
  multipleGoals: {
    ru: "несколько целей",
    en: "multiple goals",
  },
  fullHistory: {
    ru: "полная история",
    en: "full history",
  },
  customTemptationCards: {
    ru: "дополнительные карточки искушений",
    en: "extra temptation cards",
  },
  unlimitedChallenges: {
    ru: "больше челленджей",
    en: "more challenge claims",
  },
  proTheme: {
    ru: "полная кастомизация Pro-темы",
    en: "full Pro theme customization",
  },
};

const COMPARISON_ROWS_BY_LANGUAGE = {
  ru: [
    { label: "Basic impulse traker", free: true, premium: true },
    { label: "Поддержка разработчика", free: false, premium: true },
    { label: "Impulse-карта", free: false, premium: true },
    { label: "Кастомизация кота + полная кастомизация Pro-темы", free: false, premium: true },
    { label: "Недельные и месячные умные анализы расходов с инсайтами", free: false, premium: true },
    { label: "Автоматический бюджет на месяц с умной адаптацией", free: false, premium: true },
    { label: "Home Screen виджеты и слайдер", free: false, premium: true },
    { label: "Мгновенная разблокировка уровневых функций", free: false, premium: true },
    { label: "Неограниченные кастомные категории", free: false, premium: true },
    { label: "Неограниченные цели", free: false, premium: true },
    { label: "Неограниченные карточки искушений", free: false, premium: true },
  ],
  en: [
    { label: "Basic impulse traker", free: true, premium: true },
    { label: "Support the developer", free: false, premium: true },
    { label: "Impulse map", free: false, premium: true },
    { label: "Cat customization + full Pro theme customization", free: false, premium: true },
    { label: "Weekly and monthly smart spending analysis with insights", free: false, premium: true },
    { label: "Automatic monthly budget with smart adaptation", free: false, premium: true },
    { label: "Home screen widgets and slider", free: false, premium: true },
    { label: "Instant unlock of all level-gated features", free: false, premium: true },
    { label: "Unlimited custom categories", free: false, premium: true },
    { label: "Unlimited goals", free: false, premium: true },
    { label: "Unlimited temptation cards", free: false, premium: true },
  ],
};

const SOFT_PSYCHOLOGY_LINE_BY_LANGUAGE = {
  ru: "Цена Premium = стоимость одного отказа от импульсивной покупки.",
  en: "Premium costs the price of a single impulse you choose to skip.",
};

const SOFT_MARKETING_LINE_BY_LANGUAGE = {
  ru: "Premium стоит {{monthly}} — это цена одного искушения. За месяц Premium помогает сэкономить в 10–20 раз больше.",
  en: "Premium is {{monthly}} - the cost of one temptation. In a month it can help save 10-20x more.",
};

const HARD_MARKETING_LINE_BY_LANGUAGE = {
  ru: "Almost помог вам сэкономить уже {{saved}}. Хотите продолжить прогресс с Premium?",
  en: "Almost has already helped you save {{saved}}. Continue your progress with Premium?",
};

const FEATURE_MARKETING_LINE_BY_LANGUAGE = {
  ru: "Открой Premium, чтобы получить полный набор инструментов и сохранять больше каждый месяц.",
  en: "Unlock Premium for the full toolkit and keep more money every month.",
};

const LEVEL_UNLOCK_LINE_BY_LANGUAGE = {
  ru: "Premium сразу откроет все функции, которые закрыты уровнями.",
  en: "Premium instantly unlocks all features gated by user levels.",
};

const PLAN_SECTION_TITLE_BY_LANGUAGE = {
  ru: "Выберите план Premium",
  en: "Choose your Premium plan",
};

const PLAN_HINT_BY_LANGUAGE = {
  ru: "Выберите тариф и нажмите кнопку ниже",
  en: "Select a plan and tap the button below",
};

const FREE_LABEL_BY_LANGUAGE = {
  ru: "БЕСПЛ.",
  en: "FREE",
};

const PRO_LABEL_BY_LANGUAGE = {
  ru: "PRO",
  en: "PRO",
};

const PLAN_UNAVAILABLE_LABEL_BY_LANGUAGE = {
  ru: "Недоступно",
  en: "Unavailable",
};

const PAYWALL_BILLING_NOTICE_BY_LANGUAGE = {
  ru: "Подписка продлевается автоматически. Управлять и отменять можно в App Store / Google Play.",
  en: "Subscription renews automatically. Manage or cancel anytime in App Store / Google Play.",
};

const PAYWALL_LEGAL_NOTICE_BY_LANGUAGE = {
  ru: "Продолжая, вы соглашаетесь с Условиями использования и Политикой конфиденциальности.",
  en: "By continuing, you agree to the Terms of Use and Privacy Policy.",
};

const PAYWALL_BADGE_BY_KIND = {
  soft: "ALMOST PRO",
  hard: "ALMOST PRO",
  feature: "ALMOST PRO",
};

const resolveLanguage = (language) => {
  if (language === "ru") return "ru";
  return "en";
};

const template = (value, replacements = {}) => {
  let nextValue = String(value || "");
  Object.entries(replacements).forEach(([token, tokenValue]) => {
    nextValue = nextValue.replace(`{{${token}}}`, String(tokenValue));
  });
  return nextValue;
};

export const resolvePriceRegion = (currencyCode = "USD") => {
  const code = typeof currencyCode === "string" ? currencyCode.toUpperCase() : "USD";
  return REGION_BY_CURRENCY[code] || REGION_BY_CURRENCY.USD;
};

export const resolveFallbackPlanPricing = (currencyCode = "USD") => {
  const code = typeof currencyCode === "string" ? currencyCode.toUpperCase() : "USD";
  return FALLBACK_PRICES_BY_CURRENCY[code] || FALLBACK_PRICES_BY_CURRENCY.USD;
};

export const buildPaywallCopy = ({
  language = "en",
  kind = "soft",
  monthlyPriceLabel = "$5.99/mo",
  savedAmountLabel = "$0",
  featureKey = null,
} = {}) => {
  const lang = resolveLanguage(language);
  const normalizedKind = kind === "hard" ? "hard" : kind === "feature" ? "feature" : "soft";
  const normalizedFeatureKey =
    typeof featureKey === "string" && featureKey.trim().length ? featureKey.trim() : null;
  const effectiveKind = normalizedFeatureKey ? "feature" : normalizedKind;
  const featureName = normalizedFeatureKey
    ? FEATURE_NAME_BY_KEY[normalizedFeatureKey]?.[lang] || null
    : null;

  let title = SOFT_TITLE_BY_LANGUAGE[lang];
  let subtitle = template(SOFT_MARKETING_LINE_BY_LANGUAGE[lang], { monthly: monthlyPriceLabel });
  let psychologyLine = SOFT_PSYCHOLOGY_LINE_BY_LANGUAGE[lang];

  if (effectiveKind === "hard") {
    title = HARD_TITLE_BY_LANGUAGE[lang];
    subtitle = template(HARD_MARKETING_LINE_BY_LANGUAGE[lang], {
      saved: savedAmountLabel || "$0",
    });
    psychologyLine = null;
  } else if (effectiveKind === "feature") {
    title = FEATURE_TITLE_BY_LANGUAGE[lang];
    subtitle = featureName
      ? lang === "ru"
        ? `Открой Premium, чтобы получить ${featureName} и полный набор инструментов.`
        : `Unlock Premium to access ${featureName} and get the full toolkit.`
      : FEATURE_MARKETING_LINE_BY_LANGUAGE[lang];
    psychologyLine = null;
  }

  return {
    badgeLabel: PAYWALL_BADGE_BY_KIND[effectiveKind] || PAYWALL_BADGE_BY_KIND.soft,
    title,
    subtitle,
    psychologyLine,
    features: BASE_FEATURES_BY_LANGUAGE[lang],
    comparisonRows: COMPARISON_ROWS_BY_LANGUAGE[lang],
    unlockLevelsLine: LEVEL_UNLOCK_LINE_BY_LANGUAGE[lang],
    planSectionTitle: PLAN_SECTION_TITLE_BY_LANGUAGE[lang],
    planHint: PLAN_HINT_BY_LANGUAGE[lang],
    freeColumnLabel: FREE_LABEL_BY_LANGUAGE[lang],
    proColumnLabel: PRO_LABEL_BY_LANGUAGE[lang],
    planUnavailableLabel: PLAN_UNAVAILABLE_LABEL_BY_LANGUAGE[lang],
    ctaPrimary: lang === "ru" ? "Открыть Premium" : "Unlock Premium",
    ctaRestore: lang === "ru" ? "Восстановить покупки" : "Restore purchases",
    ctaClose: lang === "ru" ? "Позже" : "Maybe later",
    ctaManage: lang === "ru" ? "Управлять подпиской" : "Manage subscription",
    legalNotice: PAYWALL_LEGAL_NOTICE_BY_LANGUAGE[lang],
    billingNotice: PAYWALL_BILLING_NOTICE_BY_LANGUAGE[lang],
    legalTermsLabel: lang === "ru" ? "Условия" : "Terms",
    legalPrivacyLabel: lang === "ru" ? "Конфиденциальность" : "Privacy",
  };
};

export const buildDefaultPlanCards = (currencyCode = "USD") => {
  const pricing = resolveFallbackPlanPricing(currencyCode);
  return [
    {
      id: "yearly",
      label: "Yearly",
      priceLabel: pricing.yearly.label,
      secondaryLabel: pricing.yearly.perMonth,
      badge: pricing.yearly.badge,
      recommended: true,
    },
    {
      id: "monthly",
      label: "Monthly",
      priceLabel: pricing.monthly.label,
      secondaryLabel: pricing.monthly.perMonth,
      badge: pricing.monthly.badge,
      recommended: false,
    },
    {
      id: "lifetime",
      label: "Lifetime",
      priceLabel: pricing.lifetime.label,
      secondaryLabel: pricing.lifetime.perMonth,
      badge: pricing.lifetime.badge,
      recommended: false,
    },
  ];
};

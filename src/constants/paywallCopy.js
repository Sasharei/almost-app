export const PAYWALL_PLAN_LABEL_BY_LANGUAGE = {
  yearly: {
    ru: "Год",
    en: "Yearly",
    es: "Anual",
    fr: "Annuel",
    de: "Jährlich",
    ar: "سنوي",
    zh: "年付",
  },
  monthly: {
    ru: "Месяц",
    en: "Monthly",
    es: "Mensual",
    fr: "Mensuel",
    de: "Monatlich",
    ar: "شهري",
    zh: "月付",
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

export const PAYWALL_SAVE_BADGE_TEMPLATE_BY_LANGUAGE = {
  ru: "Экономия {{percent}}%",
  en: "Save {{percent}}%",
  es: "Ahorra {{percent}}%",
  fr: "Économisez {{percent}}%",
  de: "Spare {{percent}}%",
  ar: "وفّر {{percent}}%",
  zh: "省 {{percent}}%",
};

export const PAYWALL_TRIAL_BADGE_BY_LANGUAGE = {
  ru: "Пробный период",
  en: "Free trial",
  es: "Prueba gratis",
  fr: "Essai gratuit",
  de: "Kostenlos testen",
  ar: "تجربة مجانية",
  zh: "免费试用",
};

export const PAYWALL_EQUIVALENT_SOURCE_IDS = [
  "coffee_to_go",
  "netflix_subscription",
  "croissant_break",
  "fancy_latte",
  "pizza",
  "late_night_takeout",
  "movie_premiere_combo",
  "comfort_utilities",
  "beauty_box",
  "grooming_upgrade_set",
  "studio_pass",
  "rent_upgrade",
];

export const PAYWALL_YEAR_SUFFIX_BY_LANGUAGE = {
  ru: "/год",
  en: "/yr",
  es: "/año",
  fr: "/an",
  de: "/Jahr",
  ar: "/سنة",
  zh: "/年",
};

export const PAYWALL_MONTH_SUFFIX_BY_LANGUAGE = {
  ru: "/мес",
  en: "/mo",
  es: "/mes",
  fr: "/mois",
  de: "/Monat",
  ar: "/شهر",
  zh: "/月",
};

export const PAYWALL_BILLING_LABEL_BY_LANGUAGE = {
  yearly: {
    ru: "Списание раз в год",
    en: "Billed yearly",
    es: "Facturado anualmente",
    fr: "Facturé annuellement",
    de: "Jährliche Abrechnung",
    ar: "يتم الفوترة سنوياً",
    zh: "按年计费",
  },
  monthly: {
    ru: "Списание каждый месяц",
    en: "Billed monthly",
    es: "Facturado mensualmente",
    fr: "Facturé mensuellement",
    de: "Monatliche Abrechnung",
    ar: "يتم الفوترة شهرياً",
    zh: "按月计费",
  },
  lifetime: {
    ru: "Разовый платеж",
    en: "One-time purchase",
    es: "Pago único",
    fr: "Achat unique",
    de: "Einmaliger Kauf",
    ar: "شراء لمرة واحدة",
    zh: "一次性购买",
  },
};

export const PAYWALL_EQUIVALENT_TEMPLATE_BY_LANGUAGE = {
  ru: {
    monthly: "≈ {{emoji}} {{count}} {{item}} в месяц",
    yearly: "≈ {{emoji}} {{count}} {{item}} в год",
    lifetime: "≈ {{emoji}} {{count}} {{item}} разово",
  },
  en: {
    monthly: "≈ {{emoji}} {{count}} {{item}} / month",
    yearly: "≈ {{emoji}} {{count}} {{item}} / year",
    lifetime: "≈ {{emoji}} {{count}} {{item}} one-time",
  },
  es: {
    monthly: "≈ {{emoji}} {{count}} {{item}} / mes",
    yearly: "≈ {{emoji}} {{count}} {{item}} / año",
    lifetime: "≈ {{emoji}} {{count}} {{item}} una vez",
  },
  fr: {
    monthly: "≈ {{emoji}} {{count}} {{item}} / mois",
    yearly: "≈ {{emoji}} {{count}} {{item}} / an",
    lifetime: "≈ {{emoji}} {{count}} {{item}} une fois",
  },
  de: {
    monthly: "≈ {{emoji}} {{count}} {{item}} / Monat",
    yearly: "≈ {{emoji}} {{count}} {{item}} / Jahr",
    lifetime: "≈ {{emoji}} {{count}} {{item}} einmalig",
  },
  ar: {
    monthly: "≈ {{emoji}} {{count}} {{item}} / شهر",
    yearly: "≈ {{emoji}} {{count}} {{item}} / سنة",
    lifetime: "≈ {{emoji}} {{count}} {{item}} لمرة واحدة",
  },
  zh: {
    monthly: "≈ {{emoji}} {{count}} {{item}} / 月",
    yearly: "≈ {{emoji}} {{count}} {{item}} / 年",
    lifetime: "≈ {{emoji}} {{count}} {{item}} 一次性",
  },
};

export const PAYWALL_PERIOD_UNIT_TO_DAYS = {
  DAY: 1,
  WEEK: 7,
  MONTH: 30,
  YEAR: 365,
};

export const PAYWALL_TRIAL_CTA_DEFAULT_BY_LANGUAGE = {
  ru: "Продолжить бесплатно",
  en: "Continue free",
  es: "Continuar gratis",
  fr: "Continuer gratuitement",
  de: "Kostenlos fortfahren",
  ar: "المتابعة مجاناً",
  zh: "免费继续",
};

export const PAYWALL_POST_TRIAL_PREFIX_BY_LANGUAGE = {
  ru: "Потом",
  en: "Then",
  es: "Luego",
  fr: "Puis",
  de: "Dann",
  ar: "ثم",
  zh: "随后",
};

export const PAYWALL_NOW_PREFIX_BY_LANGUAGE = {
  ru: "Сейчас",
  en: "Now",
  es: "Ahora",
  fr: "Maintenant",
  de: "Jetzt",
  ar: "الآن",
  zh: "现在",
};

export const PAYWALL_MONTHLY_TRIAL_FALLBACK_DAYS = null;
export const PAYWALL_YEARLY_TRIAL_FALLBACK_DAYS = null;

export const PAYWALL_SAR_MARKERS_REGEX = /(﷼|sar|ر\.?\s*س\.?|ريال(?:ات)?)/gi;
export const PAYWALL_BIDI_MARKS_REGEX = /[\u200e\u200f\u061c]/g;
export const PAYWALL_DIGIT_FRAGMENT_REGEX = /[0-9\u0660-\u0669][0-9\u0660-\u0669\s.,]*/;

export const PAYWALL_ALERT_COPY = {
  missingAndroidApiKey: {
    ru: "Не найден EXPO_PUBLIC_RC_ANDROID_API_KEY. Добавьте переменную в Expo Environment Variables (preview/production), пересоберите приложение и повторите попытку.",
    en: "Missing EXPO_PUBLIC_RC_ANDROID_API_KEY. Add it to Expo Environment Variables (preview/production), rebuild the app, and try again.",
    es: "Falta EXPO_PUBLIC_RC_ANDROID_API_KEY. Añádela en Expo Environment Variables (preview/production), recompila la app e inténtalo de nuevo.",
    fr: "EXPO_PUBLIC_RC_ANDROID_API_KEY est manquante. Ajoutez-la dans Expo Environment Variables (preview/production), reconstruisez l'app puis réessayez.",
  },
  packageUnavailable: {
    ru: "Покупка пока недоступна: пакет не найден в сторе. Проверьте RevenueCat Offering.",
    en: "Purchase is unavailable: package was not found in store offerings.",
    es: "La compra no está disponible: no se encontró el paquete en las ofertas de la tienda.",
    fr: "L'achat n'est pas disponible : le package est introuvable dans les offres du store.",
  },
  purchaseFailed: {
    ru: "Не удалось завершить покупку. Попробуйте снова.",
    en: "Could not finish the purchase. Please try again.",
    es: "No se pudo completar la compra. Inténtalo de nuevo.",
    fr: "Impossible de finaliser l'achat. Réessayez.",
  },
  restoreFailed: {
    ru: "Не удалось восстановить покупки.",
    en: "Could not restore purchases.",
    es: "No se pudieron restaurar las compras.",
    fr: "Impossible de restaurer les achats.",
  },
  noActiveSubscriptionIos: {
    ru: "Активная подписка не найдена. Проверьте Apple ID в Sandbox и повторите попытку.",
    en: "No active subscription was found. Verify your Sandbox Apple ID and try again.",
    es: "No se encontró una suscripción activa. Verifica tu Apple ID de Sandbox e inténtalo de nuevo.",
    fr: "Aucun abonnement actif n'a été trouvé. Vérifiez votre identifiant Apple Sandbox puis réessayez.",
  },
  noActiveSubscriptionAndroid: {
    ru: "Активная подписка не найдена. Проверьте Google Play тестовый аккаунт и повторите попытку.",
    en: "No active subscription was found. Verify your Google Play test account and try again.",
    es: "No se encontró una suscripción activa. Verifica tu cuenta de pruebas de Google Play e inténtalo de nuevo.",
    fr: "Aucun abonnement actif n'a été trouvé. Vérifiez votre compte test Google Play puis réessayez.",
  },
};

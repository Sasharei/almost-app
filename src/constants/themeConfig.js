export const THEMES = {
  light: {
    background: "#F6F7FB",
    card: "#FFFFFF",
    text: "#1C1A2A",
    muted: "#7A7F92",
    border: "#E5E6ED",
    primary: "#111",
  },
  dark: {
    background: "#05070D",
    card: "#161B2A",
    text: "#F7F9FF",
    muted: "#A5B1CC",
    border: "#2E374F",
    primary: "#FFC857",
  },
  pro: {
    background: "#EEF1FF",
    card: "#FFFFFF",
    text: "#101B45",
    muted: "#5F6B98",
    border: "#C7D1FF",
    primary: "#4353FF",
  },
};

export const DEFAULT_THEME = "light";
export const PRO_THEME_ID = "pro";
export const THEME_IDS = ["light", "dark", PRO_THEME_ID];

export const PRO_THEME_ACCENT_OPTIONS = [
  {
    id: "indigo",
    accent: "#4353FF",
    label: { ru: "Индиго", en: "Indigo", es: "Índigo", fr: "Indigo", de: "Indigo", ar: "نيلي", zh: "靛蓝" },
    emoji: "🔵",
  },
  {
    id: "emerald",
    accent: "#1FBF8F",
    label: {
      ru: "Изумруд",
      en: "Emerald",
      es: "Esmeralda",
      fr: "Émeraude",
      de: "Smaragd",
      ar: "زمردي",
      zh: "祖母绿",
    },
    emoji: "💚",
  },
  {
    id: "sunset",
    accent: "#FF7A59",
    label: {
      ru: "Сансет",
      en: "Sunset",
      es: "Atardecer",
      fr: "Coucher",
      de: "Sonnenuntergang",
      ar: "غروب",
      zh: "日落",
    },
    emoji: "🌇",
  },
  {
    id: "gold",
    accent: "#E3A62B",
    label: { ru: "Золото", en: "Gold", es: "Oro", fr: "Or", de: "Gold", ar: "ذهبي", zh: "金色" },
    emoji: "✨",
  },
  {
    id: "violet",
    accent: "#8B61FF",
    label: { ru: "Фиолет", en: "Violet", es: "Violeta", fr: "Violet", de: "Violett", ar: "بنفسجي", zh: "紫色" },
    emoji: "🍇",
  },
  {
    id: "aqua",
    accent: "#2FA8FF",
    label: { ru: "Аква", en: "Aqua", es: "Aqua", fr: "Aqua", de: "Aqua", ar: "أكوا", zh: "水蓝" },
    emoji: "🌊",
  },
];

export const DEFAULT_PRO_THEME_ACCENT_ID = "indigo";

export const PRO_THEME_ACCENT_COPY = {
  ru: {
    title: "Акцент PRO-темы",
    subtitle: "Выбери цвет, который будет использоваться для кнопок и акцентов интерфейса.",
    selected: "Выбрано",
  },
  en: {
    title: "PRO theme accent",
    subtitle: "Pick the color used for buttons and highlighted UI accents.",
    selected: "Selected",
  },
  es: {
    title: "Acento del tema PRO",
    subtitle: "Elige el color para botones y acentos principales de la interfaz.",
    selected: "Seleccionado",
  },
  fr: {
    title: "Accent du thème PRO",
    subtitle: "Choisis la couleur utilisée pour les boutons et accents d'interface.",
    selected: "Sélectionné",
  },
  de: {
    title: "PRO-Theme-Akzent",
    subtitle: "Wähle die Farbe für Buttons und hervorgehobene UI-Akzente.",
    selected: "Ausgewählt",
  },
  ar: {
    title: "تمييز سمة PRO",
    subtitle: "اختر اللون المستخدم للأزرار وإبرازات الواجهة.",
    selected: "محدد",
  },
  zh: {
    title: "PRO 主题强调色",
    subtitle: "选择用于按钮和界面高亮的颜色。",
    selected: "已选择",
  },
};

export const INTER_FONTS = {
  light: "Inter_300Light",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semiBold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extraBold: "Inter_800ExtraBold",
  black: "Inter_900Black",
};

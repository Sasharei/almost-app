export const SUPPORT_EMAIL = "almostappsup@gmail.com";
export const INSTAGRAM_URL =
  "https://www.instagram.com/almostsavings?igsh=YzZ5aXB5YWd5ODZy&utm_source=qr";
export const FACEBOOK_APP_ID = "1653035139013896";

export const HEALTH_COIN_TIERS = [
  { id: "green", value: 1, asset: require("../../assets/coins/Coin_green.png") },
  { id: "blue", value: 10, asset: require("../../assets/coins/Coin_blue.png") },
  { id: "orange", value: 100, asset: require("../../assets/coins/Coin_orange.png") },
  { id: "red", value: 1000, asset: require("../../assets/coins/Coin_red.png") },
  { id: "pink", value: 10000, asset: require("../../assets/coins/Coin_pink.png") },
];

export const BLUE_HEALTH_COIN_TIER =
  HEALTH_COIN_TIERS.find((tier) => tier.id === "blue") || HEALTH_COIN_TIERS[1];
export const GREEN_HEALTH_COIN_TIER =
  HEALTH_COIN_TIERS.find((tier) => tier.id === "green") || HEALTH_COIN_TIERS[0];
export const BLUE_HEALTH_COIN_ASSET = BLUE_HEALTH_COIN_TIER?.asset || null;
export const BLUE_HEALTH_COIN_VALUE = BLUE_HEALTH_COIN_TIER?.value || 10;
export const GREEN_HEALTH_COIN_ASSET = GREEN_HEALTH_COIN_TIER?.asset || null;
export const GOAL_COMPLETION_REWARD_COINS = 2;
export const GOAL_COMPLETION_REWARD_TIER = BLUE_HEALTH_COIN_TIER || HEALTH_COIN_TIERS[1];
export const GOAL_COMPLETION_REWARD_VALUE =
  GOAL_COMPLETION_REWARD_COINS * (GOAL_COMPLETION_REWARD_TIER?.value || 1);
export const CHEST_REWARD_TIERS = [
  {
    id: "brown",
    minAmount: 0,
    tapsRequired: 3,
    accent: "#C87A27",
    glow: "#FFBC70",
    assets: {
      closed: require("../../assets/chests/brown/closed.png"),
      glow: require("../../assets/chests/brown/glow.png"),
      open: require("../../assets/chests/brown/open.png"),
    },
  },
  {
    id: "green",
    minAmount: 15,
    tapsRequired: 4,
    accent: "#28B061",
    glow: "#6FF3A8",
    assets: {
      closed: require("../../assets/chests/green/closed.png"),
      glow: require("../../assets/chests/green/glow.png"),
      open: require("../../assets/chests/green/open.png"),
    },
  },
  {
    id: "blue",
    minAmount: 40,
    tapsRequired: 5,
    accent: "#2E8CFF",
    glow: "#7ED5FF",
    assets: {
      closed: require("../../assets/chests/blue/closed.png"),
      glow: require("../../assets/chests/blue/glow.png"),
      open: require("../../assets/chests/blue/open.png"),
    },
  },
  {
    id: "purple",
    minAmount: 90,
    tapsRequired: 6,
    accent: "#8A57FF",
    glow: "#D2B0FF",
    assets: {
      closed: require("../../assets/chests/purple/closed.png"),
      glow: require("../../assets/chests/purple/glow.png"),
      open: require("../../assets/chests/purple/open.png"),
    },
  },
  {
    id: "gold",
    minAmount: 160,
    tapsRequired: 7,
    accent: "#E2A72A",
    glow: "#FFE58A",
    assets: {
      closed: require("../../assets/chests/gold/closed.png"),
      glow: require("../../assets/chests/gold/glow.png"),
      open: require("../../assets/chests/gold/open.png"),
    },
  },
];
export const DEFAULT_CHEST_REWARD_TIER = CHEST_REWARD_TIERS[0];

export const LEVEL_SHARE_CAT = require("../../assets/Cat_mascot.png");
export const LEVEL_SHARE_LOGO = require("../../assets/Almost_icon.png");
export const LEVEL_SHARE_ACCENT = "#FFB347";
export const LEVEL_SHARE_BG = "#050C1A";
export const LEVEL_SHARE_MUTED = "rgba(255,255,255,0.65)";

const CELEBRATION_BASE_RU = [
  "Хоп! Ещё одна осознанная экономия",
  "Меньше лишних покупок, больше плана",
  "Кошелёк вздохнул спокойно",
];

export const CELEBRATION_MESSAGES = {
  ru: {
    female: [...CELEBRATION_BASE_RU, "Ты снова выбрала умный своп вместо растрат"],
    male: [...CELEBRATION_BASE_RU, "Ты снова выбрал умный своп вместо растрат"],
    none: [...CELEBRATION_BASE_RU, "Снова выбран умный своп вместо растрат"],
    level: "Уровень {{level}}! Экономия становится привычкой 💎",
  },
  en: {
    default: [
      "Boom! Another mindful deal",
      "Less impulse, more plan",
      "Wallet just sighed with relief",
      "Smart deal locked - savings are safe",
    ],
    level: "Level {{level}}! Savings armor upgraded ✨",
  },
  fr: {
    default: [
      "Boom ! Encore un choix conscient",
      "Moins d'impulsions, plus de plan",
      "Le portefeuille respire enfin",
      "Accord malin verrouillé - l'épargne est en sécurité",
    ],
    level: "Niveau {{level}} ! Armure d'épargne améliorée ✨",
  },
  es: {
    default: [
      "¡Boom! Otro ahorro consciente",
      "Menos impulso, más plan",
      "La cartera respira aliviada",
      "Intercambio inteligente: el ahorro está a salvo",
    ],
    female: [
      "¡Boom! Otro ahorro consciente",
      "Menos impulso, más plan",
      "La cartera respira aliviada",
      "Intercambio inteligente: el ahorro está a salvo",
    ],
    male: [
      "¡Boom! Otro ahorro consciente",
      "Menos impulso, más plan",
      "La cartera respira aliviada",
      "Intercambio inteligente: el ahorro está a salvo",
    ],
    none: [
      "¡Boom! Otro ahorro consciente",
      "Menos impulso, más plan",
      "La cartera respira aliviada",
      "Intercambio inteligente: el ahorro está a salvo",
    ],
    level: "¡Nivel {{level}}! Tu armadura de ahorro sube de rango ✨",
  },
  pt: {
    default: [
      "Boom! Mais uma economia consciente",
      "Menos impulso, mais plano",
      "A carteira respirou aliviada",
      "Troca inteligente garantida - a poupança está segura",
    ],
    level: "Nível {{level}}! A armadura de poupança subiu de nível ✨",
  },
  it: {
    default: [
      "Boom! Un altro risparmio consapevole",
      "Meno impulso, più piano",
      "Il portafoglio ha appena tirato un sospiro di sollievo",
      "Scambio intelligente bloccato - i risparmi sono al sicuro",
    ],
    level: "Livello {{level}}! Armatura del risparmio potenziata ✨",
  },
};

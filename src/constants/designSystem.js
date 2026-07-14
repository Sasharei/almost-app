import { Platform } from "react-native";

export const UI_SPACING = Object.freeze({
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
});

export const UI_RADIUS = Object.freeze({
  control: 10,
  card: 16,
  sheet: 20,
  pill: 999,
});

export const UI_TOUCH_TARGET = Object.freeze({
  ios: 44,
  android: 48,
  get current() {
    return Platform.OS === "android" ? 48 : 44;
  },
});

export const UI_MOTION = Object.freeze({
  press: 120,
  micro: 180,
  transition: 220,
  sheet: 320,
  celebration: 1200,
  reduced: 140,
  pressScale: 0.97,
});

export const UI_ELEVATION = Object.freeze({
  content: 0,
  sticky: 10,
  modalBackdrop: 20,
  modal: 30,
  toast: 40,
  tooltip: 50,
});


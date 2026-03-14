import { Dimensions, PixelRatio, Platform } from "react-native";
import { FAB_BUTTON_SIZE } from "./tutorialUiConstants";

export const TEMPTATION_SOFT_LIMIT = 150;
export const TEMPTATION_HARD_LIMIT = 200;

export const SCREEN_WIDTH = Dimensions.get("window").width;
export const SCREEN_HEIGHT = Dimensions.get("window").height;
export const SAVE_PROGRESS_BAR_WIDTH = Math.min(SCREEN_WIDTH - 80, 340);
export const CTA_LETTER_SPACING = 0.4;
export const FONT_SCALE = typeof PixelRatio.getFontScale === "function" ? PixelRatio.getFontScale() : 1;
export const IS_EXTRA_COMPACT_DEVICE = SCREEN_WIDTH <= 375 || (SCREEN_WIDTH <= 390 && FONT_SCALE > 1.1);
export const TYPOGRAPHY_SCALE = IS_EXTRA_COMPACT_DEVICE ? 0.92 : 1;

export const scaleFontSize = (value) =>
  typeof value === "number" ? Number((value * TYPOGRAPHY_SCALE).toFixed(2)) : value;

export const scaleLetterSpacing = (value) =>
  typeof value === "number" ? Number((value * TYPOGRAPHY_SCALE).toFixed(3)) : value;

export const scaleTypographyOverrides = (overrides = {}) => {
  if (!overrides || typeof overrides !== "object") return overrides;
  let next = overrides;
  const applyScaled = (key, scaleFn) => {
    if (typeof overrides[key] === "number") {
      if (next === overrides) next = { ...overrides };
      next[key] = scaleFn(overrides[key]);
    }
  };
  applyScaled("fontSize", scaleFontSize);
  applyScaled("lineHeight", scaleFontSize);
  applyScaled("letterSpacing", scaleLetterSpacing);
  return next;
};

export const MAX_MODAL_KEYBOARD_OFFSET = Math.min(SCREEN_HEIGHT * 0.45, 360);
export const OVERLAY_CARD_MAX_WIDTH = Math.min(SCREEN_WIDTH - 40, 440);
export const IS_COMPACT_DEVICE = SCREEN_WIDTH <= 380;
export const IS_SHORT_DEVICE = SCREEN_HEIGHT <= 740;
export const TAMAGOTCHI_LAYOUT_SCALE = Math.max(0.68, Math.min(1, SCREEN_HEIGHT / 980));

export const scaleTamagotchiMetric = (value, min = 0) =>
  Math.max(min, Math.round((Number(value) || 0) * TAMAGOTCHI_LAYOUT_SCALE));

export const IS_ANDROID_COMPACT = Platform.OS === "android" && (IS_COMPACT_DEVICE || IS_SHORT_DEVICE);
export const SAVE_COUNTER_DIGIT_HEIGHT = 64;
export const SAVE_COUNTER_SPIN_LOOPS = 2;
export const STREAK_COUNTER_DIGIT_HEIGHT = IS_SHORT_DEVICE ? 90 : 112;
export const STREAK_COUNTER_DIGIT_WIDTH = IS_SHORT_DEVICE ? 60 : 76;
export const STREAK_COUNTER_SPIN_LOOPS = 2;
export const SAVE_PROGRESS_DELAY_MS = 800;
export const SAVE_PROGRESS_PULSE_SCALE = 1.08;
export const SAVE_COUNTDOWN_ZOOM_DELAY_AFTER_SPIN = 1500;
export const SAVE_COUNTDOWN_FINAL_HOLD_DELAY = 2600;
export const PROFILE_SUBTITLE_FONT_SIZE = scaleFontSize(IS_COMPACT_DEVICE ? 12 : 13);
export const PROFILE_SUBTITLE_LINE_HEIGHT = scaleFontSize(IS_COMPACT_DEVICE ? 16 : 18);
export const PROFILE_STAT_LABEL_FONT_SIZE = scaleFontSize(IS_COMPACT_DEVICE ? 8.5 : 10);
export const PROFILE_STAT_LETTER_SPACING = scaleLetterSpacing(
  IS_COMPACT_DEVICE ? CTA_LETTER_SPACING * 0.6 : CTA_LETTER_SPACING * 0.8
);
export const CHALLENGE_TITLE_FONT_SIZE = scaleFontSize(IS_COMPACT_DEVICE ? 15 : 16);
export const CHALLENGE_DESC_FONT_SIZE = scaleFontSize(IS_COMPACT_DEVICE ? 13 : 14);
export const CHALLENGE_LINE_HEIGHT = scaleFontSize(IS_COMPACT_DEVICE ? 18 : 20);
export const CHALLENGE_META_FONT_SIZE = scaleFontSize(IS_COMPACT_DEVICE ? 11.5 : 12);

export const COIN_SLIDER_SIZE = IS_SHORT_DEVICE ? 190 : 220;
export const COIN_REVEAL_SIZE = FAB_BUTTON_SIZE;
export const COIN_FLIGHT_SIZE = IS_SHORT_DEVICE ? 56 : 64;

import { PRO_THEME_ACCENT_OPTIONS } from "../constants/themeConfig";

export const resolveAccentForeground = (accentId, fallback = "#101B45") =>
  PRO_THEME_ACCENT_OPTIONS.find((option) => option.id === accentId)?.onAccent || fallback;

const getRelativeLuminance = (color) => {
  const value = typeof color === "string" ? color.replace("#", "").trim() : "";
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return 0;
  const channels = value.match(/../g).map((channel) => {
    const normalized = Number.parseInt(channel, 16) / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

const getContrastRatio = (first, second) => {
  const firstLuminance = getRelativeLuminance(first);
  const secondLuminance = getRelativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

export const resolveForegroundForColor = (
  background,
  darkForeground = "#101B45",
  lightForeground = "#FFFFFF"
) =>
  getContrastRatio(background, darkForeground) >= getContrastRatio(background, lightForeground)
    ? darkForeground
    : lightForeground;


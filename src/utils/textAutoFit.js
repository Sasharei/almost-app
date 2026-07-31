import { PixelRatio, Platform } from "react-native";

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_MINIMUM_FONT_SCALE = 0.84;
const NATIVE_MINIMUM_FONT_SIZE = 4;

export const resolveFabricAutoFitMinimumFontSize = ({
  fontSize = DEFAULT_FONT_SIZE,
  minimumFontScale = DEFAULT_MINIMUM_FONT_SCALE,
  allowFontScaling = true,
  maxFontSizeMultiplier,
} = {}) => {
  if (!globalThis?.nativeFabricUIManager) return undefined;

  const resolvedFontSize = Number(fontSize);
  const baseFontSize =
    Number.isFinite(resolvedFontSize) && resolvedFontSize > 0
      ? resolvedFontSize
      : DEFAULT_FONT_SIZE;
  const resolvedMinimumScale = Number(minimumFontScale);
  const safeMinimumScale = Math.max(
    0.01,
    Math.min(
      1,
      Number.isFinite(resolvedMinimumScale) && resolvedMinimumScale > 0
        ? resolvedMinimumScale
        : DEFAULT_MINIMUM_FONT_SCALE
    )
  );
  const systemFontScale = allowFontScaling
    ? Math.max(0.01, Number(PixelRatio.getFontScale()) || 1)
    : 1;
  const resolvedMaximumMultiplier = Number(maxFontSizeMultiplier);
  const effectiveFontScale =
    allowFontScaling &&
    Number.isFinite(resolvedMaximumMultiplier) &&
    resolvedMaximumMultiplier >= 1
      ? Math.min(systemFontScale, resolvedMaximumMultiplier)
      : systemFontScale;
  const minimumPointSize = Math.max(
    NATIVE_MINIMUM_FONT_SIZE,
    baseFontSize * effectiveFontScale * safeMinimumScale
  );
  const nativeMinimumSize =
    Platform.OS === "android"
      ? minimumPointSize * Math.max(1, Number(PixelRatio.get()) || 1)
      : minimumPointSize;

  return Number(nativeMinimumSize.toFixed(2));
};

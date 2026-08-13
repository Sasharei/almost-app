import { PixelRatio, Platform } from "react-native";

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_MINIMUM_FONT_SCALE = 0.84;
const DEFAULT_MINIMUM_READABLE_FONT_SIZE = 11;
const NATIVE_MINIMUM_FONT_SIZE = 4;

export const resolveFabricAutoFitMinimumFontSize = ({
  fontSize = DEFAULT_FONT_SIZE,
  minimumFontScale = DEFAULT_MINIMUM_FONT_SCALE,
  minimumReadableFontSize = DEFAULT_MINIMUM_READABLE_FONT_SIZE,
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
  const scaledBaseFontSize = baseFontSize * effectiveFontScale;
  const resolvedMinimumReadableFontSize = Number(minimumReadableFontSize);
  const readablePointSize =
    Number.isFinite(resolvedMinimumReadableFontSize) && resolvedMinimumReadableFontSize > 0
      ? resolvedMinimumReadableFontSize
      : DEFAULT_MINIMUM_READABLE_FONT_SIZE;
  const minimumPointSize = Math.min(
    scaledBaseFontSize,
    Math.max(
      NATIVE_MINIMUM_FONT_SIZE,
      readablePointSize,
      scaledBaseFontSize * safeMinimumScale
    )
  );
  const nativeMinimumSize =
    Platform.OS === "android"
      ? minimumPointSize * Math.max(1, Number(PixelRatio.get()) || 1)
      : minimumPointSize;

  return Number(nativeMinimumSize.toFixed(2));
};

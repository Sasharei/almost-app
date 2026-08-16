const finiteOr = (value, fallback) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const resolveFabTutorialCutout = ({
  overlayWidth,
  overlayHeight,
  fabRight,
  fabBottom,
  fabSize,
  haloSize,
  cutoutBleed = 1,
} = {}) => {
  const resolvedOverlayWidth = Math.max(1, finiteOr(overlayWidth, 1));
  const resolvedOverlayHeight = Math.max(1, finiteOr(overlayHeight, 1));
  const resolvedFabRight = Math.max(0, finiteOr(fabRight, 0));
  const resolvedFabBottom = Math.max(0, finiteOr(fabBottom, 0));
  const resolvedFabSize = Math.max(0, finiteOr(fabSize, 0));
  const resolvedHaloSize = Math.max(resolvedFabSize, finiteOr(haloSize, resolvedFabSize));
  const resolvedBleed = Math.max(0, finiteOr(cutoutBleed, 0));
  const radius = Math.max(1, resolvedHaloSize / 2 + resolvedBleed);
  const centerX = resolvedOverlayWidth - resolvedFabRight - resolvedFabSize / 2;
  const centerY = resolvedOverlayHeight - resolvedFabBottom - resolvedFabSize / 2;
  const top = Math.max(0, centerY - radius);
  const bottom = Math.min(resolvedOverlayHeight, centerY + radius);
  const left = Math.max(0, centerX - radius);
  const right = Math.min(resolvedOverlayWidth, centerX + radius);

  return {
    top,
    bottom,
    left,
    right,
    height: Math.max(0, bottom - top),
    width: Math.max(0, right - left),
    centerX,
    centerY,
    radius,
    overlayWidth: resolvedOverlayWidth,
    overlayHeight: resolvedOverlayHeight,
  };
};

module.exports = {
  resolveFabTutorialCutout,
};

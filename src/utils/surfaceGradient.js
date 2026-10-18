// Keep the semantic tint as one endpoint. Move the other endpoint away from
// the supplied foreground, so the gradient never weakens its contrast.
export function resolveControlGradient(background, foreground) {
  const parse = (value) => /^#[\da-f]{6}$/i.test(value || "")
    ? [1, 3, 5].map((offset) => parseInt(value.slice(offset, offset + 2), 16)) : null;
  const base = parse(background);
  const text = parse(foreground);
  if (!base || !text) return [background, background];
  const luminance = (rgb) => rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const baseLuminance = luminance(base);
  const textLuminance = luminance(text);
  const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const destination = textLuminance > baseLuminance ? 0 : 255;
  const end = base.map((v) => Math.round(v + (destination - v) * 0.1));
  if (contrast(luminance(end), textLuminance) < contrast(baseLuminance, textLuminance)) return [background, background];
  return [background, `#${end.map((v) => v.toString(16).padStart(2, "0")).join("")}`];
}

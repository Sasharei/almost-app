// A control's painted icon can be small, but its layout must reserve a usable target.
// Keep switch tracks and full-screen dismiss layers in their own coordinate system.
function resolveControlGeometry(style = {}, target = 44, role = "button") {
  if (role === "switch" || style.display === "none" || style.height === 0 || style.width === 0) {
    return null;
  }
  const geometry = {
    minHeight: Math.max(target, Number(style.minHeight) || 0),
    minWidth: Math.max(target, Number(style.minWidth) || 0),
  };
  if (typeof style.height === "number" && style.height < target) geometry.height = target;
  // Full-width text actions grow with translated labels and accessibility text.
  // Square icon targets keep their measured footprint for navigation and overlays.
  if (style.width === "100%" && typeof style.height === "number" && style.height > 0) {
    geometry.height = undefined;
    geometry.minHeight = Math.max(geometry.minHeight, style.height);
  }
  if (typeof style.width === "number" && style.width < target) geometry.width = target;
  if (typeof style.maxHeight === "number" && style.maxHeight < target) geometry.maxHeight = target;
  if (typeof style.maxWidth === "number" && style.maxWidth < target) geometry.maxWidth = target;
  if (!style.justifyContent) geometry.justifyContent = "center";
  return geometry;
}

module.exports = { resolveControlGeometry };

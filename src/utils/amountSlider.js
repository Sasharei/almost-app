// Steps are expressed in the displayed currency, never in the USD storage unit.
function resolveAmountSliderStep(maximum, minimumStep = 0.01, minorUnit = minimumStep) {
  if (maximum < minimumStep * 20) minimumStep = Math.min(minimumStep, minorUnit);
  const target = Math.max(minimumStep, maximum / 120);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  return Math.max(minimumStep, [1, 2, 5, 10].find((n) => n * magnitude >= target) * magnitude);
}

function snapAmountSliderValue(amount, maximum, step, minimum, previous) {
  const bounded = Math.max(minimum, Math.min(maximum, amount));
  if (bounded === minimum || bounded === maximum) return bounded;
  // A small deadband prevents finger tremor from chattering between two steps.
  if (Number.isFinite(previous) && Math.abs(bounded - previous) < step * 0.6) return previous;
  return Math.max(minimum, Math.min(maximum, Number((Math.round(bounded / step) * step).toFixed(8))));
}

function amountSliderRatioFromX(x, width, thumbSize = 32) {
  return Math.max(0, Math.min(1, (x - thumbSize / 2) / Math.max(1, width - thumbSize)));
}

function amountSliderDragDelta(dx, verticalDistance, width, thumbSize = 32) {
  const precision = Math.abs(verticalDistance) > 100 ? 0.1 : Math.abs(verticalDistance) > 48 ? 0.25 : 1;
  return dx * precision / Math.max(1, width - thumbSize);
}

module.exports = { resolveAmountSliderStep, snapAmountSliderValue, amountSliderRatioFromX, amountSliderDragDelta };

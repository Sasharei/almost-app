// Display money in the currency's minor units, never FX calculation residue.
function confirmationAmountPrecision(_value, currencyPrecision = 2) {
  return Number.isFinite(currencyPrecision) ? Math.max(0, Math.min(3, Math.trunc(currencyPrecision))) : 2;
}
module.exports = { confirmationAmountPrecision };

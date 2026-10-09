import { CURRENCY_SELECTOR_COPY } from '../constants/currencySelectorCopy';
import { CURRENCY_RATES } from '../constants/economyConfig';
import { resolveTranslationLanguage } from './language';

export const getCurrencySelectorCopy = (language) =>
  CURRENCY_SELECTOR_COPY[resolveTranslationLanguage(language)] || CURRENCY_SELECTOR_COPY.en;

const normalizeSearch = (value) => String(value || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

export const getCurrencyOptions = ({ codes = Object.keys(CURRENCY_RATES), language, query = '', selectedCurrency } = {}) => {
  const copy = getCurrencySelectorCopy(language);
  const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
  const options = [...new Set(codes.map((code) => String(code || '').trim().toUpperCase()))]
    .filter((code) => Object.prototype.hasOwnProperty.call(CURRENCY_RATES, code))
    .sort()
    .map((code) => ({ code, name: copy.names[code] || CURRENCY_SELECTOR_COPY.en.names[code], selected: code === selectedCurrency }));
  return tokens.length ? options.filter(({ code, name }) => {
    const haystack = normalizeSearch(`${code} ${name} ${CURRENCY_SELECTOR_COPY.en.names[code]}`);
    return tokens.every((token) => haystack.includes(token));
  }) : options;
};

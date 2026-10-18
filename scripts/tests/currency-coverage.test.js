const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { parse } = require('@babel/parser');
const root = path.join(__dirname, '../..');
const app = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
const names = [
  'CURRENCIES', 'CURRENCY_LOCALES', 'normalizeCurrencyCode', 'getCurrencyPrecision',
  'getCurrencyDisplayPrecision', 'roundCurrencyValue', 'getCurrencyFineStep',
  'convertToCurrency', 'convertFromCurrency', 'normalizeCurrencyRatesSnapshot',
  'parseCachedCurrencyRates', 'applyRuntimeCurrencyRates', 'EXCHANGE_RATES_BASE_CODE',
  'EXCHANGE_RATES_SUPPORTED_CODES', 'CURRENCY_DISPLAY_SYMBOLS', 'CURRENCY_DISPLAY_ALIASES',
  'CURRENCY_SIMPLE_DOLLAR_PATTERNS', 'escapeRegExp', 'getCurrencyDisplaySymbol',
  'normalizeCurrencyDisplayLabel', 'formatNumberWithGrouping', 'formatCurrencyFallback',
  'formatCurrency', 'formatAlmostPayAmount', 'NARROW_DOLLAR_SYMBOL_CURRENCIES',
];
const declarations = parse(app, { sourceType: 'module', plugins: ['jsx'] }).program.body
  .filter((node) => node.type === 'VariableDeclaration' && names.includes(node.declarations[0].id.name))
  .map((node) => app.slice(node.start, node.end)).join('\n');
const economy = fs.readFileSync(path.join(root, 'src/constants/economyConfig.js'), 'utf8').replace(/export /g, '');
const additions = 'HKD INR CHF PHP SEK CZK KGS MDL NGN RON UAH ILS PKR TRY SCR UZS'.split(' ');
function setup(locale = 'en-US', noIntl = false) {
  return vm.runInNewContext(`${economy}\n${declarations}\n({${names.join(',')}, CURRENCY_RATES, WALLET_CURRENCY_RATES, CURRENCY_SIGNS, CURRENCY_FINE_STEPS, CURRENCY_REWARD_STEPS})`, {
    DEFAULT_PROFILE: { currency: 'USD' }, activeCurrency: 'USD',
    resolveCurrencyLocale: () => locale, shouldForceLtrCurrencyLayout: () => false,
    getCachedIntlNumberFormat: (l, options) => {
      if (noIntl) throw Error('Intl unavailable');
      return new Intl.NumberFormat(l, options);
    },
    warnIntlFallback: () => {},
    confirmationAmountPrecision: require('../../src/utils/confirmationAmount').confirmationAmountPrecision,
  });
}

test('new selectable currencies have usable rates, symbols and monetary steps', () => {
  const api = setup();
  assert.equal(api.CURRENCIES.length, new Set(api.CURRENCIES).size);
  assert.deepEqual(Array.from(api.CURRENCIES).sort(), Object.keys(api.CURRENCY_RATES).sort());
  for (const code of additions) {
    assert.equal(api.normalizeCurrencyCode(` ${code.toLowerCase()} `), code);
    assert.ok(api.CURRENCY_SIGNS[code]);
    assert.ok(api.CURRENCY_LOCALES[code]);
    assert.ok(api.CURRENCY_FINE_STEPS[code] > 0);
    assert.ok(api.CURRENCY_REWARD_STEPS[code] > 0);
    assert.equal(api.getCurrencyPrecision(code), 2);
    for (const value of [0, 0.01, 123.45, 10_000_000]) {
      const local = api.convertToCurrency(value, code);
      assert.ok(Number.isFinite(local));
      assert.ok(Math.abs(api.convertFromCurrency(local, code) - value) <= Math.max(1e-9, value * 1e-12));
    }
    assert.equal(api.roundCurrencyValue(123.456, code), 123.46);
  }
  for (const code of ['JPY', 'KRW', 'KZT', 'RUB', 'ARS', 'TWD']) assert.equal(api.getCurrencyPrecision(code), 0);
  assert.equal(api.normalizeCurrencyCode('invalid'), 'USD');
});

test('foreign Wallet currencies retain offline rates and refresh without expanding selectable currencies', () => {
  const api = setup();
  const selectable = Object.keys(api.CURRENCY_RATES).sort();
  for (const code of ['KWD', 'BHD', 'OMR', 'QAR', 'EGP', 'NZD', 'SGD', 'NOK', 'DKK', 'ZAR', 'IDR', 'THB', 'MYR', 'VND']) {
    assert.ok(api.WALLET_CURRENCY_RATES[code] > 0, code);
    assert.ok(api.EXCHANGE_RATES_SUPPORTED_CODES.includes(code), code);
  }
  const previous = api.WALLET_CURRENCY_RATES.KWD;
  const snapshot = api.parseCachedCurrencyRates(JSON.stringify({ base: 'USD', rates: { USD: 1, KWD: 0.31, BHD: -1 } }));
  const bhd = api.WALLET_CURRENCY_RATES.BHD;
  assert.ok(api.applyRuntimeCurrencyRates(snapshot.rates));
  assert.notEqual(previous, 0.31);
  assert.equal(api.WALLET_CURRENCY_RATES.KWD, 0.31);
  assert.equal(api.WALLET_CURRENCY_RATES.BHD, bhd);
  assert.deepEqual(Object.keys(api.CURRENCY_RATES).sort(), selectable);
});

test('partial cached/live rates preserve fallbacks for newly supported currencies', () => {
  const api = setup();
  const original = api.CURRENCY_RATES.UZS;
  const cache = api.parseCachedCurrencyRates(JSON.stringify({ base: 'USD', rates: { EUR: 0.9, HKD: 8, UZS: -1, INR: 'bad' } }));
  assert.ok(cache);
  api.applyRuntimeCurrencyRates(cache.rates);
  assert.equal(api.CURRENCY_RATES.HKD, 8);
  assert.equal(api.CURRENCY_RATES.UZS, original);
  assert.equal(api.parseCachedCurrencyRates('{broken'), null);
  assert.equal(api.parseCachedCurrencyRates(JSON.stringify({ base: 'EUR', rates: { HKD: 8 } })), null);
  api.applyRuntimeCurrencyRates(Object.fromEntries(additions.map((code) => [code, 2])));
  for (const code of additions) assert.equal(api.CURRENCY_RATES[code], 2);
});

test('actual confirmation formatting retains minor units across every language and RTL locale', () => {
  for (const locale of ['en-US', 'es-ES', 'fr-FR', 'ru-RU', 'de-DE', 'pt-PT', 'it-IT', 'ar-SA', 'ar-AE', 'zh-CN', 'zh-TW', 'ko-KR', 'ja-JP']) {
    const api = setup(locale);
    for (const code of additions) {
      const usd = api.convertFromCurrency(123.45, code);
      const formatted = api.formatAlmostPayAmount(usd, code);
      const digits = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(123.45);
      assert.ok(formatted.includes(digits), `${locale}/${code}: ${formatted}`);
      assert.doesNotMatch(formatted, /NaN|undefined|Infinity/);
      assert.ok(api.formatCurrency(123.45, code));
    }
  }
  const fallback = setup('en-US', true);
  for (const code of additions) {
    assert.ok(fallback.formatAlmostPayAmount(fallback.convertFromCurrency(123.45, code), code).includes('123.45'));
    assert.ok(fallback.formatCurrencyFallback(123.45, code, 2).includes('123.45'));
  }
});

test('spend results and save reward totals retain the confirmed decimal amount', () => {
  const tree = parse(app, { sourceType: 'module', plugins: ['jsx'] });
  const targets = {};
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'VariableDeclarator' && ['triggerStormEffect', 'savedValue'].includes(node.id?.name)) {
      targets[node.id.name] = node.init;
    }
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === 'object') visit(child);
    }
  }
  visit(tree.program);
  const spendCallback = targets.triggerStormEffect.arguments[0];
  const spendSource = app.slice(spendCallback.start, spendCallback.end);
  const savedSource = app.slice(targets.savedValue.start, targets.savedValue.end);
  for (const locale of ['en-US', 'es-ES', 'fr-FR', 'ru-RU', 'de-DE', 'ar-SA', 'ar-AE', 'zh-CN']) {
    for (const noIntl of [false, true]) {
      const api = setup(locale, noIntl);
      for (const currency of ['USD', 'EUR', 'SAR', 'JPY']) {
        for (const local of [0.01, 5.5, 5.55, 10.99, 1234.56]) {
          const usd = api.convertFromCurrency(local, currency);
          const expected = api.formatAlmostPayAmount(usd, currency);
          const precision = api.getCurrencyPrecision(currency);
          const digits = new Intl.NumberFormat(locale, {
            minimumFractionDigits: precision, maximumFractionDigits: precision,
          }).format(local);
          if (!noIntl) assert.ok(expected.includes(digits), `${locale}/${currency}/${local}: ${expected}`);
          let result;
          const callback = vm.runInNewContext(`(${spendSource})`, {
            ...api,
            stormTimerRef: { current: null }, profile: { currency },
            resolveTemptationCategory: () => 'coffee', IMPULSE_CATEGORY_DEFS: { coffee: { en: 'Coffee' } },
            customCategories: [], resolveLanguageMapValue: () => 'Coffee', language: locale,
            setSpendResultPayload: (payload) => { result = payload; }, setStormActive: () => {},
            setTimeout: () => 1, STORM_OVERLAY_DURATION_MS: 1000,
          });
          callback({ id: 'coffee' }, usd);
          assert.equal(result.amount, expected, `spend ${locale}/${currency}/${local}`);
          const saved = vm.runInNewContext(savedSource, {
            ...api, payload: { savedTotalForCardUSD: usd, currency }, savedAmountLabel: 'legacy label',
          });
          assert.equal(saved, expected, `reward ${locale}/${currency}/${local}`);
        }
      }
    }
  }
  assert.equal(vm.runInNewContext(savedSource, { payload: {}, savedAmountLabel: '$5.55' }), '$5.55');
});

test('bank expense parsers recognize each new explicit ISO code on both platforms', () => {
  const rules = JSON.parse(fs.readFileSync(path.join(root, 'src/bankExpenses/parserRules.json'), 'utf8'));
  const matcher = new RegExp(`^${rules.code}$`);
  const swift = fs.readFileSync(path.join(root, 'ios/Almost/ExpensePatterns.swift'), 'utf8');
  const java = fs.readFileSync(path.join(root, 'android/app/src/main/java/com/sasarei/almostclean/expenses/ExpenseParser.java'), 'utf8');
  for (const code of additions) {
    assert.ok(matcher.test(code), code);
    assert.ok(swift.includes(code), `iOS ${code}`);
    assert.ok(java.includes(code), `Android ${code}`);
  }
  for (const code of ['$', 'kr', 'Rs', 'ABC']) assert.equal(matcher.test(code), false);
});

// QA release regression: overview totals must preserve monetary minor units.
test('default totals preserve 7.25 in every locale and the Intl fallback', () => {
  for (const locale of ['en-US','es-ES','fr-FR','ru-RU','de-DE','pt-PT','it-IT','ar-SA','ar-AE','zh-CN','zh-TW','ko-KR','ja-JP']) {
    const api=setup(locale);
    const digits=new Intl.NumberFormat(locale,{minimumFractionDigits:2,maximumFractionDigits:2}).format(7.25);
    assert.ok(api.formatCurrency(7.25,'USD').includes(digits),locale);
  }
  assert.ok(setup('en-US',true).formatCurrency(7.25,'USD').includes('7.25'));
});

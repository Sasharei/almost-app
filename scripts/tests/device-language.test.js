const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync('App.js', 'utf8');
function languageApi(tags = [], { native = {}, intl = 'en-US', throws = false } = {}) {
  const source = fs.readFileSync('src/utils/language.js', 'utf8').replace(/^import .*;\n/gm, '').replace(/export const /g, 'const ');
  return vm.runInNewContext(source + '\n({ getPreferredDeviceLanguage, getDefaultCurrencyForLanguage })', {
    React: {}, NativeModules: native,
    Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ locale: intl }) }) },
    getLocales: () => { if (throws) throw Error('native unavailable'); return tags.map((languageTag) => ({ languageTag })); },
  });
}

test('ordered system languages win over the Intl formatting locale', () => {
  for (const [tag, expected] of [['ru-RU', 'ru'], ['es-MX', 'es'], ['pt-BR', 'pt'], ['ar-AE', 'ar-ae'], ['zh-Hant-HK', 'zh-Hant'], ['zh-Hans-CN', 'zh'], ['ja-JP', 'ja'], ['ko-KR', 'ko']]) {
    assert.equal(languageApi([tag]).getPreferredDeviceLanguage(), expected);
  }
  assert.equal(languageApi(['pl-PL', 'fr-FR']).getPreferredDeviceLanguage(), 'fr');
  assert.equal(languageApi(['invalid', 'de-DE']).getPreferredDeviceLanguage(), 'de');
  assert.equal(languageApi(['xx-ZZ']).getPreferredDeviceLanguage(), 'en');
});

test('legacy native preferences and safe fallback remain available', () => {
  assert.equal(languageApi([], { throws: true, native: { SettingsManager: { settings: { AppleLanguages: ['ru-RU', 'en-US'] } } } }).getPreferredDeviceLanguage(), 'ru');
  assert.equal(languageApi([], { throws: true, native: { I18nManager: { localeIdentifier: 'es_ES' } } }).getPreferredDeviceLanguage(), 'es');
  assert.equal(languageApi([], { throws: true, intl: '' }).getPreferredDeviceLanguage(), 'en');
});

test('all supported app languages have an explicit currency default', () => {
  const api = languageApi();
  for (const [language, currency] of Object.entries({ en: 'USD', ru: 'RUB', es: 'EUR', fr: 'EUR', de: 'EUR', pt: 'EUR', it: 'EUR', 'ar-sa': 'SAR', 'ar-ae': 'AED', zh: 'CNY', 'zh-Hant': 'TWD', ja: 'JPY', ko: 'KRW' })) {
    assert.equal(api.getDefaultCurrencyForLanguage(language), currency);
  }
});

const changeHandler = app.slice(app.indexOf('  const handleLanguageChange = '), app.indexOf('  const handleTermsOpen = '));
test('onboarding language changes update automatic currency while manual/existing-user currency wins', () => {
  const api = languageApi();
  for (const [done, manual, expected] of [[false, false, 'RUB'], [false, true, 'PHP'], [true, false, 'PHP'], [true, true, 'PHP']]) {
    let currency = 'PHP';
    const handler = vm.runInNewContext(changeHandler + '\nhandleLanguageChange', {
      normalizeLanguage: (value) => value, language: 'en', onboardingStep: done ? 'done' : 'language',
      onboardingCurrencyManuallySelectedRef: { current: manual }, triggerHaptic() {}, setLanguage() {}, triggerWidgetRefresh() {}, logEvent() {},
      getDefaultCurrencyForLanguage: api.getDefaultCurrencyForLanguage,
      updateRegistrationData: (field, code, options) => { assert.equal(field, 'currency'); assert.equal(options.manualCurrency, false); currency = code; },
    });
    handler('ru');
    assert.equal(currency, expected);
  }
});

test('fresh-install hydration follows system language and preserves stored manual currency on restart', () => {
  const start = app.indexOf('        const storedCurrency = typeof rawProfile?.currency');
  const end = app.indexOf('        setActiveGoalId(null);', start);
  const source = app.slice(start, end);
  for (const [stored, expectedCurrency, expectedManual] of [[null, 'RUB', false], [{currency:'PHP'}, 'PHP', true], [{currency:'PHP',currencyManuallySelected:true}, 'PHP', true], [{currency:'RUB',currencyManuallySelected:false}, 'RUB', false], [{currency:'invalid'}, 'RUB', false]]) {
    let profile;
    const ref = { current: false };
    vm.runInNewContext(source, { rawProfile: stored, CURRENCIES: ['RUB','USD','PHP'], hydratedLanguage: 'ru', getDefaultCurrencyForLanguage: languageApi().getDefaultCurrencyForLanguage, onboardingCurrencyManuallySelectedRef: ref, DEFAULT_PROFILE_PLACEHOLDER: {currency:'USD'}, setProfile: (value) => { profile = value; }, setProfileDraft() {} });
    assert.equal(profile.currency, expectedCurrency);
    assert.equal(profile.currencyManuallySelected, expectedManual);
    assert.equal(ref.current, expectedManual);
  }
});

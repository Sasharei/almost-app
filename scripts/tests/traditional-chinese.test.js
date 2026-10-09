const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function loadLanguage() {
  const fallback = fs.readFileSync('src/constants/languageMapFallback.generated.js', 'utf8').replace('export const ', 'const ');
  const source = fs.readFileSync('src/utils/language.js', 'utf8').replace(/^import .*;\n/gm, '').replace(/export const /g, 'const ');
  const context = vm.createContext({ React: { isValidElement: () => false }, NativeModules: {}, Intl });
  return vm.runInContext(fallback + '\n' + source + '\n({normalizeLanguage,resolveTranslationLanguage,getFormatLocale,getDefaultCurrencyForLanguage,localizeFallbackTextByLanguage,localizeTextTreeDigits,LANGUAGE_NATIVE_LABELS})', context);
}
const language = loadLanguage();
test('Traditional device locales retain script while Simplified remains separate', () => {
  for (const locale of ['zh-TW','zh_Hant','zh-Hant-TW','zh-HK']) {
    assert.equal(language.normalizeLanguage(locale), 'zh-Hant');
    assert.equal(language.resolveTranslationLanguage(locale), 'zh-Hant');
    assert.equal(language.getFormatLocale(locale), 'zh-Hant-TW');
    assert.equal(language.getDefaultCurrencyForLanguage(locale), 'TWD');
  }
  for (const locale of ['zh','zh-CN','zh-Hans','zh-SG']) {
    assert.equal(language.normalizeLanguage(locale), 'zh');
    assert.equal(language.getFormatLocale(locale), 'zh-Hans-CN');
  }
  assert.equal(language.LANGUAGE_NATIVE_LABELS['zh-Hant'], '繁體中文');
});
test('user-entered content and placeholder identifiers are not converted', () => {
  const custom = '我的购物目标 {{title}}';
  assert.equal(language.localizeTextTreeDigits(custom, 'zh-Hant'), custom);
  assert.equal(language.localizeFallbackTextByLanguage(custom, 'zh-Hant'), custom);
});

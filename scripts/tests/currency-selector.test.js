const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('@babel/core');
const copySource = fs.readFileSync('src/constants/currencySelectorCopy.js', 'utf8').replace('export const ', 'const ');
const copies = vm.runInNewContext(copySource + '\nCURRENCY_SELECTOR_COPY');
const ratesSource = fs.readFileSync('src/constants/economyConfig.js', 'utf8').replace(/export /g, '');
const economy = vm.runInNewContext(ratesSource + '\n({CURRENCY_RATES,CURRENCY_SIGNS})');
const source = fs.readFileSync('src/utils/currencySelector.js', 'utf8').replace(/^import .*;\n/gm, '').replace(/export const /g, 'const ');
const resolveTranslationLanguage = (l) => String(l).startsWith('ar') ? 'ar' : l;
const api = vm.runInNewContext(source + '\n({getCurrencyOptions,getCurrencySelectorCopy})', { CURRENCY_SELECTOR_COPY: copies, ...economy, resolveTranslationLanguage });

test('every locale names the complete catalog and has matching copy/placeholder keys', () => {
  const keys = Object.keys(copies.en).sort();
  const currencies = Object.keys(economy.CURRENCY_RATES).sort();
  assert.equal(currencies.length, 34);
  for (const [language, copy] of Object.entries(copies)) {
    assert.deepEqual(Object.keys(copy).sort(), keys, language);
    assert.deepEqual(Object.keys(copy.names).sort(), currencies, language);
    for (const code of currencies) assert.ok(copy.names[code] && copy.names[code] !== code, `${language}/${code}`);
    assert.deepEqual(Array.from(api.getCurrencyOptions({ language }).map((o) => o.code)), currencies);
  }
  assert.equal(api.getCurrencySelectorCopy('ar-ae'), copies.ar);
  assert.equal(api.getCurrencySelectorCopy('ar-sa'), copies.ar);
});

test('search is case/diacritic independent and never loses or duplicates currencies', () => {
  const find = (query, language = 'ru') => Array.from(api.getCurrencyOptions({ language, query }).map((o) => o.code));
  assert.deepEqual(find(' php '), ['PHP']);
  assert.ok(find('песо').includes('PHP'));
  assert.ok(find('peso', 'zh').includes('PHP'));
  assert.deepEqual(find('PHILIPPINE PESO', 'en'), ['PHP']);
  assert.deepEqual(find('shekel', 'ar'), ['ILS']);
  assert.deepEqual(find('abcxyz'), []);
  assert.ok(find('ceska', 'cs').length === 0); // Unsupported languages use the English dictionary.
  const name = copies.fr.names.PHP;
  assert.deepEqual(find(name.normalize('NFD').replace(/\p{M}/gu, ''), 'fr'), ['PHP']);
  const options = api.getCurrencyOptions({ codes: ['PHP', 'php', 'INVALID', 'USD', 'PHP'], language: 'en', selectedCurrency: 'PHP' });
  assert.deepEqual(Array.from(options.map((o) => o.code)), ['PHP', 'USD']);
  assert.equal(options.filter((o) => o.selected).length, 1);
});

// Exercise the real shared component's callbacks through a minimal element adapter.
// This verifies interaction wiring; it is not a native visual/keyboard test.
const pickerSource = fs.readFileSync('src/components/CurrencyPicker.js', 'utf8').replace(/^import .*;\n/gm, '').replace(/export function /g, 'function ');
const compiled = babel.transformSync(pickerSource, { configFile: false, babelrc: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
function renderPicker(query = '', withTap = false) {
  const events = [];
  const React = { createElement: (type, props, ...children) => ({ type, props: props || {}, children }), Fragment: 'Fragment' };
  const nodes = vm.runInNewContext(compiled + '\n({CurrencyPicker,CurrencyRow})', {
    React, useMemo: (fn) => fn(), useRef: () => ({ current: null }), useState: () => [query, (value) => events.push(['query', value])],
    ...Object.fromEntries(['FlatList','KeyboardAvoidingView','Modal','Text','TextInput','View','Svg','Path','Pressable'].map((name) => [name, name])),
    Keyboard: { dismiss: () => events.push(['dismiss']) }, Platform: { OS: 'ios' }, StyleSheet: { create: (s) => s, hairlineWidth: 1 },
    THEMES: {}, ...economy, ...api, isRtlLanguage: () => false,
  });
  const tree = nodes.CurrencyPicker({ language: 'en', currency: 'PHP', colors: {}, onTap: withTap ? (kind, options) => events.push(['tap', kind, options.skipCooldown]) : undefined, onSelect: (code) => events.push(['select', code]), onBack: () => events.push(['back']) });
  const all = [];
  const walk = (node) => { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(walk); all.push(node); node.children?.forEach(walk); };
  walk(tree);
  return { nodes, all, events };
}

test('tapping currency applies exactly once then returns, including a selected currency', () => {
  const { all, nodes, events } = renderPicker();
  const list = all.find((n) => n.type === 'FlatList');
  assert.equal(list.props.keyboardShouldPersistTaps, 'handled');
  assert.equal(list.props.data.some((o) => o.code === 'PHP'), false); // Current selection is shown once in the header.
  const element = list.props.renderItem({ item: api.getCurrencyOptions({ language: 'en', selectedCurrency: 'PHP' }).find((o) => o.code === 'PHP') });
  const row = nodes.CurrencyRow(element.props);
  assert.equal(row.props.accessibilityState.selected, true);
  row.props.onPress();
  assert.deepEqual(events, [['dismiss'], ['select', 'PHP'], ['back']]);
});

test('Back cancels without a write, empty search clears and keeps all options available', () => {
  const { all, events } = renderPicker('abcxyz');
  all.find((n) => n.type === 'Pressable').props.onPress();
  assert.deepEqual(events, [['back']]);
  const empty = all.find((n) => n.type === 'FlatList').props.ListEmptyComponent;
  empty.children.find((n) => n?.type === 'Pressable').props.onPress();
  assert.deepEqual(events, [['back'], ['query', '']]);
  const filtered = renderPicker('PHP');
  const list = filtered.all.find((n) => n.type === 'FlatList');
  assert.deepEqual(Array.from(list.props.data.map((o) => o.code)), ['PHP']);
});

test('onboarding retains one tap sound before selection and return', () => {
  const { all, nodes, events } = renderPicker('', true);
  const list = all.find((n) => n.type === 'FlatList');
  const element = list.props.renderItem({ item: list.props.data[0] });
  nodes.CurrencyRow(element.props).props.onPress();
  assert.deepEqual(events, [['dismiss'], ['tap', 'tap', true], ['select', list.props.data[0].code], ['back']]);
});

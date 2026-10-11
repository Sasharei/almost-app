const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const read = (file) => fs.readFileSync(path.join(__dirname, '../..', file), 'utf8');
const source = read('src/components/PlatformSurface.js');
const helpers = source.slice(source.indexOf('function isDarkColor'), source.indexOf('function nativeGlassAvailable'));
const { resolveStableSurfaceColor, resolveSurfaceAppearance } = vm.runInNewContext(`${helpers}\n({resolveStableSurfaceColor, resolveSurfaceAppearance})`);
const config = vm.runInNewContext(`${read('src/constants/themeConfig.js').replace(/export const /g, 'const ')}\n({THEMES, PRO_THEME_ACCENT_OPTIONS})`);
const app = read('App.js');
const rgb = (color) => color.slice(1).match(/../g).map((v) => parseInt(v, 16));
const blendColors = (a, b, alpha) => `#${rgb(a).map((v, i) => Math.round(v * (1 - alpha) + rgb(b)[i] * alpha).toString(16).padStart(2, '0')).join('')}`;
const colorWithAlpha = (color, alpha) => `rgba(${rgb(color).join(',')},${alpha})`;
const luminance = (color) => rgb(color).map((v) => v / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);

test('translucent tints inherit the canvas appearance, including a root dark canvas and nested surfaces', () => {
  const tint = 'rgba(47,97,143,0.08)';
  const light = resolveStableSurfaceColor(tint, '#FFFFFF');
  const dark = resolveStableSurfaceColor(tint, '#191F2B');
  assert.equal(resolveSurfaceAppearance(light, null), false);
  assert.equal(resolveSurfaceAppearance(dark, null), true);
  assert.equal(resolveStableSurfaceColor('rgba(0,0,0,0)', dark), dark);
  assert.equal(resolveStableSurfaceColor('transparent', dark), dark);
  assert.equal(resolveStableSurfaceColor('#6549C8', light), '#6549C8');
  assert.equal(resolveSurfaceAppearance(resolveStableSurfaceColor(tint, light), null), false);
});

test('translucent iOS surfaces bypass adaptive glass, including when transparency is reduced', () => {
  const component = source.slice(source.indexOf('const SurfaceMaterial ='), source.indexOf('\nfunction resolveSurfaceStyle'));
  const code = babel.transformSync(component, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
  for (const reduced of [false, true]) {
    const React = { memo: (f) => f, createElement: (type, props, ...children) => ({ type, props, children }) };
    const render = vm.runInNewContext(`${helpers}\n${code}\nSurfaceMaterial`, {
      React, useMotionPreferences: () => ({ reduceTransparency: reduced }),
      useContext: (context) => context, SurfaceDepth: false, SurfaceAppearance: false, SurfaceBackground: '#FFFFFF',
      StyleSheet: { flatten: (v) => v, absoluteFillObject: {} }, Platform: { OS: 'ios' },
      resolveSwiftUISurface: () => 'NativeSurface', nativeGlassAvailable: () => true,
      View: 'View', GlassView: 'GlassView', BlurView: 'BlurView',
    });
    const tree = render({ style: { backgroundColor: 'rgba(47,97,143,0.08)' }, surfaceRole: 'card' });
    assert.equal(tree.children[0].type, 'View');
    assert.equal(tree.children[0].props.style[1].backgroundColor, '#eef2f6');
    assert.equal(tree.props.pointerEvents, 'none');
  }
});

test('protection and ready bonus text retain readable contrast in every theme and PRO accent', () => {
  const palettes = [...Object.entries(config.THEMES), ...config.PRO_THEME_ACCENT_OPTIONS.map((v) => [v.id, { ...config.THEMES.pro, ...v.palette, primary: v.accent, onPrimary: v.onAccent }])];
  const start = app.indexOf('  const isAndroidTamagotchiSurface =');
  const end = app.indexOf('  const tamagotchiImmunityBorderColor', start);
  const rewardFormula = app.match(/const dailyRewardButtonTextColor = ([^;]+);/)[1];
  for (const [id, colors] of palettes) {
    const isDarkTheme = colors.appearance === 'dark';
    const protection = vm.runInNewContext(`${app.slice(start, end)}\n({tamagotchiImmunityAccent, tamagotchiImmunitySurfaceColor, tamagotchiImmunityMutedColor})`, { colors, isDarkTheme, Platform: { OS: 'ios' }, blendColors, colorWithAlpha });
    const surface = resolveStableSurfaceColor(protection.tamagotchiImmunitySurfaceColor, colors.card);
    for (const text of [colors.text, protection.tamagotchiImmunityMutedColor, protection.tamagotchiImmunityAccent]) {
      assert.ok(contrast(text, surface) >= 4.5, `${id} protection ${text}: ${contrast(text, surface)}`);
    }
    const rewardText = vm.runInNewContext(rewardFormula, { blendColors, colors });
    const rewardSurface = resolveStableSurfaceColor(colorWithAlpha(read('src/constants/economyConfig.js').match(/SAVE_ACTION_COLOR = "([^"]+)"/)[1], isDarkTheme ? 0.24 : 0.13), colors.card);
    // The decorative glow can cross long localized labels on narrow screens.
    const rewardGlow = resolveStableSurfaceColor(colorWithAlpha('#2EB873', isDarkTheme ? 0.28 : 0.18), rewardSurface);
    for (const background of [rewardSurface, rewardGlow]) {
      assert.ok(contrast(rewardText, background) >= 4.5, `${id} bonus: ${contrast(rewardText, background)}`);
    }
  }
});


test('party glow belongs to the mascot and cannot cover bonus, protection or care controls', () => {
  const parser = require('@babel/parser');
  const tree = parser.parse(app, { sourceType: 'module', plugins: ['jsx'] });
  let owners;
  const visit = (node, ancestors = []) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'MemberExpression' && node.object?.name === 'styles' && node.property?.name === 'partyGlowOverlay') {
      owners = ancestors.filter((v) => v.type === 'JSXElement');
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach((child) => visit(child, [...ancestors, node]));
      else if (value && typeof value === 'object') visit(value, [...ancestors, node]);
    }
  };
  visit(tree);
  assert.ok(owners?.some((node) => app.slice(node.openingElement.start, node.openingElement.end).includes('styles.tamagotchiMascotWrap')));
  assert.ok(owners?.some((node) => node.openingElement.name.name === 'ScrollView'));
});

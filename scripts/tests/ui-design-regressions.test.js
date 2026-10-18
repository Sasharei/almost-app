const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const babel = require('@babel/core');
function load(file, mocks, globals = {}) {
  const code = babel.transformSync(fs.readFileSync(file, 'utf8'), {
    babelrc: false, configFile: false,
    plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { ...globals, module, exports: module.exports, require: (id) => {
    assert.ok(id in mocks, `Unmocked module ${id}`); return mocks[id];
  } });
  return module.exports;
}
const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  forwardRef: (fn) => fn, useRef: (v) => ({ current: v }),
  useMemo: (fn) => fn(), useCallback: (fn) => fn, useEffect: (fn) => fn(),
};
test('static press feedback keeps activation on release and preserves custom state styles, children and disabled hosts', () => {
  const { AccessiblePressable } = load('src/components/AccessibleControls.js', {
    react, 'react-native': { Platform: { OS: 'ios' }, Pressable: 'Pressable', StyleSheet: { create: (v) => v, flatten: (v) => v }, TouchableOpacity: 'TouchableOpacity' },
    '../utils/controlGeometry': { resolveControlGeometry: () => ({ minHeight: 44 }) },
  });
  let calls = 0;
  const onPress = () => calls++;
  const child = (state) => state.pressed ? 'down' : 'up';
  const host = AccessiblePressable({ style: { opacity: 1 }, onPress, children: child });
  assert.equal(host.props.onPress, onPress);
  assert.equal(host.props.children[0], child);
  assert.equal(host.props.style({ pressed: true }).at(-1).opacity, 0.72);
  assert.equal(calls, 0);
  host.props.onPress(); assert.equal(calls, 1);
  const disabled = AccessiblePressable({ disabled: true, children: 'x', onPress });
  assert.equal(disabled.props.style({ pressed: true }).at(-1), false);
  const custom = AccessiblePressable({ children: 'x', onPress, style: ({ pressed }) => ({ opacity: pressed ? 0.3 : 1 }) });
  assert.equal(custom.props.style({ pressed: true }).at(-1), false);
  const backdrop = AccessiblePressable({ onPress, style: { position: 'absolute' } });
  assert.equal(backdrop.props.style({ pressed: true }).at(-1), false);
});
test('edge back tracks RTL, cancels short/reversed/interrupted gestures, and commits only on release', () => {
  let responder, value = 0, calls = 0;
  class Value {
    addListener(fn) { this.listener = fn; return '1'; } removeListener() {} stopAnimation(fn) { fn?.(value); }
    setValue(v) { value = v; this.listener?.({ value: v }); }
  }
  const { default: Edge } = load('src/components/EdgeBackGesture.js', {
    react, '../constants/tutorialUiConstants': { BACK_GESTURE_EDGE_WIDTH: 24, BACK_GESTURE_TRIGGER_DISTANCE: 60, BACK_GESTURE_VERTICAL_SLOP: 60 }, '../hooks/useMotionPreferences': { useMotionPreferences: () => ({ reduceMotion: true }) },
    'react-native': { Animated: { Value, View: 'AnimatedView', multiply: (v) => v }, I18nManager: { isRTL: false }, PanResponder: { create: (v) => { responder = v; return { panHandlers: {} }; } }, Platform: { OS: 'android' }, StyleSheet: { create: (v) => v }, UIManager: {}, View: 'View', useWindowDimensions: () => ({ width: 360 }) },
  });
  Edge({ rtl: true, onBack: () => calls++, children: 'screen' });
  const g = (dx, vx = 0) => ({ dx, dy: 0, vx });
  assert.equal(responder.onMoveShouldSetPanResponder(null, g(30)), false);
  assert.equal(responder.onMoveShouldSetPanResponder(null, g(-30)), true);
  responder.onPanResponderGrant(); responder.onPanResponderMove(null, g(-40));
  assert.equal(value, 40); assert.equal(calls, 0);
  responder.onPanResponderRelease(null, g(-40)); assert.equal(value, 0); assert.equal(calls, 0);
  responder.onPanResponderGrant(); responder.onPanResponderMove(null, g(-90));
  responder.onPanResponderTerminate(); assert.equal(value, 0); assert.equal(calls, 0);
  responder.onPanResponderGrant(); responder.onPanResponderMove(null, g(-80));
  responder.onPanResponderRelease(null, g(-80)); assert.equal(value, 0); assert.equal(calls, 1);
});
test('control gradient endpoints preserve foreground contrast for every configured theme and PRO accent', () => {
  const { resolveControlGradient } = load('src/utils/surfaceGradient.js', {});
  const config = load('src/constants/themeConfig.js', {});
  const palettes = [...Object.values(config.THEMES), ...config.PRO_THEME_ACCENT_OPTIONS.map((a) => ({ ...config.THEMES.pro, ...a.palette, primary: a.accent, onPrimary: a.onAccent }))];
  const lum = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const contrast = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
  for (const colors of palettes) {
    for (const [background, foreground] of [[colors.primary, colors.onPrimary], [colors.card, colors.text], [colors.surfaceMuted, colors.muted]]) {
      const endpoints = resolveControlGradient(background, foreground);
      for (const end of endpoints) assert.ok(contrast(end, foreground) >= contrast(background, foreground) - 0.001, `${background}/${foreground} -> ${end}`);
    }
  }
});

test('interrupted back reads the presentation position and ignores a late native callback after cancellation', () => {
  let responder, animated, pending, value = 0;
  class Value {
    constructor() { animated = this; }
    addListener(fn) { this.listener = fn; return '1'; } removeListener() {}
    stopAnimation(fn) { if (fn) pending = fn; }
    setValue(v) { value = v; this.listener?.({ value: v }); }
  }
  const { default: Edge } = load('src/components/EdgeBackGesture.js', {
    react, '../constants/tutorialUiConstants': { BACK_GESTURE_EDGE_WIDTH: 24, BACK_GESTURE_TRIGGER_DISTANCE: 60, BACK_GESTURE_VERTICAL_SLOP: 60 },
    '../hooks/useMotionPreferences': { useMotionPreferences: () => ({ reduceMotion: true }) },
    'react-native': { Animated: { Value, View: 'AnimatedView', multiply: (v) => v }, I18nManager: { isRTL: false }, PanResponder: { create: (v) => { responder = v; return { panHandlers: {} }; } }, Platform: { OS: 'android' }, StyleSheet: { create: (v) => v }, UIManager: {}, View: 'View', useWindowDimensions: () => ({ width: 360 }) },
  });
  Edge({ onBack: () => assert.fail('Cancellation must not navigate'), children: 'screen' });
  animated.setValue(35);
  responder.onPanResponderGrant();
  responder.onPanResponderMove(null, { dx: 15 });
  pending(35);
  assert.equal(value, 50);
  responder.onPanResponderTerminate(); assert.equal(value, 0);
  responder.onPanResponderGrant();
  const late = pending;
  responder.onPanResponderMove(null, { dx: 50 });
  responder.onPanResponderTerminate(); late(35);
  assert.equal(value, 0);
});

test('forward/back SVG chevrons have explicit mirrored paths without Unicode bidi glyph mirroring', () => {
  const app = fs.readFileSync('App.js', 'utf8');
  const start = app.indexOf('const TemptationGlyph =');
  const end = app.indexOf('\n});', start) + 4;
  const code = babel.transformSync(app.slice(start, end), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
  for (const rtl of [false, true]) {
    const Glyph = vm.runInNewContext(`${code}\nTemptationGlyph`, {
      React: { ...react, memo: (fn) => fn }, useContext: () => rtl ? 'ar-sa' : 'en',
      FormattingLanguageContext: {}, isRtlLanguage: (lang) => lang.startsWith('ar'), Svg: 'Svg', SvgPath: 'Path',
    });
    for (const back of [false, true]) {
      const tree = Glyph({ type: 'chevron', color: '#ffffff', back });
      assert.equal(tree.props.children[0].props.d, rtl !== back ? 'm15 5-7 7 7 7' : 'm9 5 7 7-7 7');
    }
  }
});

test('Arabic paragraph alignment stays physically right without changing RTL parent row order', () => {
  const app = fs.readFileSync('App.js', 'utf8');
  const start = app.indexOf('const AppText =');
  const end = app.indexOf('\nconst AppTextInput =', start);
  const code = babel.transformSync(app.slice(start, end), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
  const Text = vm.runInNewContext(`${code}\nAppText`, {
    React: { ...react, memo: (fn) => fn }, forwardRef: (fn) => fn, useContext: () => 'ar-sa',
    FormattingLanguageContext: {}, isRtlLanguage: () => true,
    localizeTextTreeDigits: (v) => v, MIN_READABLE_FONT_SCALE: 0.84,
    Platform: { OS: 'android' }, StyleSheet: { flatten: (styles) => Object.assign({}, ...styles) }, RNText: 'RNText',
  });
  const tree = Text({ style: { fontSize: 18 }, children: 'الإعدادات' });
  const style = Object.assign({}, ...tree.props.style);
  assert.equal(style.writingDirection, 'rtl');
  // Fabric TextLayoutManager resolves alignment relative to paragraph layout.
  // Isolate that layout while leaving Arabic shaping and parent rows intact.
  assert.equal(style.direction, 'ltr');
  assert.equal(style.textAlign, 'right');
});

test('iOS edge progress uses a namespaced event and preserves tracking, cancellation and release', () => {
  let value = 0, calls = 0;
  class Value {
    addListener(fn) { this.listener = fn; return '1'; } removeListener() {}
    stopAnimation(fn) { fn?.(value); }
    setValue(v) { value = v; this.listener?.({ value: v }); }
  }
  const { default: Edge } = load('src/components/EdgeBackGesture.js', {
    react, '../constants/tutorialUiConstants': { BACK_GESTURE_EDGE_WIDTH: 24, BACK_GESTURE_TRIGGER_DISTANCE: 60, BACK_GESTURE_VERTICAL_SLOP: 60 },
    '../hooks/useMotionPreferences': { useMotionPreferences: () => ({ reduceMotion: true }) },
    'react-native': { Animated: { Value, View: 'AnimatedView', multiply: (v) => v }, I18nManager: { isRTL: false }, PanResponder: { create: () => ({ panHandlers: {} }) }, Platform: { OS: 'ios' }, StyleSheet: { create: (v) => v }, UIManager: { getViewManagerConfig: () => ({ NativeProps: { isRTL: true, onEdgeBackProgress: true } }) }, requireNativeComponent: () => 'NativeEdge', View: 'View', useWindowDimensions: () => ({ width: 402 }) },
  });
  const native = Edge({ onBack: () => calls++, children: 'screen' }).props.children[1];
  assert.equal(native.type, 'NativeEdge');
  assert.equal(native.props.onProgress, undefined);
  const emit = (phase, translationX = 0) => native.props.onEdgeBackProgress({ nativeEvent: { phase, translationX } });
  emit('began'); emit('changed', 45); assert.equal(value, 45); assert.equal(calls, 0);
  emit('cancelled', 45); assert.equal(value, 0); assert.equal(calls, 0);
  emit('began'); emit('changed', 90); native.props.onBack(); assert.equal(value, 0); assert.equal(calls, 1);
  const bridge = fs.readFileSync('ios/Almost/LiquidGlassNativeViewBridge.m', 'utf8');
  assert.match(bridge, /RCT_EXPORT_VIEW_PROPERTY\(onEdgeBackProgress, RCTBubblingEventBlock\)/);
  assert.doesNotMatch(bridge, /RCT_EXPORT_VIEW_PROPERTY\(onProgress,/);
});

test('Fabric edge routes touches through its responder and still cancels and commits on release', () => {
  let responder, value = 0, calls = 0;
  class Value {
    addListener(fn) { this.listener = fn; return '1'; } removeListener() {}
    stopAnimation(fn) { fn?.(value); }
    setValue(v) { value = v; this.listener?.({ value: v }); }
  }
  const { default: Edge } = load('src/components/EdgeBackGesture.js', {
    react, '../constants/tutorialUiConstants': { BACK_GESTURE_EDGE_WIDTH: 32, BACK_GESTURE_TRIGGER_DISTANCE: 60, BACK_GESTURE_VERTICAL_SLOP: 60 },
    '../hooks/useMotionPreferences': { useMotionPreferences: () => ({ reduceMotion: true }) },
    'react-native': { Animated: { Value, View: 'AnimatedView', multiply: (v) => v }, I18nManager: { isRTL: false }, PanResponder: { create: (v) => { responder = v; return { panHandlers: {} }; } }, Platform: { OS: 'ios' }, StyleSheet: { create: (v) => v }, UIManager: { getViewManagerConfig: () => assert.fail('Fabric must use its responder') }, View: 'View', useWindowDimensions: () => ({ width: 402 }) },
  }, { nativeFabricUIManager: {} });
  const edge = Edge({ onBack: () => calls++, children: 'screen' }).props.children[1];
  assert.equal(edge.type, 'View');
  responder.onPanResponderGrant(); responder.onPanResponderMove(null, { dx: 30 });
  assert.equal(value, 30); responder.onPanResponderTerminate(); assert.equal(value, 0); assert.equal(calls, 0);
  responder.onPanResponderGrant(); responder.onPanResponderMove(null, { dx: 90 });
  assert.equal(calls, 0); responder.onPanResponderRelease(null, { dx: 90, dy: 0, vx: 0 });
  assert.equal(calls, 1); assert.equal(value, 0);
});

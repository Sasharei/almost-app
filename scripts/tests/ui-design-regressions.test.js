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

test('Almi keeps its native image identity while idle, care reactions and skins change', () => {
  const app = fs.readFileSync('App.js', 'utf8');
  const component = app.slice(app.indexOf('function AlmiTamagotchi('), app.indexOf('const MAX_IMPULSE_EVENTS'));
  const code = babel.transformSync(component, {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx'],
  }).code;
  let animation = 'idle';
  const frames = { idle: 'idle.webp', curious: 'curious.webp', happy: 'happy.webp' };
  const context = {
    React: react, ...react, useEffect: () => {}, useState: () => [animation, () => {}],
    Platform: { OS: 'android' }, View: 'View', ExpoImage: 'ExpoImage', Image: 'Image', AlmiDustOverlay: 'Dust',
    StyleSheet: { flatten: () => ({ borderRadius: 0 }) }, styles: {},
    CLASSIC_TAMAGOTCHI_ANIMATIONS: frames, DEFAULT_TAMAGOTCHI_SKIN: 'classic',
    ALMI_ANDROID_PREVIEWS: { classic: 'classic-small.png', green: 'green-small.png' },
    TAMAGOTCHI_SKINS: { classic: { preview: 'classic.png' }, green: { preview: 'green.png' } },
    ALMI_SMOOTH_ANIMATIONS: { classic: frames, green: { ...frames, happy: 'green-happy.webp' } },
    TAMAGOTCHI_PLAY_DEPRIVED_VARIANTS: ['idle'], TAMAGOTCHI_STARVING_VARIANTS: ['idle'],
    TAMAGOTCHI_IDLE_VARIANTS: ['idle', 'curious'], ALMI_MASCOT_IMAGE_OFFSET_X: 0,
    normalizeMonetizationToken: (key) => key,
  };
  vm.createContext(context);
  vm.runInContext(`${code}\nthis.renderCat = AlmiTamagotchi;`, context);
  const imageIn = (node) => {
    if (node?.type === 'ExpoImage' || node?.type === 'Image') return node;
    return node?.props?.children.flat(Infinity).map(imageIn).find(Boolean);
  };
  const identity = (node) => [node.type, node.props.key ?? null];
  const first = imageIn(context.renderCat({}));
  for (const key of ['curious', 'happy', 'idle']) {
    animation = key;
    const next = imageIn(context.renderCat({}));
    assert.deepEqual(identity(next), identity(first), `Remount would discard the visible ${key} frame`);
    assert.equal(next.props.source, frames[key]);
    assert.equal(next.props.transition, 180);
    assert.equal(next.props.cachePolicy, 'disk');
    assert.equal(next.props.autoplay, true);
  }
  animation = 'happy';
  const green = imageIn(context.renderCat({ animationSetKey: 'green_remote' }));
  assert.deepEqual(identity(green), identity(first));
  assert.equal(green.props.source, 'green-happy.webp');
  for (const version of [24, 25]) {
    context.Platform.Version = version;
    animation = 'idle';
    const legacy = imageIn(context.renderCat({}));
    assert.equal(legacy.type, 'Image');
    assert.equal(legacy.props.source, frames.idle);
    assert.equal(legacy.props.resizeMethod, 'resize');
    assert.equal(legacy.props.defaultSource, 'classic-small.png');
    assert.equal(legacy.props.fadeDuration, 180);
    animation = 'happy';
    const reaction = imageIn(context.renderCat({}));
    assert.deepEqual(identity(reaction), identity(legacy));
    assert.equal(reaction.props.source, frames.happy);
    const paused = imageIn(context.renderCat({ idleAnimationsEnabled: false }));
    assert.deepEqual(identity(paused), identity(legacy));
    assert.equal(paused.props.source, 'classic-small.png');
    const pausedGreen = imageIn(context.renderCat({ animationSetKey: 'green_remote', idleAnimationsEnabled: false }));
    assert.equal(pausedGreen.props.source, 'green-small.png');
  }
  context.Platform.Version = 26;
  assert.equal(imageIn(context.renderCat({})).type, 'ExpoImage');
  for (const skin of ['classic', 'green', 'teal', 'yellow', 'purple']) {
    for (const scale of [1, 2, 3]) {
      const suffix = scale === 1 ? '' : `@${scale}x`;
      const placeholder = fs.readFileSync(`assets/almi_android_previews/${skin}${suffix}.png`);
      assert.equal(placeholder.readUInt32BE(16), 128 * scale);
      assert.equal(placeholder.readUInt32BE(20), 128 * scale);
    }
  }
});

test('card layout updates do not schedule global mount fades on Android Fabric', () => {
  const app = fs.readFileSync('App.js', 'utf8');
  const start = app.indexOf('const runLayoutAnimation =');
  const code = app.slice(start, app.indexOf('\n};', start) + 3);
  for (const [os, fabric, blur, expected] of [
    ['android', true, false, 0], ['android', false, true, 0],
    ['android', false, false, 1], ['ios', true, false, 0], ['ios', false, false, 1],
  ]) {
    let calls = 0;
    vm.runInNewContext(`${code}\nrunLayoutAnimation();`, {
      Platform: { OS: os }, isFabricRendererActive: fabric, shouldUseAndroidCommunityBlur: () => blur,
      LayoutAnimation: { Presets: { easeInEaseOut: {} }, configureNext: () => calls++ },
    });
    assert.equal(calls, expected, `${os}, Fabric=${fabric}, blur=${blur}`);
  }
});

test('Android quick actions keep their icon and opaque theme backing without capturing the root for blur', () => {
  const config = load('src/constants/appBehavior.js', { '../constants/economyConfig': { DAY_MS: 86400000 }, './economyConfig': { DAY_MS: 86400000 } });
  assert.equal(config.ANDROID_LIVE_GLASS_BLUR_ENABLED, false);
  class Value { interpolate() { return 0; } }
  const { default: Orb } = load('src/components/LiquidGlassFabOrb.js', {
    react: { ...react, memo: (component) => component, useEffect: () => {} },
    'react-native': { Platform: { OS: 'android' }, Animated: { Value, View: 'AnimatedView' },
      Easing: {}, StyleSheet: { create: (v) => v, absoluteFill: {} }, Text: 'Text', View: 'View' },
    'expo-blur': { BlurView: 'BlurView' },
    'react-native-svg': Object.fromEntries(['default', 'Circle', 'Defs', 'LinearGradient', 'Rect', 'Stop'].map((key) => [key, key])),
    './PlatformGlassBackground': { default: 'Glass', isNativeLiquidGlassAvailable: () => false },
    '../hooks/useMotionPreferences': { useMotionPreferences: () => ({ reduceMotion: true, reduceTransparency: false }) },
    '../utils/motion': {}, '../utils/textAutoFit': { resolveFabricAutoFitMinimumFontSize: () => 12 },
    '../constants/designSystem': { UI_TOUCH_TARGET: { current: 48 } },
    '../constants/appBehavior': config,
  });
  const all = (node) => node && typeof node === 'object'
    ? [node, ...(node.props?.children || []).flat(Infinity).flatMap(all)] : [];
  for (const props of [{}, { isDarkTheme: true }, { isProTheme: true }]) {
    const tree = Orb({ ...props, icon: '+', size: 64 });
    assert.equal(tree.props.pointerEvents, 'none');
    assert.match(tree.props.style.at(-1).backgroundColor, /^#[\da-f]{6}$/i);
    assert.equal(all(tree).some((node) => node.type === 'BlurView'), false);
    // The plus is drawn with two bars; currency quick-spend keeps its text glyph.
    assert.ok(all(tree).some((node) => node.props?.style?.at?.(-1)?.width === 26));
    const currency = Orb({ ...props, icon: '$', size: 64 });
    assert.ok(all(currency).some((node) => node.type === 'Text' && node.props.children.includes('$')));
  }
});

test('custom amount backdrop respects the Android blur safety switch', () => {
  const app = fs.readFileSync('App.js', 'utf8');
  const start = app.indexOf('const AndroidManualAmountBackdropVisual =');
  const code = babel.transformSync(app.slice(start, app.indexOf('const isFabricRendererActive', start)), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx'],
  }).code;
  const context = {
    React: { ...react, memo: (fn) => fn }, Platform: { OS: 'android' },
    ANDROID_EXPO_BLUR_ENABLED: false, AndroidBlurView: 'BlurView', View: 'View',
    StyleSheet: { absoluteFillObject: {} },
  };
  vm.createContext(context);
  vm.runInContext(`${code}\nthis.renderBackdrop = AndroidManualAmountBackdropVisual;`, context);
  for (const color of ['#FFFFFF', '#0D1320', '#DEE4FA']) {
    const tree = context.renderBackdrop({ reduceTransparency: false, solidFallbackColor: color });
    assert.equal(tree.type, 'View');
    assert.equal(tree.props.style.at(-1).backgroundColor, color);
    assert.equal(tree.props.children.length, 0);
    assert.equal(tree.props.pointerEvents, 'none');
  }
});

test('Android care glow has a bounded bitmap, preserves theme tint and cannot intercept care actions', () => {
  for (const os of ['android', 'ios']) {
    const { default: Backdrop } = load('src/components/AlmiCareBackdrop.js', {
      react: { ...react, useId: () => ':care:' },
      'react-native': { Image: 'Image', View: 'View', Platform: { OS: os }, StyleSheet: { absoluteFillObject: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 } } },
      'react-native-svg': { default: 'Svg', __esModule: true, Defs: 'Defs', RadialGradient: 'RadialGradient', Rect: 'Rect', Stop: 'Stop' },
      '../../assets/almi_room/care_glow.png': 'careGlow',
    });
    for (const primary of ['#485ED7', '#A7B9FF', '#D48A28']) {
      const root = Backdrop({ colors: { primary } });
      assert.equal(root.props.pointerEvents, 'none');
      assert.equal(root.props.accessible, false);
      const visual = root.props.children[0];
      assert.equal(visual.type, os === 'android' ? 'Image' : 'Svg');
      if (os === 'android') {
        assert.equal(visual.props.tintColor, primary);
        assert.equal(visual.props.resizeMethod, 'scale');
        assert.equal(visual.props.fadeDuration, 0);
      }
    }
  }
  const zlib = require('node:zlib');
  const { Buffer } = require('node:buffer');
  const png = fs.readFileSync('assets/almi_room/care_glow.png');
  assert.equal(png.readUInt32BE(16), 256);
  assert.equal(png.readUInt32BE(20), 256);
  const chunks = [];
  for (let offset = 8; offset < png.length;) {
    const size = png.readUInt32BE(offset);
    if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') chunks.push(png.subarray(offset + 8, offset + 8 + size));
    offset += 12 + size;
  }
  const pixels = zlib.inflateSync(Buffer.concat(chunks));
  const alpha = (x, y) => pixels[y * (256 * 4 + 1) + 1 + x * 4 + 3];
  assert.ok(alpha(179, 71) >= 39, 'glow remains anchored at 70% / 28%');
  assert.equal(alpha(0, 255), 0, 'far corner remains transparent');
});

test('room and dirt images request display-sized Android decoding without removing scene layers', () => {
  const native = { Image: 'Image', View: 'View', Platform: { OS: 'android', Version: 24 }, StyleSheet: { create: (v) => v, absoluteFillObject: {} } };
  const { default: Dust } = load('src/components/AlmiDustOverlay.js', {
    react, 'react-native': native, '../../assets/almi_room/dust_smudges.png': 'dust',
    '../../assets/almi_android_previews/dust.png': 'android-dust',
  });
  assert.equal(Dust({ intensity: 0 }), null);
  const dust = Dust({ intensity: 0.8, testID: 'dirt' });
  assert.equal(dust.props.resizeMethod, 'resize');
  assert.equal(dust.props.source, 'android-dust');
  const dirtPreview = fs.readFileSync('assets/almi_android_previews/dust.png');
  assert.equal(dirtPreview.readUInt32BE(16), 512);
  assert.equal(dirtPreview.readUInt32BE(20), 512);
  assert.equal(dust.props.fadeDuration, 0);
  assert.ok(dust.props.style[1].opacity > 0);
  const assets = Object.fromEntries(['soft_room', 'observatory', 'garden', 'bed', 'bowl', 'rug', 'window', 'shelf'].flatMap((name) => {
    const path = `../../assets/almi_android_previews/room_${name}.webp`;
    const dimensions = require('image-size').imageSize(fs.readFileSync(path.replace('../../', '')));
    assert.ok(Math.max(dimensions.width, dimensions.height) <= (['soft_room', 'observatory', 'garden'].includes(name) ? 768 : 384));
    return [[`../../assets/almi_room/${name}.webp`, name], [path, `legacy-${name}`]];
  }));
  const { default: Room } = load('src/components/AlmiRoomDecor.js', { react, 'react-native': native, ...assets });
  const equipped = Object.fromEntries(['bed', 'bowl', 'rug', 'window', 'shelf'].map((name) => [name, name]));
  const flatten = (nodes) => nodes.flat(Infinity).filter(Boolean);
  for (const [scene, count] of [['preview', 6], ['care', 3], ['careFloor', 3]]) {
    const images = flatten(Room({ equipped, scene }).props.children);
    assert.equal(images.length, count, scene);
    for (const image of images) {
      assert.equal(image.type, 'Image');
      assert.equal(image.props.resizeMethod, 'resize');
      assert.equal(image.props.fadeDuration, 0);
    }
  }
});

test('a fully covered home mascot releases images while keeping its layout slot for return navigation', () => {
  const app = fs.readFileSync('App.js', 'utf8');
  const start = app.indexOf('const TamagotchiHeroImage =');
  const end = app.indexOf('\nconst getTamagotchiDirtyVisualLevel', start);
  const code = babel.transformSync(app.slice(start, end), { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
  const Hero = vm.runInNewContext(`${code}\nTamagotchiHeroImage`, { React: { ...react, memo: (fn) => fn }, View: 'View', AlmiTamagotchi: 'Almi', AlmiDustOverlay: 'Dust' });
  const hidden = Hero({ size: 132, dirtyLevel: 0.8, visible: false });
  assert.equal(hidden.type, 'View');
  assert.equal(hidden.props.style.width, 132);
  assert.equal(hidden.props.style.height, 132);
  assert.equal(hidden.props.children[0], false);
  const shown = Hero({ size: 132, dirtyLevel: 0.8, visible: true });
  const layers = shown.props.children[0].props.children;
  assert.equal(layers[0].type, 'Almi');
  assert.equal(layers[1].type, 'Dust');
});

// Run the actual mascot hooks with a virtual clock. Native image decoding is
// intentionally outside this harness; timer ownership must hold on both platforms.
function mascotClock() {
  const app = fs.readFileSync('App.js', 'utf8');
  const component = app.slice(app.indexOf('function AlmiTamagotchi('), app.indexOf('const MAX_IMPULSE_EVENTS'));
  const code = babel.transformSync(component, { babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-react-jsx'] }).code;
  const cells = [], timers = new Map();
  let cursor = 0, now = 0, timerId = 0, pending = [], props = {}, output;
  const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const hooks = {
    useState(initial) { const i = cursor++; if (!cells[i]) cells[i] = { value: initial }; return [cells[i].value, (v) => { cells[i].value = v; }]; },
    useRef(initial) { const i = cursor++; return cells[i] ||= { current: initial }; },
    useMemo(fn, deps) { const i = cursor++; if (!same(cells[i]?.deps, deps)) cells[i] = { deps, value: fn() }; return cells[i].value; },
    useCallback(fn, deps) { return hooks.useMemo(() => fn, deps); },
    useEffect(fn, deps) { const i = cursor++; if (!same(cells[i]?.deps, deps)) pending.push(() => { cells[i]?.cleanup?.(); cells[i] = { deps, cleanup: fn() }; }); },
  };
  const frames = { idle: 'idle', curious: 'curious', follow: 'follow', speak: 'speak', happy: 'happy', sad: 'sad', cry: 'cry', ohno: 'ohno' };
  const context = {
    React: react, ...hooks, Platform: { OS: 'ios' }, View: 'View', ExpoImage: 'ExpoImage', Image: 'Image', AlmiDustOverlay: 'Dust',
    StyleSheet: { flatten: () => ({ borderRadius: 0 }) }, styles: {},
    CLASSIC_TAMAGOTCHI_ANIMATIONS: frames, DEFAULT_TAMAGOTCHI_SKIN: 'classic', ALMI_MASCOT_IMAGE_OFFSET_X: 0,
    TAMAGOTCHI_SKINS: { classic: {} }, ALMI_SMOOTH_ANIMATIONS: { classic: frames }, ALMI_ANDROID_PREVIEWS: {},
    normalizeMonetizationToken: (key) => key,
    ...vm.runInNewContext(app.slice(app.indexOf('const TAMAGOTCHI_IDLE_VARIANTS'), app.indexOf('const TAMAGOTCHI_SPEECH_DURATION_MS')) + '\n({ TAMAGOTCHI_IDLE_VARIANTS, TAMAGOTCHI_STARVING_VARIANTS, TAMAGOTCHI_PLAY_DEPRIVED_VARIANTS, TAMAGOTCHI_IDLE_ANIMATION_DURATION_MS, TAMAGOTCHI_REACTION_DURATION, TAMAGOTCHI_IDLE_ANIMATION_FALLBACK_MS, TAMAGOTCHI_IDLE_RESTART_GAP_MS })'),
    setTimeout(fn, delay) { const id = ++timerId; timers.set(id, { fn, at: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); },
  };
  const renderCat = vm.runInNewContext(code + '\nAlmiTamagotchi', context);
  const render = (next = props) => { props = next; cursor = 0; pending = []; output = renderCat(props); pending.forEach((fn) => fn()); return output; };
  const imageIn = (node) => node?.type === 'ExpoImage' ? node : node?.props?.children.flat(Infinity).map(imageIn).find(Boolean);
  return {
    render,
    source() { render(); return imageIn(output).props.source; },
    advance(ms) { const end = now + ms; for (;;) { const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0]; if (!next || next[1].at > end) break; now = next[1].at; timers.delete(next[0]); next[1].fn(); render(); } now = end; },
    unmount() { cells.forEach((cell) => cell?.cleanup?.()); },
    nextDelay() { return Math.min(...[...timers.values()].map((timer) => timer.at)) - now; },
    timers,
    frames,
  };
}

test('care reaction keeps its deadline across parent callbacks, skin maps and changing needs', () => {
  const clock = mascotClock(); let completed = 0, latest = 0;
  const override = { key: 1, type: 'happy', duration: 1000 };
  clock.render({ override, onOverrideComplete: () => completed++ });
  assert.equal(clock.source(), 'happy');
  for (let i = 0; i < 9; i++) {
    clock.advance(100);
    clock.render({ override, animations: { ...clock.frames }, isPlayDeprived: i > 4, onOverrideComplete: () => { completed++; latest = i; } });
  }
  clock.advance(100);
  assert.equal(completed, 1); assert.equal(latest, 8);
  assert.notEqual(clock.source(), 'happy');
  clock.advance(10000); assert.equal(completed, 1);
  clock.unmount(); assert.equal(clock.timers.size, 0);
});

test('cancelled and replaced care reactions cannot complete a newer reaction', () => {
  const clock = mascotClock(); const completed = [];
  const render = (override) => clock.render({ override, onOverrideComplete: () => completed.push(override?.key) });
  render({ key: 1, type: 'happy', duration: 1000 }); clock.advance(500);
  render(null); assert.notEqual(clock.source(), 'happy');
  clock.advance(600); assert.deepEqual(completed, []);
  render({ key: 2, type: 'sad', duration: 1000 }); clock.advance(500);
  render({ key: 3, type: 'happy', duration: 1000 }); clock.advance(500);
  assert.deepEqual(completed, []); assert.equal(clock.source(), 'happy');
  clock.advance(500); assert.deepEqual(completed, [3]); assert.notEqual(clock.source(), 'happy');
  clock.unmount(); assert.equal(clock.timers.size, 0);
});

test('idle cycling never repeats the previous animation and unmount cancels active reactions', () => {
  const clock = mascotClock(); clock.render();
  let previous = clock.source();
  for (let i = 0; i < 20; i++) {
    clock.advance(clock.nextDelay());
    const next = clock.source(); assert.notEqual(next, previous);
    previous = next;
  }
  assert.ok(previous);
  clock.unmount(); assert.equal(clock.timers.size, 0);
  let completed = 0;
  clock.render({ override: { key: 1, type: 'happy', duration: 1000 }, onOverrideComplete: () => completed++ });
  clock.unmount(); clock.advance(5000); assert.equal(completed, 0); assert.equal(clock.timers.size, 0);
});

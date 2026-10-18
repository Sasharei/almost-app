const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "ios/Almost/AppDelegate.swift"), "utf8");

test("native and Expo configuration register the same single-window scene lifecycle", () => {
  const native = JSON.parse(execFileSync("plutil", ["-convert", "json", "-o", "-", path.join(root, "ios/Almost/Info.plist")], { encoding: "utf8" }));
  const config = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
  const manifest = native.UIApplicationSceneManifest;
  assert.deepEqual(manifest, config.expo.ios.infoPlist.UIApplicationSceneManifest);
  assert.equal(manifest.UIApplicationSupportsMultipleScenes, false);
  assert.equal(manifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication[0].UISceneDelegateClassName, "$(PRODUCT_MODULE_NAME).SceneDelegate");
  assert.match(source, /class SceneDelegate: UIResponder, UIWindowSceneDelegate/);
});

test("React starts in the connected scene after process SDK setup and reuses its window", () => {
  const processSetup = source.slice(source.indexOf("public override func application("), source.indexOf("func connect(to"));
  assert.match(processSetup, /FirebaseApp\.configure\(\)/);
  assert.match(processSetup, /super\.application\(/);
  assert.doesNotMatch(processSetup, /UIWindow\(|startReactNative\(/);
  assert.doesNotMatch(source, /UIWindow\(frame:/);
  assert.match(source, /if let window \{[\s\S]*?return window[\s\S]*?let bootstrapWindow = UIWindow\(windowScene: windowScene\)/);
  assert.match(source, /window = appDelegate\?\.connect\(to: windowScene, options: connectionOptions\)/);
  assert.equal((source.match(/factory\.startReactNative\(/g) || []).length, 1);
});

test("scene migration retains cold and warm links, notifications and Expo lifecycle delivery", () => {
  for (const fragment of [
    "launchOptions[.url] = context.url",
    "launchOptions[.userActivityDictionary]",
    '"UIApplicationLaunchOptionsUserActivityKey": activity',
    "launchOptions[.remoteNotification] = response.notification.request.content.userInfo",
    "self.scene(scene, openURLContexts: connectionOptions.urlContexts)",
    "self.scene(scene, continue: activity)",
    "appDelegate?.application(UIApplication.shared, open: context.url, options: options)",
    "appDelegate?.application(UIApplication.shared, continue: userActivity, restorationHandler:",
    "AppsFlyerAttribution.shared().handleOpen(url, options: options)",
    "AppsFlyerAttribution.shared().continue(userActivity, restorationHandler: nil)",
  ]) assert.ok(source.includes(fragment), fragment);
  for (const callback of ["applicationDidBecomeActive", "applicationWillResignActive", "applicationDidEnterBackground", "applicationWillEnterForeground"]) {
    assert.ok(source.includes(`appDelegate?.${callback}(UIApplication.shared)`), callback);
  }
});

test("a cold progress link waits for startup hydration before selecting its destination", () => {
  const app = fs.readFileSync(path.join(root, "App.js"), "utf8");
  const handlerStart = app.indexOf("(url) => {", app.indexOf("const handleWidgetDeepLink = useCallback("));
  const handlerEnd = app.indexOf("\n    },\n    [", handlerStart) + "\n    }".length;
  const effectStart = app.indexOf("() => {\n    const action = pendingWidgetActionRef.current;");
  const effectEnd = app.indexOf("\n  }, [", effectStart) + "\n  }".length;
  let pending = null;
  const navigations = [];
  const context = {
    parseWidgetDeepLink: () => ({ route: "progress", params: {} }),
    DAILY_SUMMARY_DEEPLINK_ROUTE: "daily-summary",
    widgetLaunchGuardUntilRef: { current: 0 },
    interfaceReady: false,
    premiumAccessResolved: false,
    queueWidgetAction: (action) => { pending = action; },
    goToTab: (tab) => navigations.push(tab),
    pendingWidgetActionRef: { get current() { return pending; } },
    clearWidgetAction: () => { pending = null; },
    InteractionManager: { runAfterInteractions: (callback) => callback() },
  };
  vm.createContext(context);
  const handle = vm.runInContext(`(${app.slice(handlerStart, handlerEnd)})`, context);
  const flush = vm.runInContext(`(${app.slice(effectStart, effectEnd)})`, context);
  handle("com.sasarei.almostclean://progress");
  assert.equal(pending.type, "progress");
  flush();
  assert.deepEqual(navigations, []);
  context.interfaceReady = true;
  flush();
  assert.deepEqual(navigations, []);
  context.premiumAccessResolved = true;
  flush();
  assert.deepEqual(navigations, ["cart"]);
  assert.equal(pending, null);
  handle("com.sasarei.almostclean://progress");
  assert.deepEqual(navigations, ["cart", "cart"]);
});

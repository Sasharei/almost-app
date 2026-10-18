import Expo
import FirebaseCore
import React
import ReactAppDependencyProvider

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  private var startupLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Process-wide SDK setup stays independent of scene creation and JS consent.
    startupLaunchOptions = launchOptions
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

// @generated begin @react-native-firebase/app-didFinishLaunchingWithOptions - expo prebuild (DO NOT MODIFY) sync-10e8520570672fd76b2403b7e1e27f5198a6349a
FirebaseApp.configure()
// @generated end @react-native-firebase/app-didFinishLaunchingWithOptions
    let didFinishLaunching = super.application(
      application,
      didFinishLaunchingWithOptions: launchOptions)
    return didFinishLaunching
  }

  func connect(to windowScene: UIWindowScene, options: UIScene.ConnectionOptions) -> UIWindow {
    // A single scene can reconnect without creating a second React host.
    if let window {
      window.windowScene = windowScene
      window.makeKeyAndVisible()
      return window
    }

    let bootstrapWindow = UIWindow(windowScene: windowScene)
    bootstrapWindow.backgroundColor = .white
    bootstrapWindow.overrideUserInterfaceStyle = .light
    bootstrapWindow.rootViewController = NativeBootstrapViewController()
    window = bootstrapWindow
    bootstrapWindow.makeKeyAndVisible()
    bootstrapWindow.rootViewController?.view.layoutIfNeeded()

    // RN 0.81 still reads initial links from UIApplication launch options.
    // Warm links use the same delegates; cold links also reach getInitialURL.
    var launchOptions = startupLaunchOptions ?? [:]
    if let context = options.urlContexts.first {
      launchOptions[.url] = context.url
      launchOptions[.sourceApplication] = context.options.sourceApplication
      launchOptions[.annotation] = context.options.annotation
    }
    if let activity = options.userActivities.first {
      launchOptions[.userActivityDictionary] = [
        UIApplication.LaunchOptionsKey.userActivityType.rawValue: activity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": activity
      ]
    }
    if let response = options.notificationResponse {
      launchOptions[.remoteNotification] = response.notification.request.content.userInfo
    }
    startupLaunchOptions = nil

    // Let Core Animation commit the same blank bootstrap surface before React.
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self, weak bootstrapWindow] in
      guard let self, let bootstrapWindow, self.window === bootstrapWindow,
            let factory = self.reactNativeFactory else { return }
      factory.startReactNative(
        withModuleName: "main",
        in: bootstrapWindow,
        launchOptions: launchOptions)
    }
    return bootstrapWindow
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    AppsFlyerAttribution.shared().handleOpen(url, options: options)
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    AppsFlyerAttribution.shared().continue(userActivity, restorationHandler: nil)
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

// UIKit owns the scene; AppDelegate continues to own the single React factory.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?
  private var appDelegate: AppDelegate? { UIApplication.shared.delegate as? AppDelegate }

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene else { return }
    window = appDelegate?.connect(to: windowScene, options: connectionOptions)
    self.scene(scene, openURLContexts: connectionOptions.urlContexts)
    for activity in connectionOptions.userActivities {
      self.scene(scene, continue: activity)
    }
    if let shortcut = connectionOptions.shortcutItem, let appDelegate {
      appDelegate.application(UIApplication.shared, performActionFor: shortcut, completionHandler: { _ in })
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    for context in URLContexts {
      var options: [UIApplication.OpenURLOptionsKey: Any] = [.openInPlace: context.options.openInPlace]
      options[.sourceApplication] = context.options.sourceApplication
      options[.annotation] = context.options.annotation
      _ = appDelegate?.application(UIApplication.shared, open: context.url, options: options)
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    _ = appDelegate?.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }

  func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void) {
    guard let appDelegate else { completionHandler(false); return }
    appDelegate.application(UIApplication.shared, performActionFor: shortcutItem, completionHandler: completionHandler)
  }

  // Expo SDK 54 subscribers still use UIApplicationDelegate lifecycle methods.
  func sceneDidBecomeActive(_ scene: UIScene) {
    appDelegate?.applicationDidBecomeActive(UIApplication.shared)
  }
  func sceneWillResignActive(_ scene: UIScene) {
    appDelegate?.applicationWillResignActive(UIApplication.shared)
  }
  func sceneDidEnterBackground(_ scene: UIScene) {
    appDelegate?.applicationDidEnterBackground(UIApplication.shared)
  }
  func sceneWillEnterForeground(_ scene: UIScene) {
    appDelegate?.applicationWillEnterForeground(UIApplication.shared)
  }
}

private final class NativeBootstrapViewController: UIViewController {
  override func loadView() {
    let rootView = UIView(frame: UIScreen.main.bounds)
    rootView.backgroundColor = .white
    rootView.isOpaque = true
    // Keep this bridge surface blank. React owns the only wordmark animation,
    // so iOS cannot flash a completed logo before the animation begins.
    view = rootView
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

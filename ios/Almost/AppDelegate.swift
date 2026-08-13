import Expo
import FirebaseCore
import React
import ReactAppDependencyProvider

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    willFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
#if os(iOS) || os(tvOS)
    // Install an opaque app-owned surface at the earliest delegate callback.
    // This runs before React/Firebase factory creation and remains visible when
    // iOS hands off from the property-list launch screen.
    installBootstrapWindowIfNeeded(for: application)
#endif
    return super.application(
      application,
      willFinishLaunchingWithOptions: launchOptions)
  }

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
#if os(iOS) || os(tvOS)
    let bootstrapWindow = installBootstrapWindowIfNeeded(for: application)
#endif
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
// @generated begin @react-native-firebase/app-didFinishLaunchingWithOptions - expo prebuild (DO NOT MODIFY) sync-10e8520570672fd76b2403b7e1e27f5198a6349a
FirebaseApp.configure()
// @generated end @react-native-firebase/app-didFinishLaunchingWithOptions
    let didFinishLaunching = super.application(
      application,
      didFinishLaunchingWithOptions: launchOptions)

    // Returning to the run loop before starting React lets Core Animation
    // commit the white bootstrap window. iOS 26 otherwise keeps displaying
    // the system's black hand-off surface while the Release bundle mounts.
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self, weak bootstrapWindow] in
      guard let self, let bootstrapWindow, self.window === bootstrapWindow else { return }
      factory.startReactNative(
        withModuleName: "main",
        in: bootstrapWindow,
        launchOptions: launchOptions)
    }
    return didFinishLaunching
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  @discardableResult
  private func installBootstrapWindowIfNeeded(for application: UIApplication) -> UIWindow {
    if let window, window.rootViewController is NativeBootstrapViewController {
      window.backgroundColor = .white
      window.overrideUserInterfaceStyle = .light
      window.makeKeyAndVisible()
      window.rootViewController?.view.layoutIfNeeded()
      return window
    }

    let bootstrapWindow = Self.makeBootstrapWindow(for: application)
    bootstrapWindow.frame = bootstrapWindow.windowScene?.coordinateSpace.bounds ?? UIScreen.main.bounds
    bootstrapWindow.backgroundColor = .white
    bootstrapWindow.overrideUserInterfaceStyle = .light
    bootstrapWindow.rootViewController = NativeBootstrapViewController()
    window = bootstrapWindow
    bootstrapWindow.makeKeyAndVisible()
    bootstrapWindow.rootViewController?.view.layoutIfNeeded()
    return bootstrapWindow
  }

  private static func makeBootstrapWindow(for application: UIApplication) -> UIWindow {
#if os(iOS)
    if #available(iOS 13.0, *),
       let windowScene = application.connectedScenes.compactMap({ $0 as? UIWindowScene }).first {
      return UIWindow(windowScene: windowScene)
    }
#endif
    return UIWindow(frame: UIScreen.main.bounds)
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

private final class NativeBootstrapViewController: UIViewController {
  override func loadView() {
    let rootView = UIView(frame: UIScreen.main.bounds)
    rootView.backgroundColor = .white

    let brandLabel = UILabel()
    brandLabel.translatesAutoresizingMaskIntoConstraints = false
    brandLabel.text = "Almost"
    brandLabel.textColor = UIColor(red: 14.0 / 255.0, green: 13.0 / 255.0, blue: 25.0 / 255.0, alpha: 1)
    brandLabel.font = .systemFont(ofSize: 38, weight: .bold)
    brandLabel.adjustsFontForContentSizeCategory = false
    brandLabel.isAccessibilityElement = false
    rootView.addSubview(brandLabel)

    NSLayoutConstraint.activate([
      brandLabel.centerXAnchor.constraint(equalTo: rootView.centerXAnchor),
      brandLabel.centerYAnchor.constraint(equalTo: rootView.centerYAnchor),
    ])
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

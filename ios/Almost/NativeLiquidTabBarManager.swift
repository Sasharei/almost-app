import Foundation
import UIKit
import React

@objc(NativeLiquidTabBarManager)
class NativeLiquidTabBarManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    NativeLiquidTabBarContainer()
  }
}

private struct NativeTabItemModel {
  let key: String
  let title: String
  let badgeValue: String?
  let symbolName: String
}

@objc(NativeLiquidTabBarContainer)
class NativeLiquidTabBarContainer: UIView, UITabBarDelegate {
  private let tabBar = UITabBar(frame: .zero)
  private static let transparentImage: UIImage = {
    let renderer = UIGraphicsImageRenderer(size: CGSize(width: 1, height: 1))
    return renderer.image { context in
      UIColor.clear.setFill()
      context.cgContext.fill(CGRect(x: 0, y: 0, width: 1, height: 1))
    }.withRenderingMode(.alwaysOriginal)
  }()
  private static let transparentTitleAttrs: [NSAttributedString.Key: Any] = [
    .foregroundColor: UIColor.clear
  ]
  private static let tabIconCanvasSize = CGSize(width: 26, height: 26)
  private static let tabIconMaxSide: CGFloat = 21.5
  private static let tabIconSymbolConfig = UIImage.SymbolConfiguration(pointSize: 21, weight: .regular)

  private var tabModels: [NativeTabItemModel] = []
  private var needsResolvedWidthItemInstallation = false
  private var installedTabBarWidth: CGFloat = 0

  @objc var items: NSArray = [] {
    didSet {
      applyItems()
    }
  }

  @objc var selectedKey: NSString = "feed" {
    didSet {
      applySelectedItem(animated: true)
    }
  }

  @objc var selectorOnly: Bool = false {
    didSet {
      applyPresentationMode()
      applyItems()
    }
  }

  @objc var isDarkTheme: Bool = false {
    didSet {
      applyPresentationMode()
    }
  }

  @objc var activeColorHex: NSString = "" {
    didSet { applyPresentationMode() }
  }

  @objc var inactiveColorHex: NSString = "" {
    didSet { applyPresentationMode() }
  }

  @objc var surfaceColorHex: NSString = "" {
    didSet { applyPresentationMode() }
  }

  @objc var borderColorHex: NSString = "" {
    didSet { applyPresentationMode() }
  }

  @objc var badgeTextColorHex: NSString = "" {
    didSet { applyPresentationMode() }
  }

  @objc var onTabPress: RCTBubblingEventBlock?

  override init(frame: CGRect) {
    super.init(frame: frame)
    setup()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setup()
  }

  private func setup() {
    backgroundColor = .clear
    isOpaque = false
    clipsToBounds = true
    tabBar.translatesAutoresizingMaskIntoConstraints = false
    tabBar.delegate = self
    tabBar.itemPositioning = .fill
    tabBar.isTranslucent = true
    tabBar.clipsToBounds = true
    addSubview(tabBar)

    NSLayoutConstraint.activate([
      tabBar.leadingAnchor.constraint(equalTo: leadingAnchor),
      tabBar.trailingAnchor.constraint(equalTo: trailingAnchor),
      tabBar.topAnchor.constraint(equalTo: topAnchor),
      tabBar.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])

    applyPresentationMode()
  }

  override func layoutSubviews() {
    super.layoutSubviews()

    guard #available(iOS 26.0, *) else { return }
    let resolvedWidth = tabBar.bounds.width
    guard resolvedWidth > 0 else { return }

    if abs(installedTabBarWidth - resolvedWidth) > 0.5 {
      needsResolvedWidthItemInstallation = true
    }
    installItemsAtResolvedWidthIfNeeded()
  }

  private func applyItems() {
    tabModels = items.compactMap { rawEntry in
      guard let entry = rawEntry as? NSDictionary else { return nil }
      let key = (entry["key"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
      if key.isEmpty { return nil }

      let title = (entry["title"] as? String) ?? key.capitalized
      let badgeValue: String?
      switch entry["badgeValue"] {
      case let value as String:
        badgeValue = value.isEmpty ? nil : value
      case let value as NSNumber:
        badgeValue = value.stringValue
      default:
        badgeValue = nil
      }
      let symbolName = (entry["symbolName"] as? String) ?? Self.symbolName(for: key)
      return NativeTabItemModel(
        key: key,
        title: title,
        badgeValue: badgeValue,
        symbolName: symbolName
      )
    }

    if #available(iOS 26.0, *) {
      // React creates native views at zero width and applies their props before
      // the first layout pass. iOS 26 can retain the resulting compressed title
      // constraints until a selection or hierarchy query forces another layout.
      // Install the public UITabBar items only after Auto Layout resolves width.
      needsResolvedWidthItemInstallation = true
      setNeedsLayout()
      installItemsAtResolvedWidthIfNeeded()
      return
    }

    installNativeItems()
  }

  private func installItemsAtResolvedWidthIfNeeded() {
    guard needsResolvedWidthItemInstallation else { return }
    let resolvedWidth = tabBar.bounds.width
    guard resolvedWidth > 0 else { return }

    // Clear the flag before setItems because UIKit may synchronously re-enter
    // layout while it creates the item views.
    needsResolvedWidthItemInstallation = false
    installedTabBarWidth = resolvedWidth
    installNativeItems()
    tabBar.setNeedsLayout()
    tabBar.layoutIfNeeded()
  }

  private func installNativeItems() {
    let nativeItems: [UITabBarItem] = tabModels.enumerated().map { index, model in
      let item: UITabBarItem
      if selectorOnly {
        item = UITabBarItem(
          title: nil,
          image: Self.transparentImage,
          selectedImage: Self.transparentImage
        )
        item.badgeValue = nil
        item.titlePositionAdjustment = UIOffset(horizontal: 0, vertical: 2000)
      } else {
        let tabIcon = Self.normalizedTabIcon(named: model.symbolName)
        item = UITabBarItem(
          title: model.title,
          image: tabIcon,
          selectedImage: tabIcon
        )
        item.titlePositionAdjustment = UIOffset(horizontal: 0, vertical: 5)
        item.imageInsets = UIEdgeInsets(top: -4, left: 0, bottom: 4, right: 0)
        item.badgeValue = model.badgeValue
      }
      item.tag = index
      item.accessibilityLabel = model.title
      return item
    }

    // Keep the original, proven ownership model: UITabBar owns material,
    // icons, titles, badges, selection, accessibility and taps. There is no
    // private-frame probing and no second title or hit-target layer to race it.
    tabBar.setItems(nativeItems, animated: false)
    applySelectedItem(animated: false)
  }

  private func applySelectedItem(animated: Bool) {
    guard let nativeItems = tabBar.items, !nativeItems.isEmpty else { return }

    let key = String(selectedKey)
    let selectedIndex = tabModels.firstIndex(where: { $0.key == key }) ?? 0
    let safeIndex = max(0, min(selectedIndex, nativeItems.count - 1))
    let selectedItem = nativeItems[safeIndex]
    tabBar.selectedItem = selectedItem

    let normalizedKey = tabModels[safeIndex].key
    if key != normalizedKey {
      selectedKey = normalizedKey as NSString
    }

    if animated {
      UIView.animate(withDuration: 0.16) {
        self.layoutIfNeeded()
      }
    }
  }

  func tabBar(_ tabBar: UITabBar, didSelect item: UITabBarItem) {
    if selectorOnly { return }

    var index = item.tag
    if index < 0 || index >= tabModels.count {
      if let resolvedIndex = tabBar.items?.firstIndex(of: item) {
        index = resolvedIndex
      }
    }
    guard index >= 0, index < tabModels.count else { return }

    let model = tabModels[index]
    if String(selectedKey) != model.key {
      selectedKey = model.key as NSString
    }
    onTabPress?(["key": model.key])
  }

  private func applyPresentationMode() {
    let interfaceStyle: UIUserInterfaceStyle = isDarkTheme ? .dark : .light
    overrideUserInterfaceStyle = interfaceStyle
    tabBar.overrideUserInterfaceStyle = interfaceStyle
    tabBar.barStyle = isDarkTheme ? .black : .default
    tabBar.backgroundColor = .clear
    tabBar.barTintColor = .clear
    tabBar.backgroundImage = UIImage()
    tabBar.shadowImage = UIImage()
    tabBar.selectionIndicatorImage = Self.transparentImage
    tabBar.isTranslucent = true
    tabBar.itemPositioning = .fill
    tabBar.isUserInteractionEnabled = !selectorOnly
    tabBar.layer.shadowOpacity = 0
    tabBar.layer.shadowRadius = 0
    tabBar.layer.shadowOffset = .zero
    layer.shadowOpacity = 0
    layer.shadowRadius = 0
    layer.shadowOffset = .zero

    guard #available(iOS 13.0, *) else { return }

    if selectorOnly {
      let appearance = UITabBarAppearance()
      appearance.configureWithTransparentBackground()
      appearance.backgroundEffect = nil
      appearance.backgroundColor = .clear
      appearance.shadowColor = .clear
      appearance.stackedItemPositioning = .fill
      appearance.stackedItemWidth = 0
      appearance.stackedItemSpacing = 0

      let setTransparent: (UITabBarItemAppearance) -> Void = { itemAppearance in
        itemAppearance.normal.iconColor = .clear
        itemAppearance.selected.iconColor = .clear
        itemAppearance.disabled.iconColor = .clear
        itemAppearance.focused.iconColor = .clear

        itemAppearance.normal.titleTextAttributes = Self.transparentTitleAttrs
        itemAppearance.selected.titleTextAttributes = Self.transparentTitleAttrs
        itemAppearance.disabled.titleTextAttributes = Self.transparentTitleAttrs
        itemAppearance.focused.titleTextAttributes = Self.transparentTitleAttrs

        itemAppearance.normal.badgeBackgroundColor = .clear
        itemAppearance.selected.badgeBackgroundColor = .clear
        itemAppearance.disabled.badgeBackgroundColor = .clear
        itemAppearance.focused.badgeBackgroundColor = .clear
      }

      setTransparent(appearance.stackedLayoutAppearance)
      setTransparent(appearance.inlineLayoutAppearance)
      setTransparent(appearance.compactInlineLayoutAppearance)

      tabBar.standardAppearance = appearance
      if #available(iOS 15.0, *) {
        tabBar.scrollEdgeAppearance = appearance
      }
      tabBar.tintColor = .clear
      tabBar.unselectedItemTintColor = .clear
      return
    }

    let defaultActiveColor = isDarkTheme
      ? UIColor(red: 238.0 / 255.0, green: 241.0 / 255.0, blue: 246.0 / 255.0, alpha: 1)
      : UIColor(red: 14.0 / 255.0, green: 23.0 / 255.0, blue: 40.0 / 255.0, alpha: 1)
    let defaultInactiveColor = isDarkTheme
      ? UIColor(red: 158.0 / 255.0, green: 168.0 / 255.0, blue: 186.0 / 255.0, alpha: 1)
      : UIColor(red: 100.0 / 255.0, green: 109.0 / 255.0, blue: 128.0 / 255.0, alpha: 1)
    let activeColor = Self.color(from: activeColorHex, fallback: defaultActiveColor)
    let inactiveColor = Self.color(from: inactiveColorHex, fallback: defaultInactiveColor)
    let badgeTextColor = Self.color(from: badgeTextColorHex, fallback: .white)
    let appearance = UITabBarAppearance()
    appearance.configureWithTransparentBackground()
    appearance.stackedItemPositioning = .fill
    appearance.stackedItemWidth = 0
    appearance.stackedItemSpacing = 0

    if #available(iOS 26.0, *) {
      // iOS 26 owns the Liquid Glass material. Adding a second full-width blur
      // behind it creates the grey side lobes seen in the failed QA captures.
      appearance.backgroundEffect = nil
      appearance.backgroundColor = .clear
      appearance.shadowColor = .clear
    } else {
      let hasCustomSurface = Self.isValidHexColor(surfaceColorHex)
      let hasCustomBorder = Self.isValidHexColor(borderColorHex)
      appearance.backgroundEffect = UIBlurEffect(
        style: isDarkTheme ? .systemChromeMaterialDark : .systemChromeMaterialLight
      )
      appearance.backgroundColor = isDarkTheme
        ? UIColor(red: 13.0 / 255.0, green: 17.0 / 255.0, blue: 24.0 / 255.0, alpha: 0.72)
        : Self.color(from: surfaceColorHex, fallback: .white)
          .withAlphaComponent(hasCustomSurface ? 0.74 : 0.46)
      appearance.shadowColor = isDarkTheme
        ? UIColor(white: 1, alpha: 0.12)
        : Self.color(
            from: borderColorHex,
            fallback: UIColor(red: 14.0 / 255.0, green: 23.0 / 255.0, blue: 40.0 / 255.0, alpha: 1)
          ).withAlphaComponent(hasCustomBorder ? 0.46 : 0.1)
    }

    let badgePositionAdjustment = UIOffset(horizontal: -2, vertical: 6)
    let setColors: (UITabBarItemAppearance) -> Void = { itemAppearance in
      itemAppearance.normal.iconColor = inactiveColor
      itemAppearance.selected.iconColor = activeColor
      itemAppearance.disabled.iconColor = inactiveColor.withAlphaComponent(0.45)
      itemAppearance.focused.iconColor = activeColor

      itemAppearance.normal.titleTextAttributes = [
        .foregroundColor: inactiveColor,
        .font: UIFont.systemFont(ofSize: 10, weight: .regular)
      ]
      itemAppearance.selected.titleTextAttributes = [
        .foregroundColor: activeColor,
        .font: UIFont.systemFont(ofSize: 10, weight: .semibold)
      ]
      itemAppearance.disabled.titleTextAttributes = [
        .foregroundColor: inactiveColor.withAlphaComponent(0.45),
        .font: UIFont.systemFont(ofSize: 10, weight: .regular)
      ]
      itemAppearance.focused.titleTextAttributes = [
        .foregroundColor: activeColor,
        .font: UIFont.systemFont(ofSize: 10, weight: .semibold)
      ]

      itemAppearance.normal.badgeBackgroundColor = activeColor
      itemAppearance.selected.badgeBackgroundColor = activeColor
      itemAppearance.disabled.badgeBackgroundColor = activeColor.withAlphaComponent(0.45)
      itemAppearance.focused.badgeBackgroundColor = activeColor
      itemAppearance.normal.badgeTextAttributes = [.foregroundColor: badgeTextColor]
      itemAppearance.selected.badgeTextAttributes = [.foregroundColor: badgeTextColor]
      itemAppearance.disabled.badgeTextAttributes = [.foregroundColor: badgeTextColor]
      itemAppearance.focused.badgeTextAttributes = [.foregroundColor: badgeTextColor]
      itemAppearance.normal.badgePositionAdjustment = badgePositionAdjustment
      itemAppearance.selected.badgePositionAdjustment = badgePositionAdjustment
      itemAppearance.disabled.badgePositionAdjustment = badgePositionAdjustment
      itemAppearance.focused.badgePositionAdjustment = badgePositionAdjustment
      itemAppearance.normal.titlePositionAdjustment = UIOffset(horizontal: 0, vertical: 5)
      itemAppearance.selected.titlePositionAdjustment = UIOffset(horizontal: 0, vertical: 5)
      itemAppearance.disabled.titlePositionAdjustment = UIOffset(horizontal: 0, vertical: 5)
      itemAppearance.focused.titlePositionAdjustment = UIOffset(horizontal: 0, vertical: 5)
    }

    setColors(appearance.stackedLayoutAppearance)
    setColors(appearance.inlineLayoutAppearance)
    setColors(appearance.compactInlineLayoutAppearance)

    tabBar.standardAppearance = appearance
    if #available(iOS 15.0, *) {
      tabBar.scrollEdgeAppearance = appearance
    }
    tabBar.tintColor = activeColor
    tabBar.unselectedItemTintColor = inactiveColor

    if #available(iOS 26.0, *) {
      needsResolvedWidthItemInstallation = true
      setNeedsLayout()
    }
  }

  private static func isValidHexColor(_ rawValue: NSString) -> Bool {
    let value = String(rawValue).trimmingCharacters(in: .whitespacesAndNewlines)
    let hex = value.hasPrefix("#") ? String(value.dropFirst()) : value
    guard hex.count == 6 else { return false }
    return UInt64(hex, radix: 16) != nil
  }

  private static func color(from rawValue: NSString, fallback: UIColor) -> UIColor {
    let value = String(rawValue).trimmingCharacters(in: .whitespacesAndNewlines)
    let hex = value.hasPrefix("#") ? String(value.dropFirst()) : value
    guard hex.count == 6, let packed = UInt64(hex, radix: 16) else { return fallback }
    return UIColor(
      red: CGFloat((packed >> 16) & 0xFF) / 255.0,
      green: CGFloat((packed >> 8) & 0xFF) / 255.0,
      blue: CGFloat(packed & 0xFF) / 255.0,
      alpha: 1
    )
  }

  private static func symbolName(for key: String) -> String {
    switch key {
    case "feed":
      return "house"
    case "cart":
      return "chart.line.uptrend.xyaxis"
    case "pending":
      return "line.3.horizontal"
    case "purchases":
      return "gift"
    case "profile":
      return "person"
    default:
      return "circle"
    }
  }

  private static func normalizedTabIcon(named symbolName: String) -> UIImage? {
    let resolvedSymbolName: String
    if UIImage(systemName: symbolName, withConfiguration: tabIconSymbolConfig) == nil {
      resolvedSymbolName = "circle"
    } else {
      resolvedSymbolName = symbolName
    }
    guard let sourceImage = UIImage(systemName: resolvedSymbolName, withConfiguration: tabIconSymbolConfig) else {
      return nil
    }

    let sourceSize = sourceImage.size
    let sourceMaxSide = max(sourceSize.width, sourceSize.height)
    guard sourceSize.width > 0, sourceSize.height > 0, sourceMaxSide > 0 else {
      return sourceImage.withRenderingMode(.alwaysTemplate)
    }

    let iconScale = min(
      tabIconMaxSide / sourceMaxSide,
      tabIconCanvasSize.width / sourceSize.width,
      tabIconCanvasSize.height / sourceSize.height
    )
    let drawSize = CGSize(width: sourceSize.width * iconScale, height: sourceSize.height * iconScale)
    let drawRect = CGRect(
      x: (tabIconCanvasSize.width - drawSize.width) / 2,
      y: (tabIconCanvasSize.height - drawSize.height) / 2,
      width: drawSize.width,
      height: drawSize.height
    )

    let renderer = UIGraphicsImageRenderer(size: tabIconCanvasSize)
    let renderedImage = renderer.image { _ in
      sourceImage.withTintColor(.black, renderingMode: .alwaysOriginal).draw(in: drawRect)
    }
    return renderedImage.withRenderingMode(.alwaysTemplate)
  }
}

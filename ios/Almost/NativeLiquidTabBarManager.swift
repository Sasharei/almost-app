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
    tabBar.itemPositioning = .automatic
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
      return item
    }
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

    let activeColor = isDarkTheme
      ? UIColor(red: 238.0 / 255.0, green: 241.0 / 255.0, blue: 246.0 / 255.0, alpha: 1)
      : UIColor(red: 14.0 / 255.0, green: 23.0 / 255.0, blue: 40.0 / 255.0, alpha: 1)
    let inactiveColor = isDarkTheme
      ? UIColor(red: 158.0 / 255.0, green: 168.0 / 255.0, blue: 186.0 / 255.0, alpha: 1)
      : UIColor(red: 100.0 / 255.0, green: 109.0 / 255.0, blue: 128.0 / 255.0, alpha: 1)

    let appearance = UITabBarAppearance()
    appearance.configureWithTransparentBackground()
    appearance.backgroundEffect = UIBlurEffect(
      style: isDarkTheme ? .systemChromeMaterialDark : .systemChromeMaterialLight
    )
    appearance.backgroundColor = isDarkTheme
      ? UIColor(red: 13.0 / 255.0, green: 17.0 / 255.0, blue: 24.0 / 255.0, alpha: 0.72)
      : UIColor(white: 1, alpha: 0.46)
    appearance.shadowColor = isDarkTheme
      ? UIColor(white: 1, alpha: 0.12)
      : UIColor(red: 14.0 / 255.0, green: 23.0 / 255.0, blue: 40.0 / 255.0, alpha: 0.1)

    let setColors: (UITabBarItemAppearance) -> Void = { itemAppearance in
      itemAppearance.normal.iconColor = inactiveColor
      itemAppearance.selected.iconColor = activeColor

      itemAppearance.normal.titleTextAttributes = [
        .foregroundColor: inactiveColor,
        .font: UIFont.systemFont(ofSize: 10, weight: .regular)
      ]
      itemAppearance.selected.titleTextAttributes = [
        .foregroundColor: activeColor,
        .font: UIFont.systemFont(ofSize: 10, weight: .semibold)
      ]
      itemAppearance.normal.titlePositionAdjustment = UIOffset(horizontal: 0, vertical: 5)
      itemAppearance.selected.titlePositionAdjustment = UIOffset(horizontal: 0, vertical: 5)
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

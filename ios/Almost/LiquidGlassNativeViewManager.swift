import Foundation
import UIKit
import React
import SwiftUI

// SwiftUI owns the material; React Native retains the content and all existing actions.
// This keeps long lists and business state shared between the two platforms.
private struct AlmostSurfaceMaterial: View {
  var cornerRadius: CGFloat
  var tint: UIColor
  var density: Double
  var dark: Bool

  var body: some View {
    let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
    Group {
      if #available(iOS 26.0, *) {
        Color.clear
          .glassEffect(.regular, in: shape)
          .overlay(shape.fill(Color(uiColor: tint).opacity(density)))
      } else {
        shape.fill(.regularMaterial)
          .overlay(shape.fill(Color(uiColor: tint).opacity(density)))
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .environment(\.colorScheme, dark ? .dark : .light)
    .allowsHitTesting(false)
    .accessibilityHidden(true)
  }
}

@objc(NativeSwiftUISurfaceManager)
class NativeSwiftUISurfaceManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { true }
  override func view() -> UIView! { NativeSwiftUISurface() }
}

@objc(NativeSwiftUISurface)
class NativeSwiftUISurface: UIView {
  private var host: UIHostingController<AlmostSurfaceMaterial>?
  private var materialUpdatePending = false
  @objc var cornerRadius: NSNumber = 18 { didSet { scheduleMaterialUpdate() } }
  @objc var tintColorHex: NSString = "" { didSet { scheduleMaterialUpdate() } }
  @objc var darkAppearance: Bool = false { didSet { scheduleMaterialUpdate() } }
  @objc var tintOpacity: NSNumber = 0.8 { didSet { scheduleMaterialUpdate() } }

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .clear
    isOpaque = false
    isUserInteractionEnabled = false
    accessibilityElementsHidden = true
    scheduleMaterialUpdate()
  }
  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }

  override func layoutSubviews() {
    super.layoutSubviews()
    host?.view.frame = bounds
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    guard let host else { return }
    if window == nil {
      host.willMove(toParent: nil)
      host.removeFromParent()
    } else if host.parent == nil {
      var responder: UIResponder? = next
      while let current = responder {
        if let parent = current as? UIViewController {
          parent.addChild(host)
          host.didMove(toParent: parent)
          break
        }
        responder = current.next
      }
    }
  }

  // React supplies theme and tint separately. Build one material from the completed
  // property batch instead of displaying intermediate system colors on first mount.
  private func scheduleMaterialUpdate() {
    guard !materialUpdatePending else { return }
    materialUpdatePending = true
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.materialUpdatePending = false
      self.updateMaterial()
    }
  }

  private func updateMaterial() {
    let hex = String(tintColorHex).replacingOccurrences(of: "#", with: "")
    var rgb: UInt64 = 0
    let tint: UIColor
    if hex.count == 6, Scanner(string: hex).scanHexInt64(&rgb) {
      tint = UIColor(red: CGFloat((rgb >> 16) & 255) / 255,
                     green: CGFloat((rgb >> 8) & 255) / 255,
                     blue: CGFloat(rgb & 255) / 255, alpha: 1)
    } else {
      tint = darkAppearance ? UIColor.secondarySystemBackground : UIColor.systemBackground
    }
    let material = AlmostSurfaceMaterial(cornerRadius: max(0, cornerRadius.doubleValue),
      tint: tint, density: max(0, min(1, tintOpacity.doubleValue)), dark: darkAppearance)
    if let host {
      host.overrideUserInterfaceStyle = darkAppearance ? .dark : .light
      host.rootView = material
    } else {
      let controller = UIHostingController(rootView: material)
      controller.overrideUserInterfaceStyle = darkAppearance ? .dark : .light
      controller.view.backgroundColor = .clear
      controller.view.isOpaque = false
      controller.view.isUserInteractionEnabled = false
      controller.view.accessibilityElementsHidden = true
      if #available(iOS 16.4, *) { controller.safeAreaRegions = [] }
      host = controller
      addSubview(controller.view)
      // The deferred first update can run after this view has already joined a window.
      if window != nil { didMoveToWindow() }
    }
    setNeedsLayout()
  }
}

@objc(LiquidGlassNativeViewManager)
class LiquidGlassNativeViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    LiquidGlassNativeView()
  }
}

@objc(NativeLiquidGlassButtonManager)
class NativeLiquidGlassButtonManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    NativeLiquidGlassButton()
  }
}

@objc(NativeLiquidGlassButton)
class NativeLiquidGlassButton: UIView {
  private let button = UIButton(type: .system)

  @objc var title: NSString = "Edit" {
    didSet {
      applyButtonConfiguration()
    }
  }

  @objc var enabled: NSNumber = 1 {
    didSet {
      button.isEnabled = enabled.boolValue
      button.alpha = enabled.boolValue ? 1.0 : 0.72
    }
  }

  @objc var onPress: RCTBubblingEventBlock?

  override init(frame: CGRect) {
    super.init(frame: frame)
    setupView()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setupView()
  }

  override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
    super.traitCollectionDidChange(previousTraitCollection)
    applyButtonConfiguration()
  }

  private func setupView() {
    backgroundColor = .clear
    isOpaque = false
    clipsToBounds = false

    button.translatesAutoresizingMaskIntoConstraints = false
    button.clipsToBounds = true
    button.layer.cornerCurve = .continuous
    button.contentHorizontalAlignment = .center
    button.contentVerticalAlignment = .center
    button.addTarget(self, action: #selector(handlePress), for: .touchUpInside)
    button.titleLabel?.numberOfLines = 1
    button.titleLabel?.lineBreakMode = .byTruncatingTail
    button.titleLabel?.adjustsFontSizeToFitWidth = false
    button.titleLabel?.minimumScaleFactor = 1
    button.titleLabel?.adjustsFontForContentSizeCategory = false
    button.titleLabel?.allowsDefaultTighteningForTruncation = true

    addSubview(button)

    NSLayoutConstraint.activate([
      button.leadingAnchor.constraint(equalTo: leadingAnchor),
      button.trailingAnchor.constraint(equalTo: trailingAnchor),
      button.topAnchor.constraint(equalTo: topAnchor),
      button.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])

    applyButtonConfiguration()
    button.isEnabled = enabled.boolValue
  }

  @objc private func handlePress() {
    onPress?([:])
  }

  private func applyButtonConfiguration() {
    let titleText = String(title).trimmingCharacters(in: .whitespacesAndNewlines)
    let resolvedTitle = titleText.isEmpty ? "Edit" : titleText
    if #available(iOS 26.0, *) {
      var config = UIButton.Configuration.glass()
      config.title = resolvedTitle
      config.cornerStyle = .capsule
      config.buttonSize = .small
      config.contentInsets = NSDirectionalEdgeInsets(top: 8, leading: 14, bottom: 8, trailing: 14)
      config.baseForegroundColor = UIColor.label
      button.configuration = config
    } else {
      var config = UIButton.Configuration.bordered()
      config.title = resolvedTitle
      config.cornerStyle = .capsule
      config.buttonSize = .small
      config.contentInsets = NSDirectionalEdgeInsets(top: 8, leading: 14, bottom: 8, trailing: 14)
      config.baseForegroundColor = UIColor.label
      config.baseBackgroundColor = UIColor(white: 1.0, alpha: 0.22)
      button.configuration = config
    }
    button.titleLabel?.font = UIFont.systemFont(ofSize: 15, weight: .semibold)
    button.titleLabel?.adjustsFontSizeToFitWidth = false
    button.titleLabel?.minimumScaleFactor = 1
    button.titleLabel?.adjustsFontForContentSizeCategory = false
    button.titleLabel?.numberOfLines = 1
    button.titleLabel?.lineBreakMode = .byTruncatingTail
  }
}

@objc(LiquidGlassNativeView)
class LiquidGlassNativeView: UIView {
  private let effectView = UIVisualEffectView(effect: nil)
  private let tintView = UIView(frame: .zero)
  private let highlightLayer = CAGradientLayer()
  private let borderLayer = CALayer()

  @objc var cornerRadius: NSNumber = 28 {
    didSet {
      updateShape()
    }
  }

  @objc var tintAlpha: NSNumber = 0.14 {
    didSet {
      updateOverlayColors()
    }
  }

  @objc var strokeOpacity: NSNumber = 0.24 {
    didSet {
      updateOverlayColors()
    }
  }

  override init(frame: CGRect) {
    super.init(frame: frame)
    setupView()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setupView()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    effectView.frame = bounds
    tintView.frame = bounds
    highlightLayer.frame = bounds
    borderLayer.frame = bounds
    updateShape()
  }

  override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
    super.traitCollectionDidChange(previousTraitCollection)
    updateEffect()
    updateOverlayColors()
  }

  private func setupView() {
    clipsToBounds = true
    effectView.clipsToBounds = true
    tintView.isUserInteractionEnabled = false
    tintView.backgroundColor = .clear

    addSubview(effectView)
    addSubview(tintView)

    layer.addSublayer(highlightLayer)
    layer.addSublayer(borderLayer)

    updateEffect()
    updateShape()
    updateOverlayColors()
  }

  private func updateShape() {
    let radius = CGFloat(max(0, cornerRadius.doubleValue))
    layer.cornerRadius = radius
    effectView.layer.cornerRadius = radius
    tintView.layer.cornerRadius = radius
    highlightLayer.cornerRadius = radius
    borderLayer.cornerRadius = radius
  }

  private func updateOverlayColors() {
    let isDark = traitCollection.userInterfaceStyle == .dark
    let tint = CGFloat(max(0, min(1, tintAlpha.doubleValue)))
    let stroke = CGFloat(max(0, min(1, strokeOpacity.doubleValue)))

    tintView.backgroundColor = isDark
      ? UIColor.white.withAlphaComponent(max(0.04, tint * 0.34))
      : UIColor.white.withAlphaComponent(max(0.08, tint * 0.82))

    highlightLayer.colors = isDark
      ? [
          UIColor.white.withAlphaComponent(0.24).cgColor,
          UIColor.white.withAlphaComponent(0.06).cgColor,
          UIColor.black.withAlphaComponent(0.1).cgColor,
        ]
      : [
          UIColor.white.withAlphaComponent(0.48).cgColor,
          UIColor.white.withAlphaComponent(0.2).cgColor,
          UIColor.black.withAlphaComponent(0.04).cgColor,
        ]
    highlightLayer.locations = [0.0, 0.46, 1.0]
    highlightLayer.startPoint = CGPoint(x: 0.12, y: 0.0)
    highlightLayer.endPoint = CGPoint(x: 0.88, y: 1.0)

    borderLayer.borderWidth = 1.0
    borderLayer.borderColor = isDark
      ? UIColor.white.withAlphaComponent(max(0.16, stroke)).cgColor
      : UIColor.white.withAlphaComponent(max(0.2, stroke * 1.2)).cgColor
  }

  private func updateEffect() {
    if let liquidEffect = makeNativeLiquidGlassEffectIfAvailable() {
      effectView.effect = liquidEffect
      return
    }

    if #available(iOS 13.0, *) {
      effectView.effect = UIBlurEffect(style: .systemUltraThinMaterial)
    } else {
      effectView.effect = UIBlurEffect(style: .light)
    }
  }

  private func makeNativeLiquidGlassEffectIfAvailable() -> UIVisualEffect? {
    let effectFactorySelector = NSSelectorFromString("effectWithStyle:")
    if let effectClass: AnyObject = NSClassFromString("UIGlassEffect"),
       effectClass.responds(to: effectFactorySelector),
       let unmanagedEffect = effectClass.perform(effectFactorySelector, with: NSNumber(value: 0)),
       let effect = unmanagedEffect.takeUnretainedValue() as? UIVisualEffect {
      let setInteractiveSelector = NSSelectorFromString("setInteractive:")
      if let effectObject = effect as? NSObject, effectObject.responds(to: setInteractiveSelector) {
        _ = effectObject.perform(setInteractiveSelector, with: NSNumber(value: true))
      }
      return effect
    }

    if #available(iOS 26.0, *) {
      let effect = UIGlassEffect(style: .regular)
      effect.isInteractive = true
      return effect
    }
    return nil
  }
}

@objc(NativeEdgeBackGestureManager)
class NativeEdgeBackGestureManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { true }
  override func view() -> UIView! { NativeEdgeBackGesture() }
}

@objc(NativeEdgeBackGesture)
class NativeEdgeBackGesture: UIView {
  @objc var onBack: RCTBubblingEventBlock?
  @objc var onEdgeBackProgress: RCTBubblingEventBlock?
  @objc var isRTL: Bool = false {
    didSet { edge.edges = isRTL ? .right : .left }
  }
  private lazy var edge = UIScreenEdgePanGestureRecognizer(target: self, action: #selector(handleEdge(_:)))
  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .clear
    edge.edges = .left
    addGestureRecognizer(edge)
  }
  required init?(coder: NSCoder) { fatalError("init(coder:) is unavailable") }
  @objc private func handleEdge(_ gesture: UIScreenEdgePanGestureRecognizer) {
    let translation = gesture.translation(in: self)
    switch gesture.state {
    case .began:
      onEdgeBackProgress?(["phase": "began", "translationX": translation.x])
    case .changed:
      onEdgeBackProgress?(["phase": "changed", "translationX": translation.x])
    case .ended:
      let direction: CGFloat = isRTL ? -1 : 1
      let distance = translation.x * direction
      let velocity = gesture.velocity(in: self).x * direction
      if abs(translation.y) < 60 && (distance >= 60 || (distance > 20 && velocity > 500)) {
        onBack?([:])
      } else {
        onEdgeBackProgress?(["phase": "cancelled", "translationX": translation.x, "velocityX": gesture.velocity(in: self).x])
      }
    case .cancelled, .failed:
      onEdgeBackProgress?(["phase": "cancelled", "translationX": translation.x, "velocityX": gesture.velocity(in: self).x])
    default: break
    }
  }
}

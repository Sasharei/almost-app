import Foundation
import UIKit
import React

@objc(LiquidGlassNativeViewManager)
class LiquidGlassNativeViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    LiquidGlassNativeView()
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
    guard ProcessInfo.processInfo.operatingSystemVersion.majorVersion >= 26 else {
      return nil
    }

    guard let glassClass = NSClassFromString("UIGlassEffect") as? NSObject.Type else {
      return nil
    }

    let classObject: AnyObject = glassClass
    let directSelectors = [
      NSSelectorFromString("effect"),
      NSSelectorFromString("defaultEffect"),
      NSSelectorFromString("glassEffect"),
    ]

    for selector in directSelectors {
      guard classObject.responds(to: selector) else { continue }
      if let unmanaged = classObject.perform(selector),
         let effect = unmanaged.takeUnretainedValue() as? UIVisualEffect {
        return effect
      }
    }

    let styleSelector = NSSelectorFromString("effectWithStyle:")
    if classObject.responds(to: styleSelector) {
      let styleCandidates: [AnyObject] = [NSNumber(value: 0), NSString(string: "regular")]
      for style in styleCandidates {
        if let unmanaged = classObject.perform(styleSelector, with: style),
           let effect = unmanaged.takeUnretainedValue() as? UIVisualEffect {
          return effect
        }
      }
    }

    return nil
  }
}

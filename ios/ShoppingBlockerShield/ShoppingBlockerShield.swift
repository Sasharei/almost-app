import ManagedSettings
import ManagedSettingsUI
import UIKit

@available(iOS 16.0, *)
class ShoppingBlockerShield: ShieldConfigurationDataSource {
  override func configuration(shielding application: Application) -> ShieldConfiguration {
    let copy = (try? ShoppingBlockerStore.transaction { $0.copy }) ?? [:]
    // Dynamic system colors follow iOS appearance, remain legible with any
    // Almost PRO accent, and do not expose financial values on another app.
    return ShieldConfiguration(
      backgroundBlurStyle: .systemMaterial,
      backgroundColor: .systemBackground,
      icon: UIImage(systemName: "lock.shield")?.withTintColor(.label, renderingMode: .alwaysOriginal),
      title: .init(text: "Almost Savings", color: .label),
      subtitle: .init(text: copy["blockShieldBody"] ?? NSLocalizedString("blockShieldBody", comment: ""), color: .secondaryLabel),
      // Screen Time can resolve dynamic label/background colors in different
      // host traits. Keep this pair constant so Close stays readable in both.
      primaryButtonLabel: .init(text: copy["blockClose"] ?? NSLocalizedString("blockClose", comment: ""), color: .white),
      primaryButtonBackgroundColor: UIColor(red: 0.20, green: 0.30, blue: 0.70, alpha: 1)
    )
  }
}

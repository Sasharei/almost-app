import DeviceActivity
import Foundation

@available(iOS 16.0, *)
class ShoppingBlockerMonitor: DeviceActivityMonitor {
  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    guard activity == ShoppingBlockerStore.activity else { return }
    // Check the saved deadline: a delayed callback from an older pass must not
    // expire a newer one. The app also reconciles on every foreground sync.
    try? ShoppingBlockerStore.transaction { state in ShoppingBlockerStore.apply(&state, checkAuthorization: false) }
  }
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    guard activity == ShoppingBlockerStore.activity else { return }
    try? ShoppingBlockerStore.transaction { state in ShoppingBlockerStore.apply(&state, checkAuthorization: false) }
  }
}

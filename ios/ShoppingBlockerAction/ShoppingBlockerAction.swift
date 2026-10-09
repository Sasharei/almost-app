import ManagedSettings

class ShoppingBlockerAction: ShieldActionDelegate {
  override func handle(action: ShieldAction, for application: ApplicationToken,
                       completionHandler: @escaping (ShieldActionResponse) -> Void) {
    completionHandler(.close)
  }
}

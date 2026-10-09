import ActivityKit
import Foundation

struct WalletExpenseAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    let title: String
    let amount: String
    let merchant: String
    let expiresAt: Date
  }
}

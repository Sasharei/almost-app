import Foundation

struct ShoppingSaving: Codable, Equatable {
  var id: String
  var timestamp: Double
  var amountUSD: Double
}

enum ShoppingSavings {
  static func progress(_ events: [ShoppingSaving], startedAt: Double, excludedIds: Set<String>) -> Double {
    var seen: Set<String> = []
    return events.reduce(0) { total, event in
      guard event.timestamp.isFinite, event.timestamp > startedAt, !excludedIds.contains(event.id),
            event.amountUSD.isFinite, event.amountUSD > 0, event.amountUSD <= 1e9,
            seen.insert(event.id).inserted else { return total }
      return total + event.amountUSD
    }
  }
  static func earned(progress: Double, goal: Double, goalAmount: Double = 0, currency: String = "USD") -> Bool {
    guard goal.isFinite, goal > 0, progress.isFinite, progress >= 0 else { return false }
    guard goalAmount.isFinite, goalAmount > 0 else { return progress + 1e-7 >= goal }
    // Compare money in the cycle currency at its minor-unit precision. The
    // cycle's original exchange rate is fixed; live rate changes cannot earn a pass.
    let formatter = NumberFormatter()
    formatter.locale = Locale(identifier: "en_US")
    formatter.numberStyle = .currency
    formatter.currencyCode = currency
    let scale = pow(10.0, Double(formatter.maximumFractionDigits))
    let savedUnits = (progress / goal * goalAmount * scale + 1e-7).rounded()
    let goalUnits = (goalAmount * scale + 1e-7).rounded()
    return goalUnits > 0 && savedUnits >= goalUnits
  }
  static func passDeadline(from date: Date) -> Date {
    // DeviceActivity has second precision. Persist the same instant as its
    // schedule so intervalDidEnd cannot arrive before a millisecond deadline.
    Date(timeIntervalSince1970: floor(date.timeIntervalSince1970) + 30 * 60)
  }
}

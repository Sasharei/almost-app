import Foundation

enum ExpenseParser {
  struct Result {
    let expense: Bool
    let amount: String?
    let currency: String?
    var automatic: Bool { expense && amount != nil && currency != nil }
  }
  static func normalize(_ input: String) -> String {
    input.map { char -> String in
      if let digit = char.wholeNumberValue, digit >= 0 && digit <= 9 { return String(digit) }
      switch char {
      case "\u{066b}": return "."
      case "\u{066c}": return ","
      case "\u{00a0}", "\u{202f}": return " "
      case "\u{200e}", "\u{200f}", "\u{061c}": return ""
      default: return String(char)
      }
    }.joined()
  }
  static func matches(_ pattern: String, _ text: String) -> [NSTextCheckingResult] {
    guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { return [] }
    return regex.matches(in: text, range: NSRange(text.startIndex..., in: text))
  }
  static func parseAmount(_ input: String, currency: String = "USD") -> String? {
    var number = normalize(input).trimmingCharacters(in: .whitespacesAndNewlines)
    guard !matches("^" + ExpensePatterns.number + "$", number).isEmpty else { return nil }
    if number.contains(" "), matches("^[0-9]{1,3}( [0-9]{3})+([.,][0-9]{1,3})?$", number).isEmpty { return nil }
    number = number.replacingOccurrences(of: " ", with: "")
    if let separator = number.lastIndex(where: { $0 == "." || $0 == "," }) {
      let fraction = String(number[number.index(after: separator)...])
      guard fraction.count >= 1 && fraction.count <= (["KWD", "BHD", "OMR"].contains(currency) ? 3 : 2) else { return nil }
      let whole = String(number[..<separator])
      if whole.contains(number[separator]) { return nil }
      if whole.contains(".") || whole.contains(",") {
        guard !matches("^[0-9]{1,3}([.,][0-9]{3})+$", whole).isEmpty else { return nil }
      }
      number = whole.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: "") + "." + fraction
    }
    guard let value = Decimal(string: number, locale: Locale(identifier: "en_US_POSIX")), value > 0, value <= 1_000_000_000 else { return nil }
    return NSDecimalNumber(decimal: value).stringValue
  }
  // Shortcuts may stringify a Currency Amount using the phone's locale.
  // Require an explicit currency; never infer an ambiguous symbol or device default.
  static func walletCurrency(_ input: String?) -> String? {
    guard let input else { return nil }
    let code = normalize(input).trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    guard NSLocale.commonISOCurrencyCodes.contains(code) else { return nil }
    return code
  }
  static func walletAmount(_ input: String?, currency: String?) -> String? {
    guard let input, let code = walletCurrency(currency) else { return nil }
    var number = normalize(input).trimmingCharacters(in: .whitespacesAndNewlines)
    var tokens = [code]
    let symbols = ["EUR": ["€"], "GBP": ["£"], "RUB": ["₽"], "SAR": ["ر.س.", "ر.س", "ريال"], "AED": ["د.إ.", "د.إ", "درهم"], "USD": ["US$", "$"], "CAD": ["CA$", "C$", "$"], "AUD": ["A$", "$"], "NZD": ["NZ$", "$"], "HKD": ["HK$", "$"], "SGD": ["S$", "$"], "JPY": ["JP¥", "¥", "￥"], "CNY": ["CN¥", "¥", "￥"]]
    tokens += symbols[code] ?? []
    for token in tokens {
      if number.uppercased().hasPrefix(token.uppercased()) {
        number = String(number.dropFirst(token.count)).trimmingCharacters(in: .whitespacesAndNewlines)
        break
      }
      if number.uppercased().hasSuffix(token.uppercased()) {
        number = String(number.dropLast(token.count)).trimmingCharacters(in: .whitespacesAndNewlines)
        break
      }
    }
    // A single grouping separator is not a decimal point for two-decimal
    // currencies. Three-decimal currencies retain their fractional precision.
    if !["KWD", "BHD", "OMR"].contains(code),
       !matches(#"^[1-9][0-9]{0,2}([.,])[0-9]{3}(?:\1[0-9]{3})*$"#, number).isEmpty {
      number = number.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: "")
    } else if !matches(#"^[1-9][0-9]{0,2}([.,])[0-9]{3}(?:\1[0-9]{3})+$"#, number).isEmpty {
      number = number.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: "")
    }
    return parseAmount(number, currency: code)
  }
  static func parse(_ input: String) -> Result {
    let text = normalize(input)
    guard !matches(ExpensePatterns.outgoing, text).isEmpty, matches(ExpensePatterns.exclude, text).isEmpty else {
      return Result(expense: false, amount: nil, currency: nil)
    }
    if text.utf16.count > 2000 { return Result(expense: true, amount: nil, currency: nil) }
    let money = "(?<![\\p{L}0-9])(" + ExpensePatterns.code + ")\\s*(" + ExpensePatterns.number + ")(?![\\p{L}0-9]|[.,](?:[0-9]|[.,]))|(?<![\\p{L}0-9.,+\\-])(" + ExpensePatterns.number + ")\\s*(" + ExpensePatterns.code + ")(?!\\p{L})"
    let ns = text as NSString
    var found: [Result] = []
    for match in matches(money, text) {
      let start = max(0, match.range.location - 35)
      var prefix = ns.substring(with: NSRange(location: start, length: match.range.location - start))
      if let boundary = prefix.lastIndex(where: { $0 == "\n" || $0 == ";" }) { prefix = String(prefix[prefix.index(after: boundary)...]) }
      if !matches(ExpensePatterns.balance, prefix).isEmpty { continue }
      let leading = match.range(at: 1).location != NSNotFound
      var code = ns.substring(with: match.range(at: leading ? 1 : 4)).uppercased()
      if code == "€" { code = "EUR" }
      if code == "£" { code = "GBP" }
      if code == "₽" { code = "RUB" }
      if code.hasPrefix("ر.س") || code == "ريال" { code = "SAR" }
      if code == "درهم" { code = "AED" }
      guard let amount = parseAmount(ns.substring(with: match.range(at: leading ? 2 : 3)), currency: code) else {
        return Result(expense: true, amount: nil, currency: nil)
      }
      found.append(Result(expense: true, amount: amount, currency: code))
    }
    return found.count == 1 ? found[0] : Result(expense: true, amount: nil, currency: nil)
  }
}

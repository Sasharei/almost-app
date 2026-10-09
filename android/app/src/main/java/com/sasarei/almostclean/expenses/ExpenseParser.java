package com.sasarei.almostclean.expenses;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Conservative, offline parser. Never guess a currency from a bare $ or a card number. */
public final class ExpenseParser {
  private static final int FLAGS = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE;
  private static final Pattern OUTGOING = Pattern.compile(
      "\\b(purchase|purchased|paid|payment|spent|debited|charged|compra|pago|pagamento|acquisto|achat|paiement|kauf|bezahlt|abbuchung)\\b|покупк|оплат|списан|شراء|دفع|خصم|支付|消费|消費|支払|購入|결제|구매", FLAGS);
  private static final Pattern EXCLUDE = Pattern.compile(
      "\\b(declined|failed|rejected|pending|refund|refunded|reversed|reversal|cashback|credited|received|otp|verification|verify|scheduled|due|request|attempt|unsuccessful|insufficient|not|declinada|rechazado|reembolso|recibido|recusado|recebido|rifiutato|rimborso|refuse|remboursement|recu|abgelehnt|erstattung|erhalten)\\b|отклон|отмен|возврат|зачислен|поступлен|не выполн|ожидан|код|رفض|مرفوض|استرداد|إيداع|ايداع|رمز|لم تتم|失败|失敗|退款|验证码|驗證碼|入账|入帳|返金|失敗|認証|입금|취소|실패|인증|refusé|remboursé|reçu|rifiutat|rimborso|recusad|rechazad|abgelehnt|fehlgeschlagen|отказ|ошибк|неуспеш|رفض|معلق|قيد المعالجة|待处理|待處理|撤销|撤銷|取消|취소|보류|\\b(will|tomorrow|offer|earn|reward|limit|minimum|authorization|authorisation)\\b", FLAGS);
  private static final Pattern BALANCE = Pattern.compile(
      "balance|available|remaining|saldo|solde|guthaben|остат|баланс|رصيد|الرصيد|متاح|余额|餘額|残高|잔액", FLAGS);
  private static final String CODE = "(?:CZK|KGS|MDL|NGN|RON|UAH|PKR|SCR|UZS|USD|EUR|GBP|SAR|AED|RUB|CNY|JPY|KRW|BRL|CAD|AUD|CHF|INR|KWD|BHD|OMR|QAR|EGP|TRY|MXN|PLN|SEK|NOK|DKK|ZAR|HKD|SGD|NZD|IDR|THB|MYR|PHP|VND|ILS|TWD|€|£|₽|ر\\.س\\.?|ر\\.س|ريال|درهم)";
  private static final String NUMBER = "[0-9]+(?:[., ][0-9]+)*";
  private static final Pattern MONEY = Pattern.compile(
      "(?<![\\p{L}0-9])(" + CODE + ")\\s*(" + NUMBER + ")(?![\\p{L}0-9]|[.,](?:[0-9]|[.,]))|(?<![\\p{L}0-9.,+\\-])(" + NUMBER + ")\\s*(" + CODE + ")(?!\\p{L})", FLAGS);

  public static final class Result {
    public final boolean expense;
    public final String amount;
    public final String currency;
    public Result(boolean expense, String amount, String currency) {
      this.expense = expense; this.amount = amount; this.currency = currency;
    }
    public boolean automatic() { return expense && amount != null && currency != null; }
  }

  public static String normalize(String text) {
    StringBuilder out = new StringBuilder();
    for (char c : text.toCharArray()) {
      int digit = Character.digit(c, 10);
      if (digit >= 0) out.append(digit);
      else if (c == '\u066b') out.append('.');
      else if (c == '\u066c') out.append(',');
      else if (c == '\u00a0' || c == '\u202f') out.append(' ');
      else if (c != '\u200e' && c != '\u200f' && c != '\u061c') out.append(c);
    }
    return out.toString();
  }

  public static String parseAmount(String input) {
    return parseAmount(input, "USD");
  }

  public static String parseAmount(String input, String currency) {
    String number = normalize(input).trim();
    if (!number.matches(NUMBER)) return null;
    if (number.contains(" ") && !number.matches("[0-9]{1,3}( [0-9]{3})+([.,][0-9]{1,3})?")) return null;
    number = number.replace(" ", "");
    int dot = number.lastIndexOf('.'), comma = number.lastIndexOf(',');
    int separator = Math.max(dot, comma);
    if (separator >= 0) {
      int digits = number.length() - separator - 1;
      // A lone separator with 3 trailing digits is ambiguous (1.234): require review.
      boolean threeDecimals = currency.matches("KWD|BHD|OMR");
      if (digits < 1 || digits > (threeDecimals ? 3 : 2)) return null;
      String whole = number.substring(0, separator);
      if (whole.indexOf(number.charAt(separator)) >= 0) return null;
      if ((whole.contains(".") || whole.contains(",")) && !whole.matches("[0-9]{1,3}([.,][0-9]{3})+")) return null;
      number = whole.replace(".", "").replace(",", "") + "." + number.substring(separator + 1);
    }
    try {
      BigDecimal value = new BigDecimal(number);
      return value.signum() > 0 && value.compareTo(new BigDecimal("1000000000")) <= 0
          ? value.stripTrailingZeros().toPlainString() : null;
    } catch (NumberFormatException error) { return null; }
  }

  public static Result parse(String input) {
    String text = normalize(input);
    if (!OUTGOING.matcher(text).find() || EXCLUDE.matcher(text).find()) return new Result(false, null, null);
    if (text.length() > 2000) return new Result(true, null, null);
    List<Result> amounts = new ArrayList<>();
    Matcher matcher = MONEY.matcher(text);
    while (matcher.find()) {
      String prefix = text.substring(Math.max(0, matcher.start() - 35), matcher.start());
      // A balance is never the purchase amount. Stop context at common sentence boundaries.
      prefix = prefix.substring(Math.max(prefix.lastIndexOf('\n'), prefix.lastIndexOf(';')) + 1);
      if (BALANCE.matcher(prefix).find()) continue;
      String code = matcher.group(1) != null ? matcher.group(1) : matcher.group(4);
      code = code.toUpperCase(Locale.ROOT);
      if (code.equals("€")) code = "EUR";
      if (code.equals("£")) code = "GBP";
      if (code.equals("₽")) code = "RUB";
      if (code.startsWith("ر.س") || code.equals("ريال")) code = "SAR";
      if (code.equals("درهم")) code = "AED";
      String amount = parseAmount(matcher.group(2) != null ? matcher.group(2) : matcher.group(3), code);
      if (amount == null) return new Result(true, null, null);
      amounts.add(new Result(true, amount, code));
    }
    return amounts.size() == 1 ? amounts.get(0) : new Result(true, null, null);
  }
}

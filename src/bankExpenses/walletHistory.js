// The native receipt is the authoritative expense. Project it into the same
// spend event format as manual entries, rather than replaying UI side effects.
export function walletHistoryEvents(items, convert, classify, now = Date.now()) {
  return items.filter((item) => item.source === "apple-pay" && item.status === "saved").flatMap((item) => {
    const amountLocal = Number(item.amount);
    const amountUSD = convert(amountLocal, item.currency);
    const timestamp = Number(item.created);
    if (!(amountLocal > 0) || !(amountUSD > 0) || !Number.isFinite(amountUSD) || !(timestamp > 0) || timestamp > now + 300000) return [];
    const category = item.category || classify(item.merchant).category;
    return [{ id: `apple-pay-${item.id}`, kind: "spend", timestamp,
      meta: { title: item.merchant || "Apple Pay", amountUSD, amountLocal, currency: item.currency,
        category, quickEntryCategoryId: category, source: "apple-pay", receiptId: item.id } }];
  });
}

export function mergeWalletHistory(history, imported) {
  return [...history.filter((entry) => entry.meta?.source !== "apple-pay"), ...imported]
    .sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id));
}

// Conservative merchant matching. Unknown names remain editable; never infer
// sensitive details or send merchant/amount data to external services.
const RULES = [
  ["transport", /\b(metro|riyadh metro|uber|careem|lyft|railway|transit|bus|train|taxi|bolt)\b|метро|такси|قطار|مترو|地铁|地鐵/i],
  ["food", /\b(starbucks|mcdonald'?s|kfc|burger|restaurant|cafe|café|coffee|bakery|pizza|shawarma|shababik|supermarket|grocery|carrefour|lulu|panda|tamimi|danube|costa|dunkin)\b|ресторан|кафе|продукт|مطعم|مقهى|شبابيك|餐厅|餐廳/i],
  ["health", /\b(pharmacy|hospital|clinic|nahdi|al.?dawaa)\b|аптек|больниц|صيدلية|医院|醫院/i],
  ["car", /\b(petrol|gas station|fuel|shell|adnoc|enoc|car wash)\b|бензин|заправк|وقود/i],
  ["clothing", /\b(zara|uniqlo|h&m|nike|adidas|clothing|fashion)\b|одежд|ملابس/i],
  ["home", /\b(ikea|furniture|home centre|homecenter)\b|мебел|أثاث/i],
  ["beauty", /\b(sephora|salon|beauty|barber|cosmetics)\b|салон|парикмахер|تجميل/i],
  ["pets", /\b(pet shop|pet store|veterinary|vet clinic)\b|ветеринар/i],
  ["education", /\b(university|school|tuition|bookstore)\b|университет|школ|جامعة/i],
  ["subscriptions", /\b(netflix|spotify|apple\.com\/bill|youtube premium)\b/i],
  ["fun", /\b(cinema|movie|theatre|theater|amusement)\b|кино|سينما/i],
  ["things", /\b(amazon|noon|electronics|jarir|extra)\b/i],
];
export function classifyMerchant(merchant = "") {
  const name = String(merchant).normalize("NFKC").replace(/^\s*\d+\s+/, "").trim();
  const match = RULES.find(([, pattern]) => pattern.test(name));
  return { category: match?.[0] || "things", recognized: !!match };
}

// Run only on the authorized server with its persistent volume mounted. No network admin endpoint.
import { createSuggestionsStore, SUGGESTION_STATUSES } from "../src/store/suggestionsStore.js";
import { suggestionsDatabasePath } from "../src/suggestions.js";
const [action, id, status] = process.argv.slice(2);
const offset = id === undefined ? 0 : Number(id);
if (!(action === "list" && Number.isSafeInteger(offset) && offset >= 0) && !(action === "status" && id && SUGGESTION_STATUSES.includes(status))) {
  throw new Error("Usage: node scripts/suggestions-admin.js list [offset] | status <uuid> <pending|open|planned|in_progress|done|closed|hidden>");
}
const store = createSuggestionsStore(suggestionsDatabasePath());
try {
  if (action === "list") {
    const items = store.review(offset);
    process.stdout.write(`${JSON.stringify({ items, nextOffset: items.length === 200 ? offset + 200 : null }, null, 2)}\n`);
  }
  else { store.moderate(id, status); process.stdout.write("Updated suggestion status\n"); }
} finally { store.close(); }

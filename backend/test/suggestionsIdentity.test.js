import assert from "node:assert/strict";
import test from "node:test";
import { deriveSuggestionsActor } from "../src/auth/suggestionsIdentity.js";
import { createSuggestionsStore } from "../src/store/suggestionsStore.js";
test("board identity survives session rotation and isolates a forged legacy install ID", () => {
  const id = "synthetic-install-owner-0001";
  const owner = deriveSuggestionsActor(id, "owner-strong-install-credential-0001");
  const attacker = deriveSuggestionsActor(id, "attacker-strong-install-secret-0001");
  assert.equal(owner, deriveSuggestionsActor(id, "owner-strong-install-credential-0001"));
  assert.notEqual(owner, attacker);
  assert.notEqual(owner, deriveSuggestionsActor("other-install-0001", "owner-strong-install-credential-0001"));
  assert.equal(deriveSuggestionsActor(id, ""), null);
  const store = createSuggestionsStore();
  try {
    const item = store.create(owner, { requestId: "synthetic", title: "Private pending idea", description: "Only the actual credential holder can see this", language: "en" });
    assert.equal(store.list(attacker).items.length, 0);
    assert.throws(() => store.withdraw(attacker, item.id), /suggestion_not_found/);
    assert.equal(store.list(owner).items.length, 1);
  } finally { store.close(); }
});

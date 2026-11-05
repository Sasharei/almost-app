import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createSuggestionsStore } from "../src/store/suggestionsStore.js";
const proposal = (overrides = {}) => ({ requestId: crypto.randomUUID(), title: "Improve the board", description: "Please make the board easier to navigate.", language: "en", ...overrides });
const fixture = fn => {
  const store = createSuggestionsStore();
  try { return fn(store); } finally { store.close(); }
};
test("pending content is private, public responses never expose installation identifiers", () => fixture(s => {
  const item = s.create("author-secret-id", proposal());
  assert.equal(item.status, "pending");
  assert.equal(s.list("reader").items.length, 0);
  assert.equal(s.list("author-secret-id").items.length, 1);
  s.moderate(item.id, "open");
  const publicItem = s.list("reader").items[0];
  assert.equal(publicItem.isOwn, false);
  assert.equal(JSON.stringify(publicItem).includes("author-secret-id"), false);
}));
test("replays after a lost response are idempotent and conflicts are rejected", () => fixture(s => {
  const payload = proposal();
  const item = s.create("a", payload);
  assert.equal(s.create("a", payload).id, item.id);
  assert.equal(s.list("a").items.length, 1);
  assert.throws(() => s.create("a", { ...payload, title: "Different title" }), /request_id_conflict/);
}));
test("votes replace atomically, repeated sets are safe, and zero removes a vote", () => fixture(s => {
  const item = s.create("a", proposal());
  assert.throws(() => s.vote("a", item.id, 1), /voting_closed/);
  s.moderate(item.id, "open");
  assert.equal(s.vote("b", item.id, 1).score, 1);
  assert.equal(s.vote("b", item.id, 1).score, 1);
  assert.equal(s.vote("b", item.id, -1).score, -1);
  assert.equal(s.vote("c", item.id, 1).score, 0);
  assert.equal(s.vote("b", item.id, 0).score, 1);
  assert.equal(s.list("b").items[0].myVote, 0);
  s.moderate(item.id, "done");
  assert.throws(() => s.vote("b", item.id, 1), /voting_closed/);
}));
test("reports deduplicate, hiding blocks all posts by that author, and ownership is enforced", () => fixture(s => {
  const first = s.create("a", proposal()), second = s.create("a", proposal());
  [first, second].forEach(item => s.moderate(item.id, "open"));
  s.report("b", first.id); s.report("b", first.id);
  assert.equal(s.review().find(item => item.id === first.id).reports, 1);
  assert.throws(() => s.withdraw("b", first.id), /not_suggestion_owner/);
  s.block("b", first.id);
  assert.equal(s.list("b").items.length, 0);
  assert.throws(() => s.vote("b", second.id, 1), /suggestion_not_found/);
  assert.equal(s.list("c").items.length, 2);
  s.withdraw("a", first.id);
  assert.equal(s.list("c").items.length, 1);
}));
test("search, ranking and keyset pages remain deterministic with tied timestamps", () => fixture(s => {
  const ids = Array.from({ length: 5 }, (_, i) => s.create("a", proposal({ title: `Theme idea ${i}` }))).map(item => item.id);
  ids.forEach(id => s.moderate(id, "open"));
  s.vote("b", ids[0], 1);
  const first = s.list("reader", { limit: 2, query: "Theme", sort: "top" });
  assert.equal(first.items[0].id, ids[0]);
  const second = s.list("reader", { limit: 2, query: "Theme", cursor: first.cursor });
  const third = s.list("reader", { limit: 2, query: "Theme", cursor: second.cursor });
  assert.equal(new Set([...first.items, ...second.items, ...third.items].map(item => item.id)).size, 5);
  assert.equal(third.cursor, null);
  assert.equal(s.list("reader", { query: "does not exist" }).items.length, 0);
  assert.equal(s.list("reader", { query: "%' OR 1=1 --" }).items.length, 0);
}));
test("submission and vote limits are enforced independently of the IP limiter", () => fixture(s => {
  const items = Array.from({ length: 5 }, () => s.create("a", proposal()));
  assert.throws(() => s.create("a", proposal()), /suggestions_rate_limited/);
  s.moderate(items[0].id, "open");
  for (let i = 0; i < 60; i++) s.vote("b", items[0].id, i % 2 ? -1 : 1);
  assert.throws(() => s.vote("b", items[0].id, 0), /suggestions_rate_limited/);
}));
test("persistent database survives restart and coordinates two connections without losing votes", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "almost-suggestions-test-"));
  const database = path.join(directory, "ideas.sqlite");
  let first, second;
  try {
    first = createSuggestionsStore(database);
    const payload = proposal();
    const item = first.create("a", payload);
    first.moderate(item.id, "open");
    second = createSuggestionsStore(database);
    first.vote("b", item.id, 1);
    second.vote("c", item.id, 1);
    assert.equal(first.list("b").items[0].score, 2);
    first.close(); first = null;
    second.close(); second = createSuggestionsStore(database);
    assert.equal(second.create("a", payload).id, item.id);
    assert.equal(second.list("b").items[0].score, 2);
  } finally { first?.close(); second?.close(); fs.rmSync(directory, { recursive: true, force: true }); }
});

test("Unicode search handles case and normalization, and blocked authors can be restored", () => fixture(s => {
  const item = s.create("a", proposal({ title: "Новые идеи для Almost", description: "Обсудим предложения пользователей" }));
  s.moderate(item.id, "open");
  assert.equal(s.list("b", { query: "НОВЫЕ" }).items.length, 1);
  s.block("b", item.id);
  assert.equal(s.list("b").items.length, 0);
  s.unblock("b");
  assert.equal(s.list("b").items.length, 1);
}));

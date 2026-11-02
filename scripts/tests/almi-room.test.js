const test = require("node:test");
const assert = require("node:assert/strict");
const { ROOM_ITEMS, normalizeRoomState, purchaseRoomItem, equipRoomItem, removeRoomItem } = require("../../src/engagement/almiRoom");
const { getVisibleCoinDenominationEntries } = require("../../src/engagement/coinBalance");

const COIN_VALUES = [
  { id: "green", value: 1 }, { id: "blue", value: 10 }, { id: "orange", value: 100 },
  { id: "red", value: 1000 }, { id: "pink", value: 10000 },
];

test("room prices and balances use the app's ten-to-one colored coin denominations", () => {
  const breakdown = (amount) => getVisibleCoinDenominationEntries(amount, COIN_VALUES).map(({ id, count }) => [id, count]);
  assert.deepEqual(breakdown(1307), [["red", 1], ["orange", 3], ["green", 7]]);
  assert.deepEqual(breakdown(180), [["orange", 1], ["blue", 8]]);
  assert.deepEqual(breakdown(1693), [["red", 1], ["orange", 6], ["blue", 9], ["green", 3]]);
});

test("room prices create affordable, intermediate and collectible coin sinks", () => {
  assert.deepEqual(ROOM_ITEMS.map((item) => item.price), [180, 150, 550, 700, 950, 3000, 5000]);
  assert.equal(new Set(ROOM_ITEMS.map((item) => item.id)).size, ROOM_ITEMS.length);
});

test("collectible backgrounds can replace each other without losing ownership", () => {
  const first = purchaseRoomItem({ room: null, balance: 10000, itemId: "observatory" });
  const second = purchaseRoomItem({ room: first.room, balance: first.balance, itemId: "garden" });
  assert.equal(second.balance, 2000);
  assert.equal(second.room.equipped.background, "garden");
  assert.deepEqual(second.room.owned, ["observatory", "garden"]);
  assert.equal(equipRoomItem({ room: second.room, itemId: "observatory" }).room.equipped.background, "observatory");
});

test("a purchase debits once, owns forever and places its item", () => {
  const bought = purchaseRoomItem({ room: null, balance: 200, itemId: "bed" });
  assert.equal(bought.ok, true);
  assert.equal(bought.balance, 20);
  assert.deepEqual(bought.room.owned, ["bed"]);
  assert.equal(bought.room.equipped.bed, "bed");
  const duplicate = purchaseRoomItem({ room: bought.room, balance: bought.balance, itemId: "bed" });
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, "owned");
  assert.equal(duplicate.balance, 20);
});

test("insufficient and unknown purchases preserve coins and ownership", () => {
  for (const [itemId, reason] of [["observatory", "insufficient"], ["unknown", "unknown"]]) {
    const result = purchaseRoomItem({ room: null, balance: 120, itemId });
    assert.equal(result.ok, false);
    assert.equal(result.reason, reason);
    assert.equal(result.balance, 120);
    assert.deepEqual(result.room.owned, []);
  }
});

test("only owned items can be placed; removing a placement never removes ownership", () => {
  assert.equal(equipRoomItem({ room: null, itemId: "rug" }).ok, false);
  const bought = purchaseRoomItem({ room: null, balance: 600, itemId: "rug" });
  const removed = removeRoomItem({ room: bought.room, itemId: "rug" });
  assert.equal(removed.ok, true);
  assert.equal(removed.room.equipped.rug, null);
  assert.deepEqual(removed.room.owned, ["rug"]);
  assert.equal(equipRoomItem({ room: removed.room, itemId: "rug" }).room.equipped.rug, "rug");
});

test("hydration ignores corrupt, foreign and unowned inventory references", () => {
  const state = normalizeRoomState({ owned: ["bed", "bed", "foreign"], equipped: { bed: "bed", bowl: "bowl", rug: "bed" } });
  assert.deepEqual(state.owned, ["bed"]);
  assert.equal(state.equipped.bed, "bed");
  assert.equal(state.equipped.bowl, null);
  assert.equal(state.equipped.rug, null);
});

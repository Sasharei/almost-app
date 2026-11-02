const ROOM_ITEMS = Object.freeze([
  { id: "bed", slot: "bed", price: 180, titleKey: "almiRoomBed" },
  { id: "bowl", slot: "bowl", price: 150, titleKey: "almiRoomBowl" },
  { id: "rug", slot: "rug", price: 550, titleKey: "almiRoomRug" },
  { id: "window", slot: "window", price: 700, titleKey: "almiRoomWindow" },
  { id: "shelf", slot: "shelf", price: 950, titleKey: "almiRoomShelf" },
  { id: "observatory", slot: "background", price: 3000, titleKey: "almiRoomObservatory", collectible: true },
  { id: "garden", slot: "background", price: 5000, titleKey: "almiRoomGarden", collectible: true },
]);

const ROOM_ITEM_BY_ID = Object.freeze(Object.fromEntries(ROOM_ITEMS.map((item) => [item.id, item])));
const ROOM_SLOTS = Object.freeze(["bed", "bowl", "rug", "window", "shelf", "background"]);

const normalizeRoomState = (input) => {
  const owned = Array.isArray(input?.owned)
    ? [...new Set(input.owned.filter((id) => Boolean(ROOM_ITEM_BY_ID[id])))]
    : [];
  const equipped = Object.fromEntries(ROOM_SLOTS.map((slot) => {
    const id = input?.equipped?.[slot];
    return [slot, owned.includes(id) && ROOM_ITEM_BY_ID[id]?.slot === slot ? id : null];
  }));
  return { owned, equipped };
};

const purchaseRoomItem = ({ room, balance, itemId }) => {
  const item = ROOM_ITEM_BY_ID[itemId];
  const current = normalizeRoomState(room);
  const amount = Math.max(0, Math.floor(Number(balance) || 0));
  if (!item) return { ok: false, reason: "unknown", room: current, balance: amount };
  if (current.owned.includes(item.id)) return { ok: false, reason: "owned", room: current, balance: amount };
  if (amount < item.price) return { ok: false, reason: "insufficient", shortfall: item.price - amount, room: current, balance: amount };
  return {
    ok: true,
    room: {
      owned: [...current.owned, item.id],
      equipped: { ...current.equipped, [item.slot]: item.id },
    },
    balance: amount - item.price,
    price: item.price,
  };
};

const equipRoomItem = ({ room, itemId }) => {
  const item = ROOM_ITEM_BY_ID[itemId];
  const current = normalizeRoomState(room);
  if (!item || !current.owned.includes(itemId)) return { ok: false, room: current };
  return { ok: true, room: { ...current, equipped: { ...current.equipped, [item.slot]: itemId } } };
};

const removeRoomItem = ({ room, itemId }) => {
  const item = ROOM_ITEM_BY_ID[itemId];
  const current = normalizeRoomState(room);
  if (!item || current.equipped[item.slot] !== itemId) return { ok: false, room: current };
  return { ok: true, room: { ...current, equipped: { ...current.equipped, [item.slot]: null } } };
};

module.exports = { ROOM_ITEMS, ROOM_ITEM_BY_ID, ROOM_SLOTS, normalizeRoomState, purchaseRoomItem, equipRoomItem, removeRoomItem };

/* Widget deadlines use original event times, independent of foreground JS. */
(function (root) {
  const HOUR = 3600000;
  const FINANCIAL_FRESHNESS = 24 * HOUR;
  const SCENE_TTL = { empty_treasury: 6 * HOUR, spending_fire: 4 * HOUR, savings_guard: 6 * HOUR };
  const positiveTime = (value, now) => Number.isFinite(value) && value > 0 && value <= now;
  function resolve(snapshot = {}, now = Date.now()) {
    const balance = { scene: 'balance', copy: 'balance', expiresAt: null };
    if (!Number.isFinite(now) || now <= 0) return balance;
    if (!snapshot || typeof snapshot !== 'object') snapshot = {};
    // No current financial assertion can be inferred from a missing/stale snapshot.
    if (positiveTime(snapshot.financialUpdatedAt, now) && now - snapshot.financialUpdatedAt < FINANCIAL_FRESHNESS) {
      const ttl = SCENE_TTL[snapshot.eventScene];
      if (ttl && positiveTime(snapshot.eventAt, now)) {
        const expiresAt = Math.min(snapshot.eventAt + ttl, snapshot.financialUpdatedAt + FINANCIAL_FRESHNESS);
        if (now < expiresAt) return { scene: snapshot.eventScene, copy: snapshot.eventScene, expiresAt };
      }
    }
    if (!positiveTime(snapshot.lastOpenedAt, now)) return balance;
    const away = now - snapshot.lastOpenedAt;
    if (away < 24 * HOUR) return { ...balance, expiresAt: snapshot.lastOpenedAt + 24 * HOUR };
    const day = Math.floor(away / (24 * HOUR));
    const cycleStart = snapshot.lastOpenedAt + day * 24 * HOUR;
    // Six-hour appearance, then eighteen hours of the normal balance/input widget.
    // Absolute timestamps avoid restarting the scene's TTL on every reload.
    if (now < cycleStart + 6 * HOUR) return {
      scene: 'neglected', copy: day % 2 ? 'neglected' : 'neglected_long', expiresAt: cycleStart + 6 * HOUR,
    };
    return { ...balance, expiresAt: cycleStart + 24 * HOUR };
  }
  function timeline(snapshot, now, horizonHours = 168) {
    if (!Number.isFinite(now) || now <= 0) return { entries: [], reloadAt: null };
    if (!Number.isFinite(horizonHours)) horizonHours = 168;
    const horizon = now + Math.max(24, Math.min(168, horizonHours)) * HOUR;
    const entries = [];
    let cursor = now;
    while (cursor < horizon && entries.length < 64) {
      const state = resolve(snapshot, cursor);
      entries.push({ date: cursor, ...state });
      if (!state.expiresAt || state.expiresAt <= cursor) break;
      cursor = state.expiresAt;
    }
    // A terminal balance entry is already scheduled even if the OS delays reload.
    entries.push({ date: horizon, scene: 'balance', copy: 'balance', expiresAt: null });
    // Refresh before the prepared schedule ends; never use a permanent final joke.
    return { entries, reloadAt: horizon - 12 * HOUR };
  }
  const api = { HOUR, SCENE_TTL, resolve, timeline };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AlmiGuardian = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

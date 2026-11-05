import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
process.env.DOTENV_CONFIG_PATH = "/dev/null";
process.env.APP_SESSION_SECRET = "legacy-suggestions-test-session-key-32-characters";
process.env.REQUIRE_INSTALL_SECRET_PROOF = "0";
const { app } = await import("../src/server.js");
const { closeSuggestionsStore } = await import("../src/suggestions.js");
const { deriveSuggestionsActor } = await import("../src/auth/suggestionsIdentity.js");
test("real legacy auth route gives separate board identities for the same claimed installation", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const identity = { appUserId: "synthetic-legacy-install-0001", installId: "synthetic-legacy-install-0001", platform: "android" };
  const ownerSecret = "owner-strong-local-install-secret-0001";
  const post = async (route, payload, token) => {
    const response = await fetch(base + route, { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ ...identity, ...payload }) });
    return { status: response.status, body: await response.json() };
  };
  try {
    const owner = await post("/v1/auth/session", { installSecret: ownerSecret });
    assert.equal(owner.status, 200);
    const forged = await post("/v1/auth/session", { installSecret: "different-strong-install-secret-0002", suggestionsActor: deriveSuggestionsActor(identity.installId, ownerSecret) });
    assert.equal(forged.status, 200);
    const legacy = await post("/v1/auth/session", {});
    assert.equal(legacy.status, 200);
    assert.equal((await post("/v1/suggestions/list", {}, legacy.body.token)).status, 401);
    const created = await post("/v1/suggestions/create", { requestId: crypto.randomUUID(), title: "Private owner suggestion", description: "Visible only to the credential holder before review", language: "en" }, owner.body.token);
    assert.equal(created.status, 201);
    assert.equal((await post("/v1/suggestions/list", {}, forged.body.token)).body.items.length, 0);
    assert.equal((await post("/v1/suggestions/withdraw", { id: created.body.item.id }, forged.body.token)).status, 404);
    assert.equal((await post("/v1/suggestions/list", {}, owner.body.token)).body.items.length, 1);
  } finally { closeSuggestionsStore(); await new Promise(resolve => server.close(resolve)); }
});

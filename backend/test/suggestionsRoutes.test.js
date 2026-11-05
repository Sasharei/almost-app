import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";
process.env.DOTENV_CONFIG_PATH = "/dev/null";
process.env.APP_SESSION_SECRET = "suggestions-test-session-secret-32-characters";
process.env.REQUIRE_INSTALL_SECRET_PROOF = "1";
const { app } = await import("../src/server.js");
const { closeSuggestionsStore } = await import("../src/suggestions.js");
const { issueSessionToken } = await import("../src/auth/session.js");
const { deriveSuggestionsActor } = await import("../src/auth/suggestionsIdentity.js");

test("suggestions HTTP contract rejects unauthenticated, forged, overlong and extra-field payloads", async () => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const identity = { appUserId: "suggestion-test-user-001", installId: "suggestion-test-user-001", platform: "ios" };
  const { token } = issueSessionToken({ ...identity, suggestionsActor: deriveSuggestionsActor(identity.installId, "synthetic-board-secret-32-characters") });
  const request = async (action, payload = {}, bearer = token) => {
    const response = await fetch(`${base}/v1/suggestions/${action}`, { method: "POST", headers: { "content-type": "application/json", ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) }, body: JSON.stringify({ ...identity, ...payload }) });
    return { status: response.status, body: await response.json(), cache: response.headers.get("cache-control") };
  };
  try {
    assert.equal((await request("list", {}, "")).status, 401);
    assert.equal((await request("list", {}, "forged")).status, 401);
    assert.equal((await request("list", {}, issueSessionToken(identity).token)).status, 401);
    assert.equal((await request("list", { installId: "another-install-0001" })).status, 401);
    assert.equal((await request("list", { limit: 999 })).status, 400);
    assert.equal((await request("list", { author: "someone" })).status, 400);
    assert.equal((await request("create", { requestId: crypto.randomUUID(), title: "a".repeat(101), description: "a long description", language: "en" })).status, 400);
    const payload = { requestId: crypto.randomUUID(), title: "Better ideas", description: "Make ideas easy to find", language: "en" };
    const created = await request("create", payload);
    assert.equal(created.status, 201);
    assert.equal(created.body.item.status, "pending");
    assert.equal((await request("create", payload)).body.item.id, created.body.item.id);
    const listed = await request("list");
    assert.equal(listed.status, 200);
    assert.equal(listed.body.items.length, 1);
    assert.equal(listed.cache, "no-store");
    assert.equal((await request("vote", { id: created.body.item.id, value: 3 })).status, 400);
    assert.equal((await request("vote", { id: created.body.item.id, value: 1 })).status, 409);
    assert.equal((await request("withdraw", { id: created.body.item.id })).status, 200);
    assert.equal((await request("list")).body.items.length, 0);
  } finally {
    closeSuggestionsStore();
    await new Promise(resolve => server.close(resolve));
  }
});

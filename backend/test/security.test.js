import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

Object.assign(process.env, {
  DOTENV_CONFIG_PATH: '/dev/null', NODE_ENV: 'test', APP_SESSION_SECRET: 'audit-session-secret-32-random-chars-test',
  REQUIRE_INSTALL_SECRET_PROOF: '1', ENFORCE_INSTALL_ID_BINDING: '1', STORE_DATABASE_PATH: ':memory:', STORE_PATH: '',
  APP_SHARED_SECRET: '', APPLE_WEBHOOK_SECRET: 'test-apple-webhook', GOOGLE_RTDN_SECRET: '', WEBHOOK_SHARED_SECRET: '',
  APPLE_VALIDATION_ENABLED: '1', APPLE_BUNDLE_ID: 'audit.example', APPLE_ENVIRONMENT: 'sandbox',
  APPLE_ISSUER_ID: 'test', APPLE_KEY_ID: 'test', APPLE_PRIVATE_KEY: 'test',
  GOOGLE_VALIDATION_ENABLED: '1', GOOGLE_PACKAGE_NAME: 'audit.example', GOOGLE_SERVICE_ACCOUNT_JSON: '{}',
  REVENUECAT_API_KEY: 'test-only-key', RATE_LIMIT_AUTH_SESSION_PER_MINUTE: '10', RATE_LIMIT_APP_PER_MINUTE: '1000',
  GOOGLE_RTDN_AUDIENCE: '', GOOGLE_RTDN_SERVICE_ACCOUNT_EMAIL: '', TRUSTED_PROXY_CIDRS: '',
});
const { google } = await import('googleapis');
const { AppStoreServerAPIClient } = await import('@apple/app-store-server-library');
let purchaseState = 0;
let subscriptionState = '';
let owner = 'security-user-a-0001';
let transaction = 'security-order-1';
let accountId = 'different-native-owner';
let entitlementActive = true;
let delay = null;
let googleCalls = 0;
google.androidpublisher = () => ({ purchases: {
  subscriptionsv2: { get: async () => {
    if (!subscriptionState) throw new Error('not a subscription');
    return { data: { subscriptionState, latestOrderId: transaction,
      lineItems: [{ productId: 'almost_premium_monthly', expiryTime: new Date(Date.now()+3600000).toISOString() }] } };
  } },
  products: { get: async () => {
    googleCalls++;
    if (delay) await delay;
    return { data: { purchaseState, consumptionState: 0, productId: 'almost_premium_lifetime', orderId: transaction, obfuscatedExternalAccountId: accountId } };
  } },
} });
AppStoreServerAPIClient.prototype.getTransactionInfo = async () => ({ signedTransactionInfo: `test.${Buffer.from(JSON.stringify({
  transactionId: transaction, originalTransactionId: transaction, productId: 'almost_premium_lifetime', bundleId: 'audit.example', environment: 'Sandbox', appAccountToken: accountId,
})).toString('base64url')}.test` });
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (!String(url).startsWith('https://api.revenuecat.com/v1/subscribers/')) throw new Error('unexpected outbound network request');
  const requestedUser = decodeURIComponent(String(url).split('/').pop());
  return { ok: true, json: async () => ({ subscriber: {
    entitlements: requestedUser === owner && entitlementActive ? { premium: { product_identifier: 'almost_premium_lifetime', expires_date: null } } : {},
    non_subscriptions: requestedUser === owner ? { almost_premium_lifetime: [
      { store: 'play_store', store_transaction_id: transaction }, { store: 'app_store', store_transaction_id: transaction },
    ] } : {},
  } }) };
};
const { app, assertSecureStartupConfig } = await import('../src/server.js');
const { config } = await import('../src/config.js');
const { validateGooglePurchase } = await import('../src/validators/google.js');
const { createEntitlementsStore, upsertEntitlement, getEntitlementByUser } = await import('../src/store/entitlementsStore.js');
const { verifyGooglePush } = await import('../src/auth/googlePush.js');

await test('HTTP security regressions on loopback with synthetic store/RevenueCat responses', async t => {
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (endpoint, body, token = '', headers = {}) => {
    const response = await realFetch(base + endpoint, { method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json() };
  };
  const session = id => request('/v1/auth/session', { installId: id, appUserId: id, installSecret: 'test-install-secret-long-enough-32-characters', platform: 'android' });
  try {
    const a = await session('security-user-a-0001');
    const b = await session('security-user-b-0001');
    assert.equal(a.status, 200); assert.equal(b.status, 200);
    const payload = { appUserId: 'security-user-a-0001', installId: 'security-user-a-0001', platform: 'android', productId: 'almost_premium_lifetime', purchaseToken: 'store-purchase-token' };
    await t.test('pending, canceled, empty purchase state cannot grant premium', async () => {
      for (const state of [1, 2, null, undefined]) {
        purchaseState = state;
        const validation = await validateGooglePurchase({ productId: payload.productId, purchaseToken: 'test-token' });
        assert.equal(validation.isActive, false);
      }
      purchaseState = 2;
      const pending = await request('/v1/iap/validate', payload, a.body.token);
      assert.equal(pending.body.entitlement.isPremium, false);
      purchaseState = 0;
    });
    await t.test('canceled subscription remains available until paid expiry, grace period is preserved', async () => {
      for (const state of ['SUBSCRIPTION_STATE_CANCELED', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD']) {
        subscriptionState = state;
        assert.equal((await validateGooglePurchase({ purchaseToken: 'test' })).isActive, true);
      }
      subscriptionState = 'SUBSCRIPTION_STATE_PENDING';
      assert.equal((await validateGooglePurchase({ purchaseToken: 'test' })).isActive, false);
      subscriptionState = '';
    });
    await t.test('purchase needs verified owner on both platforms', async () => {
      owner = 'some-other-owner';
      assert.equal((await request('/v1/iap/validate', payload, a.body.token)).status, 403);
      const ios = await request('/v1/auth/session', { installId: payload.installId, installSecret: 'test-install-secret-long-enough-32-characters', platform: 'ios' });
      assert.equal((await request('/v1/iap/validate', { ...payload, platform: 'ios', transactionId: transaction, purchaseToken: null }, ios.body.token)).status, 403);
      owner = payload.appUserId;
    });
    await t.test('idempotency is isolated by user, rejects changed bodies, validates schema first', async () => {
      const headers = { 'idempotency-key': 'same-user-supplied-key' };
      const first = await request('/v1/iap/validate', payload, a.body.token, headers);
      assert.equal(first.status, 200); assert.equal(first.body.entitlement.isPremium, true);
      const calls = googleCalls;
      assert.equal((await request('/v1/iap/validate', payload, a.body.token, headers)).body.idempotent, true);
      assert.equal(googleCalls, calls);
      const otherPayload = { ...payload, appUserId: 'security-user-b-0001', installId: 'security-user-b-0001' };
      assert.equal((await request('/v1/iap/validate', otherPayload, b.body.token, headers)).status, 403);
      assert.equal((await request('/v1/iap/validate', otherPayload, b.body.token, headers)).status, 403);
      assert.equal((await request('/v1/iap/validate', {}, b.body.token, headers)).status, 400);
      assert.equal((await request('/v1/iap/validate', { ...payload, purchaseToken: 'different' }, a.body.token, headers)).status, 409);
    });
    await t.test('concurrent use of the same idempotency key cannot run two validations', async () => {
      let release;
      delay = new Promise(resolve => { release = resolve; });
      const headers = { 'idempotency-key': 'concurrent' };
      const first = request('/v1/iap/validate', payload, a.body.token, headers);
      await new Promise(resolve => setTimeout(resolve, 30));
      assert.equal((await request('/v1/iap/validate', payload, a.body.token, headers)).status, 409);
      release(); delay = null;
      assert.equal((await first).status, 200);
    });
    await t.test('verified RevenueCat restore transfers a purchase; old owner loses this grant', async () => {
      owner = 'security-user-b-0001';
      const restored = await request('/v1/iap/validate', { ...payload, appUserId: owner, installId: owner }, b.body.token);
      assert.equal(restored.status, 200);
      assert.equal(restored.body.entitlement.isPremium, true);
      assert.equal(getEntitlementByUser(payload.appUserId).isPremium, false);
      owner = payload.appUserId;
    });
    await t.test('historical RevenueCat purchase without an active entitlement cannot steal a transferred grant', async () => {
      entitlementActive = false;
      const response = await request('/v1/iap/validate', payload, a.body.token);
      assert.equal(response.status, 409);
      assert.equal(getEntitlementByUser('security-user-b-0001').isPremium, true);
      entitlementActive = true;
    });
    await t.test('Android SDK order IDs can be verified without pretending they are purchase tokens', async () => {
      const result = await request('/v1/iap/validate', { ...payload, purchaseToken: null, transactionId: transaction }, a.body.token);
      assert.equal(result.status, 200); assert.equal(result.body.entitlement.isPremium, true);
    });
    await t.test('missing webhook authentication and forged void notifications cannot change a victim', async () => {
      upsertEntitlement('webhook-victim', { isPremium: true });
      const body = { appUserId: 'webhook-victim', voidedPurchaseNotification: { purchaseToken: 'fabricated', orderId: 'fabricated' } };
      assert.equal((await request('/v1/webhooks/google/rtdn', body)).status, 503);
      config.google.webhook.secret = 'test-secret';
      assert.equal((await request('/v1/webhooks/google/rtdn', body)).status, 401);
      await request('/v1/webhooks/google/rtdn', body, '', { 'x-google-rtdn-secret': 'test-secret' });
      assert.equal(getEntitlementByUser('webhook-victim').isPremium, true);
    });
    await t.test('foreign session, forged signature and unsupported products are rejected', async () => {
      assert.equal((await request('/v1/entitlements/security-user-a-0001', undefined, b.body.token)).status, 401);
      assert.equal((await request('/v1/iap/validate', payload, a.body.token + 'tampered')).status, 401);
      assert.equal((await request('/v1/iap/validate', { ...payload, productId: 'unapproved' }, a.body.token)).status, 400);
    });
    await t.test('neither a spoofed forwarding header nor rotating install IDs bypasses the IP limit', async () => {
      let result;
      for (let i = 0; i < 12; i++) result = await session(`rate-limit-install-${i}`);
      assert.equal(result.status, 429);
      assert.equal((await request('/v1/auth/session', { installId: 'fresh-identity-000001', installSecret: 'test-install-secret-long-enough-32-characters' }, '', { 'x-forwarded-for': '198.51.100.3' })).status, 429);
    });
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});

test('persistent identities survive 50000 registrations, restart, and multiple connections', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'almost-security-'));
  const databasePath = path.join(dir, 'store.sqlite');
  const store = createEntitlementsStore({ databasePath });
  assert.equal(store.verifyOrRegisterInstallSecret('victim', 'original').ok, true);
  // Bulk load another connection to reproduce cache pressure efficiently, without weakening durability.
  const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
  const bulk = new DatabaseSync(databasePath);
  bulk.exec('BEGIN');
  const insert = bulk.prepare('INSERT INTO identities VALUES (?, ?)');
  for (let i = 0; i < 50000; i++) insert.run(`install-${i}`, 'test-hash');
  bulk.exec('COMMIT'); bulk.close();
  assert.equal(store.verifyOrRegisterInstallSecret('victim', 'attacker').ok, false);
  store.commitPurchase('victim', ['lifetime-purchase'], { isPremium: true });
  store.close();
  const reopened = createEntitlementsStore({ databasePath });
  const worker = createEntitlementsStore({ databasePath });
  assert.equal(worker.verifyOrRegisterInstallSecret('victim', 'attacker').ok, false);
  assert.equal(reopened.verifyOrRegisterInstallSecret('victim', 'original').ok, true);
  assert.throws(() => worker.commitPurchase('attacker', ['lifetime-purchase'], { isPremium: true }), /reused_transaction/);
  assert.equal(reopened.getSeenTransaction('lifetime-purchase').appUserId, 'victim');
  assert.equal(reopened.consumeRateLimit('shared-ip', 1, 60000).allowed, true);
  assert.equal(worker.consumeRateLimit('shared-ip', 1, 60000).allowed, false);
  reopened.close(); worker.close(); fs.rmSync(dir, { recursive: true });
});

test('legacy JSON migration preserves hashes and entitlements and never replaces current state', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'almost-migration-'));
  const legacyPath = path.join(dir, 'legacy.json');
  const databasePath = path.join(dir, 'new.sqlite');
  fs.writeFileSync(legacyPath, JSON.stringify({ version: 1, entitlementByUser: { legacy: { isPremium: true, transactionId: 'old-transaction' } },
    installSecretBindings: [['legacy', { secretHash: crypto.createHash('sha256').update('legacy-secret').digest('base64url') }]], seenTransactions: [] }));
  let store = createEntitlementsStore({ databasePath, legacyPath });
  assert.equal(store.verifyOrRegisterInstallSecret('legacy', 'legacy-secret').ok, true);
  assert.equal(store.getSeenTransaction('old-transaction').appUserId, 'legacy');
  store.upsertEntitlement('legacy', { isPremium: false }); store.close();
  store = createEntitlementsStore({ databasePath, legacyPath });
  assert.equal(store.getEntitlementByUser('legacy').isPremium, false);
  store.close(); fs.rmSync(dir, { recursive: true });
});

test('corrupt migration fails closed', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'almost-corrupt-'));
  const legacyPath = path.join(dir, 'bad.json'); fs.writeFileSync(legacyPath, '{bad');
  assert.throws(() => createEntitlementsStore({ legacyPath }), SyntaxError);
  fs.rmSync(dir, { recursive: true });
});

test('Pub/Sub verifies audience and service account identity', async () => {
  config.google.webhook.audience = 'https://example.invalid/webhook';
  config.google.webhook.serviceAccountEmail = 'push@example.invalid';
  const verifier = email => ({ verifyIdToken: async options => {
    assert.equal(options.audience, config.google.webhook.audience);
    return { getPayload: () => ({ email, email_verified: true, iss: 'https://accounts.google.com' }) };
  } });
  assert.equal(await verifyGooglePush('Bearer synthetic', verifier('push@example.invalid')), true);
  assert.equal(await verifyGooglePush('Bearer synthetic', verifier('other@example.invalid')), false);
  assert.equal(await verifyGooglePush('', verifier('push@example.invalid')), false);
});

test('production startup rejects disabled proof, missing webhook auth, and volatile databases', () => {
  const script = `const {assertSecureStartupConfig}=await import('./src/server.js'); assertSecureStartupConfig();`;
  for (const override of [{ REQUIRE_INSTALL_SECRET_PROOF: '0' }, { STORE_DATABASE_PATH: ':memory:' }, { GOOGLE_RTDN_SECRET: '' }]) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd: path.resolve(import.meta.dirname, '..'), encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'production', STORE_DATABASE_PATH: '/tmp/not-opened-by-startup-check.sqlite', GOOGLE_RTDN_SECRET: 'configured', ...override },
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /insecure_startup_config/);
  }
  assertSecureStartupConfig();
});

test('expired stored subscriptions fail closed even before a delayed webhook', () => {
  const store = createEntitlementsStore();
  store.upsertEntitlement('expired', { isPremium: true, expiresDate: '2001-01-01T00:00:00Z' });
  assert.equal(store.getEntitlementByUser('expired').isPremium, false);
  store.close();
});

test('expired RevenueCat entitlement with null grace does not grant access', async () => {
  const { verifyRevenueCatOwnership } = await import('../src/validators/ownership.js');
  const response = await verifyRevenueCatOwnership({ appUserId: 'test-user', platform: 'android', productId: 'almost_premium_monthly', transactionIds: ['order'] }, async () => ({
    ok: true, json: async () => ({ subscriber: {
      entitlements: { premium: { product_identifier: 'almost_premium_monthly', expires_date: '2001-01-01T00:00:00Z', grace_period_expires_date: null } },
      subscriptions: { almost_premium_monthly: { store: 'play_store', store_transaction_id: 'order', expires_date: '2001-01-01T00:00:00Z' } },
    } }),
  }));
  assert.equal(response.ok, true);
  assert.equal(response.validation.isActive, false);
});

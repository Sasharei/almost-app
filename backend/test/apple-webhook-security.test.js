import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

Object.assign(process.env, {
  NODE_ENV: 'test', DOTENV_CONFIG_PATH: '/dev/null', STORE_PATH: '', STORE_DATABASE_PATH: ':memory:', APPLE_ENVIRONMENT: 'sandbox', APPLE_BUNDLE_ID: 'audit.example',
  APPLE_WEBHOOK_VERIFY_SIGNATURE: '1', APPLE_WEBHOOK_REQUIRE_VERIFIED: '1',
  APPLE_ROOT_CA_PATHS: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../certs/AppleRootCA-G3.cer'),
});
const { SignedDataVerifier } = await import('@apple/app-store-server-library');
let notificationType = 'TEST';
let transactionId = 'unknown-test-order';
const future = Date.now() + 3600000;
SignedDataVerifier.prototype.verifyAndDecodeNotification = async signed => {
  if (signed === 'invalid-signed-notification') throw new Error('synthetic_signature_rejection');
  return { notificationType, notificationUUID: 'synthetic-uuid',
    data: notificationType === 'TEST' ? {} : { signedTransactionInfo: 'synthetic-transaction' } };
};
SignedDataVerifier.prototype.verifyAndDecodeTransaction = async () => ({
  transactionId, originalTransactionId: transactionId, productId: 'almost_premium_monthly',
  appAccountToken: 'unverified-user-hint', expiresDate: future,
});
const { app } = await import('../src/server.js');
const { config } = await import('../src/config.js');
const { markTransactionSeen, getSeenTransaction, getEntitlementByUser } = await import('../src/store/entitlementsStore.js');

await test('Apple notification authentication and ownership with synthetic verifier responses', async t => {
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const send = async (signedPayload = 'synthetic-signed-notification') => {
    const response = await fetch(base + '/v1/webhooks/apple', { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify({ signedPayload, appUserId: 'unverified-user-hint' }),
      signal: AbortSignal.timeout(3000) });
    return { status: response.status, data: await response.json() };
  };
  try {
    await t.test('invalid signatures are rejected without a custom shared-secret header', async () => {
      assert.equal((await send('invalid-signed-notification')).status, 401);
      assert.equal(getEntitlementByUser('unverified-user-hint'), null);
    });
    await t.test('verified TEST notifications are acknowledged without entitlement mutation', async () => {
      const result = await send();
      assert.equal(result.status, 202); assert.equal(result.data.trusted, true); assert.equal(result.data.mapped, false);
      assert.equal(getEntitlementByUser('unverified-user-hint'), null);
    });
    await t.test('unknown transactions cannot bind ownership using request or appAccountToken hints', async () => {
      notificationType = 'DID_RENEW';
      const result = await send();
      assert.equal(result.status, 202); assert.equal(result.data.mapped, false);
      assert.equal(getSeenTransaction(transactionId), null);
      assert.equal(getEntitlementByUser('unverified-user-hint'), null);
    });
    await t.test('verified renewals update the established owner and retries preserve ownership', async () => {
      transactionId = 'known-test-order'; markTransactionSeen(transactionId, 'verified-test-owner');
      for (let i = 0; i < 2; i++) {
        const result = await send(); assert.equal(result.status, 200); assert.equal(result.data.entitlement.isPremium, true);
        assert.equal(result.data.entitlement.appUserId, 'verified-test-owner');
        assert.equal(getSeenTransaction(transactionId).appUserId, 'verified-test-owner');
      }
    });
    await t.test('refund and expired notifications override a future expiry', async () => {
      for (notificationType of ['REFUND', 'REVOKE', 'EXPIRED']) {
        const result = await send(); assert.equal(result.status, 200); assert.equal(result.data.entitlement.isPremium, false);
      }
    });
    await t.test('canceling renewal retains the already paid period', async () => {
      notificationType = 'DID_CHANGE_RENEWAL_STATUS';
      assert.equal((await send()).data.entitlement.isPremium, true);
    });
    await t.test('a disabled verifier cannot turn an unsigned payload into a trusted webhook', async () => {
      config.apple.webhook.verifySignature = false;
      try {
        const unsigned = `x.${Buffer.from(JSON.stringify({ notificationType: 'TEST' })).toString('base64url')}.x`;
        assert.equal((await send(unsigned)).status, 401);
      } finally { config.apple.webhook.verifySignature = true; }
    });
  } finally { await new Promise(resolve => server.close(resolve)); }
});

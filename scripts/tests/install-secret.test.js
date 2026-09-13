const assert = require('node:assert/strict');
const test = require('node:test');
const { loadInstallSecret } = require('../../src/monetization/installSecretStorage');
const fixture = (legacy = null) => {
  let secure = null;
  let removed = false;
  return {
    args: { readSecure: async () => secure, writeSecure: async value => { secure = value; }, readLegacy: async () => legacy,
      removeLegacy: async () => { removed = true; }, randomBytes: async () => new Uint8Array(32).fill(171) },
    state: () => ({ secure, removed }),
  };
};
test('legacy credential is migrated unchanged, verified, then removed from AsyncStorage', async () => {
  const f = fixture('legacy-install-secret-exactly-as-registered');
  assert.equal(await loadInstallSecret(f.args), 'legacy-install-secret-exactly-as-registered');
  assert.deepEqual(f.state(), { secure: 'legacy-install-secret-exactly-as-registered', removed: true });
});
test('short legacy credential is not silently rotated', async () => {
  const f = fixture('legacy-short');
  assert.equal(await loadInstallSecret(f.args), 'legacy-short');
});
test('secure storage failure never deletes legacy value or sends a new credential', async () => {
  const f = fixture('legacy');
  f.args.writeSecure = async () => { throw new Error('device locked'); };
  await assert.rejects(loadInstallSecret(f.args), /device locked/);
  assert.equal(f.state().removed, false);
});
test('readback failure retains legacy value', async () => {
  const f = fixture('legacy');
  f.args.writeSecure = async () => {};
  await assert.rejects(loadInstallSecret(f.args), /write_unverified/);
  assert.equal(f.state().removed, false);
});
test('new credential is 32 native random bytes and is stable on retry', async () => {
  const f = fixture();
  const secret = await loadInstallSecret(f.args);
  assert.equal(secret, 'ab'.repeat(32));
  f.args.randomBytes = async () => { throw new Error('must not regenerate'); };
  assert.equal(await loadInstallSecret(f.args), secret);
});
test('unavailable secure random source fails without Math.random fallback', async () => {
  const f = fixture();
  f.args.randomBytes = async () => { throw new Error('random unavailable'); };
  await assert.rejects(loadInstallSecret(f.args), /random unavailable/);
  assert.equal(f.state().secure, null);
});
test('cleanup failure returns the durable credential and retries cleanup later', async () => {
  const f = fixture('legacy');
  f.args.removeLegacy = async () => { throw new Error('storage unavailable'); };
  assert.equal(await loadInstallSecret(f.args), 'legacy');
  assert.equal(await loadInstallSecret(f.args), 'legacy');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
process.env.DOTENV_CONFIG_PATH = '/dev/null';
test('email configuration is owner-only, CSRF protected, secret write-only, atomic and tested before enable', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'almost-mail-api-'));
  process.env.SUGGESTIONS_DATABASE_PATH = path.join(directory, 'board.sqlite');
  const { registerSuggestionsAdmin } =
    await import('../src/suggestionsAdmin.js');
  const { getSuggestionsStore, closeSuggestionsStore } =
    await import('../src/suggestions.js');
  const { createAdminCredentials, issueAdminSession, adminCsrf } =
    await import('../src/auth/suggestionsAdmin.js');
  const { emailConfigPath } = await import('../src/suggestionEmail.js');
  const config = await createAdminCredentials('test1234');
  fs.writeFileSync(
    process.env.SUGGESTIONS_DATABASE_PATH + '.admin.json',
    JSON.stringify(config),
  );
  const token = issueAdminSession(config);
  getSuggestionsStore().adminSession(
    crypto.createHash('sha256').update(token).digest('hex'),
    Number(token.split('.')[0]),
  );
  let sends = 0,
    fail = true,
    wakes = 0;
  const app = express();
  app.use(express.json());
  registerSuggestionsAdmin(app, (req, res, next) => next(), {
    wakeEmail: () => {
      wakes++;
    },
    sendEmail: async () => {
      sends++;
      if (fail) throw new Error('synthetic provider failure');
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (
    body,
    { owner = true, csrf = true, origin = base } = {},
  ) => {
    const response = await fetch(base + '/admin/suggestions/api/email', {
      method: body ? 'POST' : 'GET',
      headers: {
        origin,
        ...(owner ? { cookie: `almost_suggestions_admin=${token}` } : {}),
        ...(csrf ? { 'x-admin-csrf': adminCsrf(token, config) } : {}),
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    assert.equal((await call(null, { owner: false })).status, 401);
    assert.equal(
      (await call({ enabled: true, password: 'a'.repeat(16) }, { csrf: false }))
        .status,
      403,
    );
    assert.equal(
      (
        await call(
          { enabled: true, password: 'a'.repeat(16) },
          { origin: 'https://attacker.invalid' },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await call({
          enabled: true,
          password: 'a'.repeat(16),
          recipient: 'attacker@example.com',
        })
      ).status,
      400,
    );
    assert.equal(
      (await call({ enabled: true, password: 'wrong' })).status,
      400,
    );
    const file = emailConfigPath(process.env.SUGGESTIONS_DATABASE_PATH);
    assert.equal(
      (await call({ enabled: true, password: 'a'.repeat(16) })).status,
      503,
    );
    assert.equal(fs.existsSync(file), false);
    fail = false;
    assert.equal(
      (
        await call({
          enabled: true,
          password: 'aaaa aaaa aaaa aaaa',
          locale: 'ru',
        })
      ).status,
      200,
    );
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    const state = await call(null);
    assert.equal(state.body.enabled, true);
    assert.equal(state.body.recipient, 'almostappsup@gmail.com');
    assert.equal(state.body.password, undefined);
    assert.equal((await call({ enabled: false })).status, 200);
    assert.equal((await call(null)).body.enabled, false);
    assert.equal(sends, 2);
    assert.equal(wakes, 2);
  } finally {
    closeSuggestionsStore();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

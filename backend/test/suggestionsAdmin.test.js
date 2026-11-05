import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'almost-admin-test-'));
process.env.DOTENV_CONFIG_PATH = '/dev/null';
process.env.SUGGESTIONS_DATABASE_PATH = path.join(temp, 'ideas.sqlite');
const { registerSuggestionsAdmin } = await import('../src/suggestionsAdmin.js');
const { getSuggestionsStore, closeSuggestionsStore } =
  await import('../src/suggestions.js');
const {
  createAdminCredentials,
  issueAdminSession,
  verifyAdminSession,
  checkAdminPassword,
  adminConfigPath,
} = await import('../src/auth/suggestionsAdmin.js');

test('admin sessions expire, reject tampering and rotate without changing installation credentials', async () => {
  const first = await createAdminCredentials('synthetic-owner-password-0001');
  assert.equal(
    await checkAdminPassword('synthetic-owner-password-0001', first),
    true,
  );
  assert.equal(await checkAdminPassword('wrong-password', first), false);
  const token = issueAdminSession(first);
  assert.equal(verifyAdminSession(token, first), true);
  assert.equal(verifyAdminSession(token + 'x', first), false);
  assert.equal(
    verifyAdminSession(token, first, Date.now() + 9 * 60 * 60 * 1000),
    false,
  );
  assert.equal(
    verifyAdminSession(
      token,
      await createAdminCredentials('synthetic-owner-password-0002'),
    ),
    false,
  );
  await assert.rejects(createAdminCredentials('1234567'));
  const minimum = await createAdminCredentials('12345678');
  assert.equal(await checkAdminPassword('12345678', minimum), true);
});

test('private owner panel: one-time setup, CSRF, revision conflict, hidden recovery, complete queue and logout revocation', async () => {
  const app = express();
  app.use(express.json());
  registerSuggestionsAdmin(app, (req, res, next) => next());
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`,
    root = '/admin/suggestions/api/';
  let cookie = '',
    csrf = '';
  const call = async (
    route,
    {
      method = 'GET',
      body,
      origin = base,
      token = csrf,
      session = cookie,
    } = {},
  ) => {
    const r = await fetch(base + root + route, {
      method,
      headers: {
        ...(body ? { 'content-type': 'application/json' } : {}),
        origin,
        ...(session ? { cookie: session } : {}),
        ...(token ? { 'x-admin-csrf': token } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: r.status,
      body: await r.json(),
      cookie: r.headers.get('set-cookie'),
    };
  };
  try {
    const store = getSuggestionsStore();
    const created = store.create('synthetic-owner', {
      requestId: crypto.randomUUID(),
      title: '<img src=x onerror=alert(1)>',
      description: 'Synthetic unsafe text stays plain user content.',
      language: 'ru',
    });
    assert.equal((await call('ideas')).status, 401);
    const page = await fetch(base + '/admin/suggestions/');
    assert.equal(page.status, 200);
    assert.match(
      page.headers.get('content-security-policy'),
      /frame-ancestors 'none'/,
    );
    assert.equal(page.headers.get('cache-control'), 'no-store');
    const bootstrap = crypto.randomBytes(32).toString('hex');
    const file = adminConfigPath(process.env.SUGGESTIONS_DATABASE_PATH);
    fs.writeFileSync(
      file + '.setup',
      JSON.stringify({
        hash: crypto.createHash('sha256').update(bootstrap).digest('hex'),
        expires: Date.now() + 60000,
      }),
    );
    const body = { token: bootstrap, password: 'test1234' };
    assert.equal(
      (
        await call('setup', {
          method: 'POST',
          body,
          origin: 'https://attacker.invalid',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call('setup', {
          method: 'POST',
          body: { ...body, token: 'a'.repeat(64) },
        })
      ).status,
      403,
    );
    assert.equal(
      (await call('setup', {
        method: 'POST',
        body: { ...body, password: '1234567' },
      })).status,
      403,
    );
    const setup = await call('setup', { method: 'POST', body });
    assert.equal(setup.status, 200);
    cookie = setup.cookie.split(';')[0];
    csrf = setup.body.csrf;
    assert.match(setup.cookie, /HttpOnly/);
    assert.match(setup.cookie, /SameSite=Strict/);
    assert.equal(fs.statSync(file).mode & 0o777, 0o600);
    assert.equal((await call('setup', { method: 'POST', body })).status, 403);
    const list = await call('ideas?status=pending');
    assert.equal(list.body.total, 1);
    assert.equal(list.body.items[0].author, undefined);
    assert.equal(list.body.items[0].request_id, undefined);
    const route = `ideas/${created.id}/status`;
    assert.equal(
      (
        await call(route, {
          method: 'POST',
          body: { status: 'open', revision: 0 },
          token: '',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(route, {
          method: 'POST',
          body: { status: 'open', revision: 0 },
          origin: 'https://attacker.invalid',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(route, {
          method: 'POST',
          body: { status: 'open', revision: 0, author: 'injected' },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await call(route, {
          method: 'POST',
          body: { status: 'open', revision: 0 },
        })
      ).status,
      200,
    );
    assert.equal(store.list('another-user').items.length, 1);
    assert.equal(
      (
        await call(route, {
          method: 'POST',
          body: { status: 'hidden', revision: 0 },
        })
      ).status,
      409,
    );
    const detail = await call(`ideas/${created.id}`);
    assert.equal(detail.body.history[0].previousStatus, 'pending');
    assert.equal(detail.body.revision, 1);
    assert.equal(
      (
        await call(route, {
          method: 'POST',
          body: { status: 'hidden', revision: 1 },
        })
      ).status,
      200,
    );
    assert.equal((await call('ideas?status=hidden')).body.total, 1);
    assert.equal(
      (
        await call(route, {
          method: 'POST',
          body: { status: 'open', revision: 2 },
        })
      ).status,
      200,
    );
    for (let i = 0; i < 54; i++)
      store.create('seed-' + i, {
        requestId: crypto.randomUUID(),
        title: 'Synthetic idea ' + i,
        description: 'Maintained pagination regression fixture.',
        language: 'en',
      });
    const first = await call('ideas?status=all');
    assert.equal(first.body.items.length, 50);
    assert.equal(first.body.nextOffset, 50);
    const second = await call('ideas?status=all&offset=50');
    assert.equal(second.body.items.length, 5);
    assert.equal(second.body.nextOffset, null);
    const firstIds = new Set(first.body.items.map((row) => row.id));
    assert.equal(
      second.body.items.some((row) => firstIds.has(row.id)),
      false,
    );
    const oldCookie = cookie;
    assert.equal((await call('logout', { method: 'POST' })).status, 200);
    assert.equal((await call('session', { session: oldCookie })).status, 401);
    assert.equal(
      (await call('login', { method: 'POST', body: { password: 'incorrect' } }))
        .status,
      401,
    );
    assert.equal(
      (
        await call('login', {
          method: 'POST',
          body: { password: body.password },
        })
      ).status,
      200,
    );
  } finally {
    closeSuggestionsStore();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('production owner login uses canonical HTTPS origin behind TLS termination and sets Secure cookies', async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'almost-admin-proxy-'),
  );
  process.env.SUGGESTIONS_DATABASE_PATH = path.join(directory, 'ideas.sqlite');
  const file = adminConfigPath(process.env.SUGGESTIONS_DATABASE_PATH);
  fs.writeFileSync(
    file,
    JSON.stringify(
      await createAdminCredentials('synthetic-proxy-password-20261105'),
    ),
    { mode: 0o600 },
  );
  const oldEnvironment = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const app = express();
  app.use(express.json());
  registerSuggestionsAdmin(app, (req, res, next) => next());
  process.env.NODE_ENV = oldEnvironment;
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const login = (origin) =>
      fetch(base + '/admin/suggestions/api/login', {
        method: 'POST',
        headers: {
          origin,
          'content-type': 'application/json',
          'x-forwarded-proto': 'https',
        },
        body: JSON.stringify({ password: 'synthetic-proxy-password-20261105' }),
      });
    assert.equal((await login(base)).status, 403);
    const response = await login(
      'https://almost-monetization-backend.onrender.com',
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get('set-cookie'), /; Secure/);
  } finally {
    closeSuggestionsStore();
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

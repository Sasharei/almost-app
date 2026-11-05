import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { createSuggestionsStore } from '../src/store/suggestionsStore.js';
import {
  createSuggestionEmailWorker,
  buildSuggestionEmail,
  sendNotificationEmail,
  EMAIL_FROM,
  SUPPORT_EMAIL,
} from '../src/suggestionEmail.js';
import { messages } from '../admin/suggestions/i18n.js';
const proposal = () => ({
  requestId: crypto.randomUUID(),
  title: 'PRIVATE synthetic title',
  description: 'PRIVATE description never sent in an email.',
  language: 'ru',
});

test('transactional outbox deduplicates requests and survives leases, stale acknowledgements and restart', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'almost-mail-'));
  const file = path.join(directory, 'board.sqlite');
  let first, second;
  try {
    first = createSuggestionsStore(file);
    const payload = proposal(),
      item = first.create('PRIVATE-author', payload);
    first.create('PRIVATE-author', payload);
    assert.equal(first.emailStatus().pending, 1);
    const now = Date.now() + 10,
      job = first.claimEmail(now);
    second = createSuggestionsStore(file);
    assert.equal(second.claimEmail(now), null);
    first.close();
    first = null;
    const recovered = second.claimEmail(now + 60_001);
    assert.equal(recovered.id, item.id);
    assert.notEqual(recovered.lease, job.lease);
    second.finishEmail(job);
    assert.equal(second.emailStatus().pending, 1);
    second.finishEmail(recovered, 'delivery', now + 60_001);
    assert.equal(second.emailStatus().failed, 1);
    const due = second.nextEmailAt();
    assert.ok(due >= now + 111_001 && due <= now + 129_001);
    assert.equal(second.claimEmail(due - 1), null);
    const retry = second.claimEmail(due);
    assert.equal(retry.attempts, 1);
    second.finishEmail(retry, null, due);
    assert.equal(second.emailStatus().pending, 0);
    assert.equal(second.nextEmailAt(), null);
  } finally {
    first?.close();
    second?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('additive migration does not notify about pre-existing suggestions', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'almost-mail-old-'));
  const file = path.join(directory, 'board.sqlite');
  let store;
  try {
    store = createSuggestionsStore(file);
    store.close();
    store = null;
    const db = new DatabaseSync(file);
    db.prepare(
      'INSERT INTO suggestions(id,author,request_id,title,description,language,created_at) VALUES (?,?,?,?,?,?,?)',
    ).run(
      crypto.randomUUID(),
      'old-owner',
      crypto.randomUUID(),
      'Existing idea',
      'Pre-existing private content',
      'ru',
      Date.now(),
    );
    db.close();
    store = createSuggestionsStore(file);
    assert.equal(store.emailStatus().pending, 0);
  } finally {
    store?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('worker has one active delivery, no idle polling, retries only queued work, and cancels on shutdown', async () => {
  const store = createSuggestionsStore();
  let sent = 0,
    active = 0,
    maximum = 0,
    enabled = false;
  const timers = new Map();
  let sequence = 0,
    fail = true;
  const worker = createSuggestionEmailWorker({
    store,
    readConfig: () => ({ enabled }),
    setTimer: (fn, delay) => {
      const id = ++sequence;
      timers.set(id, { fn, delay });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
    send: async (message, signal) => {
      sent++;
      active++;
      maximum = Math.max(maximum, active);
      try {
        await new Promise((resolve, reject) => {
          if (fail) reject(new Error('synthetic failure'));
          else
            signal.addEventListener(
              'abort',
              () => reject(new Error('cancelled')),
              { once: true },
            );
        });
      } finally {
        active--;
      }
    },
  });
  try {
    worker.kick();
    await worker.settle();
    assert.equal(timers.size, 0);
    store.create('a', proposal());
    worker.kick();
    await worker.settle();
    assert.equal(sent, 0);
    enabled = true;
    worker.kick();
    worker.kick();
    await worker.settle();
    assert.equal(sent, 1);
    assert.equal(timers.size, 1);
    assert.ok([...timers.values()][0].delay >= 50_000);
    // An explicit kick cannot bypass the persisted retry deadline.
    worker.kick();
    await worker.settle();
    assert.equal(sent, 1);
    fail = false;
    store.create('b', proposal());
    worker.kick();
    await new Promise((resolve) => setImmediate(resolve));
    for (let i = 0; i < 8; i++) worker.kick();
    assert.equal(maximum, 1);
    assert.equal(active, 1);
    await worker.stop();
    assert.equal(active, 0);
    assert.equal(timers.size, 0);
  } finally {
    await worker.stop();
    store.close();
  }
});

test('already moderated or withdrawn ideas are suppressed and an empty queue leaves no timer', async () => {
  const store = createSuggestionsStore();
  let sends = 0;
  const worker = createSuggestionEmailWorker({
    store,
    readConfig: () => ({ enabled: true }),
    send: async () => {
      sends++;
    },
  });
  try {
    const item = store.create('a', proposal());
    store.withdraw('a', item.id);
    worker.kick();
    await worker.settle();
    assert.equal(sends, 0);
    assert.deepEqual(store.emailStatus(), {
      pending: 0,
      lastSentAt: null,
      failed: 0,
    });
    assert.equal(store.nextEmailAt(), null);
  } finally {
    await worker.stop();
    store.close();
  }
});

test('mail uses all supported locales, a direct owner link and no submitted text or installation identity', () => {
  const item = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    ...proposal(),
    author: 'PRIVATE-author',
  };
  for (const locale of Object.keys(messages)) {
    const mail = buildSuggestionEmail(item, locale),
      raw = JSON.stringify(mail);
    assert.deepEqual(mail.to, [SUPPORT_EMAIL]);
    assert.equal(mail.from, EMAIL_FROM);
    assert.ok(mail.text.includes('#' + item.id));
    assert.ok(mail.html.includes(messages[locale].mailOpen));
    assert.ok(!raw.includes('PRIVATE'));
    assert.ok(!/[\u2013\u2014]/.test(raw));
    assert.notEqual(mail.subject, buildSuggestionEmail(null, locale).subject);
  }
});

test('managed HTTPS sender uses fixed recipient, idempotency and validates provider acceptance', async () => {
  const item = { id: crypto.randomUUID(), createdAt: Date.now() };
  const message = buildSuggestionEmail(item, 'ru');
  let requests = 0;
  const request = async (url, options) => {
    requests++;
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.headers['Idempotency-Key'], `suggestion/${item.id}`);
    const body = JSON.parse(options.body);
    assert.deepEqual(body.to, [SUPPORT_EMAIL]);
    assert.equal(body.from, EMAIL_FROM);
    assert.equal(body.idempotencyKey, undefined);
    assert.equal(body.disableFileAccess, undefined);
    return {
      ok: true,
      status: 200,
      json: async () => ({ id: 'provider-message-001' }),
    };
  };
  assert.deepEqual(
    await sendNotificationEmail(message, null, {
      request,
      apiKey: 're_synthetic_key',
    }),
    { id: 'provider-message-001' },
  );
  assert.equal(requests, 1);
  await assert.rejects(
    sendNotificationEmail(message, null, {
      request: async () => ({
        ok: false,
        status: 403,
        json: async () => ({ message: 'synthetic rejection' }),
      }),
      apiKey: 're_synthetic_key',
    }),
    (error) => error.code === 'EAUTH',
  );
  await assert.rejects(
    sendNotificationEmail(message, null, { request, apiKey: '' }),
    /email_not_configured/,
  );
});

test('HTTPS deadline includes response body and external cancellation reaches the provider', async () => {
  for (const external of [false, true]) {
    const controller = new AbortController();
    let aborted = false;
    const request = async (url, { signal }) => ({
      ok: true,
      status: 200,
      json: () =>
        new Promise((resolve, reject) => {
          signal.addEventListener(
            'abort',
            () => {
              aborted = true;
              reject(new Error('cancelled'));
            },
            { once: true },
          );
        }),
    });
    const pending = sendNotificationEmail(
      buildSuggestionEmail(),
      controller.signal,
      { request, apiKey: 're_synthetic_key', timeoutMs: external ? 1000 : 20 },
    );
    if (external) queueMicrotask(() => controller.abort());
    await assert.rejects(pending);
    assert.equal(aborted, true);
  }
});

test('queued payload is frozen across restarts, retries and owner language changes', () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'almost-mail-payload-'),
  );
  const file = path.join(directory, 'board.sqlite');
  let store = createSuggestionsStore(file);
  try {
    const item = store.create('a', proposal());
    const now = Date.now() + 10;
    const job = store.claimEmail(now);
    const first = store.emailPayload(job, buildSuggestionEmail(item, 'ru'));
    store.finishEmail(job, 'delivery', now);
    const due = store.nextEmailAt();
    store.close();
    store = createSuggestionsStore(file);
    const retry = store.claimEmail(due);
    const second = store.emailPayload(retry, buildSuggestionEmail(item, 'de'));
    assert.deepEqual(second, first);
    assert.equal(second.subject, messages.ru.mailSubject);
  } finally {
    store.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

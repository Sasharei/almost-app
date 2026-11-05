import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import net from 'node:net';
import { DatabaseSync } from 'node:sqlite';
import { createSuggestionsStore } from '../src/store/suggestionsStore.js';
import {
  createSuggestionEmailWorker,
  buildSuggestionEmail,
  sendGmail,
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
    readConfig: () => ({ enabled, password: 'a'.repeat(16) }),
    setTimer: (fn, delay) => {
      const id = ++sequence;
      timers.set(id, { fn, delay });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
    send: async (password, message, signal) => {
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
    readConfig: () => ({ enabled: true, password: 'a'.repeat(16) }),
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
    assert.equal(mail.to, SUPPORT_EMAIL);
    assert.equal(mail.from.address, SUPPORT_EMAIL);
    assert.ok(mail.text.includes('#' + item.id));
    assert.ok(mail.html.includes(messages[locale].mailOpen));
    assert.ok(!raw.includes('PRIVATE'));
    assert.ok(!/[\u2013\u2014]/.test(raw));
    assert.notEqual(mail.subject, buildSuggestionEmail(null, locale).subject);
  }
});

test('real Nodemailer SMTP exchange has fixed support sender/recipient and a cancellable socket deadline', async () => {
  let envelope = '',
    data = false,
    wire = '',
    hang = false;
  const sockets = new Set();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    socket.write('220 synthetic SMTP\r\n');
    let buffer = '';
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      let at;
      while ((at = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, at);
        buffer = buffer.slice(at + 2);
        if (hang) continue;
        if (data) {
          wire += line + '\r\n';
          if (line === '.') {
            data = false;
            socket.write('250 accepted\r\n');
          }
          continue;
        }
        if (line.startsWith('EHLO'))
          socket.write('250-localhost\r\n250 AUTH PLAIN\r\n');
        else if (line.startsWith('AUTH')) socket.write('235 authenticated\r\n');
        else if (line.startsWith('DATA')) {
          data = true;
          socket.write('354 send data\r\n');
        } else if (line.startsWith('MAIL') || line.startsWith('RCPT')) {
          envelope += line;
          socket.write('250 ok\r\n');
        } else if (line === 'QUIT') {
          socket.end('221 bye\r\n');
        }
      }
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const connect = (options) => {
    assert.equal(options.host, 'smtp.gmail.com');
    assert.equal(options.port, 465);
    assert.equal(options.rejectUnauthorized, true);
    const socket = net.connect(server.address().port, '127.0.0.1');
    socket.once('connect', () => socket.emit('secureConnect'));
    return socket;
  };
  try {
    await sendGmail('a'.repeat(16), buildSuggestionEmail(), null, {
      connect,
      timeoutMs: 2000,
    });
    assert.ok(envelope.includes(`FROM:<${SUPPORT_EMAIL}>`));
    assert.ok(envelope.includes(`TO:<${SUPPORT_EMAIL}>`));
    assert.ok(wire.includes('text/plain'));
    hang = true;
    await assert.rejects(
      sendGmail('a'.repeat(16), buildSuggestionEmail(), null, {
        connect,
        timeoutMs: 30,
      }),
    );
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  }
});

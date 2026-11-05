import fs from 'node:fs';
import crypto from 'node:crypto';
import tls from 'node:tls';
import nodemailer from 'nodemailer';
import { messages } from '../admin/suggestions/i18n.js';

export const SUPPORT_EMAIL = 'almostappsup@gmail.com';
export const PANEL_URL =
  'https://almost-monetization-backend.onrender.com/admin/suggestions/';
export const emailConfigPath = (databasePath) => `${databasePath}.email.json`;
export const readEmailConfig = (file) => {
  if (!fs.existsSync(file)) return { enabled: false };
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (typeof value.enabled !== 'boolean' || !/^[a-z]{16}$/.test(value.password))
    throw new Error('email_config');
  return value;
};
export const writeEmailConfig = (file, value) => {
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temp, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
    fs.renameSync(temp, file);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
};
export const buildSuggestionEmail = (item = null, locale = 'ru') => {
  const t = messages[locale] || messages.ru;
  const subject = item ? t.mailSubject : t.mailTestSubject;
  const lines = item
    ? [
        t.mailNew,
        `${t.mailIdea}: ${item.id}`,
        `${t.mailDate}: ${new Date(item.createdAt).toISOString()}`,
      ]
    : [t.mailTest];
  const url = item ? `${PANEL_URL}#${item.id}` : PANEL_URL;
  const text = [
    ...lines,
    '',
    t.mailOpen,
    url,
    '',
    t.mailPrivacy,
    '',
    `${t.emailSettings}: ${PANEL_URL}`,
  ].join('\n');
  const escape = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (char) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[char],
    );
  const html = `<!doctype html><html lang="${escape(locale)}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}"><body style="margin:0;padding:28px;background:#f5f6fa;font:16px/1.6 Arial,sans-serif;color:#1f2230"><main style="max-width:580px;margin:auto;padding:28px;background:white;border:1px solid #dde1ea;border-radius:12px"><p style="font-weight:bold">Almost · ${escape(t.title)}</p><h1 style="font-size:24px;line-height:1.3">${escape(subject)}</h1>${lines.map((line) => `<p>${escape(line)}</p>`).join('')}<p style="margin:28px 0"><a href="${escape(url)}" style="display:inline-block;padding:12px 20px;background:#485ed7;color:white;border-radius:8px;text-decoration:none">${escape(t.mailOpen)}</a></p><p>${escape(t.mailPrivacy)}</p><p><a href="${PANEL_URL}">${escape(t.emailSettings)}</a></p></main></body></html>`;
  return {
    from: { name: `Almost · ${t.title}`, address: SUPPORT_EMAIL },
    to: SUPPORT_EMAIL,
    subject,
    text,
    html,
    ...(item
      ? { messageId: `<suggestion.${item.id}@notifications.almostapp.com>` }
      : {}),
    disableFileAccess: true,
    disableUrlAccess: true,
  };
};

// One connection per operation. The socket is owned here so timeout/shutdown can
// abort the entire SMTP exchange, including authentication and message upload.
export const sendGmail = async (
  password,
  message,
  signal,
  {
    connect = tls.connect,
    createTransport = nodemailer.createTransport,
    timeoutMs = 20_000,
  } = {},
) => {
  let socket, callbackPending;
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, timeoutMs);
  const cancelled = () => {
    const error = new Error('email_cancelled');
    error.code = 'ECANCELLED';
    socket?.destroy(error);
    callbackPending?.(error);
  };
  controller.signal.addEventListener('abort', cancelled, { once: true });
  let transport;
  try {
    transport = createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: SUPPORT_EMAIL, pass: password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      dnsTimeout: 10_000,
      logger: false,
      debug: false,
      getSocket(options, callback) {
        let called = false;
        const done = (error, value) => {
          if (called) return;
          called = true;
          callbackPending = null;
          callback(error, value);
        };
        callbackPending = done;
        if (controller.signal.aborted || signal?.aborted)
          return done(new Error('email_cancelled'));
        socket = connect({
          host: 'smtp.gmail.com',
          port: 465,
          servername: 'smtp.gmail.com',
          rejectUnauthorized: true,
        });
        socket.once('error', (error) => done(error));
        socket.once('secureConnect', () =>
          done(null, { connection: socket, secured: true }),
        );
      },
    });
    if (signal?.aborted) controller.abort();
    const result = await transport.sendMail(message);
    if (!result.accepted?.includes(SUPPORT_EMAIL))
      throw new Error('email_rejected');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
    controller.signal.removeEventListener('abort', cancelled);
    transport?.close();
    socket?.destroy();
  }
};

export const createSuggestionEmailWorker = ({
  store,
  readConfig,
  send = sendGmail,
  now = Date.now,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
}) => {
  let timer = null,
    running = null,
    stopped = false,
    active = null,
    internalFailure = false;
  const clear = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };
  const schedule = () => {
    clear();
    if (stopped || !readConfig().enabled) return;
    const at = store.nextEmailAt();
    if (at !== null) {
      timer = setTimer(
        () => {
          timer = null;
          kick();
        },
        Math.max(internalFailure ? 60_000 : 0, at - now()),
      );
      timer?.unref?.();
    }
  };
  const drain = async () => {
    while (!stopped) {
      const config = readConfig();
      if (!config.enabled) break;
      const job = store.claimEmail(now());
      if (!job) break;
      // The owner/author may already have processed or withdrawn a queued idea.
      if (job.status !== 'pending') {
        store.finishEmail(job, null, now(), false);
        continue;
      }
      active = new AbortController();
      try {
        await send(
          config.password,
          buildSuggestionEmail(job, config.locale),
          active.signal,
        );
        store.finishEmail(job, null, now());
      } catch (error) {
        store.finishEmail(
          job,
          error.code === 'EAUTH' ? 'authentication' : 'delivery',
          now(),
        );
      } finally {
        active = null;
      }
    }
  };
  const kick = () => {
    if (stopped) return;
    if (running) {
      try {
        if (!readConfig().enabled) active?.abort();
      } catch {}
      return;
    }
    clear();
    internalFailure = false;
    running = Promise.resolve()
      .then(drain)
      .catch(() => {
        // Storage/config errors remain visible to the authenticated status API.
        // Avoid a timer loop against a corrupt/unavailable local store.
        internalFailure = true;
      })
      .finally(() => {
        running = null;
        try {
          schedule();
        } catch {
          /* recovered on restart/configuration */
        }
      });
  };
  return {
    kick,
    async settle() {
      await running;
    },
    async stop() {
      stopped = true;
      clear();
      active?.abort();
      await running;
    },
  };
};

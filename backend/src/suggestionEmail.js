import fs from 'node:fs';
import crypto from 'node:crypto';
import { messages } from '../admin/suggestions/i18n.js';

export const SUPPORT_EMAIL = 'almostappsup@gmail.com';
export const EMAIL_FROM = 'Almost <suggestions@notify.almsotapp.com>';
export const isEmailConfigured = () =>
  /^re_[A-Za-z0-9_-]{8,}$/.test(process.env.SUGGESTIONS_EMAIL_API_KEY || '');
export const PANEL_URL =
  'https://almost-monetization-backend.onrender.com/admin/suggestions/';
export const emailConfigPath = (databasePath) => `${databasePath}.email.json`;
export const readEmailConfig = (file) => {
  if (!fs.existsSync(file)) return { enabled: false };
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (
    typeof value.enabled !== 'boolean' ||
    'password' in value ||
    'apiKey' in value
  )
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
    from: EMAIL_FROM,
    to: [SUPPORT_EMAIL],
    reply_to: SUPPORT_EMAIL,
    subject,
    text,
    html,
    idempotencyKey: item
      ? `suggestion/${item.id}`
      : `test/${crypto.randomUUID()}`,
  };
};

// One request, including response body, owns a deadline and cancellation signal.
// Queued payload and idempotency key remain unchanged across retries/restarts.
export const sendNotificationEmail = async (
  message,
  signal,
  {
    request = fetch,
    apiKey = process.env.SUGGESTIONS_EMAIL_API_KEY,
    timeoutMs = 20_000,
  } = {},
) => {
  if (!/^re_[A-Za-z0-9_-]{8,}$/.test(apiKey || ''))
    throw new Error('email_not_configured');
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  const timer = setTimeout(cancel, timeoutMs);
  try {
    const { idempotencyKey, ...body } = message;
    const response = await request('https://api.resend.com/emails', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok || typeof result.id !== 'string') {
      const error = new Error('email_delivery');
      error.code = [401, 403].includes(response.status) ? 'EAUTH' : 'EPROVIDER';
      throw error;
    }
    return { id: result.id };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
};

export const createSuggestionEmailWorker = ({
  store,
  readConfig,
  send = sendNotificationEmail,
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
        const message = store.emailPayload(
          job,
          buildSuggestionEmail(job, config.locale),
        );
        await send(message, active.signal);
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

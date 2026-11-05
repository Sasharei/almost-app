import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { z } from 'zod';
import {
  getSuggestionsStore,
  suggestionsDatabasePath,
  kickSuggestionEmail,
} from './suggestions.js';
import {
  emailConfigPath,
  readEmailConfig,
  writeEmailConfig,
  sendNotificationEmail,
  isEmailConfigured,
  buildSuggestionEmail,
  SUPPORT_EMAIL,
} from './suggestionEmail.js';
import { SUGGESTION_STATUSES } from './store/suggestionsStore.js';
import { languages } from '../admin/suggestions/i18n.js';
import {
  adminConfigPath,
  readAdminCredentials,
  createAdminCredentials,
  checkAdminPassword,
  issueAdminSession,
  verifyAdminSession,
  adminCsrf,
} from './auth/suggestionsAdmin.js';
const root = '/admin/suggestions';
const cookie = 'almost_suggestions_admin';
const sessionHash = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');
const assets = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../admin/suggestions',
);
export const registerSuggestionsAdmin = (
  app,
  loginLimiter,
  { sendEmail = sendNotificationEmail, wakeEmail = kickSuggestionEmail } = {},
) => {
  let passwordChecks = 0;
  // Render terminates TLS before the legacy server. Do not alter global proxy trust.
  const adminOrigin =
    process.env.SUGGESTIONS_ADMIN_ORIGIN ||
    (process.env.NODE_ENV === 'test'
      ? null
      : 'https://almost-monetization-backend.onrender.com');
  const credentials = () =>
    readAdminCredentials(adminConfigPath(suggestionsDatabasePath()));
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'test',
    sameSite: 'strict',
    path: root,
    maxAge: 8 * 60 * 60 * 1000,
  };
  app.use(root, (req, res, next) => {
    res.set({
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      'Cross-Origin-Resource-Policy': 'same-origin',
    });
    next();
  });
  const sameOrigin = (req, res, next) => {
    if (
      req.get('origin') !==
      (adminOrigin || `${req.protocol}://${req.get('host')}`)
    )
      return res.status(403).json({ error: 'origin' });
    next();
  };
  const auth = (req, res, next) => {
    try {
      const token = (req.get('cookie') || '')
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(`${cookie}=`))
        ?.slice(cookie.length + 1);
      const config = credentials();
      if (
        !verifyAdminSession(token, config) ||
        !getSuggestionsStore().adminSession(sessionHash(token))
      )
        return res.status(401).json({ error: 'login' });
      req.suggestionsAdmin = { token, config };
      next();
    } catch {
      return res.status(503).json({ error: 'unavailable' });
    }
  };
  const csrf = (req, res, next) => {
    const { token, config } = req.suggestionsAdmin;
    if (req.get('x-admin-csrf') !== adminCsrf(token, config))
      return res.status(403).json({ error: 'csrf' });
    next();
  };
  const safe = (fn) => (req, res) => {
    try {
      fn(req, res);
    } catch (error) {
      res
        .status(error.status || 503)
        .json({ error: error.status ? error.message : 'unavailable' });
    }
  };
  app.post(`${root}/api/setup`, loginLimiter, sameOrigin, async (req, res) => {
    try {
      const file = adminConfigPath(suggestionsDatabasePath());
      const parsed = z
        .object({
          token: z.string().regex(/^[a-f0-9]{64}$/),
          password: z.string().min(8).max(256),
        })
        .strict()
        .safeParse(req.body);
      const setup = () => JSON.parse(fs.readFileSync(`${file}.setup`, 'utf8'));
      if (!parsed.success || fs.existsSync(file))
        return res.status(403).json({ error: 'setup' });
      const proof = crypto
        .createHash('sha256')
        .update(parsed.data.token)
        .digest('hex');
      const valid = () => {
        const value = setup();
        return value.expires > Date.now() && value.hash === proof;
      };
      if (!valid()) return res.status(403).json({ error: 'setup' });
      const config = await createAdminCredentials(parsed.data.password);
      if (!valid()) return res.status(403).json({ error: 'setup' });
      fs.writeFileSync(file, JSON.stringify(config), {
        mode: 0o600,
        flag: 'wx',
      });
      fs.unlinkSync(`${file}.setup`);
      const token = issueAdminSession(config);
      getSuggestionsStore().adminSession(
        sessionHash(token),
        Number(token.split('.')[0]),
      );
      res
        .cookie(cookie, token, options)
        .json({ csrf: adminCsrf(token, config) });
    } catch {
      return res.status(403).json({ error: 'setup' });
    }
  });
  app.post(`${root}/api/login`, loginLimiter, sameOrigin, async (req, res) => {
    let checking = false;
    try {
      const parsed = z
        .object({ password: z.string().min(8).max(256) })
        .strict()
        .safeParse(req.body);
      const config = credentials();
      if (!config) return res.status(503).json({ error: 'not_configured' });
      if (passwordChecks >= 4) {
        res.set('Retry-After', '5');
        return res.status(429).json({ error: 'login_rate_limited' });
      }
      checking = true;
      passwordChecks += 1;
      if (
        !parsed.success ||
        !(await checkAdminPassword(parsed.data.password, config))
      )
        return res.status(401).json({ error: 'password' });
      const token = issueAdminSession(config);
      getSuggestionsStore().adminSession(
        sessionHash(token),
        Number(token.split('.')[0]),
      );
      res
        .cookie(cookie, token, options)
        .json({ csrf: adminCsrf(token, config) });
    } catch {
      return res.status(503).json({ error: 'unavailable' });
    } finally {
      if (checking) passwordChecks -= 1;
    }
  });
  app.get(`${root}/api/session`, auth, (req, res) =>
    res.json({
      csrf: adminCsrf(req.suggestionsAdmin.token, req.suggestionsAdmin.config),
    }),
  );
  let configuringEmail = false;
  app.get(
    `${root}/api/email`,
    auth,
    safe((req, res) => {
      const value = readEmailConfig(emailConfigPath(suggestionsDatabasePath()));
      res.json({
        enabled: value.enabled,
        configured: isEmailConfigured(),
        recipient: SUPPORT_EMAIL,
        ...getSuggestionsStore().emailStatus(),
      });
    }),
  );
  app.post(
    `${root}/api/email`,
    sameOrigin,
    auth,
    csrf,
    loginLimiter,
    async (req, res) => {
      if (configuringEmail) return res.status(409).json({ error: 'busy' });
      const parsed = z
        .object({
          enabled: z.boolean(),
          locale: z.enum(Object.keys(languages)).default('ru'),
        })
        .strict()
        .safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'request' });
      const controller = new AbortController();
      const cancel = () => {
        if (!res.writableEnded) controller.abort();
      };
      res.once('close', cancel);
      configuringEmail = true;
      try {
        const file = emailConfigPath(suggestionsDatabasePath());
        if (parsed.data.enabled && !isEmailConfigured())
          return res.status(503).json({ error: 'email_not_configured' });
        if (parsed.data.enabled)
          await sendEmail(
            buildSuggestionEmail(null, parsed.data.locale),
            controller.signal,
          );
        writeEmailConfig(file, {
          enabled: parsed.data.enabled,
          locale: parsed.data.locale,
        });
        wakeEmail();
        res.json({ ok: true, enabled: parsed.data.enabled });
      } catch {
        res.status(503).json({ error: 'email_delivery' });
      } finally {
        configuringEmail = false;
        res.off('close', cancel);
      }
    },
  );
  app.post(
    `${root}/api/logout`,
    sameOrigin,
    auth,
    csrf,
    safe((req, res) => {
      getSuggestionsStore().adminSession(
        sessionHash(req.suggestionsAdmin.token),
        0,
      );
      res
        .clearCookie(cookie, { ...options, maxAge: undefined })
        .json({ ok: true });
    }),
  );
  app.get(
    `${root}/api/ideas`,
    auth,
    safe((req, res) => {
      const parsed = z
        .object({
          status: z.enum([...SUGGESTION_STATUSES, 'all']).default('pending'),
          query: z.string().trim().max(120).default(''),
          offset: z.coerce.number().int().min(0).max(1000000).default(0),
          reported: z.enum(['0', '1']).default('0'),
          sort: z.enum(['oldest', 'newest', 'top']).default('oldest'),
        })
        .strict()
        .safeParse(req.query);
      if (!parsed.success) return res.status(400).json({ error: 'request' });
      res.json(
        getSuggestionsStore().adminList({
          ...parsed.data,
          reported: parsed.data.reported === '1',
        }),
      );
    }),
  );
  app.get(
    `${root}/api/ideas/:id`,
    auth,
    safe((req, res) => {
      if (!z.string().uuid().safeParse(req.params.id).success)
        return res.status(400).json({ error: 'request' });
      res.json(getSuggestionsStore().adminDetail(req.params.id));
    }),
  );
  app.post(
    `${root}/api/ideas/:id/status`,
    sameOrigin,
    auth,
    csrf,
    safe((req, res) => {
      const parsed = z
        .object({
          status: z.enum(SUGGESTION_STATUSES),
          revision: z.number().int().nonnegative(),
        })
        .strict()
        .safeParse(req.body);
      if (
        !parsed.success ||
        !z.string().uuid().safeParse(req.params.id).success
      )
        return res.status(400).json({ error: 'request' });
      res.json(
        getSuggestionsStore().adminModerate(
          req.params.id,
          parsed.data.status,
          parsed.data.revision,
        ),
      );
    }),
  );
  app.use(`${root}/api`, (req, res) =>
    res.status(404).json({ error: 'not_found' }),
  );
  app.get(root, (req, res) => res.sendFile(path.join(assets, 'index.html')));
  app.use(root, express.static(assets, { index: false, fallthrough: false }));
};

import { messages, languages } from './i18n.js';
import { setupEmailSettings } from './email-settings.js';
const $ = (id) => document.getElementById(id);
const statuses = [
  'pending',
  'open',
  'planned',
  'in_progress',
  'done',
  'closed',
  'hidden',
];
let locale = localStorage.getItem('almost-admin-language') || 'ru';
if (!messages[locale]) locale = 'ru';
let theme =
  localStorage.getItem('almost-admin-theme') ||
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
if (!['light', 'dark', 'pro'].includes(theme)) theme = 'light';
let csrf = '',
  folder = 'pending',
  offset = 0,
  nextOffset = null,
  query = '',
  selected = null,
  detail = null,
  counts = {},
  busy = false,
  undo = null,
  uncertainId = null;
let listRequest = null,
  detailRequest = null;
let setupToken = location.hash.startsWith('#setup=')
  ? location.hash.slice(7)
  : '';
if (setupToken) history.replaceState(null, '', location.pathname);
const t = (key) => messages[locale][key];
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
};
const action = (text, handler, className = 'quiet') => {
  const button = node('button', text, className);
  button.type = 'button';
  button.onclick = handler;
  return button;
};
const date = (value) =>
  new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
const number = (value) => new Intl.NumberFormat(locale).format(value);
const publicStatus = (status) => !['pending', 'hidden'].includes(status);
function operationBusy(value) {
  busy = value;
  document
    .querySelectorAll(
      '.sidebar button,.sidebar input,.inbox button,.inbox input,.inbox select,#logout,#language',
    )
    .forEach((element) => (element.disabled = value));
  if (!value) {
    $('previous').disabled = offset === 0;
    $('next').disabled = nextOffset === null;
  }
}
const notice = (key, previous = null) => {
  undo = previous;
  $('notice').hidden = false;
  $('notice').querySelector('span').textContent = t(key);
  $('undo').hidden = !previous;
};
function localize() {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dataset.theme = theme;
  document.title = `Almost · ${t('workspace')}`;
  document
    .querySelectorAll('[data-t]')
    .forEach((element) => (element.textContent = t(element.dataset.t)));
  $('language').replaceChildren(
    ...Object.entries(languages).map(
      ([key, value]) => new Option(value, key, false, key === locale),
    ),
  );
  $('theme').replaceChildren(
    ...['light', 'dark', 'pro'].map(
      (key) => new Option(t(key), key, false, key === theme),
    ),
  );
  const sort = $('sort').value || 'oldest';
  $('sort').replaceChildren(
    ...['oldest', 'newest', 'top'].map(
      (key) => new Option(t(key), key, false, key === sort),
    ),
  );
  $('search').placeholder = t('search');
  $('folders').ariaLabel = t('status');
  document.querySelector('.inbox').ariaLabel = t('title');
  $('detail').ariaLabel = t('choose');
  renderFolders();
  if (detail) renderDetail(detail);
  if (setupToken) {
    document.querySelector('#login h1').textContent = t('createPassword');
    document.querySelector('#login .muted').textContent = t('setupIntro');
    $('login-form').querySelector('button').textContent = t('createPassword');
    $('password').autocomplete = 'new-password';
    if (!$('confirm-password')) {
      const label = node('label');
      label.htmlFor = 'confirm-password';
      const input = node('input');
      input.id = 'confirm-password';
      input.type = 'password';
      input.autocomplete = 'new-password';
      input.required = true;
      input.minLength = 8;
      input.maxLength = 256;
      $('login-form').insertBefore(
        label,
        $('login-form').querySelector('button'),
      );
      $('login-form').insertBefore(
        input,
        $('login-form').querySelector('button'),
      );
    }
    document.querySelector('label[for=confirm-password]').textContent =
      t('confirmPassword');
    if (!$('password-rules')) {
      const rules = node('p', t('passwordRules'), 'muted');
      rules.id = 'password-rules';
      $('login-form').after(rules);
    }
    $('password-rules').textContent = t('passwordRules');
  }
}
function renderFolders() {
  $('folders').replaceChildren(
    ...[
      'pending',
      'open',
      'planned',
      'in_progress',
      'done',
      'closed',
      'hidden',
      'all',
    ].map((status) => {
      const button = action(
        '',
        () => {
          if (busy) return;
          folder = status;
          offset = 0;
          selected = null;
          loadList();
        },
        'folder',
      );
      button.disabled = busy;
      button.append(
        node('span', t(status)),
        node(
          'span',
          number(
            status === 'all'
              ? Object.values(counts).reduce((a, b) => a + b, 0)
              : counts[status] || 0,
          ),
        ),
      );
      button.setAttribute('aria-current', String(folder === status));
      return button;
    }),
  );
  $('folder-title').textContent = t(folder);
}
const controllers = new Set();
async function api(
  path,
  { method = 'GET', body, signal, timeoutMs = 12000 } = {},
) {
  const controller = new AbortController();
  controllers.add(controller);
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  let timedOut = false;
  const deadline = setTimeout(() => {
    timedOut = true;
    cancel();
  }, timeoutMs);
  try {
    const response = await fetch(`/admin/suggestions/api/${path}`, {
      method,
      credentials: 'same-origin',
      signal: controller.signal,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(method !== 'GET' && csrf ? { 'X-Admin-CSRF': csrf } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || 'error');
      error.status = response.status;
      throw error;
    }
    return result;
  } catch (error) {
    if (timedOut) {
      const failure = new Error('timeout');
      failure.name = 'TimeoutError';
      throw failure;
    }
    throw error;
  } finally {
    clearTimeout(deadline);
    signal?.removeEventListener('abort', cancel);
    controllers.delete(controller);
  }
}
function showLogin(message) {
  csrf = '';
  detail = null;
  uncertainId = null;
  selected = null;
  listRequest?.abort();
  detailRequest?.abort();
  $('board').hidden = true;
  $('login').hidden = false;
  $('logout').hidden = true;
  $('email-settings').hidden = true;
  $('startup').hidden = true;
  $('list').replaceChildren();
  $('detail').replaceChildren();
  $('notice').hidden = true;
  $('login-error').textContent = message ? t(message) : '';
}
function handleError(error, target) {
  if (error.name === 'AbortError') return;
  if (error.status === 401) {
    showLogin('expired');
    return;
  }
  target.textContent = t(
    error.name === 'TimeoutError'
      ? 'timeout'
      : error.status === 409
        ? 'changed'
        : 'error',
  );
  target.hidden = false;
}
function skeleton() {
  return Array.from({ length: 3 }, () => {
    const element = node('div', undefined, 'skeleton');
    element.setAttribute('aria-hidden', 'true');
    return element;
  });
}
async function loadList() {
  detailRequest?.abort();
  listRequest?.abort();
  const controller = new AbortController();
  listRequest = controller;
  $('list').ariaBusy = 'true';
  $('list-error').hidden = true;
  $('list').replaceChildren(...skeleton());
  $('previous').disabled = true;
  $('next').disabled = true;
  renderFolders();
  try {
    const result = await api(
      `ideas?${new URLSearchParams({ status: folder, query, offset: String(offset), reported: $('reported').checked ? '1' : '0', sort: $('sort').value })}`,
      { signal: controller.signal },
    );
    if (controller.signal.aborted) return;
    counts = result.counts;
    offset = result.offset;
    nextOffset = result.nextOffset;
    renderFolders();
    $('range').textContent = result.total
      ? `${number(offset + 1)} - ${number(offset + result.items.length)} / ${number(result.total)}`
      : number(0);
    $('previous').disabled = offset === 0;
    $('next').disabled = nextOffset === null;
    $('list').replaceChildren(
      ...result.items.map((item) => {
        const button = action('', () => openDetail(item.id, true), 'idea');
        button.disabled = busy;
        button.setAttribute('aria-pressed', String(selected === item.id));
        button.dataset.id = item.id;
        const top = node('div', undefined, 'idea-top');
        top.append(
          node('span', t(item.status)),
          node('time', date(item.createdAt)),
        );
        const title = node('h3', item.title);
        title.dir = 'auto';
        const excerpt = node('p', item.description, 'excerpt');
        excerpt.dir = 'auto';
        const bottom = node('div', undefined, 'idea-bottom');
        bottom.append(node('span', `${t('votes')}: ${number(item.score)}`));
        if (item.reports)
          bottom.append(
            node('span', `${t('reports')}: ${number(item.reports)}`, 'reports'),
          );
        button.append(top, title, excerpt, bottom);
        return button;
      }),
    );
    if (!result.items.length) {
      const empty = node('div', undefined, 'empty');
      empty.append(node('h3', t('empty')), node('p', t('emptyHelp'), 'muted'));
      $('list').append(empty);
    }
    if (selected && result.items.some((item) => item.id === selected))
      await openDetail(selected, false);
    else if (!matchMedia('(max-width:850px)').matches && result.items[0])
      await openDetail(result.items[0].id, false);
    else if (!selected) renderEmpty();
  } catch (error) {
    if (!controller.signal.aborted) {
      handleError(error, $('list-error'));
      $('list').replaceChildren();
      $('list').append(action(t('retry'), loadList, 'secondary'));
    }
  } finally {
    if (listRequest === controller) {
      $('list').ariaBusy = 'false';
      listRequest = null;
    }
  }
}
function renderEmpty() {
  detail = null;
  $('detail').replaceChildren();
  const empty = node('div', undefined, 'detail-empty');
  empty.append(node('h2', t('choose')), node('p', t('chooseHelp'), 'muted'));
  $('detail').append(empty);
}
async function openDetail(id, navigate) {
  if (busy) return;
  detailRequest?.abort();
  const controller = new AbortController();
  detailRequest = controller;
  selected = id;
  if (navigate) {
    history.pushState({ idea: id }, '', `#${id}`);
    $('board').classList.add('show-detail');
  }
  document
    .querySelectorAll('.idea')
    .forEach((element) =>
      element.setAttribute('aria-pressed', String(element.dataset.id === id)),
    );
  $('detail').replaceChildren(...skeleton());
  try {
    const item = await api(`ideas/${encodeURIComponent(id)}`, {
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    detail = item;
    if (uncertainId === id) uncertainId = null;
    renderDetail(item);
    if (navigate) $('idea-title').focus({ preventScroll: true });
  } catch (error) {
    if (!controller.signal.aborted) {
      $('detail').replaceChildren(action(t('back'), back));
      const message = node('p', undefined, 'message error');
      message.role = 'alert';
      $('detail').append(message);
      handleError(error, message);
      $('detail').append(
        action(t('retry'), () => openDetail(id, false), 'secondary'),
      );
    }
  } finally {
    if (detailRequest === controller) detailRequest = null;
  }
}
function back() {
  detailRequest?.abort();
  $('board').classList.remove('show-detail');
  if (location.hash && history.state?.idea) history.back();
  else history.replaceState(null, '', location.pathname);
  selected = null;
  detail = null;
  document
    .querySelectorAll('.idea')
    .forEach((element) => element.setAttribute('aria-pressed', 'false'));
  $('folder-title').focus({ preventScroll: true });
}
function renderDetail(item) {
  const root = $('detail');
  root.replaceChildren(action(t('back'), back, 'quiet back'));
  const head = node('div', undefined, 'detail-head');
  const badge = node('span', t(item.status), 'badge');
  badge.dataset.status = item.status;
  head.append(badge);
  root.append(head);
  const title = node('h2', item.title);
  title.id = 'idea-title';
  title.tabIndex = -1;
  title.dir = 'auto';
  root.append(title);
  const meta = node('div', undefined, 'meta');
  meta.append(
    node('time', date(item.createdAt)),
    node('span', languages[item.language] || item.language),
  );
  root.append(meta);
  const description = node('p', item.description, 'description');
  description.dir = 'auto';
  root.append(description);
  const signals = node('div', undefined, 'signals');
  for (const [value, label] of [
    [item.score, t('votes')],
    [item.up, '+1'],
    [item.down, '-1'],
    [item.reports, t('reports')],
  ]) {
    const cell = node('div');
    cell.append(node('strong', number(value)), document.createTextNode(label));
    if (label === t('reports') && value) cell.className = 'reports';
    signals.append(cell);
  }
  root.append(signals);
  const form = node('form', undefined, 'moderate');
  const label = node('label', t('status'));
  label.htmlFor = 'new-status';
  const select = node('select');
  select.id = 'new-status';
  const target = item.status === 'pending' ? 'open' : item.status;
  select.append(
    ...statuses.map(
      (status) => new Option(t(status), status, false, status === target),
    ),
  );
  const button = node(
    'button',
    t(item.status === 'pending' ? 'approve' : 'save'),
    'primary',
  );
  button.type = 'submit';
  const row = node('div', undefined, 'save-row');
  row.append(select, button);
  const visibility = node(
    'p',
    t(publicStatus(target) ? 'publicHelp' : 'privateHelp'),
    'visibility',
  );
  const error = node('p', undefined, 'message error');
  error.role = 'alert';
  error.hidden = true;
  const update = () => {
    button.textContent = t(
      item.status === 'pending' && select.value === 'open' ? 'approve' : 'save',
    );
    button.disabled =
      busy || uncertainId === item.id || select.value === item.status;
    select.disabled = busy || uncertainId === item.id;
    visibility.textContent = t(
      publicStatus(select.value) ? 'publicHelp' : 'privateHelp',
    );
  };
  select.onchange = update;
  update();
  form.append(label, row, visibility, error);
  form.onsubmit = (event) => {
    event.preventDefault();
    saveStatus(item, select.value, error);
  };
  root.append(form);
  const history = node('section', undefined, 'history');
  history.append(node('h3', t('history')));
  if (!item.history.length) history.append(node('p', t('noHistory'), 'muted'));
  else {
    const list = node('ol');
    for (const entry of item.history) {
      const li = node('li');
      li.append(
        node('span', `${t(entry.previousStatus)} → ${t(entry.status)}`),
        document.createTextNode(date(entry.createdAt)),
      );
      list.append(li);
    }
    history.append(list);
  }
  root.append(history);
}
async function saveStatus(item, status, error, allowUndo = true) {
  if (busy) return;
  operationBusy(true);
  renderDetail(item);
  try {
    await api(`ideas/${item.id}/status`, {
      method: 'POST',
      body: { status, revision: item.revision },
    });
    notice('saved', allowUndo ? { id: item.id, status: item.status } : null);
    await loadList();
    if (selected !== item.id) {
      selected = item.id;
      await api(`ideas/${item.id}`).then((value) => {
        detail = value;
        renderDetail(value);
      });
    } else {
      detail = await api(`ideas/${item.id}`);
      renderDetail(detail);
    }
  } catch (failure) {
    uncertainId = item.id;
    const target = $('detail').querySelector('[role=alert]') || error;
    handleError(failure, target);
    if (failure.status === 409) {
      $('detail').append(
        action(t('refresh'), () => openDetail(item.id, false), 'primary'),
      );
    }
  } finally {
    operationBusy(false);
    if (detail) renderDetailWithError(detail, error);
  }
}
function renderDetailWithError(item, oldError) {
  const current = $('detail').querySelector('[role=alert]');
  const message =
    current && !current.hidden ? current.textContent : oldError.textContent;
  renderDetail(item);
  if (message) {
    const target = $('detail').querySelector('[role=alert]');
    target.hidden = false;
    target.textContent = message;
    $('detail').append(
      action(t('refresh'), () => openDetail(item.id, false), 'primary'),
    );
  }
}
$('login-form').onsubmit = async (event) => {
  event.preventDefault();
  const button = event.submitter;
  if (
    setupToken &&
    ($('password').value.length < 8 ||
      $('password').value !== $('confirm-password').value)
  ) {
    $('login-error').textContent = t('passwordRules');
    return;
  }
  button.disabled = true;
  $('login-error').textContent = '';
  try {
    const result = await api(setupToken ? 'setup' : 'login', {
      method: 'POST',
      body: {
        password: $('password').value,
        ...(setupToken ? { token: setupToken } : {}),
      },
    });
    csrf = result.csrf;
    $('password').value = '';
    if ($('confirm-password')) {
      $('confirm-password').value = '';
      $('confirm-password').remove();
      document.querySelector('label[for=confirm-password]').remove();
    }
    setupToken = '';
    $('password-rules')?.remove();
    localize();
    $('login').hidden = true;
    $('board').hidden = false;
    $('logout').hidden = false;
    $('email-settings').hidden = false;
    await loadList();
    if (location.hash.length === 37) {
      $('board').classList.add('show-detail');
      await openDetail(location.hash.slice(1), false);
    }
  } catch (error) {
    $('login-error').textContent = t(
      error.name === 'TimeoutError'
        ? 'timeout'
        : error.status === 429
          ? 'rateLimit'
          : setupToken
            ? 'setupError'
            : error.message === 'not_configured'
              ? 'notConfigured'
              : error.status === 401
                ? 'wrongPassword'
                : 'error',
    );
  } finally {
    button.disabled = false;
  }
};
$('logout').onclick = async () => {
  if (busy) return;
  try {
    await api('logout', { method: 'POST' });
    showLogin();
  } catch (error) {
    notice('error');
  }
};
$('search-form').onsubmit = (event) => {
  event.preventDefault();
  if (busy) return;
  query = $('search').value.trim();
  offset = 0;
  selected = null;
  loadList();
};
$('sort').onchange = () => {
  if (busy) return;
  offset = 0;
  loadList();
};
$('reported').onchange = () => {
  if (busy) return;
  offset = 0;
  selected = null;
  loadList();
};
$('refresh').onclick = () => {
  if (!busy) loadList();
};
$('previous').onclick = () => {
  if (busy) return;
  offset = Math.max(0, offset - 50);
  loadList();
};
$('next').onclick = () => {
  if (busy) return;
  if (nextOffset !== null) {
    offset = nextOffset;
    loadList();
  }
};
$('language').onchange = (event) => {
  locale = event.target.value;
  localStorage.setItem('almost-admin-language', locale);
  localize();
  if (csrf) loadList();
};
$('theme').onchange = (event) => {
  theme = event.target.value;
  localStorage.setItem('almost-admin-theme', theme);
  document.documentElement.dataset.theme = theme;
};
$('dismiss-notice').onclick = () => {
  $('notice').hidden = true;
  undo = null;
};
$('undo').onclick = async () => {
  if (!undo || busy) return;
  const previous = undo;
  try {
    const item = await api(`ideas/${previous.id}`);
    detail = item;
    selected = item.id;
    await saveStatus(item, previous.status, node('p'), false);
  } catch (error) {
    notice('error');
  }
};
addEventListener('popstate', () => {
  if (location.hash.length === 37) {
    $('board').classList.add('show-detail');
    openDetail(location.hash.slice(1), false);
  } else back();
});
addEventListener('pagehide', () => {
  for (const controller of controllers) controller.abort();
});
localize();
setupEmailSettings({ api, t });
try {
  const session = await api('session');
  csrf = session.csrf;
  setupToken = '';
  localize();
  $('startup').hidden = true;
  $('board').hidden = false;
  $('logout').hidden = false;
  $('email-settings').hidden = false;
  await loadList();
  if (location.hash.length === 37) {
    $('board').classList.add('show-detail');
    await openDetail(location.hash.slice(1), false);
  }
} catch (error) {
  showLogin(error.status === 401 ? null : 'error');
}

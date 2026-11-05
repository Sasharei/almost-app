export function setupEmailSettings({ api, t }) {
  const $ = (id) => document.getElementById(id);
  const dialog = $('email-dialog');
  let controller = null,
    configured = false,
    saving = false,
    stateKnown = false;
  const show = (value) => {
    configured = value.configured;
    $('email-credentials').open = !configured;
    $('email-state').textContent = t(
      value.enabled ? 'emailEnabled' : 'emailDisabled',
    );
    if (value.failed) $('email-state').textContent += ' · ' + t('emailError');
    $('email-disable').hidden = !value.enabled;
    $('email-save').textContent = t(
      value.configured ? 'emailTest' : 'emailConnect',
    );
    $('email-password').required = !value.configured;
  };
  const load = async () => {
    stateKnown = false;
    controller = new AbortController();
    $('email-state').textContent = t('loading');
    $('email-save').disabled = true;
    $('email-disable').disabled = true;
    $('email-reload').hidden = true;
    try {
      show(await api('email', { signal: controller.signal }));
      stateKnown = true;
      $('email-save').disabled = false;
      $('email-disable').disabled = false;
    } catch (error) {
      if (error.name !== 'AbortError') {
        $('email-feedback').textContent = t('emailError');
        $('email-reload').hidden = false;
      }
    }
  };
  $('email-settings').onclick = () => {
    $('email-feedback').textContent = '';
    dialog.showModal();
    load();
  };
  $('email-close').onclick = () => dialog.close();
  $('email-reload').onclick = load;
  dialog.addEventListener('close', () => {
    controller?.abort();
    $('email-password').value = '';
    $('email-settings').focus();
  });
  const save = async (enabled) => {
    if (saving) return;
    const password = $('email-password').value.replace(/\s/g, '');
    if (
      enabled &&
      ((!configured && !password) ||
        (password && !/^[a-z]{16}$/.test(password)))
    ) {
      $('email-feedback').textContent = t('emailHelp');
      return;
    }
    saving = true;
    stateKnown = false;
    controller?.abort();
    controller = new AbortController();
    $('email-save').disabled = true;
    $('email-disable').disabled = true;
    $('email-password').value = '';
    $('email-feedback').textContent = t('loading');
    try {
      await api('email', {
        method: 'POST',
        body: {
          enabled,
          ...(password ? { password } : {}),
          locale: document.documentElement.lang,
        },
        signal: controller.signal,
        timeoutMs: 25000,
      });
      $('email-feedback').textContent = t(
        enabled ? 'emailSent' : 'emailPaused',
      );
      await load();
    } catch (error) {
      if (error.name !== 'AbortError') {
        $('email-feedback').textContent = t('emailError');
        $('email-reload').hidden = false;
      }
    } finally {
      saving = false;
      $('email-save').disabled = !stateKnown;
      $('email-disable').disabled = !stateKnown;
    }
  };
  $('email-form').onsubmit = (event) => {
    event.preventDefault();
    save(true);
  };
  $('email-disable').onclick = () => save(false);
}

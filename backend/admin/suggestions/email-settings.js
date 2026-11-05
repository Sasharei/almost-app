export function setupEmailSettings({ api, t }) {
  const $ = (id) => document.getElementById(id);
  const dialog = $('email-dialog');
  let controller = null,
    configured = false,
    saving = false,
    stateKnown = false;
  const show = (value) => {
    configured = value.configured;
    $('email-state').textContent = t(
      !configured
        ? 'emailNotReady'
        : value.enabled
          ? 'emailEnabled'
          : 'emailDisabled',
    );
    if (value.failed) $('email-state').textContent += ' · ' + t('emailError');
    $('email-disable').hidden = !value.enabled;
    $('email-save').textContent = t('emailTest');
    $('email-reload').hidden = configured;
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
      $('email-save').disabled = !configured;
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
    $('email-settings').focus();
  });
  const save = async (enabled) => {
    if (saving) return;
    saving = true;
    stateKnown = false;
    controller?.abort();
    controller = new AbortController();
    $('email-save').disabled = true;
    $('email-disable').disabled = true;
    $('email-feedback').textContent = t('loading');
    try {
      await api('email', {
        method: 'POST',
        body: {
          enabled,
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
      $('email-save').disabled = !stateKnown || !configured;
      $('email-disable').disabled = !stateKnown;
    }
  };
  $('email-form').onsubmit = (event) => {
    event.preventDefault();
    save(true);
  };
  $('email-disable').onclick = () => save(false);
}

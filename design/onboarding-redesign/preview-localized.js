(() => {
  const ASSET_PATH = "./assets/";
  const localeOptions = window.ONBOARDING_LOCALES;
  const copyByLanguage = window.ONBOARDING_COPY;
  const query = new URLSearchParams(window.location.search);
  if (query.get("gallery") === "1") document.body.classList.add("gallery-mode");
  let activeLocale = localeOptions.some((item) => item.id === query.get("locale"))
    ? query.get("locale")
    : "ru";

  const arrow = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`;
  const back = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>`;
  const close = "×";
  const icons = {
    pulse: `<svg viewBox="0 0 24 24"><path d="M3 12h4l2.2-5 4.1 10 2.1-5H21"/></svg>`,
    lock: `<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>`,
    tune: `<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>`,
    plane: `<svg viewBox="0 0 24 24"><path d="M3 11l18-7-7 18-3-7-8-4zM11 15l4-4"/></svg>`,
    laptop: `<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="11" rx="2"/><path d="M3 19h18"/></svg>`,
    spark: `<svg viewBox="0 0 24 24"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8L18 16z"/></svg>`,
    jar: `<svg viewBox="0 0 24 24"><path d="M7 4h10M8 4v3l-2 3v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8l-2-3V4M8 13h8"/></svg>`,
    star: `<svg viewBox="0 0 24 24"><path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3z"/></svg>`,
    home: `<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9h-6v-6h-4v6H4v-9z"/></svg>`,
    palette: `<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h4a4 4 0 0 0 4-4c0-3.3-4-6-9-6z"/><path d="M7 10h.01M9 6h.01M14 6h.01M18 9h.01"/></svg>`
  };

  const personas = [
    ["coffee", "mindful_coffee", "#f4e5d7"],
    ["smoking", "habit_smoking", "#dff3e7"],
    ["beauty", "glam_beauty", "#f9deea"],
    ["gamer", "gamer_loot", "#dce8ff"],
    ["delivery", "foodie_delivery", "#ffe8d1"],
    ["online", "online_impulse", "#e5e7ff"],
    ["home", "home_picks", "#e1f1df"],
    ["anime", "anime_fan", "#e9e0ff"],
    ["subscriptions", "sub_lover", "#dff4ec"],
    ["fashion", "fashion_fan", "#ffe2d8"]
  ];
  const personaAccents = {
    mindful_coffee: "#b68a67",
    habit_smoking: "#6ab98b",
    glam_beauty: "#d77aa8",
    gamer_loot: "#6f8ce6",
    foodie_delivery: "#e69a58",
    online_impulse: "#7c83de",
    home_picks: "#78aa70",
    anime_fan: "#9278d4",
    sub_lover: "#58ad91",
    fashion_fan: "#db816d"
  };

  const localeMeta = () => localeOptions.find((item) => item.id === activeLocale) || localeOptions[0];
  const activeCopy = () => copyByLanguage[localeMeta().copy];
  const escapeHTML = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
  const resolvePath = (source, path) => path.split(".").reduce((value, key) => value?.[key], source);
  const interpolate = (value, variables = {}) => String(value).replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? `{{${key}}}`);
  const t = (path, variables = {}) => interpolate(resolvePath(activeCopy(), path) ?? resolvePath(copyByLanguage.ru, path) ?? path, variables);
  const punctuation = () => ["zh", "ja"].includes(localeMeta().copy) ? "。" : ".";

  const statusBar = `<div class="status-bar"><span>9:41</span><span class="status-icons"><i></i><i></i></span></div>`;
  const stepbar = (step, hasBack = true, canSkip = false) => `<div class="stepbar"><button class="icon-button ${hasBack ? "" : "ghost"}" aria-label="Back">${back}</button><div class="progress">${[1, 2, 3, 4].map((item) => `<i class="${item < step ? "done" : item === step ? "current" : ""}"></i>`).join("")}</div>${canSkip ? `<button class="step-skip fit-one-line" data-max-font="10" data-min-font="7">${escapeHTML(t("common.skip"))}</button>` : "<span></span>"}<div class="step-count fit-one-line" data-max-font="10" data-min-font="7">${escapeHTML(t("common.step", { step }))}</div></div>`;
  const dock = (label = t("common.continue"), secondary = "") => `<div class="dock"><button class="primary-button fit-one-line" data-max-font="14" data-min-font="8">${escapeHTML(label)}${arrow}</button>${secondary ? `<button class="secondary-button fit-one-line" data-max-font="14" data-min-font="8">${escapeHTML(secondary)}</button>` : ""}</div>`;
  const phone = (inner, className = "") => {
    const meta = localeMeta();
    return `<div class="phone"><section class="screen ${className}" lang="${meta.id}" dir="${meta.dir}" data-locale="${meta.id}">${statusBar}${inner}</section></div>`;
  };
  const caption = (number, title, note) => `<div class="mockup-caption"><strong>${number}. ${title}</strong><span>${note}</span></div>`;

  const languageScreen = () => {
    const meta = localeMeta();
    const currencies = ["SAR", "USD", "EUR", "AED", "GBP"];
    return phone(`${stepbar(1, false)}<div class="content tight"><div class="hero language"><img src="${ASSET_PATH}hero-language.png" alt="" aria-hidden="true" /></div><div class="screen-copy language-copy"><h2 class="fit-one-line" data-max-font="28" data-min-font="15">${escapeHTML(t("language.title"))}</h2><p class="fit-one-line" data-max-font="11" data-min-font="7">${escapeHTML(t("language.subtitle"))}</p></div><div class="section-label">${escapeHTML(t("language.appLanguage"))}</div><div class="language-grid">${localeOptions.map((item) => `<button class="chip fit-one-line ${item.id === meta.id ? "selected" : ""}" data-locale-choice="${item.id}" data-max-font="11" data-min-font="7">${item.label}</button>`).join("")}</div><div class="section-label">${escapeHTML(t("language.currency"))}</div><div class="currency-row">${currencies.map((currency) => `<button class="chip ${currency === meta.currency ? "selected" : ""}">${currency}</button>`).join("")}</div><p class="legal-hint"><span>${escapeHTML(t("language.legalPrefix"))}</span> <button class="inline-link">${escapeHTML(t("language.terms"))}</button>${punctuation()}</p></div>${dock()}`);
  };

  const privacyScreen = () => phone(`${stepbar(2)}<div class="content"><div class="hero privacy"><img src="${ASSET_PATH}hero-privacy.png" alt="" aria-hidden="true" /></div><div class="screen-copy privacy-copy"><h2 class="fit-one-line" data-max-font="27" data-min-font="14">${escapeHTML(t("privacy.title"))}</h2><p class="fit-one-line" data-max-font="11" data-min-font="7">${escapeHTML(t("privacy.subtitle"))}</p></div><div class="privacy-panel"><div class="privacy-item"><div class="privacy-icon">${icons.pulse}</div><div><strong>${escapeHTML(t("privacy.stabilityTitle"))}</strong><span>${escapeHTML(t("privacy.stabilityBody"))}</span></div></div><div class="privacy-item"><div class="privacy-icon">${icons.tune}</div><div><strong>${escapeHTML(t("privacy.featuresTitle"))}</strong><span>${escapeHTML(t("privacy.featuresBody"))}</span></div></div><div class="privacy-item"><div class="privacy-icon">${icons.lock}</div><div><strong>${escapeHTML(t("privacy.financeTitle"))}</strong><span>${escapeHTML(t("privacy.financeBody"))}</span></div></div></div><p class="privacy-note fit-one-line" data-max-font="9.5" data-min-font="6.5">${escapeHTML(t("privacy.note"))}</p></div>${dock(t("privacy.allow"), t("privacy.decline"))}`);

  const personaCards = (list = personas.slice(0, 4), selected = "mindful_coffee") => list.map(([file, id, wash]) => `<div class="persona-option" style="--persona-wash:${wash};--persona-accent:${personaAccents[id]}"><button class="persona-card ${id === selected ? "selected" : ""}" data-persona="${id}"><img src="${ASSET_PATH}persona-${file}.png" alt="" aria-hidden="true" /><span>${escapeHTML(t(`persona.profiles.${id}`))}</span><i class="persona-check">✓</i></button></div>`).join("");

  const personaScreen = (all = false) => {
    const content = all ? personas : personas.slice(0, 4);
    const subtitleClass = all
      ? `class="multiline-subtitle fit-two-lines" data-max-font="11" data-min-font="7.5"`
      : `class="fit-one-line" data-max-font="13" data-min-font="7"`;
    return phone(`${stepbar(3, true, true)}<div class="content ${all ? "all-personas" : "persona-overview"}"><div class="screen-copy"><h2 class="fit-one-line" data-max-font="28" data-min-font="15">${escapeHTML(t(all ? "persona.allTitle" : "persona.title"))}</h2><p ${subtitleClass}>${escapeHTML(t(all ? "persona.allSubtitle" : "persona.subtitle"))}</p></div><div class="section-label">${escapeHTML(t("persona.address"))}</div><div class="gender-row"><button class="chip selected fit-one-line" data-max-font="10" data-min-font="7">${escapeHTML(t("persona.female"))}</button><button class="chip fit-one-line" data-max-font="10" data-min-font="7">${escapeHTML(t("persona.male"))}</button><button class="chip fit-one-line" data-max-font="10" data-min-font="6.5">${escapeHTML(t("persona.unspecified"))}</button></div><div class="section-label">${escapeHTML(t("persona.scenario"))}</div><div class="persona-grid">${personaCards(content)}</div>${all ? "" : `<button class="show-all"><span class="fit-one-line" data-max-font="12" data-min-font="7">${escapeHTML(t("persona.showAll"))}</span><b class="fit-one-line" data-max-font="11" data-min-font="7">${escapeHTML(t("persona.more"))}</b></button>`}</div>${dock()}`);
  };

  const goalCard = (icon, titlePath, amount, selected = false, wash = "#eeebff") => {
    const title = t(titlePath);
    return `<button class="goal-card ${selected ? "selected" : ""}" style="--goal-wash:${wash}" data-goal-title="${escapeHTML(title)}" data-goal-value="${escapeHTML(amount)}"><span class="goal-icon">${icon}</span><strong>${escapeHTML(title)}</strong><small>${escapeHTML(t("goal.example", { amount }))}</small></button>`;
  };
  const goalScreen = (selected = false) => {
    const currency = localeMeta().currency;
    const amounts = { travel: `${currency} 5 000`, tech: `${currency} 3 000`, joy: `${currency} 900`, save: `${currency} 2 000` };
    return phone(`${stepbar(4)}<div class="content" ${selected ? "" : "data-goal-interactive"}><div class="hero goals"><img src="${ASSET_PATH}hero-goals.png" alt="" aria-hidden="true" /></div><div class="screen-copy"><h2>${escapeHTML(t(selected ? "goal.amountTitle" : "goal.title"))}</h2><p class="fit-one-line" data-max-font="13" data-min-font="7">${escapeHTML(t(selected ? "goal.amountSubtitle" : "goal.subtitle"))}</p></div><div class="goal-grid">${goalCard(icons.plane, "goal.travel", amounts.travel, selected, "#dfe9ff")}${goalCard(icons.laptop, "goal.tech", amounts.tech, false, "#e6e3ff")}${goalCard(icons.spark, "goal.joy", amounts.joy, selected, "#ffe8d6")}${goalCard(icons.jar, "goal.save", amounts.save, false, "#dff4e9")}</div>${selected ? `<div class="goal-amounts"><div class="goal-amount-row"><div><strong>${escapeHTML(t("goal.travel"))}</strong><span>${escapeHTML(t("goal.target"))}</span></div><input class="amount-field" value="${amounts.travel}" readonly /></div><div class="goal-amount-row"><div><strong>${escapeHTML(t("goal.joy"))}</strong><span>${escapeHTML(t("goal.target"))}</span></div><input class="amount-field" value="${amounts.joy}" readonly /></div></div>` : `<button class="show-all custom-goal-button"><span class="fit-one-line" data-max-font="12" data-min-font="7">${escapeHTML(t("goal.custom"))}</span><b>＋</b></button>`}</div>${dock(selected ? t("goal.finish") : t("common.continue"))}`);
  };

  const customSheet = () => {
    const amount = `${localeMeta().currency} 4 800`;
    return goalScreen(false).replace("</section></div>", `<div class="sheet-backdrop"><section class="sheet"><div class="sheet-handle"></div><div class="sheet-head"><h3>${escapeHTML(t("custom.title"))}</h3><button class="sheet-close">${close}</button></div><p class="fit-two-lines" data-max-font="12" data-min-font="8">${escapeHTML(t("custom.subtitle"))}</p><label class="field-label">${escapeHTML(t("custom.name"))}</label><div class="text-field">${escapeHTML(t("custom.sample"))}</div><label class="field-label">${escapeHTML(t("custom.icon"))}</label><div class="icon-picker"><button>${icons.star}</button><button class="selected">${icons.laptop}</button><button>${icons.home}</button><button>${icons.palette}</button></div><label class="field-label">${escapeHTML(t("custom.target"))}</label><div class="text-field">${amount}</div><button class="primary-button fit-one-line" data-max-font="14" data-min-font="8">${escapeHTML(t("custom.add"))}${arrow}</button></section></div></section></div>`);
  };

  const termsSheet = () => languageScreen().replace("</section></div>", `<div class="sheet-backdrop"><section class="sheet"><div class="sheet-handle"></div><div class="sheet-head"><h3>${escapeHTML(t("terms.title"))}</h3><button class="sheet-close">${close}</button></div><p class="fit-two-lines" data-max-font="12" data-min-font="8">${escapeHTML(t("terms.subtitle"))}</p><div class="terms-body"><h4>${escapeHTML(t("terms.decisionTitle"))}</h4><p>${escapeHTML(t("terms.decisionBody"))}</p><h4>${escapeHTML(t("terms.dataTitle"))}</h4><p>${escapeHTML(t("terms.dataBody"))}</p><button class="text-link">${escapeHTML(t("terms.full"))} ↗</button></div><button class="primary-button fit-one-line" data-max-font="14" data-min-font="8">${escapeHTML(t("terms.accept"))}${arrow}</button><button class="secondary-button fit-one-line" data-max-font="14" data-min-font="8">${escapeHTML(t("terms.close"))}</button></section></div></section></div>`);

  const board = document.querySelector("#board");
  const mockupsForLocale = () => [
    ["01", "Язык и валюта", "12 вариантов. Выбранная локаль подсвечена автоматически.", languageScreen()],
    ["02", "Приватность", "Подзаголовок остаётся одной строкой на выбранном языке.", privacyScreen()],
    ["03", "Главное искушение", "Локализованы обращение, профили и кнопки.", personaScreen(false)],
    ["04", "Все искушения", "Две строки допустимы только в пояснении этого экрана.", personaScreen(true)],
    ["05", "Цели · выбор", "Названия целей, примеры и действие локализованы.", goalScreen(false)],
    ["06", "Цели · суммы", "Поле суммы и завершение настройки используют выбранный язык.", goalScreen(true)],
    ["07", "Своя цель", "Нижний лист допускает две строки пояснения.", customSheet()],
    ["08", "Условия", "Краткий текст и все действия переведены.", termsSheet()]
  ];

  const fitOneLine = (element) => {
    const requestedMax = Number(element.dataset.maxFont) || Number.parseFloat(getComputedStyle(element).fontSize) || 16;
    const max = document.body.classList.contains("compact") && element.matches(".screen-copy h2")
      ? Math.min(requestedMax, 24)
      : requestedMax;
    const min = Number(element.dataset.minFont) || Math.max(7, max * .62);
    let size = max;
    element.style.fontSize = `${size}px`;
    while (element.scrollWidth > element.clientWidth + .5 && size > min) {
      size = Math.max(min, size - .25);
      element.style.fontSize = `${size}px`;
    }
  };
  const fitTwoLines = (element) => {
    const max = Number(element.dataset.maxFont) || Number.parseFloat(getComputedStyle(element).fontSize) || 12;
    const min = Number(element.dataset.minFont) || 8;
    let size = max;
    element.style.fontSize = `${size}px`;
    while (size > min) {
      const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight);
      if (element.scrollHeight <= lineHeight * 2 + 1) break;
      size = Math.max(min, size - .25);
      element.style.fontSize = `${size}px`;
    }
  };
  const fitAllText = () => {
    document.querySelectorAll(".fit-one-line").forEach(fitOneLine);
    document.querySelectorAll(".fit-two-lines").forEach(fitTwoLines);
  };

  const bindScreenInteractions = () => {
    document.querySelectorAll(".persona-card").forEach((card) => card.addEventListener("click", () => {
      const grid = card.closest(".persona-grid");
      grid.querySelectorAll(".persona-card").forEach((item) => item.classList.remove("selected"));
      card.classList.add("selected");
    }));
    document.querySelectorAll(".gender-row .chip, .currency-row .chip").forEach((chip) => chip.addEventListener("click", () => {
      const group = chip.parentElement;
      group.querySelectorAll(".chip").forEach((item) => item.classList.remove("selected"));
      chip.classList.add("selected");
    }));
    document.querySelectorAll("[data-locale-choice]").forEach((chip) => chip.addEventListener("click", () => setLocale(chip.dataset.localeChoice)));
    document.querySelectorAll("[data-goal-interactive]").forEach((content) => {
      const cards = [...content.querySelectorAll(".goal-card")];
      cards.forEach((card) => card.addEventListener("click", () => {
        const selectedCount = cards.filter((item) => item.classList.contains("selected")).length;
        if (!card.classList.contains("selected") && selectedCount >= 3) return;
        card.classList.toggle("selected");
        let amounts = content.querySelector(".goal-amounts.live");
        const selectedCards = cards.filter((item) => item.classList.contains("selected"));
        if (!selectedCards.length) {
          amounts?.remove();
          return;
        }
        if (!amounts) {
          amounts = document.createElement("div");
          amounts.className = "goal-amounts live";
          content.querySelector(".custom-goal-button").before(amounts);
        }
        amounts.innerHTML = selectedCards.map((item) => `<div class="goal-amount-row"><div><strong>${escapeHTML(item.dataset.goalTitle)}</strong><span>${escapeHTML(t("goal.target"))}</span></div><input class="amount-field" value="${escapeHTML(item.dataset.goalValue)}" aria-label="${escapeHTML(t("goal.target"))}: ${escapeHTML(item.dataset.goalTitle)}" /></div>`).join("");
        requestAnimationFrame(() => content.scrollTo({ top: Math.max(0, amounts.offsetTop - 12), behavior: "smooth" }));
      }));
    });
  };

  const flattenCopy = (source, prefix = "") => Object.entries(source).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object" ? flattenCopy(value, path) : [[path, value]];
  });
  const groupNames = {
    common: "Общие действия",
    language: "Язык и валюта",
    privacy: "Приватность",
    persona: "Искушения",
    goal: "Цели",
    custom: "Своя цель",
    terms: "Условия"
  };
  const renderCopyCatalog = () => {
    const catalog = document.querySelector("#copyCatalog");
    catalog.innerHTML = localeOptions.map((meta) => {
      const flat = flattenCopy(copyByLanguage[meta.copy]);
      const groups = Object.keys(groupNames).map((group) => {
        const rows = flat.filter(([path]) => path.split(".")[0] === group).map(([path, value]) => {
          const sample = interpolate(value, { step: 3, amount: `${meta.currency} 5 000` });
          return `<div class="copy-row"><code>${escapeHTML(path)}</code><p lang="${meta.id}" dir="${meta.dir}">${escapeHTML(sample)}</p></div>`;
        }).join("");
        return `<section class="copy-group"><h3>${groupNames[group]}</h3>${rows}</section>`;
      }).join("");
      return `<details class="copy-locale" ${meta.id === activeLocale ? "open" : ""}><summary><span lang="${meta.id}" dir="${meta.dir}">${meta.label}</span><span>${meta.id} · ${flat.length} строк</span></summary><div class="copy-groups">${groups}</div></details>`;
    }).join("");
  };

  const updateQuery = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("locale", activeLocale);
    url.searchParams.set("device", document.body.classList.contains("compact") ? "compact" : "regular");
    window.history.replaceState({}, "", url);
  };
  const renderBoard = () => {
    const meta = localeMeta();
    document.documentElement.lang = meta.id;
    board.innerHTML = mockupsForLocale().map(([number, title, note, markup]) => `<article class="mockup">${caption(number, title, note)}${markup}</article>`).join("");
    document.querySelector("#localeSelect").value = activeLocale;
    bindScreenInteractions();
    renderCopyCatalog();
    requestAnimationFrame(fitAllText);
    setTimeout(fitAllText, 60);
  };
  function setLocale(locale) {
    if (!localeOptions.some((item) => item.id === locale)) return;
    activeLocale = locale;
    updateQuery();
    renderBoard();
  }

  const localeSelect = document.querySelector("#localeSelect");
  localeSelect.innerHTML = localeOptions.map((meta) => `<option value="${meta.id}">${meta.label} · ${meta.id}</option>`).join("");
  localeSelect.addEventListener("change", () => setLocale(localeSelect.value));
  document.querySelectorAll('[data-control="device"] button').forEach((button) => button.addEventListener("click", () => {
    const control = button.closest("[data-control]");
    control.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.body.classList.toggle("compact", button.dataset.value === "compact");
    updateQuery();
    requestAnimationFrame(fitAllText);
    setTimeout(fitAllText, 60);
  }));
  if (query.get("device") === "compact") {
    document.body.classList.add("compact");
    document.querySelectorAll('[data-control="device"] button').forEach((button) => button.classList.toggle("active", button.dataset.value === "compact"));
  }
  renderBoard();
  window.addEventListener("resize", () => requestAnimationFrame(fitAllText));
})();

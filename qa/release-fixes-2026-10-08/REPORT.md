# Исправления release QA — 8 октября 2026

**Итог исправлений: QA-001/002/004/005/006/007/008 исправлены в коде; QA-003 остаётся OPEN. Release verdict: NO-GO.** Исходный аудит: [REPORT](../release-e2e-2026-10-08/REPORT.md). Его первоначальные verdict и доказательства сохранены.

## Изменения и доказательства до/после

| Дефект | Причина и исправление | Повторная проверка |
|---|---|---|
| QA-001 | Fresco декодировал каждый persona WebP 900×900 (3,240,000 байт). Все 10 изображений уменьшены до 448×448, указан resizeMethod=resize. Выборы, гендер, Show all и Continue сохранены. | API24/Pixel2 heap48MB: expanded list → последняя Fashion lover → начало → Coffee lover → goals: runner PASS. Процесс остаётся жив; crash buffer пуст. Повторные некорректные селекторы отделены от product crash. |
| QA-002 | LLDB раскрыл JS TypeError в expenseCopy: импорт getTranslationLanguage не существует. DE использовал прямой словарь, ar-sa/ar-ae вызывали отсутствующий fallback. Заменён на resolveTranslationLanguage. | Реальная функция expenseCopy проходит все SUPPORTED_LANGUAGES, оба Arabic варианта и unknown fallback. iOS Release DE → ar-sa → restart → ar-ae → DE: runner PASS, оба Arabic варианта сохраняются после restart и позволяют вернуться в DE. [Причина](locale-exception.txt). |
| QA-003 | Исходные два SIGILL в AQServer/Apple caulk подтверждены; причинность Rosetta не доказана. | Изолированный Release AVPlayer x86/arm64 с теми же cue WAV, а также x86 Varispeed прошёл 30 запусков без crash. На финальном iPad Release ручной Sound ON save 2.25 с Cancel/retry прошёл: history 1→2, ровно одна новая запись; прежние 7.25 сохранены. Полная Sound ON/OFF Spend/Save матрица и физические arm64 устройства не проверены; это не закрывает дефект. Звук не отключён как обход. |
| QA-004 | Тёмный headline выходил за небесную картинку на тёмный фон. Вся offerHero получила светлую подложку #E5F0FB. | Android dark contextual Unlimited goals: native header inspected, весь трёхстрочный headline читается; expanded benefits и dismissal runner PASS. [После](dark-paywall-native-header.png). |
| QA-005 | Modal onRequestClose закрывал редактор напрямую, тогда как backdrop уже использовал keyboard-first helper. Подключён тот же dismissKeyboardOrRun. | Android API36: первый Back скрывает IME и сохраняет editor/draft; второй закрывает editor, прежние имя/100.25 остаются. Runner PASS и native modal inspected. [После](goal-back-native-modal.png). |
| QA-006 | У двух coffee presets отсутствовали title/description в части словарей. | Добавлены DE/AR/ZH/zh-Hant/PT/IT/KO/JA; EN/ES/FR/RU сохранены. Тест проверяет оба preset ×12 словарей. titleOverride остаётся пользовательским содержимым. DE названия обеих карточек осмотрены в iOS Release после закрытия coin tutorial; AR название/description coffee+pastry видны в native screenshot. Остальные locale layouts и DE description визуально не подтверждены. |
| QA-007 | Security audit ранее блокировал verify. | Безопасные override обновления, backend proxy-addr 2.0.8: 0 vulnerabilities. Два advisory без upstream fix закрыты проверяемыми source forks: braces depth/cycle guard, node-forge строгий DigestAlgorithm NULL. Audit assertions не ослаблены; consumer resolution, SHA исходников и adversarial RSA/AST + обычные glob/cert checks обязательны. |
| QA-008 | Одинаковая English plural фраза для count=1. | Общий plural key для обеих summaries, one/two/few/other в 12 словарях; Russian/Arabic правила и count=0,1,2,3,5,11,21,22,100,101 проверены. API36 count=1: runner PASS и native screenshot. [После](pause-native-header.png). |

Дополнительные UX наблюдения: default monetary formatter сохраняет minor units; Today/goal history теперь показывают $7.25, ledger не пересчитывается. Тест default formatter проверяет все locales и Intl fallback. Фраза goal speech использует существующую нейтральную localized строку остатка вместо случайного «Almost there» при нуле. Несколько Add controls имеют разные действия: header создаёт temptation, coin FAB записывает решение, contextual Add создаёт карточку. Полезные действия не удалялись.

### Дополнительный startup блокер

На beta native baseline, rebundled artifact и полной сборке стабильного Xcode интерфейс мог быть закрыт белым Expo native splash. LLDB recursiveDescription показывает уже созданный React UI под UIView белого splash; в логе UIManagerBinding instanceHandle is null/topLayout dropped. LogoSplash скрывал native splash только из начального onLayout. Добавлено повторное hideAsync при окончании wordmark animation. Это отдельный discovered startup regression, не доказательство устранения QA-003.

## Проверки

- check:localization PASS; все 12 dictionary languages, ar-sa/ar-ae используют ar; placeholder {{count}} одинаков.
- check:themes PASS; check:functional-parity PASS:250 contracts/2130 fragments/44 reachability patterns, исходные 246 не ослаблены.
- Targeted regressions:13 PASS (currency/locales/presets/plural/back/speech/splash/security).
- npm run verify PASS, включая analytics-contract/native-analytics-config, typecheck, lint, localization/themes/parity, backend tests/security и release configuration gates.
- App audit:0 unmitigated, разрешённые старые image-size advisory paths остаются. Backend audit:0.
- Android Release assembleRelease PASS; iOS simulator Release x86_64 stable Xcode26.6/SDK26.5 BUILD SUCCEEDED. Final APK 87,333,682 bytes; iOS .app сохранена в /tmp/almost-qa-fixes-final-artifacts/Almost.app. SHA256 native binary, main.jsbundle, APK и App.js записаны в [fingerprint](final-build-fingerprint.json). Версия 8.0.0(128).

## UX review

Перед изменениями inventory и state/action contract записаны в [STATE-ACTIONS](STATE-ACTIONS.md). Проверены Fitts/Hick/Zeigarnik/Jakob/goal-gradient/Von Restorff/Miller: targets и handlers сохраняются, Continue/Save/current decision выделены, Show all и benefits раскрываются постепенно, отмена и Back доступны, прогресс/суммы честные, группы привычные. Dark native paywall/goal/Pause осмотрены без потери контраста, clipping, смещения равнозначных controls или необъяснимого пространства в изменённой области. Финальный Light flow 23:14 открывает отдельный theme picker и settings-choice-light; исходные native crops paywall/goal/actions/Pause осмотрены: читаемые поверхности, Save/Cancel одной высоты с общим центром текста, сохранённая hierarchy. PRO/6 accents не осмотрены: тестовое entitlement бесплатно, оно не подделялось. iOS Light DE/AR cards осмотрены; iOS Dark/PRO paywall не покрыт. Статические gates не являются визуальным доказательством.

## Ограничения release verdict

QA-003 остаётся OPEN до воспроизведения и полной проверки Sound ON/OFF Spend/Save с ровно одной записью на compact/tablet и физических arm64 release устройствах. Исходные SIGILL AQServer/caulk не списаны на Rosetta: isolated probe не воспроизвёл их. Stable Xcode26.6/SDK26.5 сборка всё ещё тестировалась на x86_64/Rosetta runtime26.1; стабильный compiler не устраняет это ограничение. На SE native UI automation завершилась windowNotFoundAtPosition/offscreen-control blocker, не новым доказанным crash. Физические arm64 release устройства, реальные subscription lifecycle/postbacks, purchase/restore success не проверены. PRO entitlement не подделывается ради screenshot. Нет публикации, настоящих платежей, отзывов или сообщений. Отсутствие crash во вспомогательном audio probe не закрывает product flow.

Итоговый release verdict **NO-GO**. Нужны закрытие QA-003, физические release attribution/purchase проверки и оставшаяся visual/device матрица исходного аудита.

## Доказательства и оставшиеся ограничения

[Runtime index](EVIDENCE.md) содержит каждый runner exit code и ссылки на JUnit/logs, включая неудачные попытки. Снимки без assertions не названы E2E PASS. Ранние Light runs с exit0 фактически показывали Dark; их theme coverage отклонён. Повторный run 23:14 подтверждает настоящий Light. [Light header](light-unlimited-header-native.png), [Light actions](light-goal-actions-native.png), [Light Pause](light-pause-native.png), [DE cards](ios-de-presets-native.png), [AR startup](ios-after-splash-retry.png).

QA-001 повторён на heap48MB с fresh onboarding и expanded scrolling, без OOM. Расчёт RGBA для десяти исходных 900×900 изображений —32.4MB, после448×448 —8.03MB; это расчёт размера декодированных bitmap, не measured process-memory/FPS/startup gain. До/после meminfo взяты в разных состояниях и не выданы за сравнимый профиль. Сами persona choices/Show all/Continue сохранены.

QA-007 использует локальные forks, а не несуществующие официальные исправленные версии braces/node-forge. Их безопасность зависит от сохранения reviewed guard и source-integrity проверок; обновления upstream требуют повторной оценки. Overrides и actual consumers проверяются security-vendor-contract до audit. Разрешённые image-size advisory paths прежние; zero-unmitigated не означает, что npm database знает advisory под новым локальным package name. Это причина обязательных regressions/integrity checks, которые не заменяют независимый security review.

Более широкие UX дефекты отмечены, без несогласованного redesign: компактный decision экран имеет controls под нижней навигацией; AR header тесный; некоторые legacy money surfaces с явно заданным friendly rounding показывают2.25 как2.5 (ledger точный, default totals исправлены). Smart Budget contextual paywall, plan purchase/restore success, screen-reader и полный long-locale/theme набор не проверены в этом повторном прогоне.

Начальные изменения сохранены в /tmp/almost-qa-fixes-initial.patch. [SHA preservation](preservation-check.json) сравнивает исходное рабочее дерево:1898 unchanged,25 changed,0 missing. Изменения trial-and-review/automatic-soft-paywall tests и дополнительный amount-slider contract обнаружены при сравнении, их происхождение этим QA task не утверждается; они не откатывались. Исходный ignored Wallet shortcut восстановлен из готовой .app с точным начальным SHA. AppDelegate сохранён. Git reset/rebase/commit не выполнялись. Полный git diff содержит исходную чужую работу, поэтому не равен patch только этих исправлений.

Готовые APK/.app сохранены; только собственные simulator/emulator sessions остановлены. Большие native build logs сжаты gzip, task-created iOS DerivedData/rebundle удалены. Чужие simulator/device sessions и общие caches не затронуты.

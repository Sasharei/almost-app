# QA Almost Savings 8.0.0 (128) — 8 октября 2026

**Вердикт: NO-GO — выпуск не рекомендован.** Есть подтверждённое падение на минимальной поддерживаемой Android ОС, наблюдаемые iOS падения, визуальный дефект paywall, потеря черновика при Back и непереведённая стандартная карточка. Проверка безопасности зависимостей не проходит. Покупки и attribution/postbacks в физических release-сборках не проверены.

Это функциональный и визуальный аудит текущего рабочего дерева, а не подтверждение «проверены абсолютно все функции». Код приложения не исправлялся. Исходные пользовательские изменения сохранены; SHA-проверка файлов приложения совпала с начальной. Использованы mobile-app-qa, ux-interaction-review, emil-design-eng и обязательные UX/performance политики проекта. Все данные синтетические; реальные покупки, отзывы и сообщения не отправлялись.

## Сборки и среда

HEAD `160fd606bd2f9a41d8357d0bc014f166385ca6a8`, с существующими незакоммиченными изменениями. Это важно: один HEAD не описывает полностью протестированную сборку.

| Среда | Сборка / покрытие |
|---|---|
| Android Pixel 9 Pro, API36, 1280×2856, 480dpi | Собран и установлен текущий Release APK; основные бесплатные сценарии |
| Android Pixel 2, API24, 1080×1920, 420dpi | Тот же APK; свежий onboarding до OOM. 2GB RAM, heapgrowthlimit 48MB — существенное условие воспроизведения |
| iPhone 16 Pro, iOS26.1 | Release x86_64 simulator, Rosetta; onboarding, экономия, history/restart, locale |
| iPhone SE3, iOS26.1, 750×1334 | Компактный экран, максимальный Dynamic Type, paywall/restore cancel, покупка как запись расхода, настройки звука |
| iPad Pro 11 M4, iOS26.1, 1668×2420 | Onboarding, клавиатура, cancel/confirm экономии; запись сохраняется, затем аудио crash |
| iPhone 17 Pro, iOS27 | BLOCKED: имеющаяся конфигурация MLKit/Pods требует x86_64 simulator, runtime27 не устанавливает эту сборку |

Android APK: `android/app/build/outputs/apk/release/app-release.apk`, 87 910 638 bytes, SHA256 `e5ab36d1383fed01b0b47accb13d718f58634421068b68acefbc8202966e70ae`. minSDK24 / targetSDK36. iOS: `/tmp/almost-release-e2e-oct8-artifacts/Almost.app`, Xcode27.1 beta, не App Store archive. Физические устройства и минимальная iOS15.5 не проверены. iOS crashes нельзя автоматически переносить на native arm64 устройства: Rosetta и сочетание SDK/runtime ограничивают выводы.

## Дефекты

### QA-001 — High / P1: Android API24 падает при раскрытии сценариев onboarding

Предусловия: свежая установка, English, light, стандартный профиль Pixel2 API24 с heapgrowthlimit48MB. Пройти первые шаги, на выборе искушений нажать Show all и прокрутить расширенный список. Приложение закрывается с системным «Almost Savings has stopped»; ожидается доступный список без падения.

Подтверждён один crash с полным стеком в 21:18:42; более ранний прогон оборвался в том же месте, но без сохранённого crash-стека и не считается отдельным подтверждением. `FrescoDecodeExecutor-1`, `OutOfMemoryError`, попытка выделить 3 240 012 bytes при ~729KB до OOM, `Bitmap.createBitmap` → Fresco. Это блокирует основной путь на заявленной поддерживаемой ОС при данном лимите heap. На API36 такого падения не наблюдалось. Гипотеза: декодирование изображений требует ограничения размера/одновременности; точная причина не установлена.

Доказательства: [crash log](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/logs/android-api24-crash.log), [failed run](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/evidence/android-33-min-resume-20261008-211829/runner.log). Воспроизведение: `33-min-resume.yaml` после первых шагов `minandroid-full.yaml`.

### QA-002 — High / P1: выбор Arabic (Saudi Arabia) завершает iOS приложение

iPhone16Pro/iOS26.1, Release Rosetta, немецкий язык выбран и сохранён. Profile → Settings → Language → ar-sa. Через несколько секунд приложение завершается; ожидается смена языка с сохранением состояния. Повторено **2/2**. Сохранённый язык остался DE. Один screenshot-only runner сообщил PASS перед отложенным crash; сценарий всё равно FAIL.

`EXC_BAD_ACCESS/SIGSEGV`, очередь `com.meta.react.turbomodulemanager.queue`, native exception rethrow в `RCTTurboModule.mm`. Корневая причина не доказана, native arm64 не проверен. Доказательства: [первый crash](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/logs/ios-arabic-crash.ips), [повтор](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/logs/ios-arabic-crash-repeat.ips), flow `22-locale-repro.yaml`. Нужны полноценный exception message и повтор на физическом iPhone.

### QA-003 — High / P1: iOS звук сопровождается падением после записи решения

SE3/iOS26.1: при записи «купил» с включённым звуком приложение падает; iPad/iOS26.1: после первой экономии и завершения tutorial падает аналогично. Два разных устройства/пути, по одному сохранённому crash на каждый. Ожидается результат и продолжение работы.

Оба стека `EXC_BAD_INSTRUCTION/SIGILL`, очередь `AQServer`, Apple audio allocator. После отключения Sound на SE запись расхода завершилась, history содержит Matcha latte $12 и прежнюю экономию $7.25. Сумма $12 получилась из смены карточки при прокрутке тестом: это не дефект арифметики и не проверка расхода $3.50 на SE. iPad перед падением сохранил ровно одну экономию $7.25. Возможное влияние Rosetta/audio simulator не исключено; точная причина неизвестна.

Доказательства: [SE crash](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/logs/ios-spend-crash.ips), [iPad crash](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/logs/ios-ipad-crash.ips), [SE ledger](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/evidence/ios-compact-ledger-final.json), [iPad ledger](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/evidence/ipad-ledger.json). Требуется повтор с Sound ON/OFF в native release на физическом устройстве.

### QA-004 — Medium / P1: заголовок Premium paywall почти невидим в dark

Android API36, English/dark. Progress → New goal → Premium gate. Заголовок «Unlock Unlimited goals with Premium» переносится ниже светлой картинки на тёмную поверхность и остаётся цветом `#11182C`. Ожидается читаемый заголовок независимо от переноса. Повторено также через Monthly income → Smart budget paywall; тот же заголовок уходит на тёмный фон. Повторно осмотрен native crop; измеренный контраст на тёмной поверхности около **1.04:1**. Функционально All benefits, Restore без аккаунта и закрытие работают; визуально FAIL.

Доказательство: [native crop](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/evidence/dark-paywall-contrast-native.png). Связанная реализация: `src/components/PremiumPaywallModalV2.js:1303–1310`, стиль около1523. iOS проявление не подтверждено; общий компонент — только основание для следующей проверки. PRO interiors заблокированы отсутствием entitlement.

### QA-005 — Medium / P2: Android Back закрывает редактор цели вместе с клавиатурой

API36, English/dark, существующая цель. Открыть редактирование, ввести несохранённый QA-текст, оставить IME открытой, нажать системный Back **один раз**. Закрываются клавиатура и редактор, черновик теряется. Ожидается сначала скрыть IME и оставить редактор, либо явно подтвердить отказ от черновика. Старое сохранённое значение не повреждено. Повторено автоматическим hideKeyboard и независимым `adb shell input keyevent 4`.

Доказательства: [до Back](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/evidence/goal-manual-typed.png), [после одного Back](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/evidence/goal-manual-single-back.png). `App.js` Modal `onRequestClose={closeGoalEditorPrompt}` около93702, тогда как backdrop использует `dismissKeyboardOrRun`. Save через Enter и Cancel проверены отдельно. Остаток «ay fund» в одном QA названии возник из позиции курсора при eraseText и не записан как баг приложения.

### QA-006 — Medium / P2: стандартная карточка остаётся английской в немецком интерфейсе

iPhone16Pro/iOS26.1, DE/light, пользователь карточку не редактировал. Today показывает «Coffee and pastry combo» и английское описание, остальные элементы переведены. Ожидается локализованная стандартная карточка. Один runtime пример, статически подтверждено отсутствие DE в title/description map у App.js около13430/13436. Другие языки требуют проверки, не объявлены runtime FAIL автоматически.

Доказательство: [немецкий экран](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/evidence/ios-arabic-recovery.png) (историческое имя файла не означает арабский интерфейс). Статический localization validator прошёл, этот путь он не покрывает.

### QA-007 — High / P1: обязательный verify не проходит security audit

`npm run verify` останавливается на backend `proxy-addr`: GHSA-jqcg-44mw-7w3h, critical/CVSS9.1, уязвимый диапазон <2.0.8, исправление доступно. Это провал обязательного gate, а не доказанный exploit развёрнутого сервиса: какая backend версия опубликована и достижим ли путь — не установлено.

Отдельный root audit: 59 affected packages, **18 уникальных advisories**, в том числе critical shell-quote в tooling. Два image-size advisory имеют существующие mitigation/allowlist; оставшиеся нельзя автоматически считать эксплуатируемыми в мобильном рантайме. Доказательства: [verify](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/logs/verify.log), [backend audit](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/logs/backend-audit.json), [client audit](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/logs/client-audit.json).

### QA-008 — Low / P3: неверное число в English Pause

Android API36/dark, в очереди одна покупка $5. Два текста показывают «1 purchases await your decision». Ожидается «1 purchase awaits your decision». Видно после restart; остальные количества не проверены. Доказательство: [native crop](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/evidence/pause-populated-native.png). Это существующий plural/copy дефект, не ошибка количества ledger.

## UX/UI наблюдения и предлагаемое исправление

| До | После — предложение, не реализовано | Почему |
|---|---|---|
| Dark заголовок пересекает границу sky/background и теряет контраст | Контрастный цвет для каждой поверхности либо заголовок целиком в одной поверхности | Доступность текста и различимость основного действия |
| Back уничтожает открытый черновик вместе с IME | Первый Back скрывает IME; дальнейший выход явно управляет черновиком | Привычное поведение Jakob, пользовательский контроль |
| Подтверждение показывает $7.25, Today/History/Progress показывают $7 | Согласовать формат точной суммы или явно обозначить округление | Stored ledger сохраняет .25; это UX риск, **потеря денег не обнаружена** |
| При нулевом прогрессе к цели $2000 встречается «Almost there: $2,000» | Формулировка соответствует фактическому прогрессу | Честный goal-gradient; отдельное UX наблюдение, не арифметическая ошибка |
| На Today в разных состояниях встречаются несколько Add/plus | Повторно проверить их назначения и приоритеты на settled screens | Возможный конфликт основного действия; окончательный visual verdict для всей шапки не выдан |

Проверены Fitts/Hick/Zeigarnik/Jakob/goal-gradient/Von Restorff/Miller и пять принципов в реально посещённых состояниях. Основные confirmation/save/cancel действия различимы; тёмный paywall и Back нарушают требования. Геометрия пяти Android вкладок в одном English/default состоянии: центры baseline расходятся не более0.167dp. Это **не** подтверждает все языки, масштабы и selected states. Native crops осмотрены отдельно от уменьшенных обзорных скриншотов. Максимальный Dynamic Type проверен на SE reminders/paywall; полноценный VoiceOver/TalkBack walkthrough не выполнен.

## Покрытие

Ни один runner PASS сам по себе не означает PASS всей функции или визуального состояния. Прогоны с tap+screenshot, сбои ADB, неверный scroll/selector и промежуточные resume-файлы отделены от дефектов приложения. На iPad координатный history flow51 дал runner PASS, но screenshot показал Today; поэтому он не засчитан как History PASS. После crash сохранность iPad записи подтверждена чтением синтетического ledger, а не этим runner. 246 action contracts — статический inventory, а не 246 выполненных E2E сценариев. Зафиксировано 86 runner executions: 36 PASS, 50 FAIL (включая повторные, неполные и инструментальные прогоны; это не итог функций). [Полный индекс запусков](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/runner-index.json), [metadata](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/session-summary.json), [план](/Users/sasarei/Downloads/almost_clean/qa/release-e2e-2026-10-08/PLAN.md).

| ID | Статус области | Реально проверено / остаток |
|---|---|---|
| SMK-001 | FAIL | Обе release сборки/установки работают; API24 OOM и iOS crashes |
| E2E-001 | FAIL | Fresh onboarding back/finish и отказ analytics; DE работает, ar-sa iOS crash; остальные locales не полностью |
| E2E-002 | PARTIAL | Tutorial выбор карточки, ввод7.25, cancel/retry; iPad keyboard ручной переход; CRUD карточек не полностью |
| E2E-003 | PARTIAL | Экономия7.25, double confirm, один ledger entry, restart на iOS/Android; Android spend3.50 cancel/confirm; SE spend12 при Sound OFF; Android Later $5, notification Deny и сохранение Pause после restart подтверждены |
| E2E-004 | FAIL | Цель Save/Cancel, history/restart; Back draft loss; Monthly income открывает Premium gate (BLOCKED); category CRUD не полностью |
| E2E-005 | PARTIAL | Weekly reminder picker; iOS notification Deny, Android Deny фактически подтверждён permission=false; lifecycle таймеров/подписок не полностью |
| E2E-006 | PARTIAL | Progress/navigation, chest открывается и начисляет2coins; Later в rating закрывает запрос без отправки отзыва; challenges/cat skins/insights не полностью |
| E2E-007 | PARTIAL | Settings/theme/language/sound; currency conversion, support intents, Unicode profile не полностью |
| E2E-008 | PARTIAL | Paywall open/close/benefits, Android unavailable Restore, iOS Apple signin prompt cancel; покупка/active restore не выполнены |
| E2E-009 | BLOCKED | Bank/Shopping Pause native entitlement/permissions, реальная интеграция не проверены |
| NEG-001 | PARTIAL | Android zero invalid, fractional recovery, repeated save taps; отрицательные/максимальные/Unicode inputs не полностью |
| REC-001 | PARTIAL | Force-stop/restart history; Android offline Pause+History/restart PASS; deep links/background timers не полностью |
| VIS-001 | FAIL | Light и dark выборочные main screens; dark paywall defect; PRO +6 accents interiors BLOCKED |
| VIS-002 | FAIL | SE shortscreen/large text, iPad keyboard, DE; RTL iOS crash, все длинные locales и ориентации не полностью |
| ACC-001 | PARTIAL | AX hierarchy/testIDs и выборочная tab geometry; VoiceOver/TalkBack/device accessibility не полностью |
| REL-001 | BLOCKED | Нет sandbox testers / Play billing account / физической release attribution проверки |
| REL-002 | BLOCKED | Widgets/Live Activities/push routing/реальная биометрия/Shortcuts runtime не проверены, статический gate прошёл |

17 областей: **FAIL5, PARTIAL9, BLOCKED3, полностью PASS0, SKIPPED0**. Это широкие многосценарные области: ноль полностью закрытых областей не означает, что ни один отдельный путь не работает. Отдельные успешные пути описаны в таблице. Потребуются дополнительная QA сессия и доступная тестовая инфраструктура для закрытия всего заявленного scope.

## Статические gates

- Functional parity **PASS**: 246 contracts, 2120 fragments, 43 reachability checks.
- Localization **PASS**:12 dictionaries; runtime DE дефект найден отдельно. Новых/изменённых UI строк этим аудитом не добавлено.
- Themes **PASS**:light/dark/pro и6 accents статически; actual visual покрытие частичное и FAIL для dark paywall.
- Analytics contract **PASS**:216 event names, always-on attribution/ATT invariants; native analytics config **PASS**. Это не доказательство server install/revenue postbacks.
- Все `scripts/tests/*.test.js`: **326/326 PASS**, security7PASS, backend27PASS; suites пересекаются с verify, результаты не суммируются как новые независимые тесты.
- Typecheck PASS; lint0errors/432warnings; release static gate PASS; signing-secrets PASS.
- `npm run verify` **FAIL** на security audit. AppLovin cost check **BLOCKED/FAIL config**: нет требуемых двух tracking URLs и APPLOVIN_REPORTING_API_KEY; секреты не выводились.

## Условия повторной проверки и допуска

1. Исправить/разобрать QA-001…007, повторить минимальные repro и связанные cancel/back/retry пути. Для iOS crashes обязателен native arm64 physical release, поскольку тестовый x86 runtime может влиять на результат.
2. Настроить Apple Sandbox Tester через App Store Connect и Google Play license tester/закрытый тест; вход выполняется локально без передачи паролей в чат. Проверить purchase/cancel/restore/renewal/expiration/refund и восстановление entitlement после restart/offline.
3. В фактических release builds обеих платформ проверить fresh install при ATT undecided/denied, отключённой product analytics, и RevenueCat → AppsFlyer server postbacks. Debug/static evidence недостаточно. Не вводить duplicate client af_purchase/partner-sharing block.
4. Закрыть остатки таблицы: бесплатный CRUD, long locales/RTL, PRO6accents, offline/deeplinks, screenreader, min iOS, orientations/tablet, widgets/native integrations.
5. Performance: OOM измерен crash-стеком, но FPS/p95startup/battery/physical memory профиль не выполнен. Время Maestro flow включает инструмент и не выдано за latency приложения. До release нужен профиль production build на репрезентативных устройствах.

**NO-GO** сохраняется до устранения блокеров и проверки release-critical сценариев. Пользовательские файлы, данные и изменения приложения не удалялись. Собственные большие логи сжаты gzip; iOS build intermediates удалены, готовая .app сохранена. Созданные для QA simulator/emulator sessions остановлены.

## Повторная проверка после исправлений — 8 октября 2026

QA-001/002/004/005/006/007/008 исправлены; verify, functional parity, localization, themes и Release builds проходят. QA-003 остаётся OPEN; release verdict NO-GO сохраняется. Причины, актуальная runtime/theme coverage, failed runners и fingerprints приведены в [отчёте исправлений](../release-fixes-2026-10-08/REPORT.md). Первоначальные результаты выше сохранены как baseline, а не актуальный verdict каждого исправленного дефекта.

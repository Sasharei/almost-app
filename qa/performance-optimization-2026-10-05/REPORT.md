# Almost: performance audit и осторожная оптимизация

Дата: 2026-10-05. Общий чек-лист: `/Users/sasarei/.codex/rules/APP_PERFORMANCE_AUDIT.md`. Исходный аудит: `../performance-audit-2026-10-05/REPORT.md`.

## Дополнительная проверка после этого отчёта

По следующему запросу снят Premium gate в отдельной QA-копии симулятора и выполнена проверка шести PRO акцентов для Shopping Pause error/close. Обнаружено также удержание native splash при повторном запуске; для визуального QA использован отдельный обход. Native enforcement Screen Time остаётся заблокирован средой подписи. Актуальные подробности: [followup/REPORT.md](followup/REPORT.md).

## Результат

Убраны две лишние операции при неизменившемся опросе Shopping Pause: атомарная перезапись JSON и обновление React status новым идентичным объектом. Native sync, межпроцессный lock, чтение актуального состояния, сверка разрешений, применение shields и интервал 15 секунд сохранены. Изменения данных всегда записываются. Крупный App.js, стартовая гидратация, изображения и списки из исходного аудита остаются кандидатами для дальнейшего профилирования; эти изменения не доказывают ускорение всего приложения.

Рабочее дерево изначально содержало множество чужих/предыдущих изменений. Здесь не выполнялись reset, commit, публикация или изменение платёжной/атрибуционной логики. `optimization.diff` показывает собственные изменения двух основных файлов относительно сохранённого состояния перед оптимизацией, а не относительно Git HEAD.

## Изменения и сохранённые контракты

- `ios/ShoppingBlockerShared/ShoppingBlockerStore.swift`: сравнение полного Codable/Equatable состояния; первая запись и любая мутация сохраняются, неизменившееся состояние не кодируется и не заменяет файл. Перед сравнением исполняется прежняя транзакция под lock. Обработка ошибок и восстановление shields по исходному durable состоянию сохранены.
- `ios/ShoppingBlockerShared/ShoppingSavings.swift`: добавлен Equatable для событий.
- `src/shoppingBlocker/useShoppingBlocker.js`: неизменившийся status сохраняет ссылку React state. Все поля и наличие ключей сравниваются; новые/удалённые поля не теряются. Изменение доступности редактирования цели по времени и истечение пропуска вызывают обновление даже при идентичном native payload. Очередь sync/start/updateGoal/unlock/stop не менялась.
- `scripts/tests/shopping-blocker.test.js`: реальные Foundation/JSON/atomic-write/file-lock операции с заглушками недоступных на macOS Screen Time frameworks; проверки no-op, мутаций, expiry и отказов записи; hook-тесты идентичного/изменённого payload и временных границ.

Не переносились UI-зависимые Apple APIs с main queue. Не отключались опросы, анимации, аналитика, локализация, темы или полезные функции.

## Сопоставимый замер хранения

Host microbenchmark: один компьютер, Swift `-O`, фактический код transaction, временный каталог, 200 событий, пять запусков по 200 одинаковых транзакций. Apple frameworks заменены заглушками; JSON, файловая система и lock реальные. До/после запускались последовательно после завершения сборки. Скрипт: `storage-benchmark.cjs`; сырые данные: `storage-before-final.json`, `storage-after-final.json`.

| Метрика | До | После |
|---|---:|---:|
| Атомарные замены JSON / 1000 одинаковых опросов | 1000 | 0 |
| Медиана среднего времени одного опроса по пяти сериям | 0,799 мс | 0,275 мс |
| Среднее по отдельным сериям | 0,773–0,840 мс | 0,270–0,280 мс |

Стоимость этой операции снизилась приблизительно на 66%. Это не замер FPS, времени запуска или отзывчивости на iPhone. Более ранний замер (`storage-before.json`, `storage-after.json`) шёл при нагрузке сборки; основной вывод использует финальную последовательную пару. Удаление лишних React state updates подтверждено проверкой идентичности ссылки в hook-тесте; число рендеров всего AppContent в production не профилировалось.

## Release-сборка и устранение препятствий сборки

Успешно собрана и запущена конфигурация Release для iOS Simulator: Xcode 26.6, iPhone 17 / iOS 26.5, отдельный симулятор `Almost Performance QA 2026-10-05` (`C595C679-6540-4276-81E5-B414558FA80B`). Лог: `build-x86-compatible.log`.

Для сборки существовавшего рабочего дерева понадобились локальные исправления:

1. PBX-пути BankExpenses.swift, ExpenseParser.swift, ExpensePatterns.swift, BankExpensesBridge.m и Localizable.xcstrings исправлены на фактическое расположение `Almost/...`.
2. Locale.commonISOCurrencyCodes ограждён проверкой iOS 16 с эквивалентной проверкой через isoCurrencyCodes на более ранней версии; минимальная версия приложения остаётся 15.5.
3. AppShortcuts.xcstrings в качестве ресурса требовал iOS 17. Его фразы сохранены в совместимых AppShortcuts.strings для всех 12 языков; исходный каталог остаётся источником переводов. Генератор `scripts/generate-app-shortcuts-strings.js` включён в check:localization с `--check` и проверяет неизменность `${applicationName}`. PBXVariantGroup включает все переводы. plutil подтвердил формат ресурсов и проекта. [Apple: App Shortcuts localization in iOS 17](https://developer.apple.com/videos/play/wwdc2023/10102/).

Существующий MLKit/MLImage содержит arm64 device binary и не линкуется для arm64 Simulator. Поэтому для QA использована x86_64 Release-сборка через Rosetta. Исключение arm64, обход предварительной компиляции bridging header и дополнительный путь RCTDeprecation переданы только аргументами xcodebuild; производственные архитектуры и зависимости не изменены. Для QA отключён upload Sentry build artifacts. Release simulator build не является доказательством device release или доставки postbacks.

Android: production JS/Hermes export успешно завершён (`android-export.log`, bundle 14,4 MB). Это не APK/AAB и не runtime-тест Android. Ни Android Emulator, ни физические устройства не запускались.

## Runtime и визуальная проверка

В отдельном симуляторе проверены:

- Первый запуск Release, все четыре шага онбординга, переход на Today; продуктовая аналитика и уведомления отклонены в тестовой установке.
- Открытие Shopping Pause с Today и Settings, повторная попытка после ошибки и закрытие/возврат. В этой неподписанной QA-сборке native sync возвращает ошибку; полноценная App Group/Screen Time интеграция не подтверждена. Не выдаём эту проверку за работающую блокировку или native happy path.
- Светлая и тёмная темы экрана ошибки: контраст, читаемый текст, крупная primary кнопка Try again, отдельное вторичное Close, отсутствие перекрытий. Скриншоты `shopping-pause-light.png`, `shopping-pause-dark.png`.
- PRO сохраняет Premium gate; просмотрен и закрыт paywall без покупки. Shopping Pause в PRO и варианты PRO accent не проверены из-за отсутствия Premium entitlement у свежей QA-установки.
- Основной сценарий: Make a decision → выбор карточки → I decided not to buy → двойное экранное подтверждение Almost Pay → результат You saved money (+8,50 AUD). Это запись тестового решения без финансовой транзакции. Снимок `decision-saved-dark.png`.
- Приложение принудительно закрыто и повторно запущено: решение осталось в Recent events, серия показывает 1 из 3, оставшиеся решения — 2. Снимок `decision-persisted-dark.png`.
- Отложено необязательное напоминание; существующий автоматический paywall после первого решения появился. Проверки реальных покупок, restore и отправки RevenueCat/AppsFlyer postbacks не проводились.

UX-проверка затронутого error/retry/close состояния по пяти принципам и семи законам: одна основная попытка восстановления, различимая вторичная кнопка, знакомый возврат, читаемая группировка, удобные цели касания; прогресс не выдумывается. Макет и пользовательские действия этой оптимизацией не менялись. Для состояний setup/active/pass/renewal — контрактные тесты и просмотр обработчиков, но нет визуального/native runtime доказательства.

Отдельная существующая проблема вне performance scope: длинный заголовок Premium paywall для PRO в dark продолжается тёмным текстом на тёмном фоне. Снимок `pro-access-paywall-dark.png`. Текущая оптимизация этот компонент не изменяла. Это ограничивает общий вывод о визуальном качестве приложения.

## Проверки

| Проверка | Результат |
|---|---|
| check:functional-parity | PASS |
| check:localization | PASS, включая все 12 языков App Shortcuts |
| check:themes | PASS (статическая проверка) |
| check:analytics-contract / check:native-analytics-config | PASS |
| typecheck / lint | PASS |
| test:shopping-blocker | 10 PASS, 0 FAIL |
| test:bank-expenses | PASS |
| test:attribution, test:cloud-notifications, test:ui-session, test:engagement | PASS в финальном verify до security gate |
| test:security / backend:test | PASS отдельно (backend: 27 тестов) |
| check:release | PASS отдельно; size gate использует существующий debug APK, не новый Android release |
| iOS Release Simulator build | PASS |
| Android production JS export | PASS |
| npm run verify | FAIL: существующие 11 unmitigated npm advisories |

Логи проверок находятся рядом. `gates.json` и `remaining-gates.json` содержат exit codes. Финальный `verify-final.log` показывает точные 11 advisory URL. Ошибки baseline-аудита были теми же; исключения security gate не добавлялись и зависимости ради этого отчёта не обновлялись.

Перед завершением просмотрены git diff --name-only и git diff -U0. Множество UI-изменений в общем diff существовало до работы. Собственная оптимизация не меняет пользовательские строки; конвертация App Shortcuts сохраняет существующие переводы и токены. Локализация проверена. UI actions и attribution/revenue assertions не ослаблялись.

## Границы результата

Подтверждены уменьшение лишней записи на диск, корректность изменённых транзакций/hook в тестах, успешная Release Simulator сборка и перечисленные UI smoke paths. Не измерены startup p50/p95, JS/UI FPS, память, энергопотребление, реальные shields, device attribution/revenue, Android runtime и PRO native happy path. Полная проверка выпуска остаётся заблокирована security advisories. Абсолютная гарантия отсутствия любых регрессий на всех устройствах не заявляется.

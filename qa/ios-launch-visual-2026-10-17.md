# iOS: восстановление запуска и визуальная проверка, 17 октября 2026

Продолжение [UX/UI исправлений](ux-ui-fixes-2026-10-16.md). Проверен текущий dirty working tree поверх `738ad71`: native Debug 8.0.1 (133), Xcode 27.1 beta, x86_64 Simulator. Native dylib SHA256: `1ca1be9c0c7f3f10702a7f988a8ff59b577da5e18d5a52a158a4145c76ec84e6`. App.js SHA256: `c6f532d628b9be017ac01427b098e4485bcd05455581a30c7c9ff628cae97c3d`.

## Причина запуска и исправления

На macOS 27.0.1 отсутствовала рабочая Rosetta: `arch -x86_64 /usr/bin/true` завершался Bad CPU type ещё до приложения. Пользователь явно подтвердил лицензию; `softwareupdate --install-rosetta` успешно установил Rosetta, системный x86_64 check и запуск приложения после этого проходят.

Простое обновление OCR эту необходимость не устраняет. В проекте GoogleMLKit 8.0.0 / MLImage beta7. Проверены опубликованные версии, podspec и официальный бинарник последней MLImage beta8: `EXCLUDED_ARCHS[sdk=iphonesimulator*] = arm64`, ARM64 object имеет platform IOS, не IOSSIMULATOR. Источники: [Google release notes](https://developers.google.com/ml-kit/release-notes), [MLImage beta8 podspec](https://github.com/CocoaPods/Specs/blob/master/Specs/0/a/c/MLImage/1.0.0-beta8/MLImage.podspec.json), [Apple: Rosetta](https://support.apple.com/en-us/102527). OCR и SDK не удалялись/не обновлялись. Отказ от Rosetta потребует другой совместимой реализации OCR с отдельной проверкой качества и языков.

Свежая сборка выявила дополнительный дефект: `onProgress` нового native edge-компонента конфликтовал с прямым событием другого RN-компонента и вызывал RedBox при старте. Событие переименовано в `onEdgeBackProgress` в Swift, bridge и JS. В текущем Fabric legacy UIKit edge-view отображался, но не передавал жесты: проверены размер зоны и несколько свайпов; попытка UIPan не решила проблему и отменена. Fabric теперь использует существующий PanResponder-путь с теми же RTL/release/cancel правилами и Animated translation. UIKit-путь сохранён для legacy renderer. Добавлены два постоянных regression tests; всего восемь.

В Today отступ справа от основного CTA распространён со screen width ≤390 на все размеры. Такой же резерв добавлен заголовку Recent events / View all: монета больше не закрывает ссылку в проверенном первом viewport. Все callbacks сохранены; текст продукта не менялся.

## Runtime и визуальное покрытие

Использованы только собственные Simulator: iPhone 17 / iOS 26.5, 402×874 pt; iPhone SE3 / iOS 17.0, 375×667 pt. Синтетический локальный профиль UX iOS QA, пустая история и стандартные карточки. Подписки/покупки не подменялись. Текущий JS подавался локально; LogBox скрыт только во временной QA-копии bundle, production source не менялся. Первые диагностические кадры с красной краевой полосой не используются как финальные цветовые проверки.

Функционально выполнены и отдельно просмотрены изображения исходного разрешения:

- Today → решение → inline «+» → реальная форма. Проверены обычный и компактный viewport; на компактном нижние действия достигаются прокруткой. После final gutter CTA и View all справа заканчиваются примерно на x284 pt при402 pt; монета начинается около x306 pt, зазор около22 pt.
- Короткий краевой свайп сохраняет экран решения; длинный после отпускания возвращает Today. Те же cancel/release пути проверены для формы; отдельная кнопка Cancel возвращает к решению. Видео и его полноразмерные промежуточные кадры показывают смещение контента до завершения жеста; нижняя навигация остаётся на месте. Это не измерение FPS/latency.
- Progress, Profile и Settings в светлой теме; Settings/Progress/Today в тёмной на26.5. На17 просмотрены компактные Progress/Profile/Settings и реальное переключение Light→Dark. Hero, заголовки и кнопки не пересекаются в рассмотренных состояниях.
- Arabic RTL, тёмная тема, accessibility-extra-extra-extra-large на375×667: переход через иконку Profile и строку Settings, затем чистый финальный снимок Settings. Заголовки/подписи справа, back смотрит вправо, forward — влево; подписи табов помещаются. Попытка перехода до готовности UI не прошла; повтор после визуального подтверждения готовности прошёл. Это не PASS всех зон нажатия каждой RTL-подписи.
- Реальные PlatformSurface/PlatformPressable отдельно в component preview на обеих iOS: light/dark и PRO indigo/emerald/sunset/gold/violet/aqua. Просмотрены все восемь палитр; нажатие primary увеличивает видимый счётчик. Это проверка общих компонентов и native материалов, не полных Premium-экранов.

В повторном просмотре первых/средних/последних табов иконки, подписи и selected material остаются в своих областях. Приблизительные горизонтальные центры для26.5:64/133/201/270/339 pt; для17:56/122/188/254/320 pt. На рассмотренных полноразмерных кадрах смещение icon/label визуально не превышает примерно2 pt. Это ручная пиксельная оценка; полная инструментальная cold/immediate/settled матрица всех табов не выполнена.

Применены [Apple Design skill](/Users/sasarei/.codex/skills/apple-design/SKILL.md) и [семь UX-правил](../UX_RULES.md). Основное действие решения, вторичные spend/later/edit/add и back/cancel сохранены. Группировка настроек, отдельный акцент primary, прогресс и доступность действий рассмотрены в перечисленных состояниях. Форма с введённым синтетическим именем и клавиатурой просмотрена на26.5; полноценная keyboard matrix компактных форм не заявляется.

## Проверки и ограничения

`xcodebuild -workspace ios/Almost.xcworkspace -scheme Almost -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath <task-temp>/ios-build -jobs 3 ARCHS=x86_64 ONLY_ACTIVE_ARCH=YES CODE_SIGNING_ALLOWED=NO build` — BUILD SUCCEEDED после окончательного native исправления. Промежуточная попытка UIPan имела ошибку override; эксперимент отменён. Один incremental build сообщил о устаревшем PCH RCTDeprecation, затем пересоздал bridging header и завершился успешно.

`npm run check:functional-parity` — PASS258 контрактов /2190 fragments /45 reachability patterns; `npm run check:localization` — PASS12 языков, native permissions и shortcuts; `npm run check:themes` — PASS3 темы /6 PRO accents; `node --test scripts/tests/ui-design-regressions.test.js` — PASS8; `npm run verify` — exit0, включая analytics/native-config и остальные gates. ESLint0 errors /434 существующих warnings. `git diff --name-only`, `git diff -U0` и `git diff --check` просмотрены; новых продуктовых строк в этом этапе нет. Предыдущие пользовательские изменения сохранены.

Остаточное покрытие: iOS27 ARM64-only Simulator с текущей OCR-зависимостью не поддерживается;15.5 runtime не проверен. Все страницы/состояния приложения, полные PRO-экраны, все локали, VoiceOver, OS Reduce Motion/Transparency, release purchases/restore/manage и attribution E2E не пройдены. Android заново в этом этапе не запускался; две новые shared layout-правки имеют статические проверки, предыдущий Android runtime-прогон описан в основном отчёте. Полного release GO этот прогон не даёт.

Один снимок сразу после смены Light→Dark показал светлый native material под белыми иконками; последующий settled снимок тех же Settings корректен. Частота/длительность эффекта и его наличие в release не измерены; immediate theme-transition coverage остаётся частичной. Shopping Pause на Simulator показывает ошибку обновления блока; entitlement/device-путь этой функции не проверен. Неудачные селекторы/ранние нажатия, абсолютный путь takeScreenshot и cache старого Metro bundle исключены из PASS; финальный JS проверен по наличию Fabric guard и обоих gutters.

## Cleanup

Очистка завершена и проверена: удалены вся task-директория `/tmp/almost-ios-visual-20261016` и временная копия skill `/tmp/apple-design-read.txt`, включая DerivedData, JS bundles, кэши задачи, снимки, видео, сырые логи, Maestro outputs, fixtures и backups. Metro8095, server8096 и собственные workers остановлены; оба собственных Simulator выключены. Исходный AsyncStorage восстановлен и побайтно сравнен с backup, временный RCT_jsLocation удалён, content_size возвращён в large. Сохраняются текстовые QA summaries, source и постоянные tests. Rosetta оставлена как необходимый runtime; существующие Simulator registrations и установленные app/data containers сохранены, поскольку стирание данных Simulator запрещено инструкциями. Чужие процессы/данные, shared caches, зависимости и signing material не очищались. Временные пути отсутствуют, порты задачи больше не слушаются.

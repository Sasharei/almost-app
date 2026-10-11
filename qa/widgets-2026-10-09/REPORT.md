# Проверка виджетов Almost — 9 октября 2026

**Результат: NO-GO для виджетов.** На iPhone воспроизведены заглушка и отказ обновления WidgetKit. На Android новые сцены отображаются с искажёнными пропорциями. Код приложения не изменён; это отчёт QA, а не исправление.

## Сборки и среда

- Исходники: `f00f847dbed3c0c2dc9dfe76ba1779909605ebe7`, версия проекта 8.0.1 / 131. Основные новые сцены появились в `ce5ce5b`.
- iPhone 17, iOS 27.0, отдельный симулятор `Almost Widget QA Oct9`, UDID `34CFF13D-B0E8-43BC-A199-BBE4C16BCBDF`, скриншоты 1206×2622.
- iOS: текущий нативный WidgetExtension собран в Release для arm64 simulator. Для подачи синтетических данных использован временный SwiftUI host с тем же bundle ID и App Group. Это **не** полный тест установленной App Store-сборки и не подтверждение рабочего обмена данными между React Native и виджетом.
- Android 16 / API 36, `sdk_gphone64_arm64`, эмулятор `Almost_Savings_Release_E2E_Oct8`, `emulator-5554`, Pixel Launcher, скриншоты 1280×2856, density 480. Свежая сборка `assembleDebug` текущих исходников. Прежнее тестовое приложение в этом QA AVD заменено; реальные пользовательские данные не использовались.
- Данные: локальные fixtures, баланс $120.50, сегодня $7.25, цель $500 / накоплено $120.50, бюджет $1000 / остаток $650. Без аккаунтов, покупок и публикации.

## Инвентаризация

Проверены зарегистрированные домашние виджеты: iOS `Almost_Widget` в размерах small / medium / large; Android `AlmostWidgetSmallProvider`, `AlmostWidgetProvider`, `AlmostWidgetLargeProvider`. Отдельно проверено отображение iOS `WalletExpenseLiveActivity`: экран блокировки, compact и expanded Dynamic Island.

Новые состояния: `savings_guard`, `spending_fire`, `empty_treasury`, `neglected` / `neglected_long`; fallback — обычный баланс. Старые файлы `ios/AlmostWidget` и шаблон Control Widget не зарегистрированы в текущем WidgetBundle и не считались доступными пользователю виджетами.

## Матрица выполненной проверки

Здесь считаются восемь групп сценариев, а не все сочетания размеров, языков и тем. Итог: **1 PASS, 5 FAIL, 2 BLOCKED, 0 SKIPPED**. В группе iOS обновлений наблюдалось переменное отображение большого виджета: сохранение заглушки, позднее появление сцены или старого баланса. Это не отменяет зафиксированный FAIL.

| ID | Сценарий | Семантика / поведение | Визуальный результат | Итог |
|---|---|---|---|---|
| QA-W001 | iOS small, активная новая сцена | WidgetKit отклоняет архив изображения 1254×1254 | Старое пустое состояние вместо новой сцены | FAIL |
| QA-W002 | iOS medium + large вместе со small | Зафиксирован отказ пакета обновления всех трёх families; retry через час | Large — заглушка; medium — старое пустое состояние. Large позднее также отобразил сцену и баланс | FAIL |
| QA-W003 | Android новые сцены | Savings и neglected просмотрены в трёх размерах; fire — dark/ru large; treasury — pro/gold/ar large | Персонаж и текст вытянуты по вертикали | FAIL |
| QA-W004 | Android просроченный и повреждённый контекст | Истёкшая savings-сцена и неверный JSON возвращают обычный баланс во всех трёх размерах | Большие пустые области; тесные/усечённые подписи бюджета | FAIL |
| QA-W005 | Android пустое состояние и галерея | Виджеты добавляются через Pixel Launcher | Малый виджет чрезмерно высокий; Spend в preview почти не читается | FAIL |
| QA-W006 | iOS Live Activity, только нативное отображение | Синтетическая Activity создана; сумма, название и merchant переданы | Три представления отображаются, персонаж и текст видны, обрезания короткой fixture нет | PASS в этом ограниченном объёме |
| QA-W007 | Действия и конечные экраны приложения | Android Save / Spend / Home отправляют Intent в MainActivity. Конечный React Native экран не подтверждён; iOS end-to-end также не подтверждён | Debug Android показывает `Unable to load script`; запуск локального Metro и повторная попытка не дали подтверждённого конечного экрана | BLOCKED |
| QA-W008 | Полная матрица новых iOS сцен, тем и локалей | Архивирование и сохранённые timeline мешают достоверно проверить смену всех состояний | Нет подтверждённого покрытия всех четырёх сцен × трёх families × тем/языков | BLOCKED |

Android переходы проверялись подачей контекста с искусственно старым `eventAt`, а не ожиданием 4–6 часов. Реальное автоматическое обновление по таймеру и восстановление после перезагрузки не сертифицированы.

## WGT-001 — High: iOS отклоняет изображения новых сцен

Условия: текущий Release WidgetExtension, iPhone 17 / iOS 27.0, light, синтетический `savings_guard`, `widget_has_data=true`. Ошибка неоднократно воспроизведена в системном логе.

1. Установить extension в приложение с нужным App Group.
2. Добавить малый Almost Widget; также добавить medium и large.
3. Передать свежий контекст savings и запросить обновление timeline.
4. Проверить домашний экран и лог WidgetKit / chronod.

Факт: `WidgetArchiver.ArchivingError.imageTooLarge(size: (1254,1254), maximumSize: (1084.6,986.0))`. Площадь изображения 1 572 516 px превышает разрешённые для small 1 069 415.6 px. Системный лог также фиксирует отказ общего reload для medium / small / large и `timelineReloadFailed` с повторной попыткой через час.

Ожидается: актуальная сцена и данные, без постоянной заглушки или сохранения старого пустого состояния. Влияние High: основная функция виджета — показ актуальных данных — блокируется.

Все четыре новых iOS asset имеют универсальное изображение 1254×1254. Установка `.frame` / `.scaledToFit` в SwiftUI не устранила наблюдаемую ошибку архива. Конкретный отказ доказан для small; отказы medium/large в общем пакете также подтверждены логом. Нельзя утверждать, что каждый размер отдельно всегда превышает собственный лимит.

Доказательства: [заглушка large и старый medium](ios-large-medium-treasury-placeholder.png), [small со старым пустым состоянием](ios-savings-light.png), [ошибка размера](ios-image-too-large.log), [отказ пакета и retry](ios-batch-reload-failure.log). В имени первого скриншота указан запрошенный fixture; фактически новая treasury-сцена на нём не отрисована.

Это подтверждённый механизм, который может объяснять присланную пользователем заглушку. Версия iOS и установленная сборка на реальном iPhone пользователя неизвестны, поэтому точное совпадение причины на его устройстве ещё не доказано.

## WGT-002 — Medium: Android растягивает новые сцены

Условия: текущий debug APK, Android 16 / API 36, Pixel Launcher; savings/light/en, neglected/light/de, fire/dark/ru, treasury/pro/gold/ar. Повторяется на small, medium и large в просмотренных состояниях.

1. Добавить все три размера Almost через галерею Pixel Launcher.
2. Передать свежий контекст новой сцены через QA instrumentation.
3. Просмотреть виджеты на домашних страницах.

Факт: кот и буквы вытягиваются по вертикали, контуры текста размываются. Ожидается: естественные пропорции персонажа и шрифта независимо от размера host-области. Влияние Medium: сцена остаётся доступной, но читаемость и качество нарушены.

В исходниках `AlmiWidgetGuardian.kt:49–56` bitmap строится по `OPTION_APPWIDGET_MIN_WIDTH` и `MIN_HEIGHT`; затем `almi_widget_scene.xml:4` растягивает его на весь host через `fitXY`. Это подтверждённый путь растяжения; подбор правильной пары размеров для ориентации требует отдельного исправления и повторной проверки.

Доказательства: [small savings](android-small-savings.png), [medium savings](android-medium-savings.png), [large savings](android-large-savings.png), [neglected small](android-small-neglected.png), [neglected medium](android-medium-neglected.png), [neglected large](android-large-neglected.png), [fire dark/ru](android-large-fire-dark-ru.png), [treasury pro/ar](android-large-treasury-pro-ar.png). Первые английские savings captures использовали синтетическую подпись; de/ru/ar — текущую копию из `almiWidgetCopy.js`.

## WGT-003 — Medium: Android обычные виджеты плохо распределяют пространство

Условия: та же сборка / AVD; fallback balance, light/en и dark/en; 3 размера. Повторилось после истечения сцены и повреждённого JSON.

1. Добавить виджеты штатным способом, без ручного растягивания.
2. Подать просроченный контекст либо повреждённый JSON, сохранив финансовые данные.
3. Просмотреть обычный баланс.

Факт: small и medium содержат большую пустую область между метриками и действиями; в large карточка последних событий почти целиком пустая. Подписи бюджета усечены или почти соприкасаются с суммой. Ожидается: полезная компактная группировка и читаемые подписи с зазором. Влияние Medium: виджет занимает много места, но затрудняет считывание информации.

Доказательства: [small](android-small-expired.png), [medium](android-medium-expired.png), [large light](android-large-expired.png), [large dark](android-large-corrupt.png). Save и Spend в фактическом balance различаются по уровню важности; их подписи здесь читаются. Наблюдение о низком контрасте preview ниже к ним не относится.

## WGT-004 — Low: Spend почти не читается в Android preview

Условия: галерея Pixel Launcher, preview малой карточки, стандартная светлая тема галереи; обнаружено один раз при добавлении.

1. Открыть Widgets в Pixel Launcher.
2. Развернуть группу Almost.
3. Посмотреть preview с кнопками Save / Spend.

Факт: светлый текст Spend сливается со светлым фоном; preview также выглядит чрезмерно высоким. Ожидается: читаемый preview, корректно представляющий размер и действия. Влияние Low: ухудшается выбор виджета, но установленный balance использует другой читаемый цвет Spend.

Доказательство: [галерея Android](android-gallery.png).

## WGT-005 — Medium: новые Android сцены игнорируют PRO accent

Условия: treasury, `widget_theme_id=pro`, `widget_pro_theme_accent_id=gold`, ar / RTL. Обнаружено в одном native fixture; остальные accents не просмотрены отдельно.

1. Передать PRO/gold fixture.
2. Включить новую treasury-сцену.
3. Посмотреть фон виджета.

Факт: фон остаётся фиолетовым. Новый renderer выбирает жёстко заданные `#EAE1FF` / `#FFFAFF` для любого PRO и не читает accent. Ожидается: согласованное применение выбранного PRO accent. Влияние Medium: виджет не соответствует выбранной теме. Переключение всех шести accents в полном приложении ещё не подтверждено.

Доказательство: [treasury PRO/gold/ar](android-large-treasury-pro-ar.png), `AlmiWidgetGuardian.kt:61–62,85`.

## UX, локализация и темы

Основное действие пустого состояния и новых сцен — открыть Almost. В balance основное действие Save, вторичное Spend, дополнительные — открыть приложение / iOS daily summary. В Live Activity основное действие — открыть bank-expenses. Галерея использует привычный системный выбор и добавление виджета. У заглушки нет понятного статуса восстановления или полезного продолжения.

Проверены семь правил: Fitts — точные hit areas и крупный текст не сертифицированы; Hick — число действий небольшое, Save выделен; Zeigarnik — заглушка не объясняет незавершённое обновление; Jakob — системная галерея знакома; goal-gradient — проценты synthetic goal правдоподобны, есть разница округления today 72% Android / 73% iOS; Von Restorff — иерархия balance сохраняется, preview имеет дефект контраста; Miller — есть группы метрик, но Android пространство распределено плохо. UX review выявил нарушения, общего UX PASS нет.

Код, UI и пользовательские строки не менялись. Локализация проверена валидатором во всех 12 ресурсах (`en`, `es`, `fr`, `ru`, `de`, `pt`, `it`, `ar`, `zh`, `zh-Hant`, `ko`, `ja`); новые переводы не требовались. Визуально sampled Android light/en+de, dark/ru+en, pro/gold/ar. Это не визуальный PASS для всех языков, RTL, трёх тем и шести PRO accents. На iOS новые сцены не прошли полный visual theme review из-за отказа/кэширования timeline.

Live Activity native screenshots: [compact](ios-live-compact.png), [экран блокировки](ios-live-lock.png), [expanded](ios-live-expanded.png). Короткие синтетические строки читаются и содержатся в карточке. Длинные суммы, accessibility text, все локали, минимальное представление при нескольких Activity и routing не подтверждены.

## Проверки и ограничения

`npm run verify` завершился с кодом 0: widget tests, functional parity, attribution/analytics contracts, native analytics config, typecheck, lint, localization, themes, security, backend tests и release parity. Отдельные localization / theme / functional parity gates также прошли. Сборки Android debug и iOS Release extension прошли. [Краткий лог проверок](verification-summary.txt).

Существующие предупреждения: lint — 433 warnings / 0 errors; проверка размера debug APK — 84.4 MB при baseline 71.3 MB, ниже лимита 100 MB. Это не замер release-производительности и не доказательство отсутствия runtime-дефектов.

Материальные пробелы: реальные iPhone/Android и App Store/Play release; минимальные поддерживаемые ОС и маленькие экраны; Android сторонние launchers / landscape / resize; cold/immediate/settled матрица каждого состояния; Dynamic Type / font scaling; VoiceOver/TalkBack; все языки и accents; реальные таймеры, reload после reboot; полный React Native → native storage → timeline путь; save/spend/summary/bank-expenses с конечным экраном и возвратом. Попытка отдельного iOS 26.5 x86_64 симулятора не дала рабочего UI и не засчитана.

Скриншоты исследованы в исходном разрешении. Семантическое выполнение Maestro не использовано как доказательство визуального PASS. В `harness/` сохранены синтетические данные и вспомогательные файлы для повторения; это экспериментальная QA-инфраструктура с конкретными ID устройств, не продуктовый тест и не валидатор App Group integration.

Следующий приоритет: устранить WGT-001 и WGT-002, затем повторить native матрицу и проверить конечные действия в целых release-сборках. Текущий итог — **NO-GO**, исправлений или публикации в этой проверке нет.

# Проверка интеграции Алми

## Подтверждено

- iOS WidgetExtension: Release build для iphoneos без подписи — BUILD SUCCEEDED. WidgetStorage.swift дополнительно прошёл Swift syntax parse.
- Android: Kotlin/resources compile и свежий assembleDebug — BUILD SUCCESSFUL, без запуска приложения или эмулятора. Свежий debug APK 84,4 MB при лимите 100 MB; gate предупреждает о росте относительно общего baseline 71,3 MB. Это не измерение release-размера и не изолированная оценка изменения виджетов.
- `npm run test:widgets`: 3 теста проходят. Реальные события, неизвестный бюджет, истечение TTL, повторная синхронизация и 365 дней отсутствия; непосредственно нативный iOS Foundation resolver сопоставлен с моделью на границах всех сцен.
- Prototype Guardian: 6 тестов проходят, включая повреждённые данные и конечное штатное состояние timeline.
- Localization, themes, functional parity (243 contracts), typecheck и lint — проходят; lint сохраняет существующие warnings.
- Analytics contract, native analytics config, attribution, notification, UI session, engagement, shopping blocker и bank expense tests — проходят.
- Отдельные security tests, backend tests и release/runtime parity gate — проходят. `verify` останавливается на security-audit: критическая уязвимость существующих backend dependencies. Backend lockfiles в этой задаче не изменялись; gate не ослаблен.
- Браузерный макет: 312 сочетаний — 13 кодов языка × 3 размера × light/dark/6 PRO акцентов; геометрия сцены без переполнения карточки. В сценах нет цифр/кнопок, одна реплика и крупная иллюстрация. Демонстрационные переходы сцены, «Копить» и «Тратить» работают.

## UX review

Сцена имеет одно основное действие — вся карточка открывает приложение; декоративный кот исключён из accessibility, подпись и действие объединены. Обычные действия и данные возвращаются после TTL, callback wiring сохранён. Рассмотрены Fitts, Hick, Zeigarnik, Jakob, goal-gradient, Von Restorff, Miller: нет конкурирующих действий в сцене, выдуманного прогресса или новых разрешений. Финансовые сцены требуют реальных событий. Пустые и некорректные данные возвращают существующий экран. Дизайн-макет проверен в light/dark/pro, включая RTL и PRO акценты; это браузерная проверка.

## Ограничения

Нативные скриншоты и runtime-поведение iOS/Android не проверены: разрешения на запуск симуляторов/эмуляторов/устройств в разговоре нет. Браузерные снимки не доказывают native визуальную иерархию, Dynamic Type, произвольный размер/ориентацию Android host или системную доставку timeline. Offline, Doze, Low Power, смена часов/языка, перезагрузка и продолжительное отсутствие на устройствах требуют отдельной проверки. Release-профилирование производительности не проводилось; ускорение не заявляется.

Сохранены `mascot-light.png`, `mascot-dark.png`, `mascot-pro.png`, `mascot-small-ar.png`, `mascot-small-ru.png`, `mascot-large.png` в `output/playwright/almi-widget-review/`. Макет открывается локально без сервера. Нативные исходники подключены, но окончательная визуальная проверка на обеих платформах остаётся обязательной перед выпуском.

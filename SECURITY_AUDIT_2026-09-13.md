# Аудит безопасности Almost — 13 сентября 2026

> Исторический снимок до исправлений. Текущее состояние и оставшиеся действия: [SECURITY_FIXES_2026-09-13.md](/Users/sasarei/Downloads/almost_clean/SECURITY_FIXES_2026-09-13.md).

Проверены текущий рабочий код React Native, backend Express, настройки iOS/Android, хранение секретов, проверка покупок, webhook-и, ограничения запросов и npm-зависимости. Существовавшие незакоммиченные изменения включены в проверяемое состояние и не изменялись.

Это аудит исходников и локальные проверки backend на синтетических данных. Production-сервер, аккаунты магазинов, действующие покупки, IPA/APK и сетевой трафик мобильного release-приложения не тестировались. Симуляторы и устройства не запускались. Факт внешней компрометации не установлен.

## Результат и приоритеты

| ID | Приоритет | Проблема | Доказательство |
|---|---|---|---|
| SEC-01 | Высокий, исправить первым | Android release-ключ и пароль сохранены в Git | Ключ открывается, содержит PrivateKeyEntry |
| SEC-02 | Высокий | Отменённая/ожидающая оплаты Google-покупка признаётся активной | Локальный вызов валидатора с ответами Google-заглушки |
| SEC-03 | Высокий | Потеря привязки installSecret при вытеснении из LRU | После 50 000 регистраций старый installId принимает новый секрет |
| SEC-04 | Высокий | Покупка не привязывается к подтверждённому владельцу | Чужой obfuscatedExternalAccountId не мешает выдаче backend premium |
| SEC-05 | Средний | Обход ограничителя запросов | Замена X-Forwarded-For: HTTP 429 → 200; смена installId также обходит лимит |
| SEC-06 | Средний | Кэш идемпотентности общий для всех пользователей | Пользователь B получает entitlement пользователя A |
| SEC-07 | Высокий при отсутствии RTDN-секрета | Поддельный Google webhook отзывает premium | Неавторизованный voidedPurchaseNotification меняет тестовую запись |
| SEC-08 | Средний, зависит от native runtime | Некриптографический fallback installSecret и AsyncStorage | Ветка без crypto воспроизведена отдельно |
| SEC-09 | Средний для процесса выпуска | Уязвимые зависимости и неполное покрытие security gate | npm audit и остановка npm run verify |

Backend entitlement не является единственным источником premium в мобильном интерфейсе: App.js получает статус через RevenueCat. Поэтому SEC-02/04/07 подтверждают нарушение серверного состояния; разблокировка или блокировка реального приложения только этим способом не доказана.

## SEC-01. Приватный ключ подписи Android доступен читателям репозитория

Файлы [release.keystore](/Users/sasarei/Downloads/almost_clean/android/app/release.keystore) и [keystore.properties](/Users/sasarei/Downloads/almost_clean/android/keystore.properties:2) отслеживаются Git. В properties присутствуют пароли хранилища и ключа. [build.gradle:257](/Users/sasarei/Downloads/almost_clean/android/app/build.gradle:257) использует их для release signing. `keytool -list` с паролем из properties завершился успешно и показал PrivateKeyEntry. Последний коммит, затрагивающий эти пути: `aa0df10`, 2026-04-01. Значения секретов не выводились.

Получивший копию репозитория получает материал для подписи. Не установлено, является ли ключ только upload key или также app signing key опубликованного приложения. Upload key сам по себе не предоставляет доступ к Play Console. Эти роли и процедура замены различаются: [Android app signing](https://developer.android.com/studio/publish/app-signing).

Исправление: вынести ключ и пароли в защищённое хранилище/секреты CI, исключить их из отслеживания; проверить доступ к истории репозитория и копиям. Определить роль ключа в Play Console и согласовать его замену. Удаление только из последнего коммита не удаляет материал из истории. В рамках аудита ключ не удалялся и история Git не переписывалась.

## SEC-02. Отсутствие consumption не доказывает оплату

[backend/src/validators/google.js:65](/Users/sasarei/Downloads/almost_clean/backend/src/validators/google.js:65):

```js
const isActive = purchaseState === 0 || consumedState === 0;
```

По [Google ProductPurchase](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products), purchaseState=1 означает отмену, 2 — ожидание оплаты; consumptionState=0 означает только отсутствие consumption. Оба состояния при consumptionState=0 локально дали `isActive=true`. [server.js:580](/Users/sasarei/Downloads/almost_clean/backend/src/server.js:580) записывает этот результат в `isPremium`.

Исправление: требовать подтверждённое состояние оплаты; отдельно применять правила consumption для конкретного типа продукта. Добавить проверки pending, canceled/refunded, malformed/empty purchaseState и lifetime-покупки. Тесты должны проверять итоговую запись entitlement, а не только парсер.

## SEC-03. Авторизационные привязки хранятся в вытесняемом кэше

[entitlementsStore.js:8](/Users/sasarei/Downloads/almost_clean/backend/src/store/entitlementsStore.js:8) ограничивает installSecretBindings 50 000 записями. [Строка 191](/Users/sasarei/Downloads/almost_clean/backend/src/store/entitlementsStore.js:191) воспринимает отсутствие записи как новую установку и регистрирует переданный секрет.

Локально: зарегистрирован тестовый владелец → добавлено 50 000 установок → его прежний installId принял секрет атакующего с `registered=true`. HTTP endpoint регистрации публичен. Для захвата конкретной установки нужно знать её installId; это идентификатор, который код также использует в аналитике, а не отдельный секрет. Отсутствие STORE_PATH добавляет потерю привязок при рестарте; несколько экземпляров сервера имеют независимую память. Наличие файловой персистентности не устраняет вытеснение из LRU.

Исправление: постоянная общая база с уникальностью installId, атомарной первоначальной регистрацией и отдельным подтверждённым восстановлением. Вытеснение кэша не должно разрешать перерегистрацию существующей личности.

## SEC-04. Проверена покупка, но не её принадлежность текущей сессии

[Apple validator:51](/Users/sasarei/Downloads/almost_clean/backend/src/validators/apple.js:51) принимает transactionId, но не сравнивает возвращённый appAccountToken с владельцем сессии. [Google validator:75](/Users/sasarei/Downloads/almost_clean/backend/src/validators/google.js:75) возвращает obfuscatedExternalAccountId как originalTransactionId; [server.js:548](/Users/sasarei/Downloads/almost_clean/backend/src/server.js:548) проверяет только предыдущую встречаемость идентификаторов, затем выдаёт entitlement отправителю.

В локальном HTTP-тесте Google-заглушка вернула покупку другого владельца, а авторизованный отправитель получил `isPremium=true`. Нужно обладать действительной ссылкой на покупку; произвольный выдуманный токен этим способом не проходит Google API. Для iOS вывод основан на просмотре кода, без реального обращения к Apple.

Антиповтор ограничен LRU 20 000 записей и стандартным TTL 24 часа: [store:12](/Users/sasarei/Downloads/almost_clean/backend/src/store/entitlementsStore.js:12), [config:64](/Users/sasarei/Downloads/almost_clean/backend/src/config.js:64). После потери записи повторная привязка покупки к другому пользователю больше не блокируется этим механизмом.

Исправление: постоянная связь transaction/purchaseToken с подтверждённым владельцем, явная проверка account identifiers и согласованный restore/transfer flow. Добавить серверный allowlist premium-продуктов. Сохранить RevenueCat единственным отправителем lifecycle postback в AppsFlyer.

## SEC-05. Клиент управляет ключами rate limit

[server.js:86](/Users/sasarei/Downloads/almost_clean/backend/src/server.js:86) безусловно доверяет первому X-Forwarded-For. Локально после исчерпания лимита смена только этого заголовка дала HTTP 200 вместо 429. На production применимость зависит от очистки заголовка reverse proxy; его конфигурация не проверялась.

Независимо от proxy, [server.js:138](/Users/sasarei/Downloads/almost_clean/backend/src/server.js:138) ограничивает пару IP+installId. Новый installId создаёт новый лимит: 11 разных установок с одного соединения приняты при лимите 10. Это облегчает массовую регистрацию и SEC-03; обращения к магазинам также могут расходовать квоты.

Исправление: доверять только явно настроенным proxy и использовать проверенный req.ip; вводить отдельные ограничения по IP, подтверждённой личности и глобальному ресурсу. См. [Express behind proxies](https://expressjs.com/en/guide/behind-proxies/).

## SEC-06. Ответы идемпотентности не изолированы по пользователю

[server.js:484](/Users/sasarei/Downloads/almost_clean/backend/src/server.js:484) ищет ответ только по пользовательскому `idempotency-key` и возвращает его до проверки схемы тела. [store:174](/Users/sasarei/Downloads/almost_clean/backend/src/store/entitlementsStore.js:174) не добавляет namespace владельца/операции.

Локально пользователь B со своей корректной сессией, пустым телом и ключом, ранее использованным A, получил entitlement A, включая appUserId и сведения о покупке. Нужно знать/угадать ключ или добиться коллизии; перечисление случайных ключей не доказано. Текущий мобильный клиент сам этот заголовок не устанавливает, поэтому обычный пользовательский поток не создаёт таких записей.

Исправление: ключ `(authenticatedUserId, endpoint, idempotencyKey)`, проверка схемы до lookup, сохранение fingerprint запроса и HTTP-статуса; несовпадающее тело должно отклоняться.

## SEC-07. Google RTDN работает без аутентификации при пустом секрете

[server.js:229](/Users/sasarei/Downloads/almost_clean/backend/src/server.js:229) пропускает webhook при отсутствии expectedSecret. Production startup не требует GOOGLE_RTDN_SECRET. [webhooks/google.js:106](/Users/sasarei/Downloads/almost_clean/backend/src/webhooks/google.js:106) разрешает voided notification даже при неудачной проверке покупки, а fallback appUserIdHint приходит из запроса. [server.js:735](/Users/sasarei/Downloads/almost_clean/backend/src/server.js:735) записывает отзыв entitlement.

В локальной production-конфигурации без Google webhook secret startup validation прошла; POST без credentials с выдуманными token/orderId и appUserId тестовой жертвы снял premium. Настоящая проверка покупки в этом сценарии не требовалась.

В имеющемся backend/.env GOOGLE_RTDN_SECRET заполнен: это условная уязвимость небезопасной конфигурации, а не доказательство открытого production endpoint. Исправление: fail closed для включённого endpoint; проверять подписанный Pub/Sub OIDC token и его audience/issuer/service account либо иной явно согласованный механизм доставки. Не доверять переданному appUserIdHint без доказанного владения. [Google Pub/Sub push authentication](https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions).

## SEC-08. installSecret имеет слабый fallback и хранится как обычные данные

[App.js:1662](/Users/sasarei/Downloads/almost_clean/App.js:1662) использует Date.now+Math.random, если crypto API недоступен. Это не криптографический генератор. В изолированной проверке 1000 вызовов этой ветки 457 значений имели длину менее 32 символов; наблюдавшийся диапазон — 28–33. Backend требует минимум 32. [App.js:73173](/Users/sasarei/Downloads/almost_clean/App.js:73173) повторно генерирует короткие значения, что может приводить к отказам/смене credential.

[App.js:69984](/Users/sasarei/Downloads/almost_clean/App.js:69984) загружает секрет вместе с AsyncStorage, [73182](/Users/sasarei/Downloads/almost_clean/App.js:73182) сохраняет его через queuePersist. Компрометация локального хранилища даёт долговременный credential для backend. Удалённое извлечение данных из AsyncStorage не доказано; наличие crypto именно в release runtime не проверялось.

Исправление: гарантированный native CSPRNG и фиксированная достаточная длина, хранение в Keychain/Keystore через защищённое API; миграция должна сохранить существующую серверную привязку. Нельзя просто заменить уже зарегистрированный секрет новым.

## SEC-09. Зависимости и security gate

Актуальный npm audit:

| Дерево | High | Moderate | Low | Всего записей |
|---|---:|---:|---:|---:|
| Корень приложения | 9 | 0 | 1 | 10 |
| backend | 2 | 5 | 1 | 8 |

Это число уязвимых пакетов/транзитивных путей, а не число независимых эксплуатируемых дыр в мобильном release.

В корне появились предупреждения для joi 17.13.4 и js-yaml 4.3.1/3.15.1. Они относятся к инструментам сборки/конфигурации; обработка удалённого ввода этими пакетами в мобильном приложении не установлена. [js-yaml advisory](https://github.com/advisories/GHSA-2883-xcg3-v3hh). Уязвимые ICNS/HEIF/JXL парсеры image-size уже отключены патчем Metro; ICNS-проверка дала `disabled file type: icns`. Нельзя приравнивать все транзитивные high от image-size к отсутствию защиты.

Backend: form-data 4.0.5, path-to-regexp 0.1.12, qs 6.14.2, uuid 9.0.1 и body-parser 1.20.4 имеют advisories. Для path-to-regexp текущие маршруты не содержат опасного сочетания нескольких параметров; JSON body limit задан валидным `1mb`; form-data пришёл через @types/node-fetch. Эксплуатация этих advisories через существующие routes не подтверждена. Тем не менее версии требуют обновления и повторной проверки.

[scripts/check-security-audit.js:14](/Users/sasarei/Downloads/almost_clean/scripts/check-security-audit.js:14) аудирует только корневой package.json, backend с отдельным lockfile не входит в gate. Обычные backend-тесты проверяют только readiness/регистрацию маршрутов/статические assets и не покрывают перечисленные атаки.

Исправление: обновлять совместимые версии адресно, включить backend audit и настоящие auth/purchase regression tests в verify. Не расширять allowlist под новые предупреждения и не применять слепо `npm audit fix --force`, предлагающий major-обновления Expo/Google APIs.

## Дополнительное замечание по конфигурации

В локальном backend/.env APP_SESSION_SECRET отсутствует, APP_SHARED_SECRET задан; клиент backendSync.js уже использует `/v1/auth/session` и Bearer. Если это же окружение развёрнуто на сервере, выдача сессии вернёт 503, а запрос без legacy-заголовка — 401. Настройки фактического деплоя не проверялись; это возможный разрыв миграции, не доказанный production-инцидент. Локальное наличие `.env` не трактуется как утечка: эти файлы не отслеживаются Git.

## Выполненные проверки

- `npm run verify`: остановился на check:security-audit из-за новых advisories joi/js-yaml.
- До остановки прошли functional parity, analytics contract, native analytics config, attribution tests, UI session tests и engagement tests.
- Отдельно прошли localization, themes (light/dark/pro, 6 PRO accents), backend:test (3 теста), typecheck, lint (0 ошибок, 381 предупреждение), check:release. Проверка размера использует существующий AAB, не новый билд; предупреждение о росте размера сохранено.
- Локальные security probes: [reproduce.mjs](/Users/sasarei/Downloads/almost_clean/artifacts/security-audit-2026-09-13/reproduce.mjs). Сервер поднимался только на 127.0.0.1, с искусственными секретами, в памяти; ответы Google подменены локальной заглушкой, реальные API покупок не вызывались.
- Просмотрены `git diff --name-only` и `git diff -U0`: UI-изменения уже существовали до аудита. Рабочий код приложения/сервера и настройки не изменялись.
- Визуальная проверка тем не выполнялась: аудит не меняет UI, запуск симулятора/устройства отдельно не разрешался. Проверка реальных release-путей установки/покупки на обеих платформах остаётся обязательной перед выпуском исправлений этого контура.

Сначала закрыть доступ к signing material и определить его ротацию; затем исправить состояние покупок, постоянную привязку личности/владения и webhook authentication; после — лимиты, идемпотентность, безопасное хранение credential и dependency gates. Изменения не должны задерживать AppsFlyer из-за ATT/consent и не должны добавлять клиентский af_purchase или блокировать partner postbacks.

# Исправления аудита безопасности — 13 сентября 2026

Исправлены найденные уязвимости в рабочем коде и локальной конфигурации. Это ещё не подтверждение исправления опубликованного приложения: изменения не отправлялись на production и в магазины. Исторический аудит сохранён в SECURITY_AUDIT_2026-09-13.md.

## Что изменено

| Аудит | Исправление |
|---|---|
| SEC-01 | Приватный Android release-ключ и properties с паролями исключены из индекса Git, добавлены в .gitignore. Проверка verify запрещает их повторное добавление. Локальные файлы сохранены с правами 0600, резервная копия находится вне репозитория. Подготовлен новый upload-ключ и публичный сертификат. В Play Console подтверждено, что старый ключ — именно upload key; отдельный app signing key не меняется. Форма reset подготовлена, загрузку PEM и отправку заявки должен завершить пользователь. |
| SEC-02 | Google pending/canceled/неполный purchaseState не выдаёт premium. Отмена продления сохраняет уже оплаченное время; учитывается grace period. Истёкшая серверная подписка не остаётся активной из-за задержки webhook. |
| SEC-03 | Identity hashes и привязки транзакций перенесены из вытесняемого LRU в постоянную SQLite-базу. Запись синхронная, операции атомарны между процессами. Добавлена однократная транзакционная миграция старого JSON. |
| SEC-04 | Добавлена проверка принадлежности транзакции клиенту через серверный запрос RevenueCat, либо подтверждённый store account ID. Restore/transfer разрешён только при подтверждённом активном праве в RevenueCat. История покупок сама по себе не позволяет перехватить действующее право другого владельца. |
| SEC-05 | X-Forwarded-For больше не принимается на доверии. CIDR доверенных proxy задаются явно; session limit действует по IP, независимо от installId. Лимиты общие между процессами на одной базе. |
| SEC-06 | Ключ идемпотентности включает владельца и endpoint, связан с телом запроса, сохраняет HTTP-статус. Схема проверяется до кэша; одновременный повтор не запускает второй запрос проверки покупки. |
| SEC-07 | Google webhook закрыт без секрета/проверенного OIDC. Добавлена проверка Pub/Sub ID token, audience и service account. Входящий appUserIdHint не определяет владельца; выдуманное voided-событие не меняет право. Apple уведомления требуют действительной JWS-подписи; custom HTTP header для App Store Connect не нужен. |
| SEC-08 | Новые секреты — 32 байта из native CSPRNG. Хранение — Keychain/Keystore. Старый секрет переносится без изменения, удаляется из AsyncStorage только после проверенной записи; временный отказ защищённого хранилища не заменяет credential. Секрет передаётся только endpoint выдачи сессии; release backend URL должен использовать HTTPS. |
| SEC-09 | Обновлены уязвимые транзитивные зависимости, обе npm dependency trees включены в gate. Backend audit: 0. Корневые оставшиеся предупреждения относятся к уже отключённым image-size парсерам; allowlist не расширялся. |

Дополнительно исправлена передача Android order ID: он больше не выдаётся за Google purchaseToken. Когда SDK не предоставляет purchaseToken, точный order ID проверяется через RevenueCat. Кэш сессии изолирован по installId/appUserId/platform.

Backend требует Node 24 LTS. Render настроен на постоянный диск и обязательное доказательство installSecret; небезопасный production grace mode больше не проходит startup validation. Локальный backend/.env переведён на сессии и read-only RevenueCat lookup; значения секретов не печатались. Скрипт туннеля перестал ослаблять эти требования и печатать секрет webhook.

AppsFlyer startup, ATT/consent invariants и partner postbacks сохранены. Новых клиентских af_purchase и дублирующих lifecycle postback нет. RevenueCat остаётся их единственным серверным отправителем.

## Проверки

- `npm run verify` проходит: functional parity, analytics contract, native analytics config, attribution/UI/engagement tests, dependency audit, typecheck, lint, localization, themes, клиентские security tests, backend tests, release/static size gate.
- Backend security tests используют синтетические store/RevenueCat ответы и HTTP только на 127.0.0.1. Проверены захват установки после 50 000 регистраций, рестарт и несколько подключений к одной базе, миграция JSON, чужие покупки, истечение/отмена, restore, конфликт/повтор идемпотентности, поддельные webhook-и, spoofed IP и OIDC.
- Клиентские tests проверяют безопасную миграцию, отказ записи/чтения, недоступный native random и повторный доступ к существующему секрету.
- Android release APK собран: android/app/build/outputs/apk/release/app-release.apk. Сборка использует прежний локальный ключ до завершения его регистрации/замены.
- iOS Release собран успешно без подписи (`CODE_SIGNING_ALLOWED=NO`), без запуска устройства: /tmp/almost-security-ios-build/Build/Products/Release-iphoneos/Almost.app. CocoaPods установлен с ExpoCrypto/ExpoSecureStore. Для сборки на Xcode 26 добавлен воспроизводимый обход несовместимости consteval в закреплённой версии fmt: он не меняет форматирование во время работы приложения. [Upstream issue](https://github.com/react/react-native/issues/55601).
- Симуляторы и устройства не запускались. Визуальная проверка light/dark/pro не проводилась: эти изменения не меняют UI; статическая проверка тем проходит. Ранее существовавшие UI-изменения пользователя сохранены.

## Что остаётся сделать вне локального кода

**Ключ загрузки Google Play.** Проверено в Play Console для `com.sasarei.almostclean`: старый локальный сертификат совпадает с upload certificate. SHA-256 старого upload key: `9B:FC:7A:48:4D:8D:2A:B8:82:E9:D9:A3:2A:98:78:B1:A5:2D:F3:73:2A:74:BC:4E:7A:F5:36:59:8A:40:40:32`. В Digital Asset Links Play указан отдельный сертификат подписи приложения: `70:14:56:A4:72:4C:72:28:85:A8:9E:32:8F:0F:C3:23:96:71:8B:4D:DE:E9:E3:C9:7D:24:3C:EB:0B:2D:19:8C`.

Новый RSA-3072 upload key создан вне Git. Публичный сертификат: [upload-2026-09-13-certificate.pem](/Users/sasarei/.config/almost/signing/upload-2026-09-13-certificate.pem), SHA-256 `A0:2A:B5:A5:4A:13:85:9B:14:F6:A9:58:AF:19:70:8B:09:36:CF:F4:38:7C:81:3E:D8:F9:C7:6E:3A:95:C1:5E`. Приватный ключ и пароль находятся в защищённой локальной папке `/Users/sasarei/.config/almost/signing/`.

В [Play Console](https://play.google.com/console/u/2/developers/6580037814574200914/app/4975905858674100351/keymanagement) открыта форма **Request upload key reset**, выбрана причина **My upload key has been compromised**. По правилам браузерного инструмента ввод/регистрацию нового credential завершает пользователь: загрузить только публичный PEM и нажать Request. Заявка ещё не подтверждена. До подтверждения и активации Google локальный signing configuration сохраняет старый ключ. После активации переключить локальную сборку и CI на новый keystore/properties.

Замена upload key сохраняет подпись установленного приложения, возможность обновлений, локальные данные и подписки. iOS она не затрагивает. Переустановка приложения пользователям не нужна. [Правила Google](https://developer.android.com/studio/publish/app-signing).

**История Git.** По запросу пользователя создана защищённая резервная копия вне репозитория, выполнена очистка всех веток, тегов и локальных snapshot refs от `android/app/release.keystore`, `android/keystore.properties` и значений паролей. Проверено, что очищенная удалённая main отличается по файлам только удалением этих двух путей; backend и его конфигурация остаются прежними. Очищенная история отправлена на GitHub атомарным force-with-lease: main `cdbb0e9`, тег `fix-android-settings-2024-12-05` → `c8a414e`. Переписано 146 коммитов. Коммит security-исправлений сохраняется локально до проверки миграции. Кэши старых SHA на GitHub и чужие клоны не очищаются обычным force push; при необходимости требуется GitHub Support и обновление клонов. Старые ключи остаются в защищённой резервной копии для восстановления, поэтому её нельзя публиковать. [Ограничения очистки GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository).

**Влияние исправлений на действующих пользователей.** Локальные цели, сохранённые записи и настройки не сбрасываются. Существующий install secret переносится в защищённое хранилище без изменения; действующий install ID сохраняется. Premium в клиенте определяется RevenueCat CustomerInfo, а ошибка синхронизации с вспомогательным backend сама по себе не отключает Premium. Изменения backend пока не развёрнуты. Для старых серверных записей, у которых уже утрачена привязка install secret, строгая проверка вернёт `identity_recovery_required`; перед выкладкой нужна проверка production-копии и план подтверждённого восстановления. Не обещать беспроблемную миграцию, пока эта проверка не выполнена.

**Выпуск.** Настроить production по backend/DEPLOY_QUICKSTART.md, проверить миграцию на копии серверных данных. Для SQLite допускаются процессы на одном локальном постоянном диске; независимые replica disks/NFS не поддерживаются. Старые владельцы с утраченной серверной привязкой требуют отдельного подтверждённого recovery; проверка личности не отключается.

Перед rollout проверить реальные release fresh-install/purchase/restore/refund пути на iOS и Android и фактические AppsFlyer/RevenueCat postbacks. Это обязательный gate из AGENTS.md. Сборка и синтетические тесты не заменяют такую проверку.

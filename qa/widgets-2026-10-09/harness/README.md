# QA fixtures

Эти файлы сохраняют способ подачи синтетических данных. Продуктовые исходники не менялись. Временные бинарники и созданные для задачи iOS devices после проверки удалены; тестовый Android эмулятор и Metro остановлены. Уже запущенный до задачи iPhone Duo не затронут.

- `fixture.json`: только искусственные финансовые данные.
- `FixtureHost.swift.txt`: SwiftUI host с App Group `group.com.sasarei.almostclean`, записью fixture из `QA_WIDGET_JSON` и созданием Activity через `QA_LIVE_ACTIVITY=1`. Компилировался вместе с текущим `WalletExpenseAttributes.swift`; подключался текущий Release WidgetExtension.
- `Fixture.java.txt`: Android Instrumentation для debug APK; пишет SharedPreferences и вызывает настоящий `AlmostWidgetProvider.requestUpdate`. Для компиляции использовались Android 36 jar и Kotlin classes текущего debug build; тестовый APK подписывался репозиторным debug.keystore, не пользовательским release-ключом.
- `set-fixture.py`: экспериментальный сценарий для конкретных disposable device IDs этой сессии. **Перед повторным запуском создать свои QA devices и заменить IDs/пути.** Не запускать на личных устройствах. Требует установленных fixture host и instrumentation.
- YAML: порядок просмотра трёх домашних размеров и проверки Live Activity. Начальная страница важна: на iOS host находился на странице 3, large/medium — на странице 2; на Android initial page — large, два свайпа вправо показывают medium и small.

Пример после восстановления среды: `python3 set-fixture.py spending_fire dark ru`; другие сцены — `savings_guard`, `empty_treasury`, `neglected`, `expired`, `corrupt`, `empty`. Копия новых подписей читается из текущего `src/constants/almiWidgetCopy.js`.

Ограничение iOS: смена host, CFPreferences и timeline cache потребовала прямого заполнения suite-файлов и перезапуска daemon / extension в созданном QA simulator. Этот способ не подтверждает production storage bridge и сам по себе не доказывает, что новая сцена реально показана: необходимы pixels и системный лог. Часть запрошенных состояний оставалась старым содержимым или заглушкой; они не засчитаны как PASS.

Основные сборки: `./gradlew assembleDebug` из `android/`; для iOS `xcodebuild -project ios/Almost.xcodeproj -target 'Almost WidgetExtension' -configuration Release -sdk iphonesimulator ARCHS=arm64 EXCLUDED_ARCHS=x86_64 ONLY_ACTIVE_ARCH=YES CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- CODE_SIGNING_REQUIRED=NO CONFIGURATION_BUILD_DIR=<temporary QA output> build`. Для simulator host нужен корректный встроенный `__TEXT,__entitlements` с App Group, иначе получаются недостоверные результаты обмена данными.

Окончательный результат и границы проверки находятся в `../REPORT.md`; временные неудачные UI automation captures не сохранены как доказательства.

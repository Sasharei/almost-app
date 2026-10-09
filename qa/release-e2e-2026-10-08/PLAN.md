# Release E2E QA — 8 октября 2026

Проверяется текущее рабочее дерево Almost Savings 8.0.0 (128), HEAD 160fd606bd2f9a41d8357d0bc014f166385ca6a8. Изменения приложения не вносятся. Синтетические локальные данные; без реальных платежей и отправки сообщений.

## Матрица сценариев

| ID | Сценарий | Приоритет |
|---|---|---|
| SMK-001 | Release build, установка, чистый запуск, crash logs | P0 |
| E2E-001 | Язык, валюта, условия, onboarding back/skip/finish | P1 |
| E2E-002 | Tutorial, выбрать/создать карточку, сумма, slider, cancel | P1 |
| E2E-003 | Resisted / Bought / Later, результат, ledger, перезапуск | P0 |
| E2E-004 | Цель, бюджет, доход, payday, history, edit/delete/cancel | P1 |
| E2E-005 | Паузы, reminders, subscriptions, timer recovery | P1 |
| E2E-006 | Progress, rewards, challenges, insights, cat care/skins | P2 |
| E2E-007 | Profile/settings/help, analytics preference, currency/search | P1 |
| E2E-008 | Paywall, планы, restore/no entitlement, close, legal links | P0 |
| E2E-009 | Shopping Pause и банковские расходы: permission/unsupported/error | P1 |
| NEG-001 | Ноль/отрицательное/дробное/большое, Unicode, repeated taps | P1 |
| REC-001 | Background, force stop, restart, offline/recovery, deep links | P1 |
| VIS-001 | light/dark/PRO + 6 accents; контроль primary/secondary hierarchy | P1 |
| VIS-002 | Короткий экран, large text, long locale, RTL, keyboard/insets | P1 |
| ACC-001 | Семантика, targets, reduced motion; VoiceOver/TalkBack coverage | P1 |
| REL-001 | Sandbox purchase/restore/renewal и attribution/postbacks на обеих ОС | P0 |
| REL-002 | Widgets, Live Activities, Apple Pay Shortcuts, push routing, device permissions | P1 |

Две независимые оценки: функциональная и визуальная. Успешный runner не означает visual PASS. В каждом состоянии проверяются 5 UX принципов и 7 законов: следующий шаг, доступные цели касания, иерархия, честный прогресс, привычный back/cancel, группировка, сохранность возможностей. Отсутствующее устройство/тестовый аккаунт/OS — BLOCKED, не PASS.

Полный action inventory находится в action-inventory.json. Физические haptics, реальные sandbox-транзакции и backend postbacks требуют соответствующей среды; симулятор не доказывает эти пути. Минимальные ОС iOS 15.5/Android API24, новейшие/компактные/tablet устройства входят в план; доступность отмечается в итоговом отчёте.

# Контракт перед UI исправлениями
Baseline: check:functional-parity PASS (246 / 2120 / 43). Существующий inventory проверен в scripts/ui-functional-contracts.json.

- Onboarding persona initial/expanded: primary Continue; secondary selection, Show all, gender, Back/Skip. В расширенном состоянии все десять сценариев остаются доступны, выбранная карточка сохраняется. Ошибка/загрузка локальных изображений не блокирует выбор или Continue.
- Paywall loading/error/available/purchasing/restore: primary выбор/покупка доступного плана; при ошибке повтор загрузки; secondary benefits, dismiss, restore, manage, legal. Существующие prerequisites, loading/disabled states, callbacks сохраняются. Заголовок должен целиком находиться на читаемой поверхности.
- Goal editor keyboard open/closed/invalid/saved/cancel: primary Save, secondary Cancel/back/backdrop. Первый системный Back скрывает IME, сохраняя редактор и черновик; Save сохраняет, Cancel сохраняет прежние данные.
- Pause empty/populated: primary существующий переход к решению; secondary add, extend, cancel. Количество согласуется с формой числа, ledger не меняется.
- Today/History/Progress: точная сумма на финансовых результатах; primary существующая запись решения, secondary tools/edit/navigation. Данные и округление при вводе не меняются.
- Speech goal initial/progress/completed: текст остатка не утверждает близость к цели при нулевом прогрессе; возможности кота сохранены.

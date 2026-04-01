package com.sasarei.almostclean.widget

import android.content.Context

internal data class WidgetData(
  val savedMonthLabel: String,
  val savedTotalLabel: String,
  val savedTodayLabel: String,
  val streakDays: Int,
  val hasData: Boolean,
  val savedMonthValue: Double,
  val savedTotalValue: Double,
  val monthlyTargetValue: Double,
  val savedTodayValue: Double,
  val dailyGoalValue: Double,
  val goalTargetValue: Double,
  val goalSavedValue: Double,
  val budgetRemainingValue: Double,
  val budgetRemainingLabel: String,
  val budgetTotalValue: Double,
  val recentEvents: List<String>,
  val labelSavedMonth: String,
  val labelTotal: String,
  val labelBalance: String,
  val labelToday: String,
  val labelGoal: String,
  val labelMonthGoal: String,
  val labelBudgetRemaining: String,
  val labelRecent: String,
  val labelRecentEmpty: String,
  val labelEmptyState: String,
  val labelActionSave: String,
  val labelActionSpend: String
)

internal object WidgetDataStore {
  const val PREFS_NAME = "almost_widget"
  const val KEY_SAVED_MONTH_LABEL = "widget_saved_month_label"
  const val KEY_SAVED_TOTAL_LABEL = "widget_saved_total_label"
  const val KEY_SAVED_TODAY_LABEL = "widget_saved_today_label"
  const val KEY_STREAK_DAYS = "widget_streak_days"
  const val KEY_HAS_DATA = "widget_has_data"
  const val KEY_SAVED_MONTH_VALUE = "widget_saved_month_value"
  const val KEY_SAVED_TOTAL_VALUE = "widget_saved_total_value"
  const val KEY_MONTHLY_TARGET_VALUE = "widget_monthly_target_value"
  const val KEY_SAVED_TODAY_VALUE = "widget_saved_today_value"
  const val KEY_DAILY_GOAL_VALUE = "widget_daily_goal_value"
  const val KEY_GOAL_TARGET_VALUE = "widget_goal_target_value"
  const val KEY_GOAL_SAVED_VALUE = "widget_goal_saved_value"
  const val KEY_BUDGET_REMAINING_VALUE = "widget_budget_remaining_value"
  const val KEY_BUDGET_REMAINING_LABEL = "widget_budget_remaining_label"
  const val KEY_BUDGET_TOTAL_VALUE = "widget_budget_total_value"
  const val KEY_RECENT_EVENTS = "widget_recent_events"
  const val KEY_UPDATED_AT = "widget_updated_at"
  const val KEY_WIDGET_LANGUAGE = "widget_language"
  const val KEY_WIDGET_CURRENCY_CODE = "widget_currency_code"
  const val KEY_WIDGET_LABEL_SAVED_MONTH = "widget_label_saved_month"
  const val KEY_WIDGET_LABEL_TOTAL = "widget_label_total"
  const val KEY_WIDGET_LABEL_BALANCE = "widget_label_balance"
  const val KEY_WIDGET_LABEL_TODAY = "widget_label_today"
  const val KEY_WIDGET_LABEL_GOAL = "widget_label_goal"
  const val KEY_WIDGET_LABEL_MONTH_GOAL = "widget_label_month_goal"
  const val KEY_WIDGET_LABEL_BUDGET_REMAINING = "widget_label_budget_remaining"
  const val KEY_WIDGET_LABEL_RECENT = "widget_label_recent"
  const val KEY_WIDGET_LABEL_RECENT_EMPTY = "widget_label_recent_empty"
  const val KEY_WIDGET_LABEL_EMPTY_STATE = "widget_label_empty_state"
  const val KEY_WIDGET_ACTION_SAVE = "widget_action_save"
  const val KEY_WIDGET_ACTION_SPEND = "widget_action_spend"

  fun read(context: Context): WidgetData {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val savedMonthLabel = prefs.getString(KEY_SAVED_MONTH_LABEL, "--") ?: "--"
    val savedTotalLabel = prefs.getString(KEY_SAVED_TOTAL_LABEL, "--") ?: "--"
    val savedTodayLabel = prefs.getString(KEY_SAVED_TODAY_LABEL, "--") ?: "--"
    val streakDays = prefs.getInt(KEY_STREAK_DAYS, 0)
    val hasData = prefs.getBoolean(KEY_HAS_DATA, false)
    val savedMonthValue = prefs.getFloat(KEY_SAVED_MONTH_VALUE, 0f).toDouble()
    val savedTotalValue = prefs.getFloat(KEY_SAVED_TOTAL_VALUE, 0f).toDouble()
    val monthlyTargetValue = prefs.getFloat(KEY_MONTHLY_TARGET_VALUE, 0f).toDouble()
    val savedTodayValue = prefs.getFloat(KEY_SAVED_TODAY_VALUE, 0f).toDouble()
    val dailyGoalValue = prefs.getFloat(KEY_DAILY_GOAL_VALUE, 0f).toDouble()
    val goalTargetValue = prefs.getFloat(KEY_GOAL_TARGET_VALUE, 0f).toDouble()
    val goalSavedValue = prefs.getFloat(KEY_GOAL_SAVED_VALUE, 0f).toDouble()
    val budgetRemainingValue = prefs.getFloat(KEY_BUDGET_REMAINING_VALUE, 0f).toDouble()
    val budgetRemainingLabel = prefs.getString(KEY_BUDGET_REMAINING_LABEL, "--") ?: "--"
    val budgetTotalValue = prefs.getFloat(KEY_BUDGET_TOTAL_VALUE, 0f).toDouble()
    val recentRaw = prefs.getString(KEY_RECENT_EVENTS, "") ?: ""
    val recentEvents =
      if (recentRaw.isBlank()) emptyList()
      else recentRaw.split("||").map { it.trim() }.filter { it.isNotEmpty() }
    val labelSavedMonth = prefs.getString(KEY_WIDGET_LABEL_SAVED_MONTH, "Saved") ?: "Saved"
    val labelTotal = prefs.getString(KEY_WIDGET_LABEL_TOTAL, "Total") ?: "Total"
    val labelBalance = prefs.getString(KEY_WIDGET_LABEL_BALANCE, "Balance") ?: "Balance"
    val labelToday = prefs.getString(KEY_WIDGET_LABEL_TODAY, "Today") ?: "Today"
    val labelGoal = prefs.getString(KEY_WIDGET_LABEL_GOAL, "To goal") ?: "To goal"
    val labelMonthGoal = prefs.getString(KEY_WIDGET_LABEL_MONTH_GOAL, "Monthly goal") ?: "Monthly goal"
    val labelBudgetRemaining =
      prefs.getString(KEY_WIDGET_LABEL_BUDGET_REMAINING, "Budget remaining") ?: "Budget remaining"
    val labelRecent = prefs.getString(KEY_WIDGET_LABEL_RECENT, "Recent events:") ?: "Recent events:"
    val labelRecentEmpty = prefs.getString(KEY_WIDGET_LABEL_RECENT_EMPTY, "No events") ?: "No events"
    val labelEmptyState =
      prefs.getString(KEY_WIDGET_LABEL_EMPTY_STATE, "Start saving today") ?: "Start saving today"
    val labelActionSave = prefs.getString(KEY_WIDGET_ACTION_SAVE, "Save") ?: "Save"
    val labelActionSpend = prefs.getString(KEY_WIDGET_ACTION_SPEND, "Spend") ?: "Spend"
    return WidgetData(
      savedMonthLabel,
      savedTotalLabel,
      savedTodayLabel,
      streakDays,
      hasData,
      savedMonthValue,
      savedTotalValue,
      monthlyTargetValue,
      savedTodayValue,
      dailyGoalValue,
      goalTargetValue,
      goalSavedValue,
      budgetRemainingValue,
      budgetRemainingLabel,
      budgetTotalValue,
      recentEvents,
      labelSavedMonth,
      labelTotal,
      labelBalance,
      labelToday,
      labelGoal,
      labelMonthGoal,
      labelBudgetRemaining,
      labelRecent,
      labelRecentEmpty,
      labelEmptyState,
      labelActionSave,
      labelActionSpend
    )
  }

  fun write(
    context: Context,
    savedMonthLabel: String?,
    savedTotalLabel: String?,
    savedTodayLabel: String?,
    streakDays: Int?,
    hasData: Boolean?,
    savedMonthValue: Float?,
    savedTotalValue: Float?,
    monthlyTargetValue: Float?,
    savedTodayValue: Float?,
    dailyGoalValue: Float?,
    goalTargetValue: Float?,
    goalSavedValue: Float?,
    budgetRemainingValue: Float?,
    budgetRemainingLabel: String?,
    budgetTotalValue: Float?,
    recentEvents: String?,
    widgetLanguage: String?,
    widgetCurrencyCode: String?,
    widgetLabelSavedMonth: String?,
    widgetLabelTotal: String?,
    widgetLabelBalance: String?,
    widgetLabelToday: String?,
    widgetLabelGoal: String?,
    widgetLabelMonthGoal: String?,
    widgetLabelBudgetRemaining: String?,
    widgetLabelRecent: String?,
    widgetLabelRecentEmpty: String?,
    widgetLabelEmptyState: String?,
    widgetActionSave: String?,
    widgetActionSpend: String?
  ) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val editor = prefs.edit()
    if (savedMonthLabel != null) {
      editor.putString(KEY_SAVED_MONTH_LABEL, savedMonthLabel)
    }
    if (savedTotalLabel != null) {
      editor.putString(KEY_SAVED_TOTAL_LABEL, savedTotalLabel)
    }
    if (savedTodayLabel != null) {
      editor.putString(KEY_SAVED_TODAY_LABEL, savedTodayLabel)
    }
    if (streakDays != null) {
      editor.putInt(KEY_STREAK_DAYS, streakDays)
    }
    if (hasData != null) {
      editor.putBoolean(KEY_HAS_DATA, hasData)
    }
    if (savedMonthValue != null) {
      editor.putFloat(KEY_SAVED_MONTH_VALUE, savedMonthValue)
    }
    if (savedTotalValue != null) {
      editor.putFloat(KEY_SAVED_TOTAL_VALUE, savedTotalValue)
    }
    if (monthlyTargetValue != null) {
      editor.putFloat(KEY_MONTHLY_TARGET_VALUE, monthlyTargetValue)
    }
    if (savedTodayValue != null) {
      editor.putFloat(KEY_SAVED_TODAY_VALUE, savedTodayValue)
    }
    if (dailyGoalValue != null) {
      editor.putFloat(KEY_DAILY_GOAL_VALUE, dailyGoalValue)
    }
    if (goalTargetValue != null) {
      editor.putFloat(KEY_GOAL_TARGET_VALUE, goalTargetValue)
    }
    if (goalSavedValue != null) {
      editor.putFloat(KEY_GOAL_SAVED_VALUE, goalSavedValue)
    }
    if (budgetRemainingValue != null) {
      editor.putFloat(KEY_BUDGET_REMAINING_VALUE, budgetRemainingValue)
    }
    if (budgetRemainingLabel != null) {
      editor.putString(KEY_BUDGET_REMAINING_LABEL, budgetRemainingLabel)
    }
    if (budgetTotalValue != null) {
      editor.putFloat(KEY_BUDGET_TOTAL_VALUE, budgetTotalValue)
    }
    if (recentEvents != null) {
      editor.putString(KEY_RECENT_EVENTS, recentEvents)
    }
    if (widgetLanguage != null) {
      editor.putString(KEY_WIDGET_LANGUAGE, widgetLanguage)
    }
    if (widgetCurrencyCode != null) {
      editor.putString(KEY_WIDGET_CURRENCY_CODE, widgetCurrencyCode)
    }
    if (widgetLabelSavedMonth != null) {
      editor.putString(KEY_WIDGET_LABEL_SAVED_MONTH, widgetLabelSavedMonth)
    }
    if (widgetLabelTotal != null) {
      editor.putString(KEY_WIDGET_LABEL_TOTAL, widgetLabelTotal)
    }
    if (widgetLabelBalance != null) {
      editor.putString(KEY_WIDGET_LABEL_BALANCE, widgetLabelBalance)
    }
    if (widgetLabelToday != null) {
      editor.putString(KEY_WIDGET_LABEL_TODAY, widgetLabelToday)
    }
    if (widgetLabelGoal != null) {
      editor.putString(KEY_WIDGET_LABEL_GOAL, widgetLabelGoal)
    }
    if (widgetLabelMonthGoal != null) {
      editor.putString(KEY_WIDGET_LABEL_MONTH_GOAL, widgetLabelMonthGoal)
    }
    if (widgetLabelBudgetRemaining != null) {
      editor.putString(KEY_WIDGET_LABEL_BUDGET_REMAINING, widgetLabelBudgetRemaining)
    }
    if (widgetLabelRecent != null) {
      editor.putString(KEY_WIDGET_LABEL_RECENT, widgetLabelRecent)
    }
    if (widgetLabelRecentEmpty != null) {
      editor.putString(KEY_WIDGET_LABEL_RECENT_EMPTY, widgetLabelRecentEmpty)
    }
    if (widgetLabelEmptyState != null) {
      editor.putString(KEY_WIDGET_LABEL_EMPTY_STATE, widgetLabelEmptyState)
    }
    if (widgetActionSave != null) {
      editor.putString(KEY_WIDGET_ACTION_SAVE, widgetActionSave)
    }
    if (widgetActionSpend != null) {
      editor.putString(KEY_WIDGET_ACTION_SPEND, widgetActionSpend)
    }
    editor.putLong(KEY_UPDATED_AT, System.currentTimeMillis())
    editor.apply()
  }
}

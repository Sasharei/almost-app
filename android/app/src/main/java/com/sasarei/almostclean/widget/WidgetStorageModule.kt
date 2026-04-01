package com.sasarei.almostclean.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

class WidgetStorageModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "WidgetStorage"

  @ReactMethod
  fun setWidgetData(data: ReadableMap, promise: Promise) {
    try {
      val savedMonthLabel = if (data.hasKey("savedMonthLabel")) data.getString("savedMonthLabel") else null
      val savedTotalLabel = if (data.hasKey("savedTotalLabel")) data.getString("savedTotalLabel") else null
      val savedTodayLabel = if (data.hasKey("savedTodayLabel")) data.getString("savedTodayLabel") else null
      val streakDays = if (data.hasKey("streakDays")) data.getInt("streakDays") else null
      val hasData = if (data.hasKey("hasData")) data.getBoolean("hasData") else null
      val savedMonthValue = if (data.hasKey("savedMonthValue")) data.getDouble("savedMonthValue").toFloat() else null
      val savedTotalValue = if (data.hasKey("savedTotalValue")) data.getDouble("savedTotalValue").toFloat() else null
      val monthlyTargetValue = if (data.hasKey("monthlyTargetValue")) data.getDouble("monthlyTargetValue").toFloat() else null
      val savedTodayValue = if (data.hasKey("savedTodayValue")) data.getDouble("savedTodayValue").toFloat() else null
      val dailyGoalValue = if (data.hasKey("dailyGoalValue")) data.getDouble("dailyGoalValue").toFloat() else null
      val goalTargetValue = if (data.hasKey("goalTargetValue")) data.getDouble("goalTargetValue").toFloat() else null
      val goalSavedValue = if (data.hasKey("goalSavedValue")) data.getDouble("goalSavedValue").toFloat() else null
      val budgetRemainingValue = if (data.hasKey("budgetRemainingValue")) data.getDouble("budgetRemainingValue").toFloat() else null
      val budgetRemainingLabel = if (data.hasKey("budgetRemainingLabel")) data.getString("budgetRemainingLabel") else null
      val budgetTotalValue = if (data.hasKey("budgetTotalValue")) data.getDouble("budgetTotalValue").toFloat() else null
      val recentEvents = if (data.hasKey("recentEvents")) data.getArray("recentEvents") else null
      val widgetLanguage = if (data.hasKey("widgetLanguage")) data.getString("widgetLanguage") else null
      val widgetCurrencyCode = if (data.hasKey("widgetCurrencyCode")) data.getString("widgetCurrencyCode") else null
      val widgetLabelSavedMonth =
        if (data.hasKey("widgetLabelSavedMonth")) data.getString("widgetLabelSavedMonth") else null
      val widgetLabelTotal = if (data.hasKey("widgetLabelTotal")) data.getString("widgetLabelTotal") else null
      val widgetLabelBalance =
        if (data.hasKey("widgetLabelBalance")) data.getString("widgetLabelBalance") else null
      val widgetLabelToday = if (data.hasKey("widgetLabelToday")) data.getString("widgetLabelToday") else null
      val widgetLabelGoal = if (data.hasKey("widgetLabelGoal")) data.getString("widgetLabelGoal") else null
      val widgetLabelMonthGoal =
        if (data.hasKey("widgetLabelMonthGoal")) data.getString("widgetLabelMonthGoal") else null
      val widgetLabelBudgetRemaining =
        if (data.hasKey("widgetLabelBudgetRemaining")) data.getString("widgetLabelBudgetRemaining") else null
      val widgetLabelRecent = if (data.hasKey("widgetLabelRecent")) data.getString("widgetLabelRecent") else null
      val widgetLabelRecentEmpty =
        if (data.hasKey("widgetLabelRecentEmpty")) data.getString("widgetLabelRecentEmpty") else null
      val widgetLabelEmptyState =
        if (data.hasKey("widgetLabelEmptyState")) data.getString("widgetLabelEmptyState") else null
      val widgetActionSave = if (data.hasKey("widgetActionSave")) data.getString("widgetActionSave") else null
      val widgetActionSpend = if (data.hasKey("widgetActionSpend")) data.getString("widgetActionSpend") else null
      val recentEventsValue = recentEvents?.let { array ->
        val values = ArrayList<String>(array.size())
        for (index in 0 until array.size()) {
          val item = array.getString(index)
          if (!item.isNullOrBlank()) {
            values.add(item)
          }
        }
        values.joinToString("||")
      }

      WidgetDataStore.write(
        reactContext,
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
        recentEventsValue,
        widgetLanguage,
        widgetCurrencyCode,
        widgetLabelSavedMonth,
        widgetLabelTotal,
        widgetLabelBalance,
        widgetLabelToday,
        widgetLabelGoal,
        widgetLabelMonthGoal,
        widgetLabelBudgetRemaining,
        widgetLabelRecent,
        widgetLabelRecentEmpty,
        widgetLabelEmptyState,
        widgetActionSave,
        widgetActionSpend
      )
      AlmostWidgetProvider.requestUpdate(reactContext)
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("widget_storage_error", error)
    }
  }

  @ReactMethod
  fun hasInstalledHomeWidget(promise: Promise) {
    try {
      val manager = AppWidgetManager.getInstance(reactContext)
      val providers = listOf(
        ComponentName(reactContext, AlmostWidgetSmallProvider::class.java),
        ComponentName(reactContext, AlmostWidgetProvider::class.java),
        ComponentName(reactContext, AlmostWidgetLargeProvider::class.java)
      )
      val installed = providers.any { component ->
        manager.getAppWidgetIds(component).isNotEmpty()
      }
      promise.resolve(installed)
    } catch (error: Exception) {
      promise.reject("widget_install_check_error", error)
    }
  }
}

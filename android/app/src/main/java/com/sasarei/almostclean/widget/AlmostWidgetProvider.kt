package com.sasarei.almostclean.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.widget.RemoteViews
import com.sasarei.almostclean.R

enum class WidgetSize {
  SMALL,
  MEDIUM,
  LARGE
}

class AlmostWidgetProvider : AppWidgetProvider() {
  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    when (intent.action) {
      Intent.ACTION_USER_PRESENT,
      Intent.ACTION_USER_UNLOCKED -> {
        requestUpdate(context)
      }
    }
  }

  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { appWidgetId ->
      updateAppWidget(context, appWidgetManager, appWidgetId, WidgetSize.MEDIUM)
    }
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: android.os.Bundle
  ) {
    updateAppWidget(context, appWidgetManager, appWidgetId, WidgetSize.MEDIUM)
  }

  companion object {
    fun requestUpdate(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val providers = listOf(
        ProviderEntry(AlmostWidgetSmallProvider::class.java, WidgetSize.SMALL),
        ProviderEntry(AlmostWidgetProvider::class.java, WidgetSize.MEDIUM),
        ProviderEntry(AlmostWidgetLargeProvider::class.java, WidgetSize.LARGE)
      )
      providers.forEach { entry ->
        val widgetIds = manager.getAppWidgetIds(ComponentName(context, entry.provider))
        if (widgetIds.isEmpty()) return@forEach
        widgetIds.forEach { appWidgetId ->
          updateAppWidget(context, manager, appWidgetId, entry.size)
        }
      }
    }

    internal fun updateAppWidget(
      context: Context,
      appWidgetManager: AppWidgetManager,
      appWidgetId: Int,
      size: WidgetSize
    ) {
      val widgetData = WidgetDataStore.read(context)
      val isSmall = size == WidgetSize.SMALL
      val isMedium = size == WidgetSize.MEDIUM
      val isLarge = size == WidgetSize.LARGE
      val layoutId = when (size) {
        WidgetSize.SMALL -> R.layout.almost_widget_small
        WidgetSize.MEDIUM -> R.layout.almost_widget
        WidgetSize.LARGE -> R.layout.almost_widget_large
      }
      val views = RemoteViews(context.packageName, layoutId)

      if (widgetData.hasData) {
        val hasGoal = widgetData.goalTargetValue > 0
        val primaryTitle = if (hasGoal) widgetData.labelGoal else widgetData.labelMonthGoal
        val primaryProgressValue = if (hasGoal) {
          progressValue(widgetData.goalSavedValue, widgetData.goalTargetValue)
        } else {
          progressValue(widgetData.savedMonthValue, widgetData.monthlyTargetValue)
        }
        val primaryPercentLabel = if (hasGoal) {
          percentLabel(widgetData.goalSavedValue, widgetData.goalTargetValue)
        } else {
          percentLabel(widgetData.savedMonthValue, widgetData.monthlyTargetValue)
        }
        val budgetRemainingBase = widgetData.budgetRemainingLabel
        val budgetRemainingText = if (budgetRemainingBase.isBlank()) {
          "--"
        } else if (widgetData.budgetRemainingValue < -0.01) {
          "-$budgetRemainingBase"
        } else {
          budgetRemainingBase
        }
        val budgetProgress = budgetProgressValue(widgetData.budgetRemainingValue, widgetData.budgetTotalValue)
        val budgetIsNegative = widgetData.budgetRemainingValue < -0.01
        val budgetNegativeColor = Color.parseColor("#D84F61")
        val budgetDefaultColor = Color.parseColor("#111111")
        val budgetSecondaryColor = Color.parseColor("#555555")

        views.setViewVisibility(R.id.widget_content, android.view.View.VISIBLE)
        views.setViewVisibility(R.id.widget_empty_state, android.view.View.GONE)
        views.setTextViewText(R.id.widget_saved_label, widgetData.labelTotal)
        views.setTextViewText(R.id.widget_saved_value, widgetData.savedTotalLabel)
        if (isMedium || isLarge) {
          views.setTextViewText(R.id.widget_saved_total_label, widgetData.labelToday)
          views.setTextViewText(R.id.widget_saved_total_value, widgetData.savedTodayLabel)
        }
        views.setTextViewText(R.id.widget_progress_month_label, primaryTitle)
        views.setTextViewText(
          R.id.widget_progress_month_value,
          primaryPercentLabel
        )
        views.setProgressBar(
          R.id.widget_progress_month_bar,
          100,
          primaryProgressValue,
          false
        )
        views.setViewVisibility(R.id.widget_actions_row, android.view.View.VISIBLE)
        views.setViewVisibility(R.id.widget_saved_label, android.view.View.VISIBLE)
        views.setViewVisibility(R.id.widget_saved_value, android.view.View.VISIBLE)
        views.setTextViewText(R.id.widget_save_button, widgetData.labelActionSave)
        views.setTextViewText(R.id.widget_spend_button, widgetData.labelActionSpend)

        if (isMedium || isLarge) {
          views.setViewVisibility(R.id.widget_progress_streak_group, android.view.View.VISIBLE)
          views.setTextViewText(R.id.widget_progress_streak_label, widgetData.labelBudgetRemaining)
          views.setTextViewText(R.id.widget_progress_streak_value, budgetRemainingText)
          views.setProgressBar(
            R.id.widget_progress_streak_bar,
            100,
            budgetProgress,
            false
          )
          views.setTextColor(
            R.id.widget_progress_streak_value,
            if (budgetIsNegative) budgetNegativeColor else budgetSecondaryColor
          )
        }

        if (isLarge) {
          views.setViewVisibility(R.id.widget_large_section, android.view.View.VISIBLE)
          views.setTextViewText(R.id.widget_streak_label, widgetData.labelBudgetRemaining)
          views.setTextViewText(R.id.widget_streak_value, budgetRemainingText)
          views.setTextColor(
            R.id.widget_streak_value,
            if (budgetIsNegative) budgetNegativeColor else budgetDefaultColor
          )
          views.setViewVisibility(R.id.widget_progress_today_group, android.view.View.VISIBLE)
          views.setTextViewText(R.id.widget_progress_today_label, widgetData.labelToday)
          views.setTextViewText(
            R.id.widget_progress_today_value,
            percentLabel(widgetData.savedTodayValue, widgetData.dailyGoalValue)
          )
          views.setProgressBar(
            R.id.widget_progress_today_bar,
            100,
            progressValue(widgetData.savedTodayValue, widgetData.dailyGoalValue),
            false
          )
          val recentEvents = widgetData.recentEvents.take(3)
          val showRecentEvents = recentEvents.isNotEmpty()
          views.setViewVisibility(R.id.widget_recent_group, android.view.View.VISIBLE)
          views.setTextViewText(R.id.widget_recent_label, widgetData.labelRecent)
          val recentIds = listOf(
            R.id.widget_recent_event_1,
            R.id.widget_recent_event_2,
            R.id.widget_recent_event_3
          )
          if (showRecentEvents) {
            recentIds.forEachIndexed { index, viewId ->
              val label = recentEvents.getOrNull(index)
              if (!label.isNullOrBlank()) {
                views.setTextViewText(viewId, label)
                views.setViewVisibility(viewId, android.view.View.VISIBLE)
              } else {
                views.setViewVisibility(viewId, android.view.View.GONE)
              }
            }
          } else {
            views.setTextViewText(R.id.widget_recent_event_1, widgetData.labelRecentEmpty)
            views.setViewVisibility(R.id.widget_recent_event_1, android.view.View.VISIBLE)
            views.setViewVisibility(R.id.widget_recent_event_2, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_recent_event_3, android.view.View.GONE)
          }
        }
      } else {
        views.setViewVisibility(R.id.widget_content, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_empty_state, android.view.View.VISIBLE)
        views.setViewVisibility(R.id.widget_actions_row, android.view.View.GONE)
        views.setTextViewText(R.id.widget_empty_state, widgetData.labelEmptyState)
      }

      val homeIntent = Intent(Intent.ACTION_VIEW).apply {
        data = Uri.parse("com.sasarei.almostclean://home")
        `package` = context.packageName
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
      val homePendingIntent = PendingIntent.getActivity(
        context,
        0,
        homeIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      views.setOnClickPendingIntent(R.id.widget_root, homePendingIntent)

      val saveIntent = Intent(Intent.ACTION_VIEW).apply {
        data = Uri.parse("com.sasarei.almostclean://quick-entry?type=save")
        `package` = context.packageName
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
      val savePendingIntent = PendingIntent.getActivity(
        context,
        1,
        saveIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      views.setOnClickPendingIntent(R.id.widget_save_button, savePendingIntent)

      val spendIntent = Intent(Intent.ACTION_VIEW).apply {
        data = Uri.parse("com.sasarei.almostclean://quick-entry?type=spend")
        `package` = context.packageName
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      }
      val spendPendingIntent = PendingIntent.getActivity(
        context,
        2,
        spendIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
      views.setOnClickPendingIntent(R.id.widget_spend_button, spendPendingIntent)

      appWidgetManager.updateAppWidget(appWidgetId, views)
    }

    private fun progressValue(current: Double, target: Double): Int {
      if (target <= 0) return 0
      val ratio = (current / target).coerceIn(0.0, 1.0)
      return (ratio * 100).toInt()
    }

    private fun percentLabel(current: Double, target: Double): String {
      if (target <= 0) return "--"
      val ratio = (current / target).coerceIn(0.0, 1.0)
      return "${(ratio * 100).toInt()}%"
    }

    private fun budgetProgressValue(remaining: Double, total: Double): Int {
      if (total <= 0) return 0
      val ratio = (remaining / total).coerceIn(0.0, 1.0)
      return (ratio * 100).toInt()
    }
  }
}

class AlmostWidgetSmallProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { appWidgetId ->
      AlmostWidgetProvider.updateAppWidget(context, appWidgetManager, appWidgetId, WidgetSize.SMALL)
    }
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: android.os.Bundle
  ) {
    AlmostWidgetProvider.updateAppWidget(context, appWidgetManager, appWidgetId, WidgetSize.SMALL)
  }
}

class AlmostWidgetLargeProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { appWidgetId ->
      AlmostWidgetProvider.updateAppWidget(context, appWidgetManager, appWidgetId, WidgetSize.LARGE)
    }
  }

  override fun onAppWidgetOptionsChanged(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int,
    newOptions: android.os.Bundle
  ) {
    AlmostWidgetProvider.updateAppWidget(context, appWidgetManager, appWidgetId, WidgetSize.LARGE)
  }
}

private data class ProviderEntry(
  val provider: Class<out AppWidgetProvider>,
  val size: WidgetSize
)

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
import java.util.Locale
import kotlin.math.pow
import kotlin.math.roundToInt

enum class WidgetSize {
  SMALL,
  MEDIUM,
  LARGE
}

private data class WidgetPalette(
  val backgroundRes: Int,
  val catBackgroundRes: Int,
  val heroPanelRes: Int,
  val supportingPanelRes: Int,
  val saveButtonRes: Int,
  val spendButtonRes: Int,
  val saveButtonTextColor: Int,
  val spendButtonTextColor: Int,
  val titleColor: Int,
  val labelColor: Int,
  val valueColor: Int,
  val secondaryValueColor: Int,
  val detailColor: Int,
  val emptyStateColor: Int,
  val recentEventColor: Int,
  val spendEventColor: Int,
  val budgetDefaultColor: Int,
  val budgetSecondaryColor: Int,
  val budgetNegativeColor: Int
)

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
      val isMedium = size == WidgetSize.MEDIUM
      val isLarge = size == WidgetSize.LARGE
      val layoutId = when (size) {
        WidgetSize.SMALL -> R.layout.almost_widget_small
        WidgetSize.MEDIUM -> R.layout.almost_widget
        WidgetSize.LARGE -> R.layout.almost_widget_large
      }
      val views = RemoteViews(context.packageName, layoutId)
      val palette = resolveWidgetPalette(widgetData)
      applyWidgetPalette(views, palette, size)

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

        views.setViewVisibility(R.id.widget_content, android.view.View.VISIBLE)
        views.setViewVisibility(R.id.widget_empty_state, android.view.View.GONE)
        views.setTextViewText(R.id.widget_saved_label, widgetData.labelBalance)
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
        views.setTextViewText(R.id.widget_save_button, "+  ${widgetData.labelActionSave}")
        views.setTextViewText(R.id.widget_spend_button, "−  ${widgetData.labelActionSpend}")

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
            if (budgetIsNegative) palette.budgetNegativeColor else palette.budgetSecondaryColor
          )
        }

        if (isLarge) {
          views.setViewVisibility(R.id.widget_large_section, android.view.View.VISIBLE)
          views.setTextViewText(R.id.widget_streak_label, widgetData.labelBudgetRemaining)
          views.setTextViewText(R.id.widget_streak_value, budgetRemainingText)
          views.setTextColor(
            R.id.widget_streak_value,
            if (budgetIsNegative) palette.budgetNegativeColor else palette.budgetDefaultColor
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
                views.setTextColor(
                  viewId,
                  if (label.trimStart().startsWith("-")) palette.spendEventColor else palette.recentEventColor
                )
                views.setViewVisibility(viewId, android.view.View.VISIBLE)
              } else {
                views.setViewVisibility(viewId, android.view.View.GONE)
              }
            }
          } else {
            views.setTextViewText(R.id.widget_recent_event_1, widgetData.labelRecentEmpty)
            views.setTextColor(R.id.widget_recent_event_1, palette.labelColor)
            views.setViewVisibility(R.id.widget_recent_event_1, android.view.View.VISIBLE)
            views.setViewVisibility(R.id.widget_recent_event_2, android.view.View.GONE)
            views.setViewVisibility(R.id.widget_recent_event_3, android.view.View.GONE)
          }
        }
      } else {
        views.setViewVisibility(R.id.widget_content, android.view.View.GONE)
        views.setViewVisibility(R.id.widget_empty_state, android.view.View.VISIBLE)
        views.setViewVisibility(R.id.widget_actions_row, android.view.View.GONE)
        views.setTextViewText(R.id.widget_empty_state_label, widgetData.labelEmptyState)
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

    private fun applyWidgetPalette(views: RemoteViews, palette: WidgetPalette, size: WidgetSize) {
      val isMedium = size == WidgetSize.MEDIUM
      val isLarge = size == WidgetSize.LARGE

      views.setInt(R.id.widget_root, "setBackgroundResource", palette.backgroundRes)
      views.setInt(R.id.widget_cat, "setBackgroundResource", palette.catBackgroundRes)
      views.setInt(R.id.widget_empty_cat, "setBackgroundResource", palette.catBackgroundRes)
      views.setInt(R.id.widget_metric_column, "setBackgroundResource", palette.heroPanelRes)
      views.setInt(R.id.widget_save_button, "setBackgroundResource", palette.saveButtonRes)
      views.setInt(R.id.widget_spend_button, "setBackgroundResource", palette.spendButtonRes)

      views.setTextColor(R.id.widget_title, palette.titleColor)
      views.setTextColor(R.id.widget_saved_label, palette.labelColor)
      views.setTextColor(R.id.widget_saved_value, palette.valueColor)
      views.setTextColor(R.id.widget_progress_month_label, palette.labelColor)
      views.setTextColor(R.id.widget_progress_month_value, palette.detailColor)
      views.setTextColor(R.id.widget_empty_state_label, palette.emptyStateColor)
      views.setTextColor(R.id.widget_save_button, palette.saveButtonTextColor)
      views.setTextColor(R.id.widget_spend_button, palette.spendButtonTextColor)

      if (isMedium || isLarge) {
        views.setInt(R.id.widget_progress_column, "setBackgroundResource", palette.supportingPanelRes)
        views.setTextColor(R.id.widget_saved_total_label, palette.labelColor)
        views.setTextColor(R.id.widget_saved_total_value, palette.secondaryValueColor)
        views.setTextColor(R.id.widget_progress_streak_label, palette.labelColor)
        views.setTextColor(R.id.widget_progress_streak_value, palette.budgetSecondaryColor)
      }

      if (isLarge) {
        views.setInt(R.id.widget_recent_group, "setBackgroundResource", palette.supportingPanelRes)
        views.setTextColor(R.id.widget_streak_label, palette.labelColor)
        views.setTextColor(R.id.widget_streak_value, palette.budgetDefaultColor)
        views.setTextColor(R.id.widget_progress_today_label, palette.labelColor)
        views.setTextColor(R.id.widget_progress_today_value, palette.detailColor)
        views.setTextColor(R.id.widget_recent_label, palette.labelColor)
        views.setTextColor(R.id.widget_recent_event_1, palette.recentEventColor)
        views.setTextColor(R.id.widget_recent_event_2, palette.recentEventColor)
        views.setTextColor(R.id.widget_recent_event_3, palette.recentEventColor)
      }
    }

    private fun resolveWidgetPalette(widgetData: WidgetData): WidgetPalette {
      return when (normalizeThemeId(widgetData.themeId)) {
        "dark" -> WidgetPalette(
          backgroundRes = R.drawable.widget_bg_dark,
          catBackgroundRes = R.drawable.widget_cat_bg_dark,
          heroPanelRes = R.drawable.widget_panel_hero_dark,
          supportingPanelRes = R.drawable.widget_panel_support_dark,
          saveButtonRes = R.drawable.widget_button_save_bg,
          spendButtonRes = R.drawable.widget_button_spend_bg,
          saveButtonTextColor = Color.WHITE,
          spendButtonTextColor = Color.WHITE,
          titleColor = Color.parseColor("#F7F9FF"),
          labelColor = Color.parseColor("#A5B1CC"),
          valueColor = Color.parseColor("#64F2B5"),
          secondaryValueColor = Color.parseColor("#F7F9FF"),
          detailColor = Color.parseColor("#D8E1FF"),
          emptyStateColor = Color.parseColor("#E8EEFF"),
          recentEventColor = Color.parseColor("#DDE5FF"),
          spendEventColor = Color.parseColor("#FF8D9A"),
          budgetDefaultColor = Color.parseColor("#F7F9FF"),
          budgetSecondaryColor = Color.parseColor("#C4CEE7"),
          budgetNegativeColor = Color.parseColor("#FF8D9A")
        )

        "pro" -> {
          val accentId = normalizeAccentId(widgetData.proThemeAccentId)
          val accentFallback = proAccentColorForId(accentId)
          val accentColor = parseColorOrDefault(widgetData.themePrimaryColor, accentFallback)
          val titleBase = Color.parseColor("#101B45")
          val labelBase = Color.parseColor("#5F6B98")
          WidgetPalette(
            backgroundRes = proBackgroundResForAccent(accentId),
            catBackgroundRes = R.drawable.widget_cat_bg_pro,
            heroPanelRes = R.drawable.widget_panel_hero_pro,
            supportingPanelRes = R.drawable.widget_panel_support_pro,
            saveButtonRes = proSaveButtonResForAccent(accentId),
            spendButtonRes = R.drawable.widget_button_spend_bg,
            saveButtonTextColor = contrastingTextColor(accentColor),
            spendButtonTextColor = Color.WHITE,
            titleColor = blendColors(titleBase, accentColor, 0.12f),
            labelColor = blendColors(labelBase, accentColor, 0.18f),
            valueColor = accentColor,
            secondaryValueColor = blendColors(titleBase, accentColor, 0.08f),
            detailColor = blendColors(labelBase, accentColor, 0.28f),
            emptyStateColor = blendColors(titleBase, accentColor, 0.12f),
            recentEventColor = blendColors(titleBase, accentColor, 0.14f),
            spendEventColor = Color.parseColor("#D84F61"),
            budgetDefaultColor = blendColors(titleBase, accentColor, 0.08f),
            budgetSecondaryColor = blendColors(labelBase, accentColor, 0.2f),
            budgetNegativeColor = Color.parseColor("#D84F61")
          )
        }

        else -> WidgetPalette(
          backgroundRes = R.drawable.widget_bg,
          catBackgroundRes = R.drawable.widget_cat_bg,
          heroPanelRes = R.drawable.widget_panel_hero,
          supportingPanelRes = R.drawable.widget_panel_support,
          saveButtonRes = R.drawable.widget_button_save_bg,
          spendButtonRes = R.drawable.widget_button_spend_bg,
          saveButtonTextColor = Color.WHITE,
          spendButtonTextColor = Color.WHITE,
          titleColor = Color.parseColor("#0A241C"),
          labelColor = Color.parseColor("#3B5C50"),
          valueColor = Color.parseColor("#087A43"),
          secondaryValueColor = Color.parseColor("#0A241C"),
          detailColor = Color.parseColor("#28586A"),
          emptyStateColor = Color.parseColor("#294C40"),
          recentEventColor = Color.parseColor("#1B493A"),
          spendEventColor = Color.parseColor("#C02E40"),
          budgetDefaultColor = Color.parseColor("#0A241C"),
          budgetSecondaryColor = Color.parseColor("#2E5E51"),
          budgetNegativeColor = Color.parseColor("#C02E40")
        )
      }
    }

    private fun contrastingTextColor(backgroundColor: Int): Int {
      fun linearChannel(channel: Int): Double {
        val value = channel / 255.0
        return if (value <= 0.04045) value / 12.92 else ((value + 0.055) / 1.055).pow(2.4)
      }
      val luminance =
        0.2126 * linearChannel(Color.red(backgroundColor)) +
          0.7152 * linearChannel(Color.green(backgroundColor)) +
          0.0722 * linearChannel(Color.blue(backgroundColor))
      return if (luminance > 0.2) Color.parseColor("#0A142E") else Color.WHITE
    }

    private fun normalizeThemeId(themeId: String?): String {
      return (themeId ?: "light").trim().lowercase(Locale.US)
    }

    private fun normalizeAccentId(accentId: String?): String {
      return (accentId ?: "indigo").trim().lowercase(Locale.US)
    }

    private fun proAccentColorForId(accentId: String): Int {
      return when (accentId) {
        "emerald" -> Color.parseColor("#1FBF8F")
        "sunset" -> Color.parseColor("#FF7A59")
        "gold" -> Color.parseColor("#E3A62B")
        "violet" -> Color.parseColor("#8B61FF")
        "aqua" -> Color.parseColor("#2FA8FF")
        else -> Color.parseColor("#4353FF")
      }
    }

    private fun proBackgroundResForAccent(accentId: String): Int {
      return when (accentId) {
        "emerald" -> R.drawable.widget_bg_pro_emerald
        "sunset" -> R.drawable.widget_bg_pro_sunset
        "gold" -> R.drawable.widget_bg_pro_gold
        "violet" -> R.drawable.widget_bg_pro_violet
        "aqua" -> R.drawable.widget_bg_pro_aqua
        else -> R.drawable.widget_bg_pro_indigo
      }
    }

    private fun proSaveButtonResForAccent(accentId: String): Int {
      return when (accentId) {
        "emerald" -> R.drawable.widget_button_save_bg_pro_emerald
        "sunset" -> R.drawable.widget_button_save_bg_pro_sunset
        "gold" -> R.drawable.widget_button_save_bg_pro_gold
        "violet" -> R.drawable.widget_button_save_bg_pro_violet
        "aqua" -> R.drawable.widget_button_save_bg_pro_aqua
        else -> R.drawable.widget_button_save_bg_pro_indigo
      }
    }

    private fun parseColorOrDefault(raw: String?, fallbackColor: Int): Int {
      if (raw.isNullOrBlank()) return fallbackColor
      return try {
        Color.parseColor(raw.trim())
      } catch (_: IllegalArgumentException) {
        fallbackColor
      }
    }

    private fun blendColors(baseColor: Int, tintColor: Int, ratio: Float): Int {
      val clamped = ratio.coerceIn(0f, 1f)
      val inverse = 1f - clamped
      val red = (Color.red(baseColor) * inverse + Color.red(tintColor) * clamped).roundToInt()
      val green = (Color.green(baseColor) * inverse + Color.green(tintColor) * clamped).roundToInt()
      val blue = (Color.blue(baseColor) * inverse + Color.blue(tintColor) * clamped).roundToInt()
      return Color.argb(255, red, green, blue)
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

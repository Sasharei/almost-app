import Foundation
import WidgetKit
import React

@objc(WidgetStorage)
class WidgetStorage: NSObject {
  private let appGroupId = "group.com.sasarei.almostclean"
  private let keySavedMonthLabel = "widget_saved_month_label"
  private let keySavedTotalLabel = "widget_saved_total_label"
  private let keySavedTodayLabel = "widget_saved_today_label"
  private let keyStreakDays = "widget_streak_days"
  private let keyHasData = "widget_has_data"
  private let keySavedMonthValue = "widget_saved_month_value"
  private let keySavedTotalValue = "widget_saved_total_value"
  private let keyMonthlyTargetValue = "widget_monthly_target_value"
  private let keySavedTodayValue = "widget_saved_today_value"
  private let keyDailyGoalValue = "widget_daily_goal_value"
  private let keyGoalTargetValue = "widget_goal_target_value"
  private let keyGoalSavedValue = "widget_goal_saved_value"
  private let keyBudgetRemainingValue = "widget_budget_remaining_value"
  private let keyBudgetRemainingLabel = "widget_budget_remaining_label"
  private let keyBudgetTotalValue = "widget_budget_total_value"
  private let keyRecentEvents = "widget_recent_events"
  private let keyUpdatedAt = "widget_updated_at"
  private let keyWidgetLanguage = "widget_language"
  private let keyWidgetCurrencyCode = "widget_currency_code"
  private let keyWidgetLabelSavedMonth = "widget_label_saved_month"
  private let keyWidgetLabelTotal = "widget_label_total"
  private let keyWidgetLabelBalance = "widget_label_balance"
  private let keyWidgetLabelToday = "widget_label_today"
  private let keyWidgetLabelGoal = "widget_label_goal"
  private let keyWidgetLabelMonthGoal = "widget_label_month_goal"
  private let keyWidgetLabelBudgetRemaining = "widget_label_budget_remaining"
  private let keyWidgetLabelRecent = "widget_label_recent"
  private let keyWidgetLabelRecentEmpty = "widget_label_recent_empty"
  private let keyWidgetLabelEmptyState = "widget_label_empty_state"
  private let keyWidgetActionSave = "widget_action_save"
  private let keyWidgetActionSpend = "widget_action_spend"
  private let keyWidgetLabelStreak = "widget_label_streak"
  private let keyWidgetLabelAddTemptation = "widget_label_add_temptation"

  @objc
  func setWidgetData(
    _ data: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let defaults = UserDefaults(suiteName: appGroupId) else {
      reject("widget_storage_unavailable", "App Group UserDefaults not available", nil)
      return
    }

    if let savedLabel = data["savedMonthLabel"] as? String {
      defaults.set(savedLabel, forKey: keySavedMonthLabel)
    }
    if let savedTotalLabel = data["savedTotalLabel"] as? String {
      defaults.set(savedTotalLabel, forKey: keySavedTotalLabel)
    }
    if let savedTodayLabel = data["savedTodayLabel"] as? String {
      defaults.set(savedTodayLabel, forKey: keySavedTodayLabel)
    }
    if let streakDays = data["streakDays"] as? NSNumber {
      defaults.set(streakDays.intValue, forKey: keyStreakDays)
    }
    if let hasData = data["hasData"] as? NSNumber {
      defaults.set(hasData.boolValue, forKey: keyHasData)
    }
    if let savedMonthValue = data["savedMonthValue"] as? NSNumber {
      defaults.set(savedMonthValue.doubleValue, forKey: keySavedMonthValue)
    }
    if let savedTotalValue = data["savedTotalValue"] as? NSNumber {
      defaults.set(savedTotalValue.doubleValue, forKey: keySavedTotalValue)
    }
    if let monthlyTargetValue = data["monthlyTargetValue"] as? NSNumber {
      defaults.set(monthlyTargetValue.doubleValue, forKey: keyMonthlyTargetValue)
    }
    if let savedTodayValue = data["savedTodayValue"] as? NSNumber {
      defaults.set(savedTodayValue.doubleValue, forKey: keySavedTodayValue)
    }
    if let dailyGoalValue = data["dailyGoalValue"] as? NSNumber {
      defaults.set(dailyGoalValue.doubleValue, forKey: keyDailyGoalValue)
    }
    if let goalTargetValue = data["goalTargetValue"] as? NSNumber {
      defaults.set(goalTargetValue.doubleValue, forKey: keyGoalTargetValue)
    }
    if let goalSavedValue = data["goalSavedValue"] as? NSNumber {
      defaults.set(goalSavedValue.doubleValue, forKey: keyGoalSavedValue)
    }
    if let budgetRemainingValue = data["budgetRemainingValue"] as? NSNumber {
      defaults.set(budgetRemainingValue.doubleValue, forKey: keyBudgetRemainingValue)
    }
    if let budgetRemainingLabel = data["budgetRemainingLabel"] as? String {
      defaults.set(budgetRemainingLabel, forKey: keyBudgetRemainingLabel)
    }
    if let budgetTotalValue = data["budgetTotalValue"] as? NSNumber {
      defaults.set(budgetTotalValue.doubleValue, forKey: keyBudgetTotalValue)
    }
    if let recentEvents = data["recentEvents"] as? [String] {
      defaults.set(recentEvents, forKey: keyRecentEvents)
    }
    if let widgetLanguage = data["widgetLanguage"] as? String {
      defaults.set(widgetLanguage, forKey: keyWidgetLanguage)
    }
    if let widgetCurrencyCode = data["widgetCurrencyCode"] as? String {
      defaults.set(widgetCurrencyCode, forKey: keyWidgetCurrencyCode)
    }
    if let widgetLabelSavedMonth = data["widgetLabelSavedMonth"] as? String {
      defaults.set(widgetLabelSavedMonth, forKey: keyWidgetLabelSavedMonth)
    }
    if let widgetLabelTotal = data["widgetLabelTotal"] as? String {
      defaults.set(widgetLabelTotal, forKey: keyWidgetLabelTotal)
    }
    if let widgetLabelBalance = data["widgetLabelBalance"] as? String {
      defaults.set(widgetLabelBalance, forKey: keyWidgetLabelBalance)
    }
    if let widgetLabelToday = data["widgetLabelToday"] as? String {
      defaults.set(widgetLabelToday, forKey: keyWidgetLabelToday)
    }
    if let widgetLabelGoal = data["widgetLabelGoal"] as? String {
      defaults.set(widgetLabelGoal, forKey: keyWidgetLabelGoal)
    }
    if let widgetLabelMonthGoal = data["widgetLabelMonthGoal"] as? String {
      defaults.set(widgetLabelMonthGoal, forKey: keyWidgetLabelMonthGoal)
    }
    if let widgetLabelBudgetRemaining = data["widgetLabelBudgetRemaining"] as? String {
      defaults.set(widgetLabelBudgetRemaining, forKey: keyWidgetLabelBudgetRemaining)
    }
    if let widgetLabelRecent = data["widgetLabelRecent"] as? String {
      defaults.set(widgetLabelRecent, forKey: keyWidgetLabelRecent)
    }
    if let widgetLabelRecentEmpty = data["widgetLabelRecentEmpty"] as? String {
      defaults.set(widgetLabelRecentEmpty, forKey: keyWidgetLabelRecentEmpty)
    }
    if let widgetLabelEmptyState = data["widgetLabelEmptyState"] as? String {
      defaults.set(widgetLabelEmptyState, forKey: keyWidgetLabelEmptyState)
    }
    if let widgetActionSave = data["widgetActionSave"] as? String {
      defaults.set(widgetActionSave, forKey: keyWidgetActionSave)
    }
    if let widgetActionSpend = data["widgetActionSpend"] as? String {
      defaults.set(widgetActionSpend, forKey: keyWidgetActionSpend)
    }
    if let widgetLabelStreak = data["widgetLabelStreak"] as? String {
      defaults.set(widgetLabelStreak, forKey: keyWidgetLabelStreak)
    }
    if let widgetLabelAddTemptation = data["widgetLabelAddTemptation"] as? String {
      defaults.set(widgetLabelAddTemptation, forKey: keyWidgetLabelAddTemptation)
    }

    defaults.set(Date().timeIntervalSince1970, forKey: keyUpdatedAt)
    defaults.synchronize()

    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadTimelines(ofKind: "Almost_Widget")
      WidgetCenter.shared.reloadTimelines(ofKind: "AlmostWidget")
    }

    resolve(true)
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }
}

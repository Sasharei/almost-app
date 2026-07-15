//
//  Almost_Widget.swift
//  Almost Widget
//
//  Created by Alexander Rysev on 20/02/2026.
//

import WidgetKit
import SwiftUI
import UIKit

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
private let keyWidgetThemeId = "widget_theme_id"
private let keyWidgetProThemeAccentId = "widget_pro_theme_accent_id"
private let keyWidgetThemePrimaryColor = "widget_theme_primary_color"
private let keyWidgetThemeBackgroundColor = "widget_theme_background_color"
private let keyWidgetInstalledMarker = "widget_home_installed_marker"
private let keyWidgetDailySummaryAvailable = "widget_daily_summary_available"
private let keyWidgetDailySummaryExpiresAt = "widget_daily_summary_expires_at"
private let keyWidgetDailySummaryLabel = "widget_daily_summary_label"

private struct WidgetThemePalette {
    let backgroundTop: Color
    let backgroundBottom: Color
    let backgroundAccent: Color
    let title: Color
    let label: Color
    let primary: Color
    let secondaryValue: Color
    let detail: Color
    let progressTrack: Color
    let heroSurface: Color
    let supportingSurface: Color
    let surfaceBorder: Color
    let catBackground: Color
    let badgeBackground: Color
    let badgeBorder: Color
    let saveButtonBackground: Color
    let spendButtonBackground: Color
    let saveButtonText: Color
    let spendButtonText: Color
    let budgetDefault: Color
    let budgetSecondary: Color
    let budgetNegative: Color
    let recentEvent: Color
    let recentSpend: Color
    let emptyState: Color
}

struct AlmostWidgetEntry: TimelineEntry {
    let date: Date
    let savedMonthLabel: String
    let savedTotalLabel: String
    let savedTodayLabel: String
    let streakDays: Int
    let hasData: Bool
    let savedMonthValue: Double
    let savedTotalValue: Double
    let monthlyTargetValue: Double
    let savedTodayValue: Double
    let dailyGoalValue: Double
    let goalTargetValue: Double
    let goalSavedValue: Double
    let budgetRemainingValue: Double
    let budgetRemainingLabel: String
    let budgetTotalValue: Double
    let recentEvents: [String]
    let labelSavedMonth: String
    let labelTotal: String
    let labelBalance: String
    let labelToday: String
    let labelGoal: String
    let labelMonthGoal: String
    let labelBudgetRemaining: String
    let labelRecent: String
    let labelRecentEmpty: String
    let labelEmptyState: String
    let actionSaveLabel: String
    let actionSpendLabel: String
    let widgetThemeId: String
    let widgetProThemeAccentId: String
    let widgetThemePrimaryColor: String
    let widgetThemeBackgroundColor: String
    let dailySummaryAvailable: Bool
    let dailySummaryExpiresAt: Double
    let dailySummaryLabel: String
}

struct AlmostWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> AlmostWidgetEntry {
        AlmostWidgetEntry(
            date: Date(),
            savedMonthLabel: "$0",
            savedTotalLabel: "$0",
            savedTodayLabel: "$0",
            streakDays: 0,
            hasData: false,
            savedMonthValue: 0,
            savedTotalValue: 0,
            monthlyTargetValue: 0,
            savedTodayValue: 0,
            dailyGoalValue: 0,
            goalTargetValue: 0,
            goalSavedValue: 0,
            budgetRemainingValue: 0,
            budgetRemainingLabel: "--",
            budgetTotalValue: 0,
            recentEvents: [],
            labelSavedMonth: "Сэкономлено",
            labelTotal: "Всего",
            labelBalance: "Баланс",
            labelToday: "Сегодня",
            labelGoal: "До цели",
            labelMonthGoal: "Цель месяца",
            labelBudgetRemaining: "Остаток бюджета",
            labelRecent: "Последние события:",
            labelRecentEmpty: "Нет событий",
            labelEmptyState: "Start saving today",
            actionSaveLabel: "Копить",
            actionSpendLabel: "Тратить",
            widgetThemeId: "light",
            widgetProThemeAccentId: "none",
            widgetThemePrimaryColor: "#111111",
            widgetThemeBackgroundColor: "#F6F7FB",
            dailySummaryAvailable: false,
            dailySummaryExpiresAt: 0,
            dailySummaryLabel: "Отчёт"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (AlmostWidgetEntry) -> Void) {
        completion(loadEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<AlmostWidgetEntry>) -> Void) {
        let entry = loadEntry()
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }

    private func loadEntry() -> AlmostWidgetEntry {
        let defaults = UserDefaults(suiteName: appGroupId)
        defaults?.set(true, forKey: keyWidgetInstalledMarker)
        let savedMonthLabel = defaults?.string(forKey: keySavedMonthLabel) ?? "--"
        let savedTotalLabel = defaults?.string(forKey: keySavedTotalLabel) ?? "--"
        let savedTodayLabel = defaults?.string(forKey: keySavedTodayLabel) ?? "--"
        let streakDays = defaults?.integer(forKey: keyStreakDays) ?? 0
        let hasData = defaults?.object(forKey: keyHasData) as? Bool ?? false
        let savedMonthValue = defaults?.double(forKey: keySavedMonthValue) ?? 0
        let savedTotalValue = defaults?.double(forKey: keySavedTotalValue) ?? 0
        let monthlyTargetValue = defaults?.double(forKey: keyMonthlyTargetValue) ?? 0
        let savedTodayValue = defaults?.double(forKey: keySavedTodayValue) ?? 0
        let dailyGoalValue = defaults?.double(forKey: keyDailyGoalValue) ?? 0
        let goalTargetValue = defaults?.double(forKey: keyGoalTargetValue) ?? 0
        let goalSavedValue = defaults?.double(forKey: keyGoalSavedValue) ?? 0
        let budgetRemainingValue = defaults?.double(forKey: keyBudgetRemainingValue) ?? 0
        let budgetRemainingLabel = defaults?.string(forKey: keyBudgetRemainingLabel) ?? "--"
        let budgetTotalValue = defaults?.double(forKey: keyBudgetTotalValue) ?? 0
        let recentEvents = defaults?.stringArray(forKey: keyRecentEvents) ?? []
        let labelSavedMonth = defaults?.string(forKey: keyWidgetLabelSavedMonth) ?? "Сэкономлено"
        let labelTotal = defaults?.string(forKey: keyWidgetLabelTotal) ?? "Всего"
        let labelBalance = defaults?.string(forKey: keyWidgetLabelBalance) ?? "Баланс"
        let labelToday = defaults?.string(forKey: keyWidgetLabelToday) ?? "Сегодня"
        let labelGoal = defaults?.string(forKey: keyWidgetLabelGoal) ?? "До цели"
        let labelMonthGoal = defaults?.string(forKey: keyWidgetLabelMonthGoal) ?? "Цель месяца"
        let labelBudgetRemaining =
            defaults?.string(forKey: keyWidgetLabelBudgetRemaining) ?? "Остаток бюджета"
        let labelRecent = defaults?.string(forKey: keyWidgetLabelRecent) ?? "Последние события:"
        let labelRecentEmpty = defaults?.string(forKey: keyWidgetLabelRecentEmpty) ?? "Нет событий"
        let labelEmptyState = defaults?.string(forKey: keyWidgetLabelEmptyState) ?? "Start saving today"
        let actionSaveLabel = defaults?.string(forKey: keyWidgetActionSave) ?? "Копить"
        let actionSpendLabel = defaults?.string(forKey: keyWidgetActionSpend) ?? "Тратить"
        let widgetThemeId = defaults?.string(forKey: keyWidgetThemeId) ?? "light"
        let widgetProThemeAccentId = defaults?.string(forKey: keyWidgetProThemeAccentId) ?? "none"
        let widgetThemePrimaryColor = defaults?.string(forKey: keyWidgetThemePrimaryColor) ?? "#111111"
        let widgetThemeBackgroundColor = defaults?.string(forKey: keyWidgetThemeBackgroundColor) ?? "#F6F7FB"
        let dailySummaryAvailable = defaults?.bool(forKey: keyWidgetDailySummaryAvailable) ?? false
        let dailySummaryExpiresAt = defaults?.double(forKey: keyWidgetDailySummaryExpiresAt) ?? 0
        let dailySummaryLabel = defaults?.string(forKey: keyWidgetDailySummaryLabel) ?? "Отчёт"
        return AlmostWidgetEntry(
            date: Date(),
            savedMonthLabel: savedMonthLabel,
            savedTotalLabel: savedTotalLabel,
            savedTodayLabel: savedTodayLabel,
            streakDays: streakDays,
            hasData: hasData,
            savedMonthValue: savedMonthValue,
            savedTotalValue: savedTotalValue,
            monthlyTargetValue: monthlyTargetValue,
            savedTodayValue: savedTodayValue,
            dailyGoalValue: dailyGoalValue,
            goalTargetValue: goalTargetValue,
            goalSavedValue: goalSavedValue,
            budgetRemainingValue: budgetRemainingValue,
            budgetRemainingLabel: budgetRemainingLabel,
            budgetTotalValue: budgetTotalValue,
            recentEvents: recentEvents,
            labelSavedMonth: labelSavedMonth,
            labelTotal: labelTotal,
            labelBalance: labelBalance,
            labelToday: labelToday,
            labelGoal: labelGoal,
            labelMonthGoal: labelMonthGoal,
            labelBudgetRemaining: labelBudgetRemaining,
            labelRecent: labelRecent,
            labelRecentEmpty: labelRecentEmpty,
            labelEmptyState: labelEmptyState,
            actionSaveLabel: actionSaveLabel,
            actionSpendLabel: actionSpendLabel,
            widgetThemeId: widgetThemeId,
            widgetProThemeAccentId: widgetProThemeAccentId,
            widgetThemePrimaryColor: widgetThemePrimaryColor,
            widgetThemeBackgroundColor: widgetThemeBackgroundColor,
            dailySummaryAvailable: dailySummaryAvailable,
            dailySummaryExpiresAt: dailySummaryExpiresAt,
            dailySummaryLabel: dailySummaryLabel
        )
    }
}

struct Almost_WidgetEntryView: View {
    var entry: AlmostWidgetEntry
    @Environment(\.widgetFamily) private var family

    private var palette: WidgetThemePalette {
        resolveWidgetPalette(
            themeId: entry.widgetThemeId,
            proAccentId: entry.widgetProThemeAccentId,
            primaryHex: entry.widgetThemePrimaryColor,
            backgroundHex: entry.widgetThemeBackgroundColor
        )
    }

    var body: some View {
        let edgePadding: CGFloat = family == .systemSmall ? 7 : (family == .systemLarge ? 12 : 8)
        let content = ZStack(alignment: .topTrailing) {
            contentView
            if dailySummaryReady {
                dailySummaryBadge
            }
        }
            .padding(edgePadding)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .widgetURL(URL(string: "com.sasarei.almostclean://home"))

        if #available(iOS 17.0, *) {
            content.containerBackground(for: .widget) {
                widgetBackground
            }
        } else {
            content.background(widgetBackground)
        }
    }

    private var widgetBackground: some View {
        ZStack {
            LinearGradient(
                colors: [palette.backgroundTop, palette.backgroundBottom],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            Circle()
                .fill(palette.backgroundAccent.opacity(0.2))
                .frame(width: family == .systemSmall ? 104 : 180)
                .blur(radius: family == .systemSmall ? 2 : 8)
                .offset(x: family == .systemSmall ? 58 : 130, y: -58)
            Circle()
                .fill(palette.spendButtonBackground.opacity(0.1))
                .frame(width: family == .systemLarge ? 180 : 120)
                .blur(radius: 10)
                .offset(x: family == .systemSmall ? -72 : -150, y: family == .systemLarge ? 150 : 86)
        }
    }

    @ViewBuilder
    private var contentView: some View {
        let monthProgress = progressValue(entry.savedMonthValue, entry.monthlyTargetValue)
        let goalProgress = progressValue(entry.goalSavedValue, entry.goalTargetValue)
        let todayProgress = progressValue(entry.savedTodayValue, entry.dailyGoalValue)
        let hasGoal = entry.goalTargetValue > 0
        let primaryTitle = hasGoal ? entry.labelGoal : entry.labelMonthGoal
        let primaryProgress = hasGoal ? goalProgress : monthProgress
        let primaryDetail = hasGoal
            ? percentLabel(entry.goalSavedValue, entry.goalTargetValue)
            : percentLabel(entry.savedMonthValue, entry.monthlyTargetValue)
        let todayDetail = percentLabel(entry.savedTodayValue, entry.dailyGoalValue)
        let budgetTotalValue = entry.budgetTotalValue
        let budgetRemainingValue = entry.budgetRemainingValue
        let budgetRemainingBase = entry.budgetRemainingLabel
        let budgetRemainingText = budgetRemainingBase.isEmpty
            ? "--"
            : (budgetRemainingValue < -0.01 ? "-\(budgetRemainingBase)" : budgetRemainingBase)
        let budgetProgress = budgetTotalValue > 0
            ? min(max(budgetRemainingValue / budgetTotalValue, 0), 1)
            : 0
        let budgetIsNegative = budgetRemainingValue < -0.01
        let budgetColor = budgetIsNegative ? palette.budgetNegative : palette.budgetSecondary
        let budgetMetricColor = budgetIsNegative ? palette.budgetNegative : palette.budgetDefault
        let recentEvents = entry.recentEvents

        if !entry.hasData {
            VStack(spacing: 8) {
                Spacer(minLength: 0)
                catImage
                Text("Almost")
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundColor(palette.title)
                Text(entry.labelEmptyState)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(palette.emptyState)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .multilineTextAlignment(.center)
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(palette.heroSurface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(palette.surfaceBorder, lineWidth: 1)
            )
        } else {
            switch family {
            case .systemSmall:
                VStack(alignment: .leading, spacing: 7) {
                    headerRow
                    heroMetricPanel(
                        title: entry.labelBalance,
                        value: entry.savedTotalLabel,
                        valueSize: 25,
                        progressTitle: primaryTitle,
                        progress: primaryProgress,
                        detail: primaryDetail,
                        compact: true
                    )
                    actionRow(buttonFontSize: 12, verticalPadding: 6)
                }
            case .systemMedium:
                VStack(alignment: .leading, spacing: 8) {
                    headerRow
                    HStack(alignment: .top, spacing: 8) {
                        heroMetricPanel(
                            title: entry.labelBalance,
                            value: entry.savedTotalLabel,
                            valueSize: 28,
                            progressTitle: primaryTitle,
                            progress: primaryProgress,
                            detail: primaryDetail,
                            compact: false
                        )
                        .frame(maxWidth: .infinity)
                        VStack(alignment: .leading, spacing: 6) {
                            progressBlock(
                                title: entry.labelToday,
                                progress: todayProgress,
                                detail: entry.savedTodayLabel,
                                color: palette.detail,
                                barHeight: 6
                            )
                            progressBlock(
                                title: entry.labelBudgetRemaining,
                                progress: budgetProgress,
                                detail: budgetRemainingText,
                                color: budgetColor,
                                barHeight: 6
                            )
                        }
                        .padding(8)
                        .background(
                            RoundedRectangle(cornerRadius: 13, style: .continuous)
                                .fill(palette.supportingSurface)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 13, style: .continuous)
                                .stroke(palette.surfaceBorder, lineWidth: 1)
                        )
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    Spacer(minLength: 0)
                    actionRow(buttonFontSize: 12, verticalPadding: 6)
                }
            default:
                VStack(alignment: .leading, spacing: 9) {
                    headerRow
                    HStack(alignment: .top, spacing: 9) {
                        heroMetricPanel(
                            title: entry.labelBalance,
                            value: entry.savedTotalLabel,
                            valueSize: 30,
                            progressTitle: primaryTitle,
                            progress: primaryProgress,
                            detail: primaryDetail,
                            compact: false,
                            panelHeight: 124
                        )
                        .frame(maxWidth: .infinity)
                        VStack(spacing: 8) {
                            compactMetricTile(
                                title: entry.labelToday,
                                value: entry.savedTodayLabel,
                                valueColor: palette.secondaryValue,
                                panelHeight: 58
                            )
                            compactMetricTile(
                                title: entry.labelBudgetRemaining,
                                value: budgetRemainingText,
                                valueColor: budgetMetricColor,
                                panelHeight: 58
                            )
                        }
                        .frame(maxWidth: .infinity)
                    }
                    HStack(alignment: .top, spacing: 10) {
                        VStack(alignment: .leading, spacing: 7) {
                            progressBlock(
                                title: entry.labelToday,
                                progress: todayProgress,
                                detail: todayDetail,
                                color: palette.detail,
                                barHeight: 7
                            )
                            progressBlock(
                                title: entry.labelBudgetRemaining,
                                progress: budgetProgress,
                                detail: budgetRemainingText,
                                color: budgetColor,
                                barHeight: 7
                            )
                        }
                        .padding(8)
                        .frame(
                            maxWidth: .infinity,
                            minHeight: 84,
                            maxHeight: 84,
                            alignment: .topLeading
                        )
                        .background(
                            RoundedRectangle(cornerRadius: 13, style: .continuous)
                                .fill(palette.supportingSurface)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 13, style: .continuous)
                                .stroke(palette.surfaceBorder, lineWidth: 1)
                        )
                        .frame(maxWidth: .infinity, alignment: .leading)
                        recentEventsBlock(
                            title: entry.labelRecent,
                            events: recentEvents,
                            emptyLabel: entry.labelRecentEmpty,
                            panelHeight: 84
                        )
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    Spacer(minLength: 0)
                    actionRow(buttonFontSize: 13, verticalPadding: 9)
                }
            }
        }
    }

    private var headerRow: some View {
        HStack(spacing: 8) {
            catImage
            Text("Almost")
                .font(.system(size: family == .systemSmall ? 15 : 13, weight: .bold, design: .rounded))
                .foregroundColor(palette.title)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
            Spacer()
        }
    }

    private var dailySummaryReady: Bool {
        entry.dailySummaryAvailable &&
            entry.dailySummaryExpiresAt > Date().timeIntervalSince1970 * 1000
    }

    private var dailySummaryBadge: some View {
        let summaryBadgeSize: CGFloat = family == .systemSmall ? 26 : 28
        let summaryIconSize: CGFloat = family == .systemSmall ? 11 : 12
        return Link(destination: URL(string: "com.sasarei.almostclean://daily-summary")!) {
            Image(systemName: "chart.bar.fill")
                .font(.system(size: summaryIconSize, weight: .bold))
                .foregroundColor(palette.primary)
                .frame(width: summaryBadgeSize, height: summaryBadgeSize)
                .background(palette.badgeBackground)
                .overlay(
                    Circle()
                        .stroke(palette.badgeBorder, lineWidth: 1)
                )
                .clipShape(Circle())
        }
        .accessibilityLabel(Text(entry.dailySummaryLabel))
        .padding(.top, 2)
        .padding(.trailing, 2)
    }

    private var catImage: some View {
        Image("AlmiWidget")
            .resizable()
            .scaledToFit()
            .frame(width: family == .systemSmall ? 27 : 28, height: family == .systemSmall ? 27 : 28)
            .padding(4)
            .background(palette.catBackground)
            .overlay(
                Circle()
                    .stroke(palette.surfaceBorder, lineWidth: 1)
            )
            .clipShape(Circle())
    }

    private func heroMetricPanel(
        title: String,
        value: String,
        valueSize: CGFloat,
        progressTitle: String,
        progress: Double,
        detail: String,
        compact: Bool,
        panelHeight: CGFloat? = nil
    ) -> some View {
        VStack(alignment: .leading, spacing: compact ? 3 : 4) {
            HStack(spacing: 6) {
                Text(title)
                    .font(.system(size: compact ? 12 : 11, weight: .semibold))
                    .foregroundColor(palette.label)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                Spacer(minLength: 4)
                Text(detail)
                    .font(.system(size: compact ? 12 : 11, weight: .bold))
                    .foregroundColor(palette.primary)
                    .lineLimit(1)
            }
            Text(value)
                .font(.system(size: valueSize, weight: .bold, design: .rounded))
                .foregroundColor(palette.primary)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .allowsTightening(true)
                .frame(maxWidth: .infinity, alignment: .leading)
            HStack(spacing: 6) {
                Text(progressTitle)
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(palette.label)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                progressBar(progress: progress, color: palette.primary, height: 6)
            }
        }
        .padding(8)
        .frame(
            maxWidth: .infinity,
            minHeight: panelHeight,
            maxHeight: panelHeight,
            alignment: .topLeading
        )
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(palette.heroSurface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(palette.surfaceBorder, lineWidth: 1)
        )
    }

    private func compactMetricTile(
        title: String,
        value: String,
        valueColor: Color,
        panelHeight: CGFloat? = nil
    ) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(palette.label)
                .lineLimit(1)
                .minimumScaleFactor(0.72)
            Text(value)
                .font(.system(size: 17, weight: .bold, design: .rounded))
                .foregroundColor(valueColor)
                .lineLimit(1)
                .minimumScaleFactor(0.55)
                .allowsTightening(true)
        }
        .padding(10)
        .frame(
            maxWidth: .infinity,
            minHeight: panelHeight,
            maxHeight: panelHeight,
            alignment: .topLeading
        )
        .background(
            RoundedRectangle(cornerRadius: 13, style: .continuous)
                .fill(palette.supportingSurface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 13, style: .continuous)
                .stroke(palette.surfaceBorder, lineWidth: 1)
        )
    }

    private func progressBlock(
        title: String,
        progress: Double,
        detail: String,
        color: Color,
        barHeight: CGFloat
    ) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 6) {
                Text(title)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(palette.label)
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
                    .allowsTightening(true)
                Spacer(minLength: 4)
                Text(detail)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(color)
                    .lineLimit(1)
                    .minimumScaleFactor(0.65)
                    .allowsTightening(true)
            }
            progressBar(progress: progress, color: color, height: barHeight)
        }
    }

    private func progressBar(progress: Double, color: Color, height: CGFloat) -> some View {
        GeometryReader { proxy in
            let clamped = min(max(progress, 0), 1)
            let fillWidth = clamped <= 0 ? 0 : max(height, proxy.size.width * clamped)
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(palette.progressTrack)
                Capsule()
                    .fill(color)
                    .frame(width: fillWidth)
            }
        }
        .frame(height: height)
    }

    private func recentEventsBlock(
        title: String,
        events: [String],
        emptyLabel: String,
        panelHeight: CGFloat? = nil
    ) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(palette.label)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            if events.isEmpty {
                Text(emptyLabel)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(palette.label)
                    .lineLimit(1)
            } else {
                ForEach(Array(events.prefix(3).enumerated()), id: \.offset) { _, label in
                    recentEventRow(label)
                }
            }
        }
        .padding(10)
        .frame(
            maxWidth: .infinity,
            minHeight: panelHeight,
            maxHeight: panelHeight,
            alignment: .topLeading
        )
        .background(
            RoundedRectangle(cornerRadius: 13, style: .continuous)
                .fill(palette.supportingSurface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 13, style: .continuous)
                .stroke(palette.surfaceBorder, lineWidth: 1)
        )
    }

    private func recentEventRow(_ label: String) -> some View {
        let trimmed = label.trimmingCharacters(in: .whitespacesAndNewlines)
        let isSpend = trimmed.hasPrefix("-")
        return Text(label)
            .font(.system(size: 10, weight: .semibold))
            .foregroundColor(isSpend ? palette.recentSpend : palette.recentEvent)
            .lineLimit(1)
            .truncationMode(.tail)
    }

    private func progressValue(_ current: Double, _ target: Double) -> Double {
        guard target > 0 else { return 0 }
        return min(max(current / target, 0), 1)
    }

    private func percentLabel(_ current: Double, _ target: Double) -> String {
        guard target > 0 else { return "--" }
        let percent = Int(round(min(max(current / target, 0), 1) * 100))
        return "\(percent)%"
    }

    private func actionRow(buttonFontSize: CGFloat, verticalPadding: CGFloat) -> some View {
        HStack(spacing: 8) {
            Link(destination: URL(string: "com.sasarei.almostclean://quick-entry?type=save")!) {
                HStack(spacing: 5) {
                    Image(systemName: "plus")
                        .font(.system(size: max(9, buttonFontSize - 1), weight: .heavy))
                    Text(entry.actionSaveLabel)
                        .lineLimit(1)
                        .minimumScaleFactor(0.72)
                }
                    .font(.system(size: buttonFontSize, weight: .bold, design: .rounded))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, verticalPadding)
                    .background(palette.saveButtonBackground)
                    .foregroundColor(palette.saveButtonText)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(Color.white.opacity(0.24), lineWidth: 1)
                    )
            }
            Link(destination: URL(string: "com.sasarei.almostclean://quick-entry?type=spend")!) {
                HStack(spacing: 5) {
                    Image(systemName: "minus")
                        .font(.system(size: max(9, buttonFontSize - 1), weight: .heavy))
                    Text(entry.actionSpendLabel)
                        .lineLimit(1)
                        .minimumScaleFactor(0.72)
                }
                    .font(.system(size: buttonFontSize, weight: .bold, design: .rounded))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, verticalPadding)
                    .background(palette.spendButtonBackground)
                    .foregroundColor(palette.spendButtonText)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(Color.white.opacity(0.2), lineWidth: 1)
                    )
            }
        }
    }

    private func resolveWidgetPalette(
        themeId: String,
        proAccentId: String,
        primaryHex: String,
        backgroundHex: String
    ) -> WidgetThemePalette {
        let normalizedTheme = normalizeThemeId(themeId)
        switch normalizedTheme {
        case "dark":
            let background = colorFromHex(
                backgroundHex,
                fallback: UIColor(red: 0.035, green: 0.075, blue: 0.15, alpha: 1)
            )
            let accent = UIColor(red: 0.2, green: 0.92, blue: 0.62, alpha: 1)
            return WidgetThemePalette(
                backgroundTop: Color(uiColor: blend(background, accent, ratio: 0.06)),
                backgroundBottom: Color(uiColor: blend(background, UIColor.black, ratio: 0.2)),
                backgroundAccent: Color(uiColor: accent),
                title: Color(uiColor: UIColor(red: 0.97, green: 0.98, blue: 1.0, alpha: 1)),
                label: Color(uiColor: UIColor(red: 0.65, green: 0.69, blue: 0.8, alpha: 1)),
                primary: Color(uiColor: accent),
                secondaryValue: Color(uiColor: UIColor(red: 0.97, green: 0.98, blue: 1.0, alpha: 1)),
                detail: Color(uiColor: UIColor(red: 0.84, green: 0.89, blue: 1.0, alpha: 1)),
                progressTrack: Color(uiColor: UIColor(red: 0.18, green: 0.24, blue: 0.37, alpha: 1)),
                heroSurface: Color.white.opacity(0.105),
                supportingSurface: Color.white.opacity(0.07),
                surfaceBorder: Color.white.opacity(0.12),
                catBackground: Color(uiColor: UIColor(red: 0.13, green: 0.19, blue: 0.31, alpha: 1)),
                badgeBackground: Color(uiColor: UIColor(red: 0.16, green: 0.22, blue: 0.36, alpha: 1)),
                badgeBorder: Color(uiColor: UIColor(red: 0.28, green: 0.37, blue: 0.57, alpha: 1)),
                saveButtonBackground: Color(uiColor: UIColor(red: 0.02, green: 0.48, blue: 0.27, alpha: 1)),
                spendButtonBackground: Color(uiColor: UIColor(red: 0.75, green: 0.18, blue: 0.25, alpha: 1)),
                saveButtonText: .white,
                spendButtonText: .white,
                budgetDefault: Color(uiColor: UIColor(red: 0.97, green: 0.98, blue: 1.0, alpha: 1)),
                budgetSecondary: Color(uiColor: UIColor(red: 0.77, green: 0.81, blue: 0.91, alpha: 1)),
                budgetNegative: Color(uiColor: UIColor(red: 1.0, green: 0.56, blue: 0.62, alpha: 1)),
                recentEvent: Color(uiColor: UIColor(red: 0.88, green: 0.91, blue: 1.0, alpha: 1)),
                recentSpend: Color(uiColor: UIColor(red: 1.0, green: 0.56, blue: 0.62, alpha: 1)),
                emptyState: Color(uiColor: UIColor(red: 0.91, green: 0.94, blue: 1.0, alpha: 1))
            )
        case "pro":
            let normalizedAccentId = normalizeAccentId(proAccentId)
            let accent = colorFromHex(primaryHex, fallback: proAccentColor(for: normalizedAccentId))
            let backgroundFallback = blend(
                UIColor(red: 0.93, green: 0.95, blue: 1.0, alpha: 1),
                accent,
                ratio: 0.14
            )
            let background = colorFromHex(backgroundHex, fallback: backgroundFallback)
            let titleBase = UIColor(red: 0.06, green: 0.11, blue: 0.27, alpha: 1)
            let labelBase = UIColor(red: 0.37, green: 0.42, blue: 0.6, alpha: 1)
            return WidgetThemePalette(
                backgroundTop: Color(uiColor: blend(background, UIColor.white, ratio: 0.16)),
                backgroundBottom: Color(uiColor: blend(background, accent, ratio: 0.16)),
                backgroundAccent: Color(uiColor: accent),
                title: Color(uiColor: blend(titleBase, accent, ratio: 0.12)),
                label: Color(uiColor: blend(labelBase, accent, ratio: 0.2)),
                primary: Color(uiColor: accent),
                secondaryValue: Color(uiColor: blend(titleBase, accent, ratio: 0.08)),
                detail: Color(uiColor: blend(labelBase, accent, ratio: 0.28)),
                progressTrack: Color(uiColor: UIColor(red: 0.74, green: 0.79, blue: 0.93, alpha: 1)),
                heroSurface: Color.white.opacity(0.62),
                supportingSurface: Color.white.opacity(0.42),
                surfaceBorder: Color.white.opacity(0.68),
                catBackground: Color(uiColor: blend(UIColor(red: 0.88, green: 0.91, blue: 1.0, alpha: 1), accent, ratio: 0.2)),
                badgeBackground: Color(uiColor: blend(UIColor(red: 0.88, green: 0.91, blue: 1.0, alpha: 1), accent, ratio: 0.24)),
                badgeBorder: Color(uiColor: blend(UIColor(red: 0.78, green: 0.83, blue: 0.97, alpha: 1), accent, ratio: 0.32)),
                saveButtonBackground: Color(uiColor: accent),
                spendButtonBackground: Color(uiColor: UIColor(red: 0.75, green: 0.18, blue: 0.25, alpha: 1)),
                saveButtonText: Color(uiColor: contrastingTextColor(for: accent)),
                spendButtonText: .white,
                budgetDefault: Color(uiColor: blend(titleBase, accent, ratio: 0.1)),
                budgetSecondary: Color(uiColor: blend(labelBase, accent, ratio: 0.2)),
                budgetNegative: Color(uiColor: UIColor(red: 0.85, green: 0.32, blue: 0.38, alpha: 1)),
                recentEvent: Color(uiColor: blend(titleBase, accent, ratio: 0.14)),
                recentSpend: Color(uiColor: UIColor(red: 0.85, green: 0.32, blue: 0.38, alpha: 1)),
                emptyState: Color(uiColor: blend(titleBase, accent, ratio: 0.1))
            )
        default:
            let emerald = UIColor(red: 0.03, green: 0.48, blue: 0.26, alpha: 1)
            return WidgetThemePalette(
                backgroundTop: Color(uiColor: UIColor(red: 0.88, green: 1.0, blue: 0.94, alpha: 1)),
                backgroundBottom: Color(uiColor: UIColor(red: 0.82, green: 0.93, blue: 1.0, alpha: 1)),
                backgroundAccent: Color(uiColor: emerald),
                title: Color(uiColor: UIColor(red: 0.04, green: 0.14, blue: 0.11, alpha: 1)),
                label: Color(uiColor: UIColor(red: 0.23, green: 0.36, blue: 0.31, alpha: 1)),
                primary: Color(uiColor: emerald),
                secondaryValue: Color(uiColor: UIColor(red: 0.04, green: 0.14, blue: 0.11, alpha: 1)),
                detail: Color(uiColor: UIColor(red: 0.16, green: 0.35, blue: 0.42, alpha: 1)),
                progressTrack: Color(uiColor: UIColor(red: 0.62, green: 0.78, blue: 0.72, alpha: 0.5)),
                heroSurface: Color.white.opacity(0.7),
                supportingSurface: Color.white.opacity(0.48),
                surfaceBorder: Color.white.opacity(0.72),
                catBackground: Color.white.opacity(0.62),
                badgeBackground: Color.white.opacity(0.62),
                badgeBorder: Color.white.opacity(0.78),
                saveButtonBackground: Color(uiColor: emerald),
                spendButtonBackground: Color(uiColor: UIColor(red: 0.75, green: 0.18, blue: 0.25, alpha: 1)),
                saveButtonText: .white,
                spendButtonText: .white,
                budgetDefault: Color(uiColor: UIColor(red: 0.04, green: 0.14, blue: 0.11, alpha: 1)),
                budgetSecondary: Color(uiColor: UIColor(red: 0.18, green: 0.37, blue: 0.33, alpha: 1)),
                budgetNegative: Color(uiColor: UIColor(red: 0.75, green: 0.18, blue: 0.25, alpha: 1)),
                recentEvent: Color(uiColor: UIColor(red: 0.1, green: 0.27, blue: 0.22, alpha: 1)),
                recentSpend: Color(uiColor: UIColor(red: 0.75, green: 0.18, blue: 0.25, alpha: 1)),
                emptyState: Color(uiColor: UIColor(red: 0.16, green: 0.3, blue: 0.25, alpha: 1))
            )
        }
    }

    private func contrastingTextColor(for background: UIColor) -> UIColor {
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0
        guard background.getRed(&red, green: &green, blue: &blue, alpha: &alpha) else {
            return .white
        }
        let linearRed = red <= 0.04045 ? red / 12.92 : pow((red + 0.055) / 1.055, 2.4)
        let linearGreen = green <= 0.04045 ? green / 12.92 : pow((green + 0.055) / 1.055, 2.4)
        let linearBlue = blue <= 0.04045 ? blue / 12.92 : pow((blue + 0.055) / 1.055, 2.4)
        let luminance = 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue
        return luminance > 0.2
            ? UIColor(red: 0.04, green: 0.08, blue: 0.18, alpha: 1)
            : .white
    }

    private func normalizeThemeId(_ raw: String) -> String {
        let normalized = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        switch normalized {
        case "dark", "pro":
            return normalized
        default:
            return "light"
        }
    }

    private func normalizeAccentId(_ raw: String) -> String {
        let normalized = raw.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        switch normalized {
        case "emerald", "sunset", "gold", "violet", "aqua", "indigo":
            return normalized
        default:
            return "indigo"
        }
    }

    private func proAccentColor(for accentId: String) -> UIColor {
        switch accentId {
        case "emerald":
            return UIColor(red: 0.12, green: 0.75, blue: 0.56, alpha: 1)
        case "sunset":
            return UIColor(red: 1.0, green: 0.48, blue: 0.35, alpha: 1)
        case "gold":
            return UIColor(red: 0.89, green: 0.65, blue: 0.17, alpha: 1)
        case "violet":
            return UIColor(red: 0.55, green: 0.38, blue: 1.0, alpha: 1)
        case "aqua":
            return UIColor(red: 0.18, green: 0.66, blue: 1.0, alpha: 1)
        default:
            return UIColor(red: 0.26, green: 0.33, blue: 1.0, alpha: 1)
        }
    }

    private func colorFromHex(_ raw: String, fallback: UIColor) -> UIColor {
        let cleaned = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleaned.isEmpty else { return fallback }
        let hex = cleaned.hasPrefix("#") ? String(cleaned.dropFirst()) : cleaned
        guard hex.count == 6 else { return fallback }
        var value: UInt64 = 0
        guard Scanner(string: hex).scanHexInt64(&value) else { return fallback }
        let red = CGFloat((value & 0xFF0000) >> 16) / 255.0
        let green = CGFloat((value & 0x00FF00) >> 8) / 255.0
        let blue = CGFloat(value & 0x0000FF) / 255.0
        return UIColor(red: red, green: green, blue: blue, alpha: 1)
    }

    private func blend(_ base: UIColor, _ tint: UIColor, ratio: CGFloat) -> UIColor {
        let clamped = max(0, min(1, ratio))
        var br: CGFloat = 0
        var bg: CGFloat = 0
        var bb: CGFloat = 0
        var ba: CGFloat = 0
        var tr: CGFloat = 0
        var tg: CGFloat = 0
        var tb: CGFloat = 0
        var ta: CGFloat = 0
        guard base.getRed(&br, green: &bg, blue: &bb, alpha: &ba),
              tint.getRed(&tr, green: &tg, blue: &tb, alpha: &ta) else {
            return base
        }
        let inverse = 1 - clamped
        return UIColor(
            red: br * inverse + tr * clamped,
            green: bg * inverse + tg * clamped,
            blue: bb * inverse + tb * clamped,
            alpha: ba * inverse + ta * clamped
        )
    }
}

struct Almost_Widget: Widget {
    let kind: String = "Almost_Widget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: AlmostWidgetProvider()) { entry in
            Almost_WidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Almost")
        .description("Сбережения и быстрые действия.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

#Preview(as: .systemSmall) {
    Almost_Widget()
} timeline: {
    AlmostWidgetEntry(
        date: .now,
        savedMonthLabel: "$120",
        savedTotalLabel: "$860",
        savedTodayLabel: "$12",
        streakDays: 4,
        hasData: true,
        savedMonthValue: 120,
        savedTotalValue: 860,
        monthlyTargetValue: 300,
        savedTodayValue: 12,
        dailyGoalValue: 20,
        goalTargetValue: 1000,
        goalSavedValue: 320,
        budgetRemainingValue: 540,
        budgetRemainingLabel: "$540",
        budgetTotalValue: 1200,
        recentEvents: ["- Кофе · 2ч", "Такси · вчера", "Книга · 3д"],
        labelSavedMonth: "Сэкономлено",
        labelTotal: "Всего",
        labelBalance: "Баланс",
        labelToday: "Сегодня",
        labelGoal: "До цели",
        labelMonthGoal: "Цель месяца",
        labelBudgetRemaining: "Остаток бюджета",
        labelRecent: "Последние события:",
        labelRecentEmpty: "Нет событий",
        labelEmptyState: "Start saving today",
        actionSaveLabel: "Копить",
        actionSpendLabel: "Тратить",
        widgetThemeId: "pro",
        widgetProThemeAccentId: "indigo",
        widgetThemePrimaryColor: "#4353FF",
        widgetThemeBackgroundColor: "#EEF1FF",
        dailySummaryAvailable: true,
        dailySummaryExpiresAt: Date().addingTimeInterval(60 * 60 * 2).timeIntervalSince1970 * 1000,
        dailySummaryLabel: "Отчёт"
    )
    AlmostWidgetEntry(
        date: .now,
        savedMonthLabel: "--",
        savedTotalLabel: "--",
        savedTodayLabel: "--",
        streakDays: 0,
        hasData: false,
        savedMonthValue: 0,
        savedTotalValue: 0,
        monthlyTargetValue: 0,
        savedTodayValue: 0,
        dailyGoalValue: 0,
        goalTargetValue: 0,
        goalSavedValue: 0,
        budgetRemainingValue: 0,
        budgetRemainingLabel: "--",
        budgetTotalValue: 0,
        recentEvents: [],
        labelSavedMonth: "Сэкономлено",
        labelTotal: "Всего",
        labelBalance: "Баланс",
        labelToday: "Сегодня",
        labelGoal: "До цели",
        labelMonthGoal: "Цель месяца",
        labelBudgetRemaining: "Остаток бюджета",
        labelRecent: "Последние события:",
        labelRecentEmpty: "Нет событий",
        labelEmptyState: "Start saving today",
        actionSaveLabel: "Копить",
        actionSpendLabel: "Тратить",
        widgetThemeId: "dark",
        widgetProThemeAccentId: "none",
        widgetThemePrimaryColor: "#FFC857",
        widgetThemeBackgroundColor: "#05070D",
        dailySummaryAvailable: false,
        dailySummaryExpiresAt: 0,
        dailySummaryLabel: "Отчёт"
    )
}

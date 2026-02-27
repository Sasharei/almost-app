//
//  Almost_Widget.swift
//  Almost Widget
//
//  Created by Alexander Rysev on 20/02/2026.
//

import WidgetKit
import SwiftUI

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
private let keyWidgetInstalledMarker = "widget_home_installed_marker"

private let saveGreen = Color(red: 0.18, green: 0.72, blue: 0.45)

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
            actionSpendLabel: "Тратить"
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
            actionSpendLabel: actionSpendLabel
        )
    }
}

struct Almost_WidgetEntryView: View {
    var entry: AlmostWidgetEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        let background = Color(red: 0.97, green: 0.95, blue: 0.92)
        let edgePadding: CGFloat = 8
        let content = contentView
            .padding(edgePadding)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            .widgetURL(URL(string: "com.sasarei.almostclean://home"))

        if #available(iOS 17.0, *) {
            content.containerBackground(background, for: .widget)
        } else {
            content.background(background)
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
        let budgetColor = budgetIsNegative
            ? Color(red: 0.85, green: 0.32, blue: 0.38)
            : Color.black.opacity(0.65)
        let budgetMetricColor = budgetIsNegative
            ? Color(red: 0.85, green: 0.32, blue: 0.38)
            : Color.black
        let recentEvents = entry.recentEvents

        if !entry.hasData {
            VStack(spacing: 6) {
                Spacer(minLength: 0)
                Text("Almost")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.black)
                Text(entry.labelEmptyState)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(Color.black.opacity(0.7))
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .multilineTextAlignment(.center)
        } else {
            switch family {
            case .systemSmall:
                VStack(alignment: .leading, spacing: 6) {
                    headerRow
                    metricBlock(title: entry.labelTotal, value: entry.savedTotalLabel, valueSize: 22, valueColor: saveGreen)
                    progressBlock(
                        title: primaryTitle,
                        progress: primaryProgress,
                        detail: primaryDetail,
                        color: saveGreen,
                        barHeight: 6
                    )
                    Spacer(minLength: 2)
                    actionRow(buttonFontSize: 10, verticalPadding: 6)
                }
            case .systemMedium:
                VStack(alignment: .leading, spacing: 8) {
                    headerRow
                    HStack(alignment: .top, spacing: 10) {
                        metricBlock(title: entry.labelTotal, value: entry.savedTotalLabel, valueSize: 26, valueColor: saveGreen)
                        VStack(alignment: .leading, spacing: 6) {
                            progressBlock(
                                title: primaryTitle,
                                progress: primaryProgress,
                                detail: primaryDetail,
                                color: saveGreen,
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
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    Spacer(minLength: 2)
                    actionRow(buttonFontSize: 12, verticalPadding: 7)
                }
            default:
                VStack(alignment: .leading, spacing: 10) {
                    headerRow
                    HStack(alignment: .top, spacing: 12) {
                        VStack(alignment: .leading, spacing: 10) {
                            VStack(alignment: .leading, spacing: 6) {
                                Text(entry.labelToday)
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundColor(Color.black.opacity(0.6))
                                Text(entry.savedTodayLabel)
                                    .font(.system(size: 28, weight: .bold))
                                    .foregroundColor(.black)
                            }
                            HStack(alignment: .top, spacing: 12) {
                                metricBlock(
                                    title: entry.labelTotal,
                                    value: entry.savedTotalLabel,
                                    valueSize: 18,
                                    valueColor: saveGreen
                                )
                                .frame(maxWidth: .infinity, alignment: .leading)
                                metricBlock(
                                    title: entry.labelBudgetRemaining,
                                    value: budgetRemainingText,
                                    valueSize: 18,
                                    valueColor: budgetMetricColor
                                )
                                .frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        VStack(alignment: .leading, spacing: 8) {
                            progressBlock(
                                title: primaryTitle,
                                progress: primaryProgress,
                                detail: primaryDetail,
                                color: saveGreen,
                                barHeight: 7
                            )
                            progressBlock(
                                title: entry.labelToday,
                                progress: todayProgress,
                                detail: todayDetail,
                                color: Color(red: 0.25, green: 0.55, blue: 0.95),
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
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    if !recentEvents.isEmpty {
                        recentEventsBlock(title: entry.labelRecent, events: recentEvents)
                    }
                    Spacer(minLength: 4)
                    actionRow(buttonFontSize: 13, verticalPadding: 9)
                }
            }
        }
    }

    private var headerRow: some View {
        HStack(spacing: 8) {
            catImage
            Text("Almost")
                .font(.system(size: 12, weight: .bold))
                .foregroundColor(.black)
            Spacer()
        }
    }

    private var catImage: some View {
        Image("AlmiWidget")
            .resizable()
            .scaledToFit()
            .frame(width: 30, height: 30)
            .padding(4)
            .background(Color.black.opacity(0.08))
            .clipShape(Circle())
    }

    private func metricBlock(title: String, value: String, valueSize: CGFloat, valueColor: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(Color.black.opacity(0.6))
                .lineLimit(1)
                .minimumScaleFactor(0.75)
            Text(value)
                .font(.system(size: valueSize, weight: .bold))
                .foregroundColor(valueColor)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
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
                    .foregroundColor(Color.black.opacity(0.6))
                Spacer(minLength: 4)
                Text(detail)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(Color.black.opacity(0.75))
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
                    .fill(Color.black.opacity(0.08))
                Capsule()
                    .fill(color)
                    .frame(width: fillWidth)
            }
        }
        .frame(height: height)
    }

    private func recentEventsBlock(title: String, events: [String]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(.system(size: 10, weight: .semibold))
                .foregroundColor(Color.black.opacity(0.6))
            ForEach(Array(events.prefix(3).enumerated()), id: \.offset) { _, label in
                recentEventRow(label)
            }
        }
    }

    private func recentEventRow(_ label: String) -> some View {
        let trimmed = label.trimmingCharacters(in: .whitespacesAndNewlines)
        let isSpend = trimmed.hasPrefix("-")
        return Text(label)
            .font(.system(size: 10, weight: .semibold))
            .foregroundColor(
                isSpend
                    ? Color(red: 0.85, green: 0.32, blue: 0.38)
                    : Color.black.opacity(0.75)
            )
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
                Text(entry.actionSaveLabel)
                    .font(.system(size: buttonFontSize, weight: .bold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, verticalPadding)
                    .background(Color(red: 0.20, green: 0.70, blue: 0.45))
                    .foregroundColor(.white)
                    .cornerRadius(10)
            }
            Link(destination: URL(string: "com.sasarei.almostclean://quick-entry?type=spend")!) {
                Text(entry.actionSpendLabel)
                    .font(.system(size: buttonFontSize, weight: .bold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, verticalPadding)
                    .background(Color(red: 0.85, green: 0.32, blue: 0.38))
                    .foregroundColor(.white)
                    .cornerRadius(10)
            }
        }
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
        actionSpendLabel: "Тратить"
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
        actionSpendLabel: "Тратить"
    )
}

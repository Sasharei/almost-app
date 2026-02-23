import WidgetKit
import SwiftUI

private let appGroupId = "group.com.sasarei.almostclean"
private let keySavedMonthLabel = "widget_saved_month_label"
private let keyStreakDays = "widget_streak_days"
private let keyHasData = "widget_has_data"
private let keyWidgetLabelSavedMonth = "widget_label_saved_month"
private let keyWidgetLabelStreak = "widget_label_streak"
private let keyWidgetLabelEmptyState = "widget_label_empty_state"
private let keyWidgetLabelAddTemptation = "widget_label_add_temptation"

struct AlmostWidgetEntry: TimelineEntry {
  let date: Date
  let savedMonthLabel: String
  let streakDays: Int
  let hasData: Bool
  let labelSavedMonth: String
  let labelStreak: String
  let labelEmptyState: String
  let labelAddTemptation: String
}

struct AlmostWidgetProvider: TimelineProvider {
  func placeholder(in context: Context) -> AlmostWidgetEntry {
    AlmostWidgetEntry(
      date: Date(),
      savedMonthLabel: "$0",
      streakDays: 0,
      hasData: false,
      labelSavedMonth: "Saved this month",
      labelStreak: "Streak",
      labelEmptyState: "Start saving today",
      labelAddTemptation: "Add temptation"
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
    let savedMonthLabel = defaults?.string(forKey: keySavedMonthLabel) ?? "--"
    let streakDays = defaults?.integer(forKey: keyStreakDays) ?? 0
    let hasData = defaults?.object(forKey: keyHasData) as? Bool ?? false
    let labelSavedMonth =
      defaults?.string(forKey: keyWidgetLabelSavedMonth) ?? "Saved this month"
    let labelStreak = defaults?.string(forKey: keyWidgetLabelStreak) ?? "Streak"
    let labelEmptyState =
      defaults?.string(forKey: keyWidgetLabelEmptyState) ?? "Start saving today"
    let labelAddTemptation =
      defaults?.string(forKey: keyWidgetLabelAddTemptation) ?? "Add temptation"
    return AlmostWidgetEntry(
      date: Date(),
      savedMonthLabel: savedMonthLabel,
      streakDays: streakDays,
      hasData: hasData,
      labelSavedMonth: labelSavedMonth,
      labelStreak: labelStreak,
      labelEmptyState: labelEmptyState,
      labelAddTemptation: labelAddTemptation
    )
  }
}

struct AlmostWidgetView: View {
  let entry: AlmostWidgetEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    let background = Color(red: 0.97, green: 0.95, blue: 0.92)
    ZStack {
      background
      content
        .padding(14)
    }
    .widgetURL(URL(string: "com.sasarei.almostclean://home"))
  }

  @ViewBuilder
  private var content: some View {
    if !entry.hasData {
      VStack(spacing: 8) {
        Text("Almost")
          .font(.headline)
          .foregroundColor(.black)
        Text(entry.labelEmptyState)
          .font(.subheadline)
          .foregroundColor(Color.black.opacity(0.7))
      }
      .multilineTextAlignment(.center)
    } else {
      switch family {
      case .systemMedium, .systemLarge:
        HStack(alignment: .center, spacing: 16) {
          metricBlock(title: entry.labelSavedMonth, value: entry.savedMonthLabel)
          Divider()
          VStack(alignment: .leading, spacing: 6) {
            metricBlock(title: entry.labelStreak, value: "\(entry.streakDays)d")
            Link(destination: URL(string: "com.sasarei.almostclean://add-temptation")!) {
              Text(entry.labelAddTemptation)
                .font(.caption)
                .fontWeight(.semibold)
                .padding(.vertical, 6)
                .padding(.horizontal, 10)
                .background(Color.black.opacity(0.08))
                .cornerRadius(10)
            }
          }
        }
      default:
        VStack(alignment: .leading, spacing: 10) {
          metricBlock(title: entry.labelSavedMonth, value: entry.savedMonthLabel)
          metricBlock(title: entry.labelStreak, value: "\(entry.streakDays)d")
        }
      }
    }
  }

  private func metricBlock(title: String, value: String) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(title)
        .font(.caption)
        .foregroundColor(Color.black.opacity(0.6))
      Text(value)
        .font(.title3)
        .fontWeight(.semibold)
        .foregroundColor(.black)
    }
  }
}

@main
struct AlmostWidget: Widget {
  let kind: String = "AlmostWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: AlmostWidgetProvider()) { entry in
      AlmostWidgetView(entry: entry)
    }
    .configurationDisplayName("Almost Summary")
    .description("Saved this month and your streak.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
  }
}

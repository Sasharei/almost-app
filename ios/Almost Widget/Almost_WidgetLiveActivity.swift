import ActivityKit
import SwiftUI
import WidgetKit

// Raster renditions match each presentation size to avoid WidgetKit image placeholders.
struct WalletExpenseLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: WalletExpenseAttributes.self) { context in
      HStack(spacing: 12) {
        Image("AlmiWalletLock").renderingMode(.original).resizable().scaledToFit().frame(width: 48, height: 48).accessibilityHidden(true)
        VStack(alignment: .leading, spacing: 4) {
          Text(context.state.title).font(.headline)
          Text(context.state.amount).font(.title2).monospacedDigit()
          if !context.state.merchant.isEmpty { Text(context.state.merchant).font(.caption).lineLimit(2) }
        }
        Spacer(minLength: 0)
      }
      .padding()
      .foregroundStyle(.primary)
      .activityBackgroundTint(Color(.systemBackground))
      .widgetURL(URL(string: "com.sasarei.almostclean://bank-expenses"))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Image("AlmiWalletExpanded").renderingMode(.original).resizable().scaledToFit().frame(width: 40, height: 40).accessibilityHidden(true)
        }
        DynamicIslandExpandedRegion(.center) {
          VStack(spacing: 4) {
            Text(context.state.title).font(.headline)
            Text(context.state.amount).font(.title2).monospacedDigit()
          }.foregroundStyle(.white)
        }
        DynamicIslandExpandedRegion(.bottom) {
          Text(context.state.merchant).font(.caption).lineLimit(1).foregroundStyle(.white)
        }
      } compactLeading: {
        Image("AlmiWalletCompact").renderingMode(.original).resizable().scaledToFit().frame(width: 24, height: 24).accessibilityLabel(context.state.title)
      } compactTrailing: {
        Text(context.state.amount).font(.caption2).monospacedDigit().lineLimit(1).minimumScaleFactor(0.6).foregroundStyle(.white)
      } minimal: {
        Image(systemName: "checkmark.circle.fill").foregroundStyle(.green).accessibilityLabel("\(context.state.title), \(context.state.amount)")
      }
      .widgetURL(URL(string: "com.sasarei.almostclean://bank-expenses"))
    }
  }
}

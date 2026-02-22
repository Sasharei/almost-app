//
//  Almost_WidgetLiveActivity.swift
//  Almost Widget
//
//  Created by Alexander Rysev on 20/02/2026.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct Almost_WidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct Almost_WidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: Almost_WidgetAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension Almost_WidgetAttributes {
    fileprivate static var preview: Almost_WidgetAttributes {
        Almost_WidgetAttributes(name: "World")
    }
}

extension Almost_WidgetAttributes.ContentState {
    fileprivate static var smiley: Almost_WidgetAttributes.ContentState {
        Almost_WidgetAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: Almost_WidgetAttributes.ContentState {
         Almost_WidgetAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: Almost_WidgetAttributes.preview) {
   Almost_WidgetLiveActivity()
} contentStates: {
    Almost_WidgetAttributes.ContentState.smiley
    Almost_WidgetAttributes.ContentState.starEyes
}

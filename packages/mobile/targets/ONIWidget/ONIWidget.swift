import WidgetKit
import SwiftUI

struct SimpleEntry: TimelineEntry {
  let date: Date
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> SimpleEntry {
    SimpleEntry(date: Date())
  }

  func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
    completion(SimpleEntry(date: Date()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
    completion(Timeline(entries: [SimpleEntry(date: Date())], policy: .never))
  }
}

struct ONIWidgetEntryView: View {
  var entry: Provider.Entry
  @Environment(\.widgetFamily) var family

  @ViewBuilder
  var content: some View {
    switch family {
    case .accessoryCircular:
      ZStack {
        AccessoryWidgetBackground()
        Image(systemName: "bubble.left.fill")
          .font(.system(size: 20))
          .foregroundStyle(.primary)
      }
    case .accessoryRectangular:
      HStack(spacing: 6) {
        Image(systemName: "bubble.left.fill")
          .font(.system(size: 14))
        Text("ONI")
          .font(.headline)
      }
      .foregroundStyle(.primary)
    default:
      Image(systemName: "bubble.left.fill")
    }
  }

  var body: some View {
    if #available(iOS 17.0, *) {
      content
        .widgetURL(URL(string: "opennativeui://")!)
        .containerBackground(for: .widget) { Color.clear }
    } else {
      content
        .widgetURL(URL(string: "opennativeui://")!)
    }
  }
}

struct ONIWidget: Widget {
  let kind: String = "ONIWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      ONIWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("ONI")
    .description("Open the ONI chat app")
    .supportedFamilies([.accessoryCircular, .accessoryRectangular])
  }
}

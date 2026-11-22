import ActivityKit
import SwiftUI
import WidgetKit

@main
struct FitGenOutdoorWidget: Widget {
  private let accent = Color(red: 0.82, green: 1, blue: 0.30)

  var body: some WidgetConfiguration {
    ActivityConfiguration(for: OutdoorActivityAttributes.self) { context in
      VStack(alignment: .leading, spacing: 12) {
        HStack {
          Label(context.attributes.title, systemImage: icon(context.attributes.kind))
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(accent)
          Spacer()
          if context.state.timerStart == nil {
            Text("Pausada").font(.caption).foregroundStyle(.white.opacity(0.7))
          }
        }
        metrics(context)
      }
      .padding(16)
      .foregroundStyle(.white)
      .activityBackgroundTint(Color(red: 0.07, green: 0.08, blue: 0.09))
      .activitySystemActionForegroundColor(.white)
      .widgetURL(URL(string: context.attributes.url))
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          Label(context.attributes.title, systemImage: icon(context.attributes.kind))
            .foregroundStyle(accent)
        }
        DynamicIslandExpandedRegion(.trailing) {
          if context.state.timerStart == nil {
            Text("Pausada").font(.caption)
          }
        }
        DynamicIslandExpandedRegion(.bottom) {
          metrics(context)
        }
      } compactLeading: {
        Image(systemName: icon(context.attributes.kind)).foregroundStyle(accent)
      } compactTrailing: {
        timer(context).font(.caption.weight(.semibold)).frame(maxWidth: 54, alignment: .trailing)
      } minimal: {
        Image(systemName: context.state.timerStart == nil ? "pause.fill" : icon(context.attributes.kind))
          .foregroundStyle(accent)
      }
      .widgetURL(URL(string: context.attributes.url))
      .keylineTint(accent)
    }
  }

  @ViewBuilder
  private func metrics(_ context: ActivityViewContext<OutdoorActivityAttributes>) -> some View {
    if let workout = context.state.workout {
      HStack(spacing: 16) {
        VStack(alignment: .leading, spacing: 4) {
          Text(workout.detail).font(.subheadline.weight(.semibold)).lineLimit(2)
          Text(workout.progress).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        VStack(alignment: .trailing, spacing: 4) {
          Text(workout.restEnd == nil || context.isStale ? "Tempo" : "Descanso").font(.caption).foregroundStyle(.secondary)
          timer(context).font(.headline)
        }
        .frame(width: 68, alignment: .trailing)
      }
    } else if let outdoor = context.state.outdoor {
      HStack(spacing: 12) {
        metric("Tempo") { timer(context) }
        metric("Distância") { Text(outdoor.distance) }
        metric(rateTitle(context.attributes.kind)) { Text(outdoor.rate) }
      }
    }
  }

  private func timer(_ context: ActivityViewContext<OutdoorActivityAttributes>) -> some View {
    let state = context.state
    return Group {
      if !context.isStale, let start = state.workout?.restStart, let end = state.workout?.restEnd {
        Text(timerInterval: start...end, countsDown: true, showsHours: false)
      } else if let start = state.timerStart {
        Text(timerInterval: start...start.addingTimeInterval(86_400), countsDown: false, showsHours: true)
      } else {
        Text(state.outdoor?.elapsed ?? "")
      }
    }
    .monospacedDigit()
    .lineLimit(1)
    .minimumScaleFactor(0.7)
  }

  private func metric(_ label: String, @ViewBuilder value: () -> some View) -> some View {
    VStack(alignment: .leading, spacing: 4) {
      Text(label).font(.caption).foregroundStyle(.secondary)
      value().font(.headline.monospacedDigit()).lineLimit(1).minimumScaleFactor(0.7)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
  }

  private func rateTitle(_ kind: String) -> String {
    kind == "bike" ? "Velocidade média" : "Ritmo médio"
  }

  private func icon(_ kind: String) -> String {
    switch kind {
    case "workout": "dumbbell.fill"
    case "bike": "bicycle"
    case "walk": "figure.walk"
    default: "figure.run"
    }
  }
}

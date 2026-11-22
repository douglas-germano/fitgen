import ActivityKit
import ExpoModulesCore
import Foundation

public final class OutdoorLiveModule: Module {
  // ActivityKit updates and dismissal suspend. Keep them in the order received from JS.
  @MainActor private static var pending: Task<Void, Never>?

  @MainActor private static func enqueue(_ operation: @escaping @MainActor () async -> Void) {
    let previous = pending
    pending = Task {
      await previous?.value
      await operation()
    }
  }

  @MainActor private static func publish(
    _ attributes: OutdoorActivityAttributes,
    _ state: OutdoorActivityAttributes.ContentState,
    start: Bool
  ) {
    enqueue {
      let activities = Activity<OutdoorActivityAttributes>.activities
      let content = ActivityContent(state: state, staleDate: state.workout?.restEnd)
      if let activity = activities.first(where: { $0.attributes.sessionId == attributes.sessionId }) {
        await activity.update(content)
      } else if start && ActivityAuthorizationInfo().areActivitiesEnabled {
        for old in activities
          where (old.attributes.kind == "workout") == (attributes.kind == "workout") {
          await old.end(nil, dismissalPolicy: .immediate)
        }
        // ActivityKit can deny the request without interrupting the workout.
        _ = try? Activity.request(attributes: attributes, content: content, pushType: nil)
      }
    }
  }

  public func definition() -> ModuleDefinition {
    Name("OutdoorLive")

    AsyncFunction("publish") { (id: String, title: String, kind: String, timerStart: Double?,
                                elapsed: String, distance: String, rate: String, start: Bool) in
      MainActor.assumeIsolated {
        Self.publish(
          OutdoorActivityAttributes(sessionId: id, title: title, kind: kind, url: "fitgen:///outdoor"),
          OutdoorActivityAttributes.ContentState(
            timerStart: timerStart.map { Date(timeIntervalSince1970: $0 / 1000) },
            outdoor: .init(elapsed: elapsed, distance: distance, rate: rate)
          ),
          start: start
        )
      }
      return true
    }.runOnQueue(.main)

    AsyncFunction("publishWorkout") { (id: String, title: String, detail: String, progress: String,
                                       timerStart: Double, restEnd: Double?, url: String, start: Bool) in
      MainActor.assumeIsolated {
        let now = Date()
        let end = restEnd.map { Date(timeIntervalSince1970: $0 / 1000) }.flatMap { $0 > now ? $0 : nil }
        Self.publish(
          OutdoorActivityAttributes(sessionId: id, title: title, kind: "workout", url: url),
          OutdoorActivityAttributes.ContentState(
            timerStart: Date(timeIntervalSince1970: timerStart / 1000),
            workout: .init(detail: detail, progress: progress, restStart: end == nil ? nil : now, restEnd: end)
          ),
          start: start
        )
      }
    }.runOnQueue(.main)

    AsyncFunction("end") { (id: String) in
      MainActor.assumeIsolated {
        Self.enqueue {
          for activity in Activity<OutdoorActivityAttributes>.activities where activity.attributes.sessionId == id {
            await activity.end(nil, dismissalPolicy: .immediate)
          }
        }
      }
    }.runOnQueue(.main)
  }
}

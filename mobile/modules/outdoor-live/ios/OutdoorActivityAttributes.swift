import ActivityKit
import Foundation

struct OutdoorActivityAttributes: ActivityAttributes {
  struct OutdoorMetrics: Codable, Hashable {
    let elapsed: String
    let distance: String
    let rate: String
  }

  struct WorkoutMetrics: Codable, Hashable {
    let detail: String
    let progress: String
    let restStart: Date?
    let restEnd: Date?
  }

  struct ContentState: Codable, Hashable {
    let timerStart: Date?
    var outdoor: OutdoorMetrics?
    var workout: WorkoutMetrics?
  }

  let sessionId: String
  let title: String
  let kind: String
  let url: String
}

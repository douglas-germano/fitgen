import SwiftUI
import CoreLocation
import HealthKit

/// Run, walk or bike.
enum OutdoorKind: String, CaseIterable, Identifiable, Sendable {
    case run, walk, bike
    var id: String { rawValue }

    var title: String { switch self { case .run: "Corrida"; case .walk: "Caminhada"; case .bike: "Pedal" } }
    var fullName: String { title + " ao ar livre" }
    var icon: String { switch self { case .run: "figure.run"; case .walk: "figure.walk"; case .bike: "bicycle" } }
    var color: Color { switch self { case .run: Theme.voltText; case .walk: Theme.steps; case .bike: Theme.water } }
    /// Fixes implying a faster speed are GPS jumps and get discarded (same limits as the Expo app).
    var maxMetersPerSecond: Double { self == .bike ? 30 : 11 }
    var usesSpeed: Bool { self == .bike }
    var hkActivity: HKWorkoutActivityType { switch self { case .run: .running; case .walk: .walking; case .bike: .cycling } }
}

/// An outdoor activity as the API returns it. The list omits `route`; the detail includes it.
/// Route = segments (one per pause) of [latitude, longitude] points.
struct OutdoorRecord: Decodable, Identifiable, Sendable {
    let id: String
    let startedAt: String
    let completedAt: String
    let durationSeconds: Int
    let workoutName: String
    let outdoorType: String
    let distanceMeters: Double
    let calories: Double?
    let route: [[[Double]]]

    enum CodingKeys: String, CodingKey {
        case id, startedAt, completedAt, durationSeconds, workoutName, outdoorType, distanceMeters, calories, route
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? UUID().uuidString
        startedAt = try c.decodeIfPresent(String.self, forKey: .startedAt) ?? ""
        completedAt = try c.decodeIfPresent(String.self, forKey: .completedAt) ?? ""
        durationSeconds = Int(c.number(.durationSeconds) ?? 0)
        outdoorType = try c.decodeIfPresent(String.self, forKey: .outdoorType) ?? "run"
        workoutName = (try c.decodeIfPresent(String.self, forKey: .workoutName)).flatMap { $0.isEmpty ? nil : $0 }
            ?? (OutdoorKind(rawValue: outdoorType) ?? .run).fullName
        distanceMeters = c.number(.distanceMeters) ?? 0
        calories = c.number(.calories)
        route = (try? c.decodeIfPresent([[[Double]]].self, forKey: .route)) ?? []
    }

    init(id: String, kind: OutdoorKind, start: Date, end: Date, duration: Int, meters: Double, calories: Double?, route: [[[Double]]]) {
        self.id = id
        startedAt = ISODate.string(start)
        completedAt = ISODate.string(end)
        durationSeconds = duration
        workoutName = kind.fullName
        outdoorType = kind.rawValue
        distanceMeters = meters
        self.calories = calories
        self.route = route
    }

    var kind: OutdoorKind { OutdoorKind(rawValue: outdoorType) ?? .run }
    var date: Date? { ISODate.parse(startedAt) }
    var segments: [[CLLocationCoordinate2D]] {
        route.map { $0.compactMap { $0.count == 2 ? CLLocationCoordinate2D(latitude: $0[0], longitude: $0[1]) : nil } }
            .filter { !$0.isEmpty }
    }

    var distanceText: String { OutdoorFormat.km(distanceMeters) }
    var durationText: String { Format.clock(durationSeconds) }
    var paceText: String { OutdoorFormat.pace(seconds: durationSeconds, meters: distanceMeters) }
    var speedText: String { OutdoorFormat.speed(seconds: durationSeconds, meters: distanceMeters) }
    var dateText: String {
        guard let date else { return "" }
        return date.formatted(.dateTime.weekday(.wide).day().month(.wide).hour().minute().locale(Locale(identifier: "pt_BR")))
    }
}

enum OutdoorFormat {
    static func km(_ meters: Double) -> String {
        (meters / 1000).formatted(.number.precision(.fractionLength(2)).locale(Locale(identifier: "pt_BR")))
    }

    /// Minutes per km, "5:32"; "--" until there is enough distance.
    static func pace(seconds: Int, meters: Double) -> String {
        guard seconds > 0, meters >= 20 else { return "--:--" }
        let pace = Int((Double(seconds) * 1000 / meters).rounded())
        return String(format: "%d:%02d", pace / 60, pace % 60)
    }

    static func speed(seconds: Int, meters: Double) -> String {
        guard seconds > 0, meters > 0 else { return "--" }
        return Format.decimal(meters * 3.6 / Double(seconds), digits: 1)
    }

    /// Same estimate the backend uses (ACSM for walk/run, Compendium for bike); shown while the server value is not known.
    static func calories(kind: OutdoorKind, meters: Double, weightKg: Double?, seconds: Int) -> Double? {
        guard let weightKg, weightKg > 0, meters > 0, seconds > 0 else { return nil }
        if kind == .bike {
            let mph = meters / Double(seconds) * 3600 / 1609.344
            let met = [(10.0, 4.0), (12, 6.8), (14, 8), (16, 10)].first { mph < $0.0 }?.1 ?? 12
            return ((met - 1) * weightKg * Double(seconds) / 3600).rounded()
        }
        return (weightKg * meters / 1000 * (kind == .run ? 1 : 0.5)).rounded()
    }

    static func meters(_ a: CLLocationCoordinate2D, _ b: CLLocationCoordinate2D) -> Double {
        CLLocation(latitude: a.latitude, longitude: a.longitude).distance(from: CLLocation(latitude: b.latitude, longitude: b.longitude))
    }
}

extension ISODate {
    /// "2026-11-24T10:00:00.123+00:00": UTC with milliseconds, an offset every Python version parses.
    static func string(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: date).replacingOccurrences(of: "Z", with: "+00:00")
    }
}

// MARK: - API

extension AppStore {
    private struct OutdoorBody: Encodable {
        let ownerId: String
        let activityType: String
        let durationSeconds: Int
        let startedAt: String
        let completedAt: String
        let route: [[[Double]]]
    }

    /// PUT /exercises/outdoor/{id}: idempotent, so a retry after a network failure is safe.
    func saveOutdoor(id: String, kind: OutdoorKind, start: Date, end: Date, duration: Int, route: [[[Double]]]) async throws -> OutdoorRecord {
        if profile.value == nil { await loadProfile() }
        guard let owner = profile.value?.id, !owner.isEmpty else {
            throw APIError(status: 0, message: "Não foi possível identificar sua conta. Tente novamente.")
        }
        let body = OutdoorBody(ownerId: owner, activityType: kind.rawValue, durationSeconds: duration,
                               startedAt: ISODate.string(start), completedAt: ISODate.string(end), route: route)
        let saved: OutdoorRecord = try await APIClient.shared.send("/exercises/outdoor/\(id)", method: "PUT", json: body)
        await loadHistory()
        return saved
    }

    func loadOutdoorHistory() async throws -> [OutdoorRecord] {
        try await APIClient.shared.get("/exercises/outdoor")
    }

    func loadOutdoor(id: String) async throws -> OutdoorRecord {
        try await APIClient.shared.get("/exercises/outdoor/\(id)")
    }

    /// DELETE /exercises/outdoor/:id, then refreshes the workout history that lists it.
    func deleteOutdoor(id: String) async throws {
        try await APIClient.shared.sendNoContent("/exercises/outdoor/\(id)", method: "DELETE")
        await loadHistory()
    }
}

// MARK: - HealthKit

extension HealthService {
    /// Saves the activity as an Apple Health workout with distance, energy and the GPS route.
    func saveOutdoorWorkout(kind: OutdoorKind, start: Date, end: Date, meters: Double, kcal: Double?, locations: [CLLocation]) async {
        guard available, connected else { return }
        let store = HKHealthStore()
        let distanceType: HKQuantityType = kind == .bike ? HKQuantityType(.distanceCycling) : HKQuantityType(.distanceWalkingRunning)
        let share: Set<HKSampleType> = [HKObjectType.workoutType(), distanceType, HKQuantityType(.activeEnergyBurned), HKSeriesType.workoutRoute()]
        do {
            try await store.requestAuthorization(toShare: share, read: [])
            let config = HKWorkoutConfiguration()
            config.activityType = kind.hkActivity
            config.locationType = .outdoor
            let builder = HKWorkoutBuilder(healthStore: store, configuration: config, device: .local())
            try await builder.beginCollection(at: start)
            var samples: [HKSample] = []
            if meters > 0 {
                samples.append(HKQuantitySample(type: distanceType, quantity: HKQuantity(unit: .meter(), doubleValue: meters), start: start, end: end))
            }
            if let kcal, kcal > 0 {
                samples.append(HKQuantitySample(type: HKQuantityType(.activeEnergyBurned), quantity: HKQuantity(unit: .kilocalorie(), doubleValue: kcal), start: start, end: end))
            }
            if !samples.isEmpty { try await builder.addSamples(samples) }
            try await builder.endCollection(at: end)
            guard let workout = try await builder.finishWorkout() else { return }
            if !locations.isEmpty {
                let routeBuilder = HKWorkoutRouteBuilder(healthStore: store, device: .local())
                try await routeBuilder.insertRouteData(locations)
                try await routeBuilder.finishRoute(with: workout, metadata: nil)
            }
        } catch {}
    }
}

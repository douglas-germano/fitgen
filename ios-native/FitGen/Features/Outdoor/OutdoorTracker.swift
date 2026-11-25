import CoreLocation
import Observation

/// What a finished recording hands back.
struct OutdoorResult {
    let id: String
    let kind: OutdoorKind
    let start: Date
    let end: Date
    let duration: Int
    let meters: Double
    let route: [[[Double]]]
    let locations: [CLLocation]
}

/// Records a GPS route with CoreLocation, in the background too. Bad fixes (poor accuracy, stale,
/// or implying an impossible speed) are discarded. A pause closes the current route segment.
@MainActor @Observable
final class OutdoorTracker: NSObject, CLLocationManagerDelegate {
    enum Phase { case idle, recording, paused }

    private(set) var phase: Phase = .idle
    var kind: OutdoorKind = .run
    private(set) var segments: [[CLLocationCoordinate2D]] = []
    private(set) var meters: Double = 0
    private(set) var authorization: CLAuthorizationStatus = .notDetermined
    /// True while recent fixes are too imprecise to count (shown as "sinal de GPS fraco").
    private(set) var weakSignal = false

    @ObservationIgnored private let manager = CLLocationManager()
    @ObservationIgnored private var startedAt: Date?
    @ObservationIgnored private var runningSince: Date?
    @ObservationIgnored private var accumulated: TimeInterval = 0
    @ObservationIgnored private var lastAccepted: CLLocation?
    @ObservationIgnored private var accepted: [CLLocation] = []

    private static let maxAccuracy: CLLocationAccuracy = 25
    private static let minStep: CLLocationDistance = 3

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 5
        manager.activityType = .fitness
        manager.pausesLocationUpdatesAutomatically = false
        authorization = manager.authorizationStatus
    }

    var isAuthorized: Bool { authorization == .authorizedWhenInUse || authorization == .authorizedAlways }
    var isDenied: Bool { authorization == .denied || authorization == .restricted }
    var isActive: Bool { phase != .idle }

    func elapsed(at now: Date = .now) -> Int {
        let current = runningSince.map { max(0, now.timeIntervalSince($0)) } ?? 0
        return min(86400, Int(accumulated + current))
    }

    /// Asks permission if needed and starts showing the user's position (without recording).
    func prepare() {
        if authorization == .notDetermined { manager.requestWhenInUseAuthorization() }
        else if isAuthorized { manager.startUpdatingLocation() }
    }

    func releaseIfIdle() {
        if phase == .idle { manager.stopUpdatingLocation() }
    }

    func start() {
        guard phase == .idle, isAuthorized else { return }
        segments = []; meters = 0; accumulated = 0; lastAccepted = nil; accepted = []
        startedAt = .now
        runningSince = .now
        phase = .recording
        manager.allowsBackgroundLocationUpdates = true
        manager.showsBackgroundLocationIndicator = true
        manager.startUpdatingLocation()
    }

    func pause() {
        guard phase == .recording else { return }
        accumulated += max(0, Date.now.timeIntervalSince(runningSince ?? .now))
        runningSince = nil
        lastAccepted = nil // the next fix opens a new segment
        phase = .paused
    }

    func resume() {
        guard phase == .paused else { return }
        runningSince = .now
        phase = .recording
    }

    func finish() -> OutdoorResult? {
        guard phase != .idle, let start = startedAt else { return nil }
        if phase == .recording { pause() }
        let route = segments.filter { !$0.isEmpty }.map { $0.map { [$0.latitude, $0.longitude] } }
        let result = OutdoorResult(id: UUID().uuidString.lowercased(), kind: kind, start: start, end: .now,
                                   duration: max(1, elapsed()), meters: meters, route: route, locations: accepted)
        stop()
        return result
    }

    func discard() { stop() }

    private func stop() {
        phase = .idle
        manager.allowsBackgroundLocationUpdates = false
        manager.showsBackgroundLocationIndicator = false
        manager.stopUpdatingLocation()
        startedAt = nil; runningSince = nil; accumulated = 0; lastAccepted = nil
    }

    // MARK: CLLocationManagerDelegate

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        Task { @MainActor in self.ingest(locations) }
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            self.authorization = status
            // Use our own manager (main-actor owned) rather than sending the delegate argument across.
            if self.isAuthorized { self.manager.startUpdatingLocation() }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {}

    private func ingest(_ locations: [CLLocation]) {
        guard phase == .recording else { return }
        for location in locations {
            guard location.horizontalAccuracy >= 0, location.horizontalAccuracy <= Self.maxAccuracy,
                  abs(location.timestamp.timeIntervalSinceNow) < 15,
                  location.timestamp >= (startedAt ?? .distantPast) else {
                weakSignal = true
                continue
            }
            weakSignal = false
            if let last = lastAccepted {
                let dt = location.timestamp.timeIntervalSince(last.timestamp)
                let step = location.distance(from: last)
                guard dt > 0 else { continue }
                if dt > 60 { // long gap in fixes: don't draw a straight line across it
                    segments.append([location.coordinate])
                    lastAccepted = location
                    accepted.append(location)
                    continue
                }
                if step / dt > kind.maxMetersPerSecond { continue }
                if step < Self.minStep { continue }
                meters += step
                segments[segments.count - 1].append(location.coordinate)
            } else {
                segments.append([location.coordinate])
            }
            lastAccepted = location
            accepted.append(location)
        }
    }
}

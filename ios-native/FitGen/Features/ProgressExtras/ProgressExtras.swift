import SwiftUI
import HealthKit

// MARK: - Apple Health body metrics import

extension HealthService {
    private static let lastImportKey = "health.bodyImport.last"

    /// Imports weight (and body fat of the same day) from Apple Health since the last import. Returns how many days were posted.
    func importBodyMetrics(store: AppStore) async -> Int {
        guard available else { return 0 }
        let hk = HKHealthStore()
        let weightType = HKQuantityType(.bodyMass)
        let fatType = HKQuantityType(.bodyFatPercentage)
        do { try await hk.requestAuthorization(toShare: [], read: [weightType, fatType]) } catch { return 0 }

        let defaults = UserDefaults.standard
        let now = Date.now
        let since = defaults.object(forKey: Self.lastImportKey) as? Date
            ?? Calendar.current.date(byAdding: .day, value: -90, to: now) ?? now
        let ownBundle = Bundle.main.bundleIdentifier

        func read(_ type: HKQuantityType, unit: HKUnit) async -> [(date: Date, value: Double)] {
            let predicate = HKQuery.predicateForSamples(withStart: since, end: nil)
            let descriptor = HKSampleQueryDescriptor(
                predicates: [.quantitySample(type: type, predicate: predicate)],
                sortDescriptors: [SortDescriptor(\.startDate, order: .forward)])
            guard let samples = try? await descriptor.result(for: hk) else { return [] }
            return samples
                .filter { $0.sourceRevision.source.bundleIdentifier != ownBundle }
                .map { ($0.startDate, $0.quantity.doubleValue(for: unit)) }
        }

        let weights = await read(weightType, unit: .gramUnit(with: .kilo))
        let fats = await read(fatType, unit: .percent())

        // Latest sample per day (inputs are ascending, so later entries overwrite).
        let cal = Calendar.current
        func latestPerDay(_ items: [(date: Date, value: Double)]) -> [Date: Double] {
            var result: [Date: Double] = [:]
            for item in items { result[cal.startOfDay(for: item.date)] = item.value }
            return result
        }
        let weightByDay = latestPerDay(weights)
        let fatByDay = latestPerDay(fats)

        var imported = 0
        var allPosted = true
        for day in weightByDay.keys.sorted() {
            guard let weight = weightByDay[day], weight > 0 else { continue }
            let fat = fatByDay[day].map { $0 * 100 }.flatMap { $0 > 0 ? $0 : nil }
            let entry = MetricsEntry(weightKg: (weight * 10).rounded() / 10,
                                     bodyFatPercentage: fat.map { ($0 * 10).rounded() / 10 },
                                     muscleMassKg: nil, waistCm: nil, notes: "Importado do app Saúde")
            do { try await store.logMetrics(entry); imported += 1 } catch { allPosted = false; break }
        }
        // Only advance the cursor when everything went through, so failures retry next time.
        if allPosted { defaults.set(now, forKey: Self.lastImportKey) }
        return imported
    }
}

/// Shows the automatic Health sync; the only action is connecting when not yet connected.
struct HealthImportRow: View {
    @Environment(AppStore.self) private var store

    init() {}

    var body: some View {
        let health = store.health
        Card {
            HStack(spacing: 12) {
                Image(systemName: "heart.text.square.fill").font(.title2).foregroundStyle(Theme.calories)
                VStack(alignment: .leading, spacing: 2) {
                    Text("App Saúde").font(.headline).foregroundStyle(.primary)
                    Text(status(health)).font(.footnote).foregroundStyle(Theme.secondary)
                }
                Spacer()
                if health.bodySyncRunning {
                    ProgressView().tint(Theme.voltText)
                } else if health.available && !health.connected {
                    Button("Conectar") {
                        Task {
                            await health.connect()
                            await health.autoImportBodyMetrics(store: store, force: true)
                        }
                    }
                    .buttonStyle(.fitgenPrimaryCompact)
                } else if health.connected {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.voltText)
                }
            }
        }
    }

    private func status(_ health: HealthService) -> String {
        guard health.available else { return "Indisponível neste dispositivo" }
        guard health.connected else { return "Conecte para trazer peso e gordura da sua balança automaticamente" }
        guard let last = health.lastBodySync else { return "Peso e gordura sincronizam automaticamente" }
        let time = last.formatted(.relative(presentation: .named).locale(Locale(identifier: "pt_BR")))
        let imported = health.lastBodySyncCount > 0 ? " · \(health.lastBodySyncCount) novo(s)" : ""
        return "Sincronizado \(time)\(imported)"
    }
}

// MARK: - Training volume + records

struct WeeklyVolume: Decodable, Sendable {
    let volumeKg: Double
    let changePercentage: Double
}

struct RecentRecord: Decodable, Sendable, Identifiable {
    let exerciseLibraryId: String?
    let name: String
    let weightKg: Double
    let previousKg: Double?
    let achievedAt: String?
    var id: String { (exerciseLibraryId ?? name) + (achievedAt ?? "") }
}

extension AppStore {
    /// GET /metrics/dashboard → workout_volume. Nil when missing or the request fails.
    func fetchWeeklyVolume() async -> WeeklyVolume? {
        struct Dashboard: Decodable { let workoutVolume: WeeklyVolume? }
        let dashboard: Dashboard? = try? await APIClient.shared.get("/metrics/dashboard")
        return dashboard?.workoutVolume
    }

    /// GET /exercises/records/recent. Empty when the request fails.
    func fetchRecentRecords() async -> [RecentRecord] {
        (try? await APIClient.shared.get("/exercises/records/recent") as [RecentRecord]) ?? []
    }
}

struct TrainingProgressCard: View {
    @Environment(AppStore.self) private var store
    @State private var volume: WeeklyVolume?
    @State private var records: [RecentRecord] = []
    @State private var loaded = false

    init() {}

    private var hasVolume: Bool { (volume?.volumeKg ?? 0) > 0 }

    var body: some View {
        Card(title: "Treino") {
            if !loaded {
                ProgressView().tint(Theme.voltText).frame(maxWidth: .infinity)
            } else if !hasVolume && records.isEmpty {
                Text("Treine para ver seu volume e recordes aqui.")
                    .font(.subheadline).foregroundStyle(Theme.secondary)
            } else {
                if let volume, hasVolume {
                    VStack(alignment: .leading, spacing: 6) {
                        MetricValue(value: Format.int(volume.volumeKg), unit: "kg", color: Theme.voltText)
                        HStack(spacing: 8) {
                            Text("esta semana").font(.footnote).foregroundStyle(Theme.secondary)
                            changeBadge(volume.changePercentage)
                        }
                    }
                }
                if !records.isEmpty {
                    if hasVolume { Divider().overlay(Theme.separator) }
                    Text("Recordes recentes").font(.subheadline.weight(.semibold)).foregroundStyle(.primary)
                    ForEach(records.prefix(3)) { record in
                        HStack {
                            Text(record.name).font(.subheadline).foregroundStyle(.primary).lineLimit(1)
                            Spacer()
                            Text(detail(record)).font(.footnote).foregroundStyle(Theme.secondary)
                        }
                    }
                }
            }
        }
        .task {
            async let v = store.fetchWeeklyVolume()
            async let r = store.fetchRecentRecords()
            volume = await v
            records = await r
            loaded = true
        }
    }

    private func detail(_ record: RecentRecord) -> String {
        var text = "\(Format.decimal(record.weightKg)) kg"
        if let previous = record.previousKg, previous > 0 { text += " · antes \(Format.decimal(previous)) kg" }
        return text
    }

    private func changeBadge(_ pct: Double) -> some View {
        let up = pct >= 0
        let color = up ? Theme.voltText : Theme.secondary
        let text = "\(up ? "+" : "-")\(Format.int(abs(pct)))% vs. semana anterior"
        return Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(color.opacity(0.15), in: Capsule())
    }
}

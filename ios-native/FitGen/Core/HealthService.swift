import Foundation
import HealthKit
import Observation

/// Apple Health: today's steps, distance and active energy for Resumo; workouts and meals are written back.
@MainActor @Observable
final class HealthService {
    struct Today: Sendable { var steps: Double = 0; var distanceKm: Double = 0; var activeKcal: Double = 0; var hourlySteps: [Double] = [] }

    private let store = HKHealthStore()
    var today: Today?
    var available: Bool { HKHealthStore.isHealthDataAvailable() }
    /// True once the user went through the permission sheet in this install.
    var connected = UserDefaults.standard.bool(forKey: "health.connected")

    private let readTypes: Set<HKObjectType> = [
        HKQuantityType(.stepCount), HKQuantityType(.distanceWalkingRunning), HKQuantityType(.activeEnergyBurned),
        HKQuantityType(.bodyMass), HKQuantityType(.bodyFatPercentage),
    ]
    private let writeTypes: Set<HKSampleType> = [
        HKObjectType.workoutType(), HKQuantityType(.activeEnergyBurned), HKQuantityType(.dietaryEnergyConsumed),
        HKQuantityType(.dietaryProtein), HKQuantityType(.dietaryCarbohydrates), HKQuantityType(.dietaryFatTotal),
    ]

    // Automatic body-metrics import (weight / body fat from a smart scale).
    var bodySyncRunning = false
    var lastBodySync: Date? = UserDefaults.standard.object(forKey: "health.bodySync.at") as? Date
    var lastBodySyncCount = 0

    /// Imports new weight/fat samples in the background: on launch and whenever the app returns to the
    /// foreground, at most every 30 minutes, and only once the user has connected Health.
    func autoImportBodyMetrics(store: AppStore, force: Bool = false) async {
        guard available, connected, !bodySyncRunning else { return }
        if !force, let last = lastBodySync, Date.now.timeIntervalSince(last) < 30 * 60 { return }
        bodySyncRunning = true
        let count = await importBodyMetrics(store: store)
        bodySyncRunning = false
        lastBodySync = .now
        lastBodySyncCount = count
        UserDefaults.standard.set(Date.now, forKey: "health.bodySync.at")
    }

    func connect() async {
        guard available else { return }
        do {
            try await store.requestAuthorization(toShare: writeTypes, read: readTypes)
            connected = true
            UserDefaults.standard.set(true, forKey: "health.connected")
            await refresh()
        } catch {}
    }

    func refresh() async {
        guard available, connected else { return }
        let start = Calendar.current.startOfDay(for: .now)
        async let steps = sum(.stepCount, unit: .count(), from: start)
        async let distance = sum(.distanceWalkingRunning, unit: .meterUnit(with: .kilo), from: start)
        async let energy = sum(.activeEnergyBurned, unit: .kilocalorie(), from: start)
        async let hourly = hourlySteps(from: start)
        today = Today(steps: await steps, distanceKm: await distance, activeKcal: await energy, hourlySteps: await hourly)
    }

    private func sum(_ id: HKQuantityTypeIdentifier, unit: HKUnit, from start: Date) async -> Double {
        let predicate = HKSamplePredicate.quantitySample(type: HKQuantityType(id), predicate: HKQuery.predicateForSamples(withStart: start, end: nil))
        let descriptor = HKStatisticsQueryDescriptor(predicate: predicate, options: .cumulativeSum)
        return (try? await descriptor.result(for: store))?.sumQuantity()?.doubleValue(for: unit) ?? 0
    }

    private func hourlySteps(from start: Date) async -> [Double] {
        let predicate = HKSamplePredicate.quantitySample(type: HKQuantityType(.stepCount), predicate: HKQuery.predicateForSamples(withStart: start, end: nil))
        let descriptor = HKStatisticsCollectionQueryDescriptor(predicate: predicate, options: .cumulativeSum, anchorDate: start, intervalComponents: DateComponents(hour: 1))
        guard let collection = try? await descriptor.result(for: store) else { return [] }
        var values = Array(repeating: 0.0, count: 24)
        collection.enumerateStatistics(from: start, to: .now) { stats, _ in
            let hour = Calendar.current.component(.hour, from: stats.startDate)
            values[hour] = stats.sumQuantity()?.doubleValue(for: .count()) ?? 0
        }
        return values
    }

    func saveWorkout(start: Date, end: Date, kcal: Double) async {
        guard available, connected else { return }
        let config = HKWorkoutConfiguration()
        config.activityType = .traditionalStrengthTraining
        let builder = HKWorkoutBuilder(healthStore: store, configuration: config, device: .local())
        do {
            try await builder.beginCollection(at: start)
            let energy = HKQuantitySample(type: HKQuantityType(.activeEnergyBurned), quantity: HKQuantity(unit: .kilocalorie(), doubleValue: kcal), start: start, end: end)
            try await builder.addSamples([energy])
            try await builder.endCollection(at: end)
            _ = try await builder.finishWorkout()
        } catch {}
    }

    func saveMeal(calories: Double, protein: Double, carbs: Double, fats: Double) async {
        guard available, connected else { return }
        let now = Date.now
        let samples: [HKQuantitySample] = [
            (HKQuantityTypeIdentifier.dietaryEnergyConsumed, HKUnit.kilocalorie(), calories),
            (.dietaryProtein, .gram(), protein), (.dietaryCarbohydrates, .gram(), carbs), (.dietaryFatTotal, .gram(), fats),
        ].filter { $0.2 > 0 }.map { HKQuantitySample(type: HKQuantityType($0.0), quantity: HKQuantity(unit: $0.1, doubleValue: $0.2), start: now, end: now) }
        try? await store.save(samples)
    }
}

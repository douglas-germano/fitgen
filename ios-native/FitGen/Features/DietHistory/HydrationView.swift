import Charts
import SwiftUI

extension AppStore {
    func fetchHydrationHistory() async throws -> [HistoryPoint] {
        try await APIClient.shared.get("/hydration/history")
    }

    func setWaterGoal(_ ml: Int) async throws {
        struct Body: Encodable { let goalAmountMl: Int }
        let _: Empty = try await APIClient.shared.send("/hydration/goal", method: "POST", json: Body(goalAmountMl: ml))
        await loadHydration()
    }
}

struct HydrationView: View {
    @Environment(AppStore.self) private var store
    @State private var history: [HistoryPoint] = []
    @State private var busy = false
    @State private var errorMessage: String?
    @State private var showCustom = false
    @State private var showGoal = false
    @State private var customText = ""
    @State private var goalText = ""
    @State private var haptic = 0

    init() {}

    private var total: Double { store.hydration.value?.totalIntakeMl ?? 0 }
    private var goal: Double { store.hydration.value?.dailyGoalMl ?? 0 }
    private var progress: Double { goal > 0 ? total / goal : 0 }

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                todayCard
                HStack(spacing: 12) {
                    quick("Copo", "200 ml", "cup.and.saucer.fill") { await add(200) }
                    quick("Garrafa", "500 ml", "waterbottle.fill") { await add(500) }
                    quick("Outra", "quantidade", "plus") { customText = ""; showCustom = true }
                }
                chartCard
                Button { goalText = String(Int(goal)); showGoal = true } label: {
                    Card {
                        HStack {
                            Image(systemName: "target").foregroundStyle(Theme.water)
                            Text("Meta diária").foregroundStyle(.primary)
                            Spacer()
                            Text("\(Format.liters(goal)) L").foregroundStyle(Theme.secondary)
                            Image(systemName: "chevron.right").font(.footnote.bold()).foregroundStyle(Theme.secondary)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.bottom, 24)
        }
        .screen()
        .navigationTitle("Hidratação")
        .navigationBarTitleDisplayMode(.inline)
        .sensoryFeedback(.success, trigger: haptic)
        .refreshable { await reload() }
        .task { await reload() }
        .alert("Outra quantidade", isPresented: $showCustom) {
            TextField("Ex: 350", text: $customText).keyboardType(.numberPad)
            Button("Adicionar") {
                if let ml = Int(customText.trimmingCharacters(in: .whitespaces)), ml > 0 { Task { await add(ml) } }
            }
            Button("Cancelar", role: .cancel) {}
        } message: { Text("Quantos ml você bebeu?") }
        .alert("Meta diária", isPresented: $showGoal) {
            TextField("Meta em ml", text: $goalText).keyboardType(.numberPad)
            Button("Salvar") {
                if let ml = Int(goalText.trimmingCharacters(in: .whitespaces)), ml > 0 { Task { await saveGoal(ml) } }
            }
            Button("Cancelar", role: .cancel) {}
        } message: { Text("Informe a meta em ml.") }
        .alert("Erro", isPresented: Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(errorMessage ?? "") }
    }

    private var todayCard: some View {
        Card(title: "Hoje") {
            HStack(spacing: 20) {
                ZStack {
                    Ring(progress: progress, color: Theme.water, lineWidth: 16)
                    Image(systemName: "drop.fill").font(.title2).foregroundStyle(Theme.water)
                }
                .frame(width: 110, height: 110)
                VStack(alignment: .leading, spacing: 4) {
                    MetricValue(value: Format.liters(total), unit: "L", color: Theme.water, size: 34)
                    if goal > 0 {
                        Text("de \(Format.liters(goal)) L · \(Int((progress * 100).rounded()))%")
                            .font(.subheadline).foregroundStyle(Theme.secondary)
                    }
                }
                Spacer(minLength: 0)
            }
        }
    }

    private func quick(_ title: String, _ subtitle: String, _ icon: String, action: @escaping () async -> Void) -> some View {
        Button { Task { await action() } } label: {
            Card {
                Image(systemName: icon).font(.title3).foregroundStyle(Theme.water)
                Text(title).font(.headline).foregroundStyle(.primary)
                Text(subtitle).font(.caption).foregroundStyle(Theme.secondary)
            }
        }
        .buttonStyle(.plain)
        .disabled(busy)
    }

    private var chartCard: some View {
        let points = history.suffix(7).compactMap { p in p.day.map { (date: $0, liters: p.value / 1000) } }
        return Card(title: "Últimos 7 dias") {
            if points.isEmpty {
                Text("Sem registros ainda.").foregroundStyle(Theme.secondary).frame(maxWidth: .infinity, minHeight: 80)
            } else {
                Chart(points, id: \.date) { p in
                    BarMark(x: .value("Dia", p.date, unit: .day), y: .value("Litros", p.liters))
                        .foregroundStyle(Theme.water).cornerRadius(5)
                    if goal > 0 {
                        RuleMark(y: .value("Meta", goal / 1000))
                            .foregroundStyle(Theme.secondary.opacity(0.5)).lineStyle(StrokeStyle(lineWidth: 1, dash: [4]))
                    }
                }
                .chartXAxis { AxisMarks(values: .automatic(desiredCount: 7)) { _ in AxisValueLabel(format: .dateTime.weekday(.narrow)) } }
                .frame(height: 170)
            }
        }
    }

    private func reload() async {
        await store.loadHydration()
        history = (try? await store.fetchHydrationHistory()) ?? history
    }

    private func add(_ ml: Int) async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            try await store.logWater(ml)
            haptic += 1
            await reload()
        } catch { errorMessage = error.localizedDescription }
    }

    private func saveGoal(_ ml: Int) async {
        do {
            try await store.setWaterGoal(ml)
            await reload()
        } catch { errorMessage = error.localizedDescription }
    }
}

import Charts
import PhotosUI
import SwiftUI

/// Body progress: goal, trend chart with period and smoothing, full records (edit/delete),
/// progress photos, Health import and training volume/records.
struct ProgressTabView: View {
    @Environment(AppStore.self) private var store
    @State private var metric: MetricKind = .weight
    @State private var period: ChartPeriod = .threeMonths
    @State private var sheet: MetricsSheetMode?
    @State private var entries: [MetricEntryRow] = []

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    GoalCard()
                    Picker("Medida", selection: $metric) {
                        ForEach(MetricKind.allCases) { Text($0.title).tag($0) }
                    }
                    .pickerStyle(.segmented)
                    ChartCard(metric: metric, period: $period)
                    ProgressPhotosCard()
                    TrainingProgressCard()
                    IndicatorsCard()
                    RecordsCard(entries: entries, onEdit: { sheet = .edit($0) })
                }
                .padding(.horizontal, Theme.gutter)
                .padding(.bottom, 24)
            }
            .task { await reload() }
            .refreshable { await reload() }
            .screen()
            .ottoButton()
            .navigationTitle("Progresso")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { sheet = .new } label: { Image(systemName: "plus") }.accessibilityLabel("Registrar medidas")
                }
            }
            .sheet(item: $sheet, onDismiss: { Task { await reload() } }) { mode in MetricsSheet(mode: mode) }
        }
    }

    private func reload() async {
        async let a: Void = store.loadMetrics()
        async let b: [MetricEntryRow]? = try? store.metricEntries()
        _ = await a
        if let rows = await b { entries = rows }
    }
}

// MARK: - Goal (item 1)

private struct GoalCard: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let weights = store.metricHistory[.weight] ?? []
        let target = store.profile.value?.targetWeightKg
        let current = store.latestWeight
        let start = weights.first?.value ?? current
        Card(title: "Meta de peso") {
            if let target, let current, let start {
                let total = abs(start - target)
                let done = total > 0 ? min(max((start - current) / (start - target), 0), 1) : 1
                let left = current - target
                HStack(spacing: 18) {
                    ZStack {
                        Ring(progress: done, color: Theme.weight, lineWidth: 12)
                        VStack(spacing: 0) {
                            Text("\(Int((done * 100).rounded()))%").font(.metric(22))
                            Text("da meta").font(.caption2).foregroundStyle(Theme.secondary)
                        }
                    }
                    .frame(width: 96, height: 96)
                    VStack(alignment: .leading, spacing: 6) {
                        if abs(left) < 0.1 {
                            Text("Meta alcançada!").font(.headline).foregroundStyle(Theme.voltText)
                        } else {
                            MetricValue(value: Format.decimal(abs(left)), unit: "kg", color: Theme.weight, size: 26)
                            Text(left > 0 ? "para perder" : "para ganhar").font(.subheadline).foregroundStyle(Theme.secondary)
                        }
                        Text("\(Format.decimal(start)) → \(Format.decimal(target)) kg").font(.caption).foregroundStyle(Theme.secondary)
                    }
                    Spacer(minLength: 0)
                }
            } else {
                Text(target == nil ? "Defina um peso meta no seu perfil para acompanhar o progresso." : "Registre seu peso para ver o progresso até a meta.")
                    .font(.subheadline).foregroundStyle(Theme.secondary)
            }
        }
    }
}

// MARK: - Chart (items 2, 3, 4)

enum ChartPeriod: String, CaseIterable, Identifiable {
    case month = "1M", threeMonths = "3M", sixMonths = "6M", year = "1A", all = "Tudo"
    var id: String { rawValue }
    var days: Int? {
        switch self { case .month: 30; case .threeMonths: 90; case .sixMonths: 180; case .year: 365; case .all: nil }
    }
}

private struct ChartCard: View {
    @Environment(AppStore.self) private var store
    let metric: MetricKind
    @Binding var period: ChartPeriod

    var body: some View {
        let all = (store.metricHistory[metric] ?? []).compactMap { p in p.day.map { (date: $0, value: p.value) } }
        let cutoff = period.days.map { Date.now.addingTimeInterval(-Double($0) * 86400) } ?? .distantPast
        let points = all.filter { $0.date >= cutoff }
        let trend = Self.trend(points)
        let color = Self.color(metric)

        Card(title: metric.title) {
            Picker("Período", selection: $period) {
                ForEach(ChartPeriod.allCases) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)

            if let last = points.last {
                HStack(alignment: .firstTextBaseline) {
                    MetricValue(value: Format.decimal(last.value), unit: metric.unit, color: color, size: 34)
                    Spacer()
                    if points.count > 1, let first = trend.first, let end = trend.last {
                        let delta = end.value - first.value
                        Text("\(delta > 0 ? "+" : "")\(Format.decimal(delta)) \(metric.unit) no período")
                            .font(.subheadline.weight(.medium)).foregroundStyle(Theme.secondary)
                    }
                }
                Chart {
                    ForEach(points, id: \.date) { p in
                        PointMark(x: .value("Data", p.date), y: .value(metric.title, p.value))
                            .foregroundStyle(color.opacity(0.45)).symbolSize(26)
                    }
                    // Smoothed trend: daily noise (water, salt) hides the real direction.
                    ForEach(trend, id: \.date) { p in
                        LineMark(x: .value("Data", p.date), y: .value("Tendência", p.value))
                            .interpolationMethod(.catmullRom).foregroundStyle(color).lineStyle(StrokeStyle(lineWidth: 3))
                    }
                }
                .chartYScale(domain: .automatic(includesZero: false))
                .chartXAxis { AxisMarks(values: .automatic(desiredCount: 4)) { _ in AxisValueLabel(format: .dateTime.day().month(.abbreviated)) } }
                .frame(height: 200)
                HStack(spacing: 14) {
                    legend(color.opacity(0.45), "Registros", dot: true)
                    legend(color, "Tendência", dot: false)
                }
            } else if !store.metricsLoaded {
                ProgressView().frame(maxWidth: .infinity, minHeight: 200)
            } else {
                Text(all.isEmpty ? "Nenhum registro de \(metric.title.lowercased()) ainda. Toque em + para registrar." : "Nenhum registro neste período.")
                    .foregroundStyle(Theme.secondary).frame(maxWidth: .infinity, minHeight: 120)
            }
        }
    }

    private func legend(_ color: Color, _ text: String, dot: Bool) -> some View {
        HStack(spacing: 6) {
            if dot { Circle().fill(color).frame(width: 8, height: 8) } else { Capsule().fill(color).frame(width: 16, height: 3) }
            Text(text).font(.caption).foregroundStyle(Theme.secondary)
        }
    }

    static func color(_ metric: MetricKind) -> Color {
        switch metric { case .weight: Theme.weight; case .fat: Theme.calories; case .muscle: Theme.water; case .waist: Theme.steps }
    }

    /// Exponentially weighted moving average (α = 0.25), like trend-weight apps.
    static func trend(_ points: [(date: Date, value: Double)]) -> [(date: Date, value: Double)] {
        var result: [(date: Date, value: Double)] = []
        var current: Double?
        for p in points {
            current = current.map { $0 + 0.25 * (p.value - $0) } ?? p.value
            result.append((p.date, current!))
        }
        return result
    }
}

// MARK: - Indicators

private struct IndicatorsCard: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let profile = store.profile.value
        let weight = store.latestWeight
        let bmi: Double? = {
            guard let weight, let h = profile?.heightCm, h > 0 else { return nil }
            return weight / pow(h / 100, 2)
        }()
        Card(title: "Indicadores") {
            HStack(spacing: 12) {
                indicator("IMC", bmi.map { Format.decimal($0) } ?? "—", Theme.steps)
                indicator("Basal", profile?.bmr.map { Format.int($0) } ?? "—", Theme.calories, unit: "kcal")
                indicator("Gasto/dia", profile?.tdee.map { Format.int($0) } ?? "—", Theme.protein, unit: "kcal")
            }
        }
    }

    private func indicator(_ title: String, _ value: String, _ color: Color, unit: String? = nil) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).font(.subheadline).foregroundStyle(Theme.secondary)
            MetricValue(value: value, unit: unit, color: color, size: 22)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Records (item 5)

struct MetricEntryRow: Decodable, Identifiable, Sendable, Hashable {
    let id: String
    let recordedAt: String
    let weightKg: Double?
    let bodyFatPercentage: Double?
    let muscleMassKg: Double?
    let waistCm: Double?
    let notes: String?

    enum CodingKeys: String, CodingKey { case id, recordedAt, weightKg, bodyFatPercentage, muscleMassKg, waistCm, notes }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? UUID().uuidString
        recordedAt = try c.decodeIfPresent(String.self, forKey: .recordedAt) ?? ""
        weightKg = c.number(.weightKg)
        bodyFatPercentage = c.number(.bodyFatPercentage)
        muscleMassKg = c.number(.muscleMassKg)
        waistCm = c.number(.waistCm)
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
    }
    var date: Date? { ISODate.parse(recordedAt) }
}

extension AppStore {
    func metricEntries() async throws -> [MetricEntryRow] {
        try await APIClient.shared.get("/metrics/entries?limit=60")
    }

    func updateMetric(id: String, _ entry: MetricsEntry) async throws {
        let _: Empty = try await APIClient.shared.send("/metrics/\(id)", method: "PUT", json: entry)
        await loadMetrics()
        await loadProfile()
    }

    func deleteMetric(id: String) async throws {
        try await APIClient.shared.sendNoContent("/metrics/\(id)", method: "DELETE")
        await loadMetrics()
        await loadProfile()
    }
}

private struct RecordsCard: View {
    let entries: [MetricEntryRow]
    let onEdit: (MetricEntryRow) -> Void
    @State private var showAll = false

    var body: some View {
        Card(title: "Registros") {
            if entries.isEmpty {
                Text("Seus registros aparecem aqui. Toque em + para registrar.").foregroundStyle(Theme.secondary)
            }
            ForEach(showAll ? entries : Array(entries.prefix(5))) { entry in
                Button { onEdit(entry) } label: {
                    HStack(alignment: .center) {
                        VStack(alignment: .leading, spacing: 3) {
                            Text(entry.date.map(Format.dayMonth) ?? "—").font(.body.weight(.medium))
                            Text(details(entry)).font(.caption).foregroundStyle(Theme.secondary).lineLimit(1)
                        }
                        Spacer()
                        if let w = entry.weightKg {
                            Text("\(Format.decimal(w)) kg").font(.metric(17)).foregroundStyle(Theme.weight)
                        }
                        Image(systemName: "chevron.right").font(.caption.bold()).foregroundStyle(Theme.secondary)
                    }
                    .padding(.vertical, 4)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            if entries.count > 5 {
                Button(showAll ? "Ver menos" : "Ver todos (\(entries.count))") { withAnimation { showAll.toggle() } }
                    .font(.subheadline.weight(.semibold))
            }
        }
    }

    private func details(_ e: MetricEntryRow) -> String {
        [e.bodyFatPercentage.map { "Gordura \(Format.decimal($0))%" },
         e.muscleMassKg.map { "Músculo \(Format.decimal($0)) kg" },
         e.waistCm.map { "Cintura \(Format.decimal($0)) cm" },
         e.notes.flatMap { $0.isEmpty ? nil : $0 }].compactMap { $0 }.joined(separator: " · ")
    }
}

enum MetricsSheetMode: Identifiable {
    case new, edit(MetricEntryRow)
    var id: String { switch self { case .new: "new"; case .edit(let e): e.id } }
}

struct MetricsSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    var mode: MetricsSheetMode = .new
    @State private var weight: Double?
    @State private var fat: Double?
    @State private var muscle: Double?
    @State private var waist: Double?
    @State private var notes = ""
    @State private var saving = false
    @State private var confirmDelete = false
    @State private var error: String?

    private var editing: MetricEntryRow? { if case .edit(let e) = mode { e } else { nil } }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    field("Peso", "kg", $weight)
                } footer: { Text("Obrigatório") }
                Section("Opcional") {
                    field("Gordura", "%", $fat)
                    field("Músculo", "kg", $muscle)
                    field("Cintura", "cm", $waist)
                    TextField("Notas (ex: em jejum)", text: $notes)
                }
                if let error { Text(error).foregroundStyle(Theme.calories) }
                if editing != nil {
                    Section { Button("Excluir registro", role: .destructive) { confirmDelete = true } }
                }
            }
            .scrollContentBackground(.hidden)
            .screen()
            .navigationTitle(editing == nil ? "Registrar medidas" : "Editar registro")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Salvando…" : "Salvar") { save() }.bold().disabled(saving || (weight ?? 0) <= 0)
                }
            }
            .confirmationDialog("Excluir este registro?", isPresented: $confirmDelete, titleVisibility: .visible) {
                Button("Excluir", role: .destructive) { delete() }
            }
            .onAppear {
                if let e = editing {
                    weight = e.weightKg; fat = e.bodyFatPercentage; muscle = e.muscleMassKg; waist = e.waistCm; notes = e.notes ?? ""
                } else {
                    weight = store.latestWeight
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func field(_ title: String, _ unit: String, _ value: Binding<Double?>) -> some View {
        HStack {
            Text(title)
            Spacer()
            TextField("—", value: value, format: .number.precision(.fractionLength(0...1)))
                .keyboardType(.decimalPad).multilineTextAlignment(.trailing).font(.metric(18)).frame(width: 90)
            Text(unit).foregroundStyle(Theme.secondary).frame(width: 30, alignment: .leading)
        }
    }

    private func save() {
        guard let weight, weight > 0 else { return }
        if let fat, fat > 100 { error = "Gordura deve ficar entre 0 e 100%."; return }
        saving = true
        let entry = MetricsEntry(weightKg: weight, bodyFatPercentage: fat, muscleMassKg: muscle, waistCm: waist, notes: notes)
        Task {
            do {
                if let editing { try await store.updateMetric(id: editing.id, entry) } else { try await store.logMetrics(entry) }
                dismiss()
            } catch {
                self.error = error.localizedDescription
            }
            saving = false
        }
    }

    private func delete() {
        guard let editing else { return }
        Task {
            do { try await store.deleteMetric(id: editing.id); dismiss() }
            catch { self.error = error.localizedDescription }
        }
    }
}


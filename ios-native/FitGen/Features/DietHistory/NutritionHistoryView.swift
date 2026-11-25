import Charts
import SwiftUI

// MARK: - Models

struct NutritionHistoryDay: Decodable, Sendable, Identifiable {
    let date: String
    let calories: Double
    let protein: Double
    let carbs: Double
    let fats: Double
    let mealsCount: Int
    var id: String { date }
    var day: Date? { ISODate.parse(date) }

    enum CodingKeys: String, CodingKey { case date, calories, protein, carbs, fats, mealsCount }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        date = try c.decodeIfPresent(String.self, forKey: .date) ?? ""
        calories = c.number(.calories) ?? 0
        protein = c.number(.protein) ?? 0
        carbs = c.number(.carbs) ?? 0
        fats = c.number(.fats) ?? 0
        mealsCount = Int(c.number(.mealsCount) ?? 0)
    }
}

struct NutritionHistory: Decodable, Sendable {
    let data: [NutritionHistoryDay]
    let avgCalories: Double?

    enum CodingKeys: String, CodingKey { case data, summary }
    enum SummaryKeys: String, CodingKey { case avgCalories }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        data = (try? c.decodeIfPresent([NutritionHistoryDay].self, forKey: .data)) ?? []
        if let s = try? c.nestedContainer(keyedBy: SummaryKeys.self, forKey: .summary) {
            avgCalories = s.number(.avgCalories)
        } else {
            avgCalories = nil
        }
    }
}

extension AppStore {
    func fetchNutritionHistory(days: Int) async throws -> NutritionHistory {
        let from = Calendar.current.date(byAdding: .day, value: -(days - 1), to: Date()) ?? Date()
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return try await APIClient.shared.get("/nutrition/history?period=dia&start_date=\(f.string(from: from))")
    }
}

// MARK: - View

struct NutritionHistoryView: View {
    @Environment(AppStore.self) private var store
    @State private var range = 7
    @State private var history: NutritionHistory?
    @State private var error: String?
    @State private var loading = true

    init() {}

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Picker("Período", selection: $range) {
                    ForEach([7, 30, 90], id: \.self) { Text("\($0) dias").tag($0) }
                }
                .pickerStyle(.segmented)

                if loading && history == nil {
                    LoadingView(cards: [140, 88, 88])
                } else if let error, history == nil {
                    Card { Text(error).foregroundStyle(Theme.secondary) }
                } else if let history {
                    content(history)
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.bottom, 24)
        }
        .screen()
        .navigationTitle("Histórico alimentar")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task(id: range) { await load() }
    }

    private func load() async {
        loading = true
        do {
            history = try await store.fetchNutritionHistory(days: range)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }

    @ViewBuilder private func content(_ h: NutritionHistory) -> some View {
        let records = h.data
        let meals = records.reduce(0) { $0 + $1.mealsCount }
        HStack(spacing: 12) {
            tile("kcal por dia", Format.int(h.avgCalories ?? 0), Theme.calories)
            tile("Refeições", "\(meals)", Theme.voltText)
            tile("Dias", "\(records.count)", Theme.water)
        }
        if records.isEmpty {
            Card {
                VStack(spacing: 8) {
                    Image(systemName: "fork.knife").font(.title).foregroundStyle(Theme.secondary)
                    Text("Nenhuma refeição registrada neste período.")
                        .multilineTextAlignment(.center).foregroundStyle(Theme.secondary)
                }
                .frame(maxWidth: .infinity, minHeight: 100)
            }
        } else {
            let recent = records.suffix(7).compactMap { r in r.day.map { (date: $0, kcal: r.calories) } }
            Card(title: "Calorias por dia") {
                Chart(recent, id: \.date) { p in
                    BarMark(x: .value("Dia", p.date, unit: .day), y: .value("kcal", p.kcal))
                        .foregroundStyle(Theme.calories).cornerRadius(5)
                }
                .chartXAxis { AxisMarks(values: .automatic(desiredCount: 7)) { _ in AxisValueLabel(format: .dateTime.day().month(.defaultDigits)) } }
                .frame(height: 180)
            }
            Card(title: "Dias") {
                VStack(spacing: 0) {
                    ForEach(Array(records.reversed().enumerated()), id: \.element.id) { index, r in
                        if index > 0 { Divider().overlay(Theme.separator) }
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(r.day.map(Format.dayMonth) ?? r.date).foregroundStyle(.primary)
                                Text("\(r.mealsCount) \(r.mealsCount == 1 ? "refeição" : "refeições") · P \(Format.int(r.protein)) · C \(Format.int(r.carbs)) · G \(Format.int(r.fats)) g")
                                    .font(.caption).foregroundStyle(Theme.secondary)
                            }
                            Spacer()
                            MetricValue(value: Format.int(r.calories), unit: "kcal", color: Theme.calories, size: 20)
                        }
                        .padding(.vertical, 10)
                    }
                }
            }
        }
    }

    private func tile(_ title: String, _ value: String, _ color: Color) -> some View {
        Card {
            MetricValue(value: value, color: color, size: 26)
            Text(title).font(.caption).foregroundStyle(Theme.secondary).lineLimit(1).minimumScaleFactor(0.7)
        }
    }
}

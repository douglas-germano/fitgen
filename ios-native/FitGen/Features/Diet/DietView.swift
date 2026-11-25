import SwiftUI

struct DietView: View {
    @Environment(AppStore.self) private var store
    @State private var showLogger = false
    @State private var editing: LoggedMeal?
    @State private var repeating: LoggedMeal?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    CaloriesCard()
                    MacrosCard()
                    MealsCard(onAdd: { showLogger = true }, onEdit: { editing = $0 })
                    WaterCard()
                    NavigationLink { DietPlanView() } label: { PlanCard() }.buttonStyle(.plain)
                    NavigationLink { NutritionHistoryView() } label: {
                        Card(title: "Histórico alimentar", showsChevron: true) {
                            Text("Média de calorias e refeições dos últimos dias").font(.subheadline).foregroundStyle(Theme.secondary)
                        }
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, Theme.gutter)
                .padding(.bottom, 24)
            }
            .refreshable {
                async let a: Void = store.loadNutrition()
                async let b: Void = store.loadDietPlan()
                async let c: Void = store.loadHydration()
                _ = await (a, b, c)
            }
            .screen()
            .ottoButton()
            .navigationTitle("Dieta")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showLogger = true } label: { Image(systemName: "plus") }
                        .accessibilityLabel("Registrar refeição")
                }
            }
            .sheet(isPresented: $showLogger) { MealLoggerSheet() }
            .sheet(item: $editing) { meal in MealEditorSheet(meal: meal) }
        }
    }
}

private struct CaloriesCard: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let kcal = store.nutrition.value?.totals.calories ?? 0
        let goal = store.calorieGoal
        Card(title: "Calorias") {
            HStack(spacing: 18) {
                ZStack {
                    Ring(progress: goal.map { kcal / $0 } ?? 0, color: Theme.calories, lineWidth: 14)
                    VStack(spacing: 0) {
                        Text(Format.int(kcal)).font(.metric(24))
                        Text("kcal").font(.caption).foregroundStyle(Theme.secondary)
                    }
                }
                .frame(width: 110, height: 110)
                VStack(alignment: .leading, spacing: 8) {
                    if let goal {
                        row("Meta", Format.int(goal))
                        // Over the goal is shown neutrally, never in alarm red.
                        row(kcal <= goal ? "Restam" : "Acima da meta", Format.int(abs(goal - kcal)))
                        if (store.dietPlan.value ?? nil) == nil {
                            Text("Estimada pelo seu perfil").font(.caption).foregroundStyle(Theme.secondary)
                        }
                    } else {
                        Text("Sem meta ainda").font(.headline)
                        Text("Complete peso, altura e idade no perfil ou peça um plano ao Otto.")
                            .font(.caption).foregroundStyle(Theme.secondary)
                    }
                }
                Spacer(minLength: 0)
            }
            Divider().overlay(Theme.separator).padding(.vertical, 4)
            WeekCalories(todayKcal: kcal, goal: goal, values: week)
        }
        // Reload when today's total changes, so the week stays in step after logging a meal.
        .task(id: kcal) { await loadWeek() }
    }

    /// kcal per local day, keyed "yyyy-MM-dd" (the API's dates are calendar days, not instants).
    @State private var week: [String: Double] = [:]

    private func loadWeek() async {
        guard let history = try? await store.fetchNutritionHistory(days: 7) else { return }
        week = Dictionary(history.data.map { (String($0.date.prefix(10)), $0.calories) }, uniquingKeysWith: +)
    }
}

/// Mon–Sun: a small ring per day (kcal vs goal), today highlighted, plus the week's average.
private struct WeekCalories: View {
    let todayKcal: Double
    let goal: Double?
    let values: [String: Double]

    var body: some View {
        let start = Calendar.mondayFirst.dateInterval(of: .weekOfYear, for: .now)?.start ?? .now
        let days = (0..<7).map { Calendar.current.date(byAdding: .day, value: $0, to: start)! }
        let kcal: (Date) -> Double? = { day in
            if Calendar.current.isDateInToday(day) { return todayKcal }
            return day > .now ? nil : values[Self.key(day)]
        }
        let logged = days.compactMap { kcal($0) }.filter { $0 > 0 }

        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Esta semana").font(.subheadline.weight(.semibold))
                Spacer()
                if !logged.isEmpty {
                    Text("Média \(Format.int(logged.reduce(0, +) / Double(logged.count))) kcal")
                        .font(.subheadline).foregroundStyle(Theme.secondary)
                }
            }
            HStack(spacing: 0) {
                ForEach(days, id: \.self) { day in
                    let value = kcal(day)
                    let isToday = Calendar.current.isDateInToday(day)
                    VStack(spacing: 6) {
                        Text(Weekday(date: day).initial).font(.caption2.weight(.semibold))
                            .foregroundStyle(isToday ? .primary : Theme.secondary)
                        Ring(progress: (value ?? 0) / max(goal ?? 2000, 1), color: Theme.calories, lineWidth: 5)
                            .frame(width: 34, height: 34)
                            .opacity(day > .now && !isToday ? 0.35 : 1)
                        Text(value.map { $0 > 0 ? Format.int($0) : "–" } ?? " ")
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                            .foregroundStyle(isToday ? Theme.calories : Theme.secondary)
                            .lineLimit(1).minimumScaleFactor(0.7)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
                    .background(isToday ? Theme.cardRaised : .clear, in: RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }

    private static func key(_ date: Date) -> String {
        let c = Calendar.current.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }
}

private extension CaloriesCard {
    func row(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(title).font(.subheadline).foregroundStyle(Theme.secondary)
            Text("\(value) kcal").font(.metric(20)).foregroundStyle(Theme.calories)
        }
    }
}

private struct MacrosCard: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let totals = store.nutrition.value?.totals ?? Macros()
        let targets = (store.dietPlan.value ?? nil)?.macroTargets
        Card(title: "Macronutrientes") {
            HStack(spacing: 14) {
                macro("Proteína", totals.protein, targets?.protein, Theme.protein)
                macro("Carbos", totals.carbs, targets?.carbs, Theme.water)
                macro("Gorduras", totals.fats, targets?.fats, Theme.weight)
            }
        }
    }

    private func macro(_ title: String, _ value: Double, _ goal: Double?, _ color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.subheadline).foregroundStyle(Theme.secondary)
            MetricValue(value: Format.int(value), unit: "g", color: color, size: 22)
            ProgressLine(progress: goal.map { value / $0 } ?? 0, color: color)
            Text(goal.map { "de \(Format.int($0)) g" } ?? " ").font(.caption2).foregroundStyle(Theme.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct MealsCard: View {
    @Environment(AppStore.self) private var store
    let onAdd: () -> Void
    let onEdit: (LoggedMeal) -> Void

    var body: some View {
        let meals = (store.nutrition.value?.meals ?? []).sorted { ($0.createdAt ?? "") < ($1.createdAt ?? "") }
        Card(title: "Refeições") {
            if meals.isEmpty {
                Text("Nada registrado hoje.").foregroundStyle(Theme.secondary)
            }
            ForEach(meals) { meal in
                Button { onEdit(meal) } label: {
                    HStack(spacing: 12) {
                        Image(systemName: meal.type.symbol).foregroundStyle(Theme.calories)
                            .frame(width: 38, height: 38).background(Theme.cardRaised, in: Circle())
                        VStack(alignment: .leading, spacing: 2) {
                            Text(meal.name).font(.body.weight(.medium)).lineLimit(1)
                            Text(meal.type.label).font(.caption).foregroundStyle(Theme.secondary)
                        }
                        Spacer()
                        Text("\(Format.int(meal.calories)) kcal").font(.metric(16)).foregroundStyle(Theme.calories)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
            Button(action: onAdd) {
                Label("Registrar refeição", systemImage: "plus.circle.fill").font(.headline)
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(.bordered).buttonBorderShape(.capsule).tint(Theme.calories)
            .padding(.top, 4)
        }
    }
}

private struct WaterCard: View {
    @Environment(AppStore.self) private var store
    @State private var saving = false

    var body: some View {
        let water = store.hydration.value
        Card(title: "Água") {
            HStack(alignment: .firstTextBaseline) {
                MetricValue(value: Format.liters(water?.totalIntakeMl ?? 0), unit: "L",
                            goal: water.map { Format.liters($0.dailyGoalMl) }, color: Theme.water, size: 28)
                Spacer()
            }
            ProgressLine(progress: water.map { $0.totalIntakeMl / max($0.dailyGoalMl, 1) } ?? 0, color: Theme.water)
            HStack(spacing: 8) {
                ForEach([200, 300, 500], id: \.self) { ml in
                    Button {
                        saving = true
                        Task { try? await store.logWater(ml); saving = false }
                    } label: {
                        Text("+\(ml) ml").font(.subheadline.bold()).frame(maxWidth: .infinity, minHeight: 38)
                    }
                    .buttonStyle(.bordered).tint(Theme.water).disabled(saving)
                }
            }
            .sensoryFeedback(.success, trigger: water?.totalIntakeMl)
            NavigationLink { HydrationView() } label: {
                HStack {
                    Text("Meta, outra quantidade e últimos 7 dias").font(.subheadline)
                    Spacer()
                    Image(systemName: "chevron.right").font(.footnote.bold())
                }
                .foregroundStyle(Theme.water)
                .padding(.top, 4)
            }
        }
    }
}

private struct PlanCard: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let plan = store.dietPlan.value ?? nil
        Card(title: "Plano alimentar", showsChevron: true) {
            HStack(spacing: 12) {
                Image(systemName: "sparkles").font(.title3).foregroundStyle(Theme.voltText)
                    .frame(width: 40, height: 40).background(Theme.cardRaised, in: Circle())
                VStack(alignment: .leading, spacing: 2) {
                    Text(plan == nil ? "Peça um cardápio ao Otto" : "Cardápio da semana").font(.headline)
                    Text(plan == nil ? "Refeições montadas para o seu objetivo" : "\(plan!.shoppingListCount) itens na lista de compras")
                        .font(.caption).foregroundStyle(Theme.secondary)
                }
            }
        }
    }
}

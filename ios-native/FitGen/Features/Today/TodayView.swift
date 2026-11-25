import SwiftUI

/// "Resumo": the user's day first, like Apple Fitness. Rings for today's goals, the planned workout
/// with one tap to start, then a grid of metric cards and the weekly trend.
struct TodayView: View {
    @Environment(AppStore.self) private var store
    @Binding var tab: AppTab
    @State private var showProfile = false
    @State private var showMeal = false
    @State private var player: PlayerRoute?
    @State private var route: TodayRoute?
    @State private var showCoach = false
    @Environment(\.openURL) private var openURL

    enum TodayRoute: Hashable { case hydration, achievements }

    private let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    // Every card leads somewhere. Tap gestures (not links) so the + buttons inside tiles keep working.
                    RingsCard().tappable { tab = .diet }
                    TodayWorkoutCard(player: $player, tab: $tab)
                    OttoCard().tappable { showCoach = true }
                    LazyVGrid(columns: columns, spacing: 12) {
                        CaloriesTile(onAdd: { showMeal = true }).tappable { tab = .diet }
                        WaterTile().tappable { route = .hydration }
                        ProteinTile().tappable { tab = .diet }
                        StepsTile().tappable { openURL(URL(string: "x-apple-health://")!) }
                        WeekTile().tappable { tab = .workout }
                        AwardTile().tappable { route = .achievements }
                    }
                    TrendsCard().tappable { tab = .progress }
                }
                .padding(.horizontal, Theme.gutter)
                .padding(.bottom, 24)
            }
            .refreshable { await store.loadToday() }
            .screen()
            .ottoButton()
            .navigationTitle("Resumo")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showProfile = true } label: {
                        Avatar(name: store.profile.value?.name ?? "", url: store.profile.value?.profilePicture, size: 34)
                    }
                    .buttonStyle(.plain)
                }
            }
            .navigationDestination(item: $route) { route in
                switch route {
                case .hydration: HydrationView()
                case .achievements: AchievementsView()
                }
            }
            .sheet(isPresented: $showProfile) { ProfileView() }
            .fullScreenCover(isPresented: $showCoach) { CoachView() }
            .sheet(isPresented: $showMeal) { MealLoggerSheet() }
            .fullScreenCover(item: $player) { route in WorkoutPlayerView(planId: route.planId, day: route.day) }
        }
    }
}

struct PlayerRoute: Identifiable, Hashable {
    let planId: String
    let day: WorkoutDay
    var id: String { day.id }
}

// MARK: - Rings

/// Three daily goals as rings: calories eaten (red), water (blue), workout (volt).
private struct RingsCard: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let kcal = store.nutrition.value?.totals.calories ?? 0
        let goal = store.calorieGoal
        let water = store.hydration.value
        let trained = store.trained(on: .now)
        let hasWorkout = (store.plan.value ?? nil)?.today != nil

        Card(title: "Metas de hoje") {
            HStack(spacing: 20) {
                RingStack(rings: [
                    (goal.map { kcal / $0 } ?? 0, Theme.calories),
                    (water.map { $0.totalIntakeMl / max($0.dailyGoalMl, 1) } ?? 0, Theme.water),
                    (trained ? 1 : 0, Theme.voltText),
                ], size: 140, lineWidth: 17)
                .padding(.vertical, 4)

                VStack(alignment: .leading, spacing: 10) {
                    RingLegend(title: "Calorias", color: Theme.calories,
                               value: Format.int(kcal), goal: goal.map(Format.int), unit: "kcal")
                    RingLegend(title: "Água", color: Theme.water,
                               value: Format.liters(water?.totalIntakeMl ?? 0), goal: water.map { Format.liters($0.dailyGoalMl) }, unit: "L")
                    RingLegend(title: "Treino", color: Theme.voltText,
                               value: trained ? "Feito" : (hasWorkout ? "Pendente" : "Descanso"), goal: nil, unit: nil)
                }
                Spacer(minLength: 0)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

private struct RingLegend: View {
    var title: String
    var color: Color
    var value: String
    var goal: String?
    var unit: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(title).font(.subheadline.weight(.medium)).foregroundStyle(.primary)
            MetricValue(value: value, unit: unit, goal: goal, color: color, size: 20)
        }
    }
}

// MARK: - Workout

private struct TodayWorkoutCard: View {
    @Environment(AppStore.self) private var store
    @Binding var player: PlayerRoute?
    @Binding var tab: AppTab

    var body: some View {
        Card(title: "Treino de hoje", showsChevron: true, highlight: true) {
            content
            WeekDots()
        }
        .contentShape(Rectangle())
        .onTapGesture { tab = .workout }
    }

    @ViewBuilder private var content: some View {
        switch store.plan {
        case .idle, .loading:
            ProgressView().frame(maxWidth: .infinity, minHeight: 60)
        case .failed(let message):
            Text(message).foregroundStyle(Theme.secondary)
        case .loaded(nil):
            VStack(alignment: .leading, spacing: 10) {
                Text("Você ainda não tem um plano").font(.headline)
                Text("O Otto monta um plano de treino para o seu objetivo.").font(.subheadline).foregroundStyle(Theme.secondary)
            }
        case .loaded(let plan?):
            if let active = store.activeSession, let day = plan.days.first(where: { $0.id == active.workoutDayId }) {
                workoutRow(day: day, plan: plan, caption: "Em andamento · \(Format.minutes(active.elapsedSeconds))", action: "Retomar")
            } else if let day = plan.today {
                if store.trained(on: .now) {
                    Label("\(day.title) concluído", systemImage: "checkmark.circle.fill")
                        .font(.headline).foregroundStyle(Theme.voltText)
                } else {
                    workoutRow(day: day, plan: plan, caption: "\(day.exercises.count) exercícios · \(day.minutes) min", action: "Começar")
                }
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    Label("Dia de descanso", systemImage: "moon.zzz.fill").font(.headline)
                    if let next = plan.next {
                        Text("Próximo: \(Format.relativeDay(next.date).lowercased()) · \(next.day.title)")
                            .font(.subheadline).foregroundStyle(Theme.secondary)
                    }
                }
            }
        }
    }

    private func workoutRow(day: WorkoutDay, plan: WorkoutPlan, caption: String, action: String) -> some View {
        // No start button here: tapping the card opens the Treino tab, where the workout starts.
        VStack(alignment: .leading, spacing: 4) {
            Text(day.title).font(.system(.title2, design: .rounded).bold())
                .lineLimit(1).minimumScaleFactor(0.7)
            Text(caption).font(.subheadline).foregroundStyle(Theme.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Mon–Sun dots: planned days outlined, trained days filled. A weekly view instead of a daily streak.
struct WeekDots: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let plan = store.plan.value ?? nil
        let week = Calendar.mondayFirst.dateInterval(of: .weekOfYear, for: .now)?.start ?? .now
        HStack(spacing: 0) {
            ForEach(0..<7, id: \.self) { offset in
                let date = Calendar.current.date(byAdding: .day, value: offset, to: week)!
                let weekday = Weekday(date: date)
                let planned = plan?.day(for: weekday) != nil
                let done = store.trained(on: date)
                let isToday = Calendar.current.isDateInToday(date)
                VStack(spacing: 6) {
                    Text(weekday.initial).font(.caption2.weight(.semibold))
                        .foregroundStyle(isToday ? .primary : Theme.secondary)
                    ZStack {
                        Circle().fill(done ? Theme.volt : .clear)
                        Circle().strokeBorder(planned || done ? Theme.voltText : Theme.cardRaised, lineWidth: 2)
                        if done { Image(systemName: "checkmark").font(.system(size: 11, weight: .heavy)).foregroundStyle(.black) }
                    }
                    .frame(width: 26, height: 26)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .padding(.top, 4)
    }
}

// MARK: - Tiles

private struct Tile<Content: View>: View {
    var title: String
    var caption: String = "Hoje"
    @ViewBuilder var content: Content

    var body: some View {
        Card(title: title, showsChevron: true, height: 184) {
            Text(caption).font(.subheadline).foregroundStyle(.primary.opacity(0.85)).lineLimit(1)
            content
        }
    }
}

private struct CaloriesTile: View {
    @Environment(AppStore.self) private var store
    var onAdd: () -> Void

    var body: some View {
        let kcal = store.nutrition.value?.totals.calories ?? 0
        let goal = store.calorieGoal
        let caption = goal.map { kcal <= $0 ? "Restam \(Format.int($0 - kcal))" : "\(Format.int(kcal - $0)) acima" } ?? "Sem meta ainda"
        Tile(title: "Calorias", caption: caption) {
            MetricValue(value: Format.int(kcal), unit: "kcal", color: Theme.calories, size: 30)
            if let goal { ProgressLine(progress: kcal / goal, color: Theme.calories) }
            Button(action: onAdd) {
                Label("Refeição", systemImage: "plus").font(.subheadline.weight(.semibold))
            }
            .tint(Theme.calories)
        }
    }
}

private struct WaterTile: View {
    @Environment(AppStore.self) private var store
    @State private var adding = false

    var body: some View {
        let water = store.hydration.value
        Tile(title: "Água") {
            MetricValue(value: Format.liters(water?.totalIntakeMl ?? 0), unit: "L",
                        goal: water.map { Format.liters($0.dailyGoalMl) }, color: Theme.water, size: 30)
            ProgressLine(progress: water.map { $0.totalIntakeMl / max($0.dailyGoalMl, 1) } ?? 0, color: Theme.water)
            Button {
                adding = true
                Task {
                    try? await store.logWater(250)
                    adding = false
                }
            } label: {
                Label(adding ? "Salvando…" : "250 ml", systemImage: "plus").font(.subheadline.weight(.semibold))
            }
            .tint(Theme.water)
            .disabled(adding)
            .sensoryFeedback(.success, trigger: water?.totalIntakeMl)
        }
    }
}

private struct ProteinTile: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let protein = store.nutrition.value?.totals.protein ?? 0
        Tile(title: "Proteína") {
            MetricValue(value: Format.int(protein), unit: "g", goal: store.proteinGoal.map(Format.int), color: Theme.protein, size: 30)
            if let goal = store.proteinGoal {
                ProgressLine(progress: protein / goal, color: Theme.protein)
            }
        }
    }
}

private struct StepsTile: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        Tile(title: "Passos") {
            if let today = store.health.today {
                MetricValue(value: Format.int(today.steps), color: Theme.steps, size: 30)
                HourlyBars(values: today.hourlySteps, color: Theme.steps)
            } else if store.health.available {
                Text("Conecte ao app Saúde para ver seus passos.").font(.caption).foregroundStyle(Theme.secondary)
                Button("Conectar") { Task { await store.health.connect() } }
                    .font(.subheadline.weight(.semibold)).tint(Theme.steps)
            } else {
                Text("Indisponível neste aparelho").font(.caption).foregroundStyle(Theme.secondary)
            }
        }
    }
}

/// Tiny per-hour bar chart, like the Steps card in Fitness.
private struct HourlyBars: View {
    var values: [Double]
    var color: Color

    var body: some View {
        let peak = max(values.max() ?? 1, 1)
        HStack(alignment: .bottom, spacing: 2) {
            ForEach(Array(values.enumerated()), id: \.offset) { _, value in
                Capsule().fill(value > 0 ? color : Theme.cardRaised)
                    .frame(height: max(3, 34 * value / peak))
            }
        }
        .frame(height: 34, alignment: .bottom)
    }
}

private struct WeekTile: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let progress = store.weekProgress
        Tile(title: "Semana", caption: "Treinos") {
            MetricValue(value: "\(progress.done)", goal: progress.planned > 0 ? "\(progress.planned)" : nil, color: Theme.voltText, size: 30)
            if let streak = store.streaks?.workoutStreak, streak > 0 {
                Label("\(streak) \(streak == 1 ? "dia" : "dias") de sequência", systemImage: "flame.fill")
                    .font(.caption).foregroundStyle(Theme.streak)
            } else {
                Text(progress.planned > progress.done ? "Faltam \(progress.planned - progress.done) na semana" : "Meta da semana em dia")
                    .font(.caption).foregroundStyle(Theme.secondary)
            }
        }
    }
}

private struct AwardTile: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let latest = store.achievements.filter(\.unlocked).max { ($0.unlockedAt ?? "") < ($1.unlockedAt ?? "") }
        Tile(title: "Prêmios", caption: latest == nil ? "Ainda nenhum" : "Último") {
            VStack(spacing: 6) {
                Image(systemName: latest == nil ? "medal" : "medal.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(latest == nil ? AnyShapeStyle(Theme.cardRaised) : AnyShapeStyle(LinearGradient(colors: [Theme.voltText, .yellow], startPoint: .top, endPoint: .bottom)))
                Text(latest?.name ?? "Complete um treino").font(.footnote.weight(.medium)).lineLimit(2).multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
        }
    }
}

// MARK: - Trends

private struct TrendsCard: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        Card(title: "Tendências", showsChevron: true) {
            let rows = trends
            if rows.isEmpty {
                Text("Registre seu peso para ver como você evolui.").font(.subheadline).foregroundStyle(Theme.secondary)
            } else {
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], alignment: .leading, spacing: 16) {
                    ForEach(rows, id: \.title) { row in
                        HStack(spacing: 10) {
                            Image(systemName: row.symbol)
                                .font(.system(size: 18, weight: .bold)).foregroundStyle(row.color)
                                .frame(width: 40, height: 40).background(Theme.cardRaised, in: Circle())
                            VStack(alignment: .leading, spacing: 0) {
                                Text(row.title).font(.subheadline).lineLimit(1)
                                Text(row.value).font(.metric(17)).foregroundStyle(row.color).lineLimit(1).minimumScaleFactor(0.7)
                            }
                        }
                    }
                }
            }
        }
    }

    private struct Row { let title: String; let value: String; let symbol: String; let color: Color }

    private var trends: [Row] {
        var rows: [Row] = []
        if let weights = store.metricHistory[.weight], let last = weights.last {
            let first = weights.count > 1 ? weights[max(0, weights.count - 5)].value : last.value
            let delta = last.value - first
            rows.append(Row(title: "Peso", value: "\(Format.decimal(last.value)) KG",
                            symbol: delta < -0.05 ? "chevron.down" : delta > 0.05 ? "chevron.up" : "minus", color: Theme.weight))
        }
        let sessions = store.strengthSessions
        if !sessions.isEmpty {
            let fourWeeks = sessions.filter { ($0.date ?? .distantPast) > Date.now.addingTimeInterval(-28 * 86400) }.count
            rows.append(Row(title: "Treinos", value: "\(Format.decimal(Double(fourWeeks) / 4)) /SEM", symbol: "dumbbell.fill", color: Theme.voltText))
            let avg = sessions.prefix(10).map(\.durationSeconds).reduce(0, +) / max(1, min(10, sessions.count))
            rows.append(Row(title: "Duração média", value: "\(avg / 60) MIN", symbol: "timer", color: Theme.distance))
        }
        if let streaks = store.streaks, streaks.hydrationStreak > 0 {
            rows.append(Row(title: "Água em dia", value: "\(streaks.hydrationStreak) DIAS", symbol: "drop.fill", color: Theme.water))
        }
        return rows
    }
}

/// Entry to the coach chat.
private struct OttoCard: View {
    var body: some View {
        HStack(spacing: 14) {
            Image("OttoAvatar").resizable().scaledToFill()
                .frame(width: 44, height: 44).clipShape(Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text("Converse com o Otto").font(.headline)
                Text("Tire dúvidas sobre treino e dieta").font(.subheadline).foregroundStyle(Theme.secondary)
            }
            Spacer()
            Image(systemName: "bubble.left.and.bubble.right.fill").foregroundStyle(Theme.voltText)
        }
        .padding(16)
        .highlightCard()
    }
}

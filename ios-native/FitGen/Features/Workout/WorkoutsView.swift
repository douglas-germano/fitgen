import SwiftUI

struct WorkoutsView: View {
    @Environment(AppStore.self) private var store
    @State private var player: PlayerRoute?
    @State private var generating = false
    @State private var error: String?
    @State private var pickerOpen = false
    @State private var pendingRoute: PlayerRoute?
    @State private var records: [PersonalRecord] = []
    @State private var outdoorOpen = false
    @State private var confirmGenerate = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    switch store.plan {
                    case .idle, .loading:
                        LoadingView(cards: [140, 88, 88])
                    case .failed(let message):
                        ErrorCard(message: message) { Task { await store.loadPlan() } }
                    case .loaded(nil):
                        emptyPlan
                    case .loaded(let plan?):
                        planContent(plan)
                    }
                }
                .padding(.horizontal, Theme.gutter)
                .padding(.bottom, 24)
            }
            .task { await loadRecords() }
            .refreshable {
                async let a: Void = store.loadPlan()
                async let b: Void = store.loadHistory()
                async let c: Void = store.loadActiveSession()
                async let d: Void = loadRecords()
                _ = await (a, b, c, d)
            }
            .sheet(isPresented: $pickerOpen, onDismiss: {
                if let route = pendingRoute { pendingRoute = nil; player = route }
            }) {
                if let plan = store.plan.value ?? nil {
                    DayPickerSheet(plan: plan) { day in
                        pendingRoute = PlayerRoute(planId: plan.id, day: day)
                        pickerOpen = false
                    }
                    .presentationDetents([.medium, .large])
                }
            }
            .screen()
            .ottoButton()
            .navigationTitle("Treino")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink { HistoryView() } label: { Image(systemName: "clock.arrow.circlepath") }
                        .accessibilityLabel("Histórico")
                }
            }
            .fullScreenCover(item: $player) { route in WorkoutPlayerView(planId: route.planId, day: route.day) }
            .fullScreenCover(isPresented: $outdoorOpen) { OutdoorRecorderView() }
            .alert("Não foi possível gerar o plano", isPresented: .constant(error != nil)) {
                Button("OK") { error = nil }
            } message: { Text(error ?? "") }
        }
    }

    private var emptyPlan: some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                Image(systemName: "sparkles").font(.largeTitle).foregroundStyle(Theme.voltText)
                Text("Nenhum plano ativo").font(.title2.bold())
                Text("O Otto cria um plano de treino a partir do seu objetivo e dos dias que você tem livres.")
                    .foregroundStyle(Theme.secondary)
                Button {
                    generate()
                } label: {
                    HStack { if generating { ProgressView().tint(.black) }; Text(generating ? "Gerando…" : "Gerar plano").bold() }
                }
                .buttonStyle(.fitgenPrimary)
                .disabled(generating)
            }
        }
    }

    @ViewBuilder private func planContent(_ plan: WorkoutPlan) -> some View {
        // Weekly goal, not a daily streak: rest days never break it.
        Card(title: "Esta semana") {
            let progress = store.weekProgress
            HStack(alignment: .firstTextBaseline) {
                MetricValue(value: "\(progress.done)", unit: "treinos", goal: "\(progress.planned)", color: Theme.voltText, size: 30)
                Spacer()
                if let streak = store.streaks?.workoutStreak, streak > 0 {
                    Label("\(streak) \(streak == 1 ? "dia seguido" : "dias seguidos")", systemImage: "flame.fill")
                        .font(.subheadline.weight(.semibold)).foregroundStyle(Theme.streak)
                        .accessibilityLabel("Sequência de \(streak) \(streak == 1 ? "dia" : "dias") com treino")
                }
            }
            WeekDots()
        }

        todayCard(plan)

        if !records.isEmpty { RecordsCard(records: records) }

        if let active = store.activeSession, active.workoutDayId != plan.today?.id,
           let day = plan.days.first(where: { $0.id == active.workoutDayId }) {
            Button { player = PlayerRoute(planId: plan.id, day: day) } label: {
                HStack(spacing: 12) {
                    Image(systemName: "timer").font(.title3.bold())
                    VStack(alignment: .leading) {
                        Text("Treino em andamento").font(.headline)
                        Text("\(day.title) · toque para retomar").font(.subheadline).opacity(0.75)
                    }
                    Spacer()
                    Image(systemName: "play.fill")
                }
                .foregroundStyle(.black).padding(16)
                .background(Theme.voltGradient, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
            }
            .buttonStyle(.plain)
        }

        Text(plan.name).font(.title3.bold()).lineLimit(1).padding(.top, 8)

        ForEach(plan.sortedDays) { day in
            DayCard(day: day, isToday: day.dayOfWeek == Weekday.today.apiName, done: trainedThisWeek(day)) {
                player = PlayerRoute(planId: plan.id, day: day)
            }
        }

        Card(title: "Mais") {
            VStack(spacing: 0) {
                moreRow("Gravar atividade ao ar livre", "Corrida, caminhada e pedal com GPS", "figure.run", Theme.distance) { outdoorOpen = true }
                Divider().overlay(Theme.separator)
                moreLink("Histórico ao ar livre", "Percursos, distância e ritmo", "map.fill", Theme.water) { OutdoorHistoryView() }
                Divider().overlay(Theme.separator)
                moreLink("Biblioteca de exercícios", "Como fazer, dicas e erros comuns", "books.vertical.fill", Theme.steps) { ExerciseLibraryView() }
                Divider().overlay(Theme.separator)
                moreLink("Editar plano", "Renomear e ajustar exercícios", "slider.horizontal.3", Theme.protein) { PlanEditorView(plan: plan) }
                Divider().overlay(Theme.separator)
                Button { confirmGenerate = true } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "sparkles").font(.headline).foregroundStyle(Theme.voltText)
                            .frame(width: 38, height: 38).background(Theme.cardRaised, in: Circle())
                        VStack(alignment: .leading, spacing: 2) {
                            Text(generating ? "Gerando novo plano…" : "Gerar novo plano").font(.body.weight(.medium)).foregroundStyle(.primary)
                            Text("O Otto monta um plano novo para você").font(.caption).foregroundStyle(Theme.secondary)
                        }
                        Spacer()
                        if generating { ProgressView() }
                    }
                    .padding(.vertical, 8)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .disabled(generating)
            }
        }
        .padding(.top, 4)
        .alert("Gerar novo plano?", isPresented: $confirmGenerate) {
            Button("Cancelar", role: .cancel) {}
            Button("Gerar plano") { generate() }
        } message: {
            Text("O Otto vai substituir seu plano atual por um novo. O histórico dos seus treinos continua salvo.")
        }
    }

    private func moreLabel(_ title: String, _ caption: String, _ symbol: String, _ color: Color, chevron: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: symbol).font(.headline).foregroundStyle(color)
                .frame(width: 38, height: 38).background(Theme.cardRaised, in: Circle())
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.body.weight(.medium)).foregroundStyle(.primary)
                Text(caption).font(.caption).foregroundStyle(Theme.secondary)
            }
            Spacer()
            Image(systemName: chevron).font(.footnote.bold()).foregroundStyle(Theme.secondary)
        }
        .padding(.vertical, 8)
        .contentShape(Rectangle())
    }

    private func moreRow(_ title: String, _ caption: String, _ symbol: String, _ color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) { moreLabel(title, caption, symbol, color, chevron: "play.fill") }.buttonStyle(.plain)
    }

    private func moreLink<Destination: View>(_ title: String, _ caption: String, _ symbol: String, _ color: Color,
                                             @ViewBuilder destination: () -> Destination) -> some View {
        NavigationLink(destination: destination()) { moreLabel(title, caption, symbol, color, chevron: "chevron.right") }.buttonStyle(.plain)
    }

    @ViewBuilder private func todayCard(_ plan: WorkoutPlan) -> some View {
        Card(title: "Treino de hoje", highlight: true) {
            if let day = plan.today {
                let active = store.activeSession?.workoutDayId == day.id
                if store.trained(on: .now) && !active {
                    Label("\(day.title) concluído", systemImage: "checkmark.circle.fill")
                        .font(.headline).foregroundStyle(Theme.voltText)
                    pickButton("Escolher outro treino")
                } else {
                    // Title gets the full width; the button sits below it.
                    VStack(alignment: .leading, spacing: 4) {
                        Text(day.title).font(.system(.title2, design: .rounded).bold())
                            .lineLimit(1).minimumScaleFactor(0.7)
                        Text("\(day.exercises.count) exercícios · \(day.minutes) min").font(.subheadline).foregroundStyle(Theme.secondary)
                    }
                    Button { player = PlayerRoute(planId: plan.id, day: day) } label: {
                        Label(active ? "Retomar treino" : "Começar treino", systemImage: "play.fill").font(.headline)
                    }
                    .buttonStyle(.fitgenPrimary)
                    .padding(.top, 4)
                }
            } else {
                Label("Dia de descanso", systemImage: "moon.zzz.fill").font(.headline)
                if let next = plan.next {
                    Text("Próximo: \(Format.relativeDay(next.date).lowercased()) · \(next.day.title)")
                        .font(.subheadline).foregroundStyle(Theme.secondary)
                }
                pickButton("Treinar mesmo assim")
            }
        }
    }

    private func pickButton(_ title: String) -> some View {
        Button { pickerOpen = true } label: {
            Text(title).font(.subheadline.weight(.semibold)).frame(maxWidth: .infinity, minHeight: 40)
        }
        .buttonStyle(.bordered).buttonBorderShape(.capsule)
    }

    private func loadRecords() async {
        records = (try? await APIClient.shared.get("/exercises/records/recent")) ?? []
    }

    private func trainedThisWeek(_ day: WorkoutDay) -> Bool {
        guard let weekday = Weekday(apiName: day.dayOfWeek),
              let start = Calendar.mondayFirst.dateInterval(of: .weekOfYear, for: .now)?.start,
              let date = Calendar.current.date(byAdding: .day, value: weekday.mondayIndex, to: start) else { return false }
        return store.trained(on: date)
    }

    private func generate() {
        generating = true
        Task {
            do { try await store.generatePlan() }
            catch let e as APIError where e.isPremiumRequired { error = "Gerar um novo plano faz parte do FitGen Premium." }
            catch { self.error = error.localizedDescription }
            generating = false
        }
    }
}

struct PersonalRecord: Decodable, Identifiable, Sendable {
    let exerciseLibraryId: String
    let name: String
    let weightKg: Double
    let previousKg: Double
    let achievedAt: String
    var id: String { exerciseLibraryId }

    enum CodingKeys: String, CodingKey { case exerciseLibraryId, name, weightKg, previousKg, achievedAt }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        exerciseLibraryId = try c.string(.exerciseLibraryId) ?? UUID().uuidString
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Exercício"
        weightKg = c.number(.weightKg) ?? 0
        previousKg = c.number(.previousKg) ?? 0
        achievedAt = try c.decodeIfPresent(String.self, forKey: .achievedAt) ?? ""
    }
}

private struct RecordsCard: View {
    let records: [PersonalRecord]

    var body: some View {
        Card(title: "Recordes recentes") {
            ForEach(records) { record in
                let thumb = LibraryCache.shared.items?.first { $0.id == record.exerciseLibraryId }?.animationUrl
                HStack(spacing: 12) {
                    if thumb != nil {
                        ExerciseAnimation(url: thumb, size: 44, animating: false)
                    } else {
                        Image(systemName: "trophy.fill").foregroundStyle(Theme.voltText)
                            .frame(width: 44, height: 44).background(Theme.cardRaised, in: RoundedRectangle(cornerRadius: 12))
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(record.name).font(.body.weight(.medium)).lineLimit(1)
                        Text(ago(record.achievedAt)).font(.subheadline).foregroundStyle(Theme.secondary)
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("\(Format.decimal(record.weightKg)) kg").font(.metric(17))
                        Text("+\(Format.decimal(max(0, record.weightKg - record.previousKg))) kg").font(.caption.bold()).foregroundStyle(Theme.voltText)
                    }
                }
                .accessibilityElement(children: .combine)
            }
        }
    }

    private func ago(_ text: String) -> String {
        guard let date = ISODate.parse(text) else { return "" }
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.unitsStyle = .full
        return formatter.localizedString(for: date, relativeTo: .now)
    }
}

private struct DayPickerSheet: View {
    let plan: WorkoutPlan
    let onPick: (WorkoutDay) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section("Qual treino você quer fazer?") {
                    ForEach(plan.sortedDays) { day in
                        Button { onPick(day) } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(day.title).font(.body.weight(.medium)).foregroundStyle(.primary)
                                    Text("\(Weekday(apiName: day.dayOfWeek)?.long ?? "") · \(day.exercises.count) exercícios · \(day.minutes) min")
                                        .font(.subheadline).foregroundStyle(Theme.secondary)
                                }
                                Spacer()
                                Image(systemName: "play.fill").foregroundStyle(Theme.voltText)
                            }
                        }
                    }
                }
                .listRowBackground(Theme.card)
            }
            .scrollContentBackground(.hidden)
            .screen()
            .navigationTitle("Escolher treino")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarLeading) { Button("Fechar") { dismiss() } } }
        }
    }
}

private struct DayCard: View {
    let day: WorkoutDay
    let isToday: Bool
    let done: Bool
    let onStart: () -> Void

    var body: some View {
        NavigationLink {
            DayDetailView(day: day, onStart: onStart)
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    Circle().fill(done ? Theme.volt : Theme.cardRaised)
                    // Today: a volt outline instead of a "HOJE" badge (the card above already says it).
                    if isToday && !done { Circle().strokeBorder(Theme.voltText, lineWidth: 2) }
                    if done {
                        Image(systemName: "checkmark").font(.headline.bold()).foregroundStyle(.black)
                    } else {
                        Text(String((Weekday(apiName: day.dayOfWeek)?.long ?? "?").prefix(3))).font(.caption.bold())
                            .foregroundStyle(isToday ? Theme.voltText : .primary)
                    }
                }
                .frame(width: 46, height: 46)
                VStack(alignment: .leading, spacing: 3) {
                    Text(day.shortTitle).font(.headline).lineLimit(2).multilineTextAlignment(.leading)
                    Text("\(day.exercises.count) exercícios · \(day.minutes) min").font(.subheadline).foregroundStyle(Theme.secondary)
                }
                Spacer()
                Image(systemName: "chevron.right").font(.footnote.bold()).foregroundStyle(Theme.secondary)
            }
            .padding(14)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct DayDetailView: View {
    let day: WorkoutDay
    let onStart: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List {
            Section {
                ForEach(Array(day.exercises.enumerated()), id: \.element.id) { index, exercise in
                    NavigationLink { PlanExerciseDetail(exercise: exercise) } label: { HStack(spacing: 12) {
                        ExerciseAnimation(url: exercise.animationUrl, size: 64)
                            .overlay(alignment: .topLeading) {
                                Text("\(index + 1)").font(.caption.bold()).foregroundStyle(.black)
                                    .frame(width: 20, height: 20).background(Theme.volt, in: Circle()).offset(x: -6, y: -6)
                            }
                        VStack(alignment: .leading, spacing: 2) {
                            Text(exercise.name).font(.body.weight(.medium))
                            Text(exercise.line).font(.subheadline).foregroundStyle(Theme.secondary)
                        }
                    } }
                    .padding(.vertical, 2)
                }
            } header: {
                Text("\(day.exercises.count) exercícios · \(day.minutes) min")
            }
            .listRowBackground(Theme.card)
        }
        .scrollContentBackground(.hidden)
        .screen()
        .navigationTitle(day.title)
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) {
            Button {
                dismiss()
                onStart()
            } label: {
                Label("Começar treino", systemImage: "play.fill")
            }
            .buttonStyle(.fitgenPrimary)
            .padding(.horizontal, Theme.gutter).padding(.bottom, 8)
        }
    }
}

struct HistoryView: View {
    @Environment(AppStore.self) private var store

    /// Sessions grouped by the Monday of their week, newest week first.
    private var weeks: [(start: Date, sessions: [SessionSummary])] {
        var calendar = Calendar(identifier: .gregorian)
        calendar.firstWeekday = 2
        let sessions = store.history.value ?? []
        let grouped = Dictionary(grouping: sessions) { session in
            calendar.dateInterval(of: .weekOfYear, for: session.date ?? .distantPast)?.start ?? .distantPast
        }
        return grouped.map { ($0.key, $0.value) }.sorted { $0.start > $1.start }
    }

    var body: some View {
        List {
            if (store.history.value ?? []).isEmpty {
                Text("Nenhum treino registrado ainda.").foregroundStyle(Theme.secondary).listRowBackground(Theme.card)
            }
            ForEach(weeks, id: \.start) { week in
                Section {
                    ForEach(week.sessions) { session in row(session).listRowBackground(Theme.card) }
                } header: {
                    HStack {
                        Text(weekTitle(week.start))
                        Spacer()
                        // Sum of the rounded row values, so the header always matches the rows below it.
                        let minutes = week.sessions.reduce(0) { $0 + max(1, Int((Double($1.durationSeconds) / 60).rounded())) }
                        Text("\(week.sessions.count) \(week.sessions.count == 1 ? "treino" : "treinos") · \(minutes) min")
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .screen()
        .navigationTitle("Histórico")
        .refreshable { await store.loadHistory() }
    }

    @ViewBuilder private func row(_ session: SessionSummary) -> some View {
        let label = HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(session.workoutName).font(.body.weight(.medium))
                Text(session.date.map { "\(Format.relativeDay($0)) · \(Format.dayMonth($0))" } ?? "")
                    .font(.subheadline).foregroundStyle(Theme.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(Format.minutes(session.durationSeconds)).font(.metric(17)).foregroundStyle(Theme.voltText)
                if let kcal = session.calories, kcal > 0 {
                    Text("\(Format.int(kcal)) kcal").font(.caption).foregroundStyle(Theme.calories)
                }
            }
        }
        if session.fromHealth == true {
            label
        } else if session.outdoorType != nil {
            NavigationLink { OutdoorDetailView(id: session.id) } label: { label }
        } else {
            NavigationLink { SessionDetailView(sessionId: session.id) } label: { label }
        }
    }

    private func weekTitle(_ start: Date) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.firstWeekday = 2
        if let current = calendar.dateInterval(of: .weekOfYear, for: .now)?.start {
            if start == current { return "Esta semana" }
            if let previous = calendar.date(byAdding: .weekOfYear, value: -1, to: current), start == previous { return "Semana passada" }
        }
        return "Semana de \(Format.dayMonth(start))"
    }
}

/// GET /exercises/sessions/:id — a past workout with its sets.
struct SessionDetail: Decodable, Sendable {
    struct SetLog: Decodable, Sendable, Identifiable {
        let setNumber: Int
        let reps: Int
        let weightKg: Double?
        var id: Int { setNumber }
        enum CodingKeys: String, CodingKey { case setNumber, reps, weightKg }
        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            setNumber = Int(c.number(.setNumber) ?? 0)
            reps = Int(c.number(.reps) ?? 0)
            weightKg = c.number(.weightKg)
        }
    }
    struct ExerciseLogGroup: Decodable, Sendable, Identifiable {
        let exerciseId: String
        let name: String
        let sets: [SetLog]
        var id: String { exerciseId }
    }
    let workoutName: String
    let startedAt: String?
    let durationSeconds: Int
    let calories: Double?
    let totalSets: Int
    let totalVolumeKg: Double
    let exercises: [ExerciseLogGroup]

    enum CodingKeys: String, CodingKey { case workoutName, startedAt, durationSeconds, calories, totalSets, totalVolumeKg, exercises }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        workoutName = (try? c.decodeIfPresent(String.self, forKey: .workoutName)) ?? "Treino"
        startedAt = try? c.decodeIfPresent(String.self, forKey: .startedAt)
        durationSeconds = Int(c.number(.durationSeconds) ?? 0)
        calories = c.number(.calories)
        totalSets = Int(c.number(.totalSets) ?? 0)
        totalVolumeKg = c.number(.totalVolumeKg) ?? 0
        exercises = (try? c.decodeIfPresent([ExerciseLogGroup].self, forKey: .exercises)) ?? []
    }
}

struct SessionDetailView: View {
    let sessionId: String
    @State private var detail: SessionDetail?
    @State private var error: String?

    var body: some View {
        Group {
            if let detail {
                content(detail)
            } else if let error {
                ScrollView { ErrorCard(message: error) { Task { await load() } }.padding(Theme.gutter) }
            } else {
                LoadingView()
            }
        }
        .screen()
        .navigationTitle(detail?.workoutName ?? "Treino")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func load() async {
        do { detail = try await APIClient.shared.get("/exercises/sessions/\(sessionId)"); error = nil }
        catch { if detail == nil { self.error = error.localizedDescription } }
    }

    private func content(_ d: SessionDetail) -> some View {
        List {
            Section {
                HStack(spacing: 10) {
                    stat("Tempo", Format.minutes(d.durationSeconds), Theme.voltText)
                    stat("Séries", "\(d.totalSets)", Theme.water)
                    stat("Volume", d.totalVolumeKg > 0 ? "\(Format.int(d.totalVolumeKg)) kg" : "—", Theme.streak)
                }
                .listRowInsets(EdgeInsets())
                .listRowBackground(Color.clear)
            } footer: {
                if let date = d.startedAt.flatMap(ISODate.parse) {
                    Text("\(Format.relativeDay(date)) · \(Format.dayMonth(date))\(d.calories.map { $0 > 0 ? " · \(Format.int($0)) kcal" : "" } ?? "")")
                }
            }
            if d.exercises.isEmpty {
                Section { Text("Nenhuma série registrada neste treino.").foregroundStyle(Theme.secondary) }
                    .listRowBackground(Theme.card)
            }
            ForEach(d.exercises) { exercise in
                Section(exercise.name) {
                    ForEach(exercise.sets) { set in
                        HStack {
                            Text("Série \(set.setNumber)").foregroundStyle(Theme.secondary)
                            Spacer()
                            Text(line(set)).font(.metric(17)).monospacedDigit()
                        }
                    }
                }
                .listRowBackground(Theme.card)
            }
        }
        .scrollContentBackground(.hidden)
    }

    private func line(_ set: SessionDetail.SetLog) -> String {
        if let kg = set.weightKg, kg > 0 { return "\(Format.decimal(kg)) kg × \(set.reps)" }
        return "\(set.reps) reps"
    }

    private func stat(_ title: String, _ value: String, _ color: Color) -> some View {
        VStack(spacing: 4) {
            Text(title).font(.subheadline).foregroundStyle(Theme.secondary)
            Text(value).font(.metric(20)).foregroundStyle(color).lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 14)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

struct ErrorCard: View {
    let message: String
    let retry: () -> Void
    var body: some View {
        Card {
            Label(message, systemImage: "wifi.exclamationmark").foregroundStyle(Theme.secondary)
            Button("Tentar novamente", action: retry).font(.subheadline.weight(.semibold))
        }
    }
}

/// Opens the library page of a plan exercise, loading the library entry by id.
struct PlanExerciseDetail: View {
    let exercise: Exercise
    @Environment(AppStore.self) private var store
    @State private var library: LibraryExercise?
    @State private var failed = false

    var body: some View {
        Group {
            if let library {
                ExerciseDetailView(exercise: library)
            } else if failed {
                ContentUnavailableView("Exercício sem página", systemImage: "dumbbell",
                                       description: Text("\(exercise.name) não está na biblioteca de exercícios."))
                    .screen()
            } else {
                LoadingView().screen()
            }
        }
        .task {
            let items = (try? await store.library()) ?? []
            library = items.first { $0.id == exercise.exerciseLibraryId } ?? items.first { $0.name == exercise.name }
            failed = library == nil
        }
    }
}

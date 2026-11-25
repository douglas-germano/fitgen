import SwiftUI
import UserNotifications

/// One set in the player. Weight and reps arrive filled from the last session, so a set is one tap.
struct SetEntry: Equatable {
    var weight: Double?
    var reps: Int
    var done = false
    /// What was done last time, shown as "Anterior".
    var previous: String?
}

@MainActor @Observable
final class WorkoutSessionModel {
    let planId: String
    private(set) var day: WorkoutDay
    private let store: AppStore

    /// The set being corrected: (exercise id, set index).
    var editing: (exerciseId: String, index: Int)?
    var planBusy = false

    var sets: [String: [SetEntry]] = [:]
    var sessionId: String?
    var startedAt: Date?
    var restEnd: Date?
    var restTotal: TimeInterval = 0
    var busy = false
    var error: String?
    var finished: (duration: Int, calories: Int)?

    init(planId: String, day: WorkoutDay, store: AppStore) {
        self.planId = planId
        self.day = day
        self.store = store
        for exercise in day.exercises {
            sets[exercise.id] = (0..<max(exercise.sets, 1)).map { _ in SetEntry(weight: nil, reps: exercise.targetReps) }
        }
    }

    var totalSets: Int { sets.values.reduce(0) { $0 + $1.count } }
    var doneSets: Int { sets.values.reduce(0) { $0 + $1.filter(\.done).count } }
    var started: Bool { sessionId != nil }

    /// Resume an open session for this day, then fill every set from the exercise's last session.
    func prepare() async {
        await store.loadActiveSession()
        if let active = store.activeSession, active.workoutDayId == day.id {
            sessionId = active.sessionId
            startedAt = Date.now.addingTimeInterval(-TimeInterval(active.elapsedSeconds))
            for log in active.logs {
                guard var list = sets[log.exerciseId], list.indices.contains(log.setNumber - 1) else { continue }
                list[log.setNumber - 1].weight = log.weightUsedKg
                list[log.setNumber - 1].reps = log.repsDone
                list[log.setNumber - 1].done = true
                sets[log.exerciseId] = list
            }
        }
        await fillPrevious(for: day.exercises)
        carryLoadForward()
    }

    /// After resuming, open sets with no load of their own take the load of the last set done before them,
    /// the same thing `complete` does live. Without it a resumed set shows "—" and gets logged as 0 kg.
    private func carryLoadForward() {
        for (exerciseId, list) in sets {
            var list = list
            var last: SetEntry?
            for index in list.indices {
                if list[index].done {
                    if (list[index].weight ?? 0) > 0 { last = list[index] }
                    continue
                }
                if list[index].weight == nil, let last, let weight = last.weight, weight > 0 {
                    list[index].weight = weight
                    if list[index].previous == nil { list[index].reps = last.reps }
                }
            }
            sets[exerciseId] = list
        }
    }

    /// Fills each exercise's sets from its last session ("Anterior" column and prefilled load).
    private func fillPrevious(for exercises: [Exercise]) async {
        await withTaskGroup(of: (String, [Int: ExerciseHistory.Session.SetLog]).self) { group in
            for exercise in exercises {
                guard let libraryId = exercise.exerciseLibraryId else { continue }
                group.addTask { [store] in (exercise.id, await store.lastSets(libraryId: libraryId)) }
            }
            for await (exerciseId, last) in group where !last.isEmpty {
                guard var list = sets[exerciseId] else { continue }
                let fallback = last.values.max { $0.setNumber < $1.setNumber }
                for index in list.indices {
                    let previous = last[index + 1] ?? fallback
                    guard let previous else { continue }
                    let weight = previous.weightKg ?? 0
                    list[index].previous = weight > 0 ? "\(Format.decimal(weight)) × \(previous.reps)" : "\(previous.reps) reps"
                    if !list[index].done {
                        list[index].weight = weight > 0 ? weight : nil
                        list[index].reps = previous.reps > 0 ? previous.reps : list[index].reps
                    }
                }
                sets[exerciseId] = list
            }
        }
    }

    // MARK: Editing the plan

    private struct ExerciseBody: Encodable {
        let name: String
        let sets: Int
        let reps: String
        let restSeconds: Int
        let notes: String
        let exerciseLibraryId: String?
    }

    /// Reloads the plan and rebuilds the exercise list, keeping what was already logged.
    private func reloadDay() async {
        await store.loadPlan()
        guard let plan = store.plan.value ?? nil, let fresh = plan.days.first(where: { $0.id == day.id }) else { return }
        day = fresh
        var rebuilt: [String: [SetEntry]] = [:]
        var added: [Exercise] = []
        for exercise in fresh.exercises {
            let count = max(exercise.sets, 1)
            if var existing = sets[exercise.id] {
                if existing.count > count { existing = Array(existing.prefix(count)) }
                while existing.count < count { existing.append(SetEntry(weight: existing.last?.weight, reps: exercise.targetReps)) }
                rebuilt[exercise.id] = existing
            } else {
                rebuilt[exercise.id] = (0..<count).map { _ in SetEntry(weight: nil, reps: exercise.targetReps) }
                added.append(exercise)
            }
        }
        sets = rebuilt
        editing = nil
        await fillPrevious(for: added)
    }

    private func mutate(_ work: () async throws -> Void) async -> Bool {
        guard !planBusy else { return false }
        planBusy = true
        defer { planBusy = false }
        do {
            try await work()
            await reloadDay()
            return true
        } catch let e as APIError where e.isPremiumRequired {
            error = "Esse recurso faz parte do FitGen Premium."
        } catch {
            self.error = error.localizedDescription
        }
        return false
    }

    func addExercise(_ library: LibraryExercise) async {
        _ = await mutate {
            let body = ExerciseBody(name: library.name, sets: 3, reps: "8-12", restSeconds: 60, notes: "", exerciseLibraryId: library.id)
            try await APIClient.shared.sendNoContent("/workouts/day/\(day.id)/exercises", method: "POST", json: body)
        }
    }

    func swapExercise(_ exercise: Exercise, with library: LibraryExercise) async {
        _ = await mutate {
            let body = ExerciseBody(name: library.name, sets: exercise.sets, reps: exercise.reps, restSeconds: exercise.restSeconds,
                                    notes: exercise.notes ?? "", exerciseLibraryId: library.id)
            try await APIClient.shared.sendNoContent("/workouts/exercises/\(exercise.id)", method: "PUT", json: body)
            sets[exercise.id] = nil  // a different exercise: start its sets fresh
        }
    }

    func removeExercise(_ exercise: Exercise) async {
        _ = await mutate {
            try await APIClient.shared.sendNoContent("/workouts/exercises/\(exercise.id)", method: "DELETE")
        }
    }

    func start() async -> Bool {
        if sessionId != nil { return true }
        struct Body: Encodable { let workoutDayId: String }
        struct Response: Decodable { let sessionId: String }
        busy = true
        defer { busy = false }
        do {
            let response: Response = try await APIClient.shared.send("/exercises/sessions/start", method: "POST", json: Body(workoutDayId: day.id))
            sessionId = response.sessionId
            startedAt = .now
            await store.loadActiveSession()
            return true
        } catch let e as APIError where e.status == 409 {
            await store.loadActiveSession()
            if let active = store.activeSession, active.workoutDayId == day.id {
                sessionId = active.sessionId
                startedAt = Date.now.addingTimeInterval(-TimeInterval(active.elapsedSeconds))
                return true
            }
            error = "Há outro treino em andamento. Finalize-o antes de começar este."
        } catch {
            self.error = error.localizedDescription
        }
        return false
    }

    private struct SetBody: Encodable { let exerciseId: String; let setNumber: Int; let repsDone: Int; let weightUsedKg: Double }

    private func logSet(_ exercise: Exercise, index: Int, entry: SetEntry) async -> Bool {
        guard let sessionId else { return false }
        guard entry.reps > 0 else { error = "Informe as repetições da série."; return false }
        busy = true
        defer { busy = false }
        do {
            try await APIClient.shared.sendNoContent("/exercises/sessions/\(sessionId)/log-set", method: "POST",
                json: SetBody(exerciseId: exercise.id, setNumber: index + 1, repsDone: entry.reps, weightUsedKg: entry.weight ?? 0))
            return true
        } catch {
            self.error = error.localizedDescription
            return false
        }
    }

    /// Checks the next open set (or a given one). Starts the session on the first set, then the rest timer.
    func complete(_ exercise: Exercise, index: Int) async {
        guard var list = sets[exercise.id], list.indices.contains(index), !busy else { return }
        guard await start() else { return }
        let entry = list[index]
        guard await logSet(exercise, index: index, entry: entry) else { return }
        list[index].done = true
        // The next untouched set inherits this load when it had nothing from last time.
        if list.indices.contains(index + 1), list[index + 1].previous == nil, !list[index + 1].done {
            list[index + 1].weight = entry.weight
            list[index + 1].reps = entry.reps
        }
        sets[exercise.id] = list
        if doneSets < totalSets, exercise.restSeconds > 0 { startRest(TimeInterval(exercise.restSeconds)) }
    }

    /// Re-sends a corrected set with the same set number (the API upserts it).
    func saveEdit(_ exercise: Exercise) async {
        guard let editing, editing.exerciseId == exercise.id, let entry = sets[exercise.id]?[safe: editing.index], !busy else { return }
        if await logSet(exercise, index: editing.index, entry: entry) { self.editing = nil }
    }

    func startRest(_ seconds: TimeInterval) {
        restTotal = seconds
        restEnd = .now.addingTimeInterval(seconds)
        scheduleRestNotification()
    }

    func adjustRest(_ delta: TimeInterval) {
        guard let end = restEnd else { return }
        let newEnd = end.addingTimeInterval(delta)
        if newEnd <= .now { skipRest(); return }
        restEnd = newEnd
        restTotal = max(1, restTotal + delta)
        scheduleRestNotification()
    }

    func skipRest() {
        restEnd = nil
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["rest"])
    }

    /// Rest-over alert when the phone is locked or the app is in the background.
    private func scheduleRestNotification() {
        guard let end = restEnd else { return }
        let center = UNUserNotificationCenter.current()
        center.removePendingNotificationRequests(withIdentifiers: ["rest"])
        let content = UNMutableNotificationContent()
        content.title = "Descanso acabou"
        content.body = "Hora da próxima série."
        content.sound = .default
        content.interruptionLevel = .timeSensitive
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(1, end.timeIntervalSinceNow), repeats: false)
        center.add(UNNotificationRequest(identifier: "rest", content: content, trigger: trigger))
    }

    /// Throws away the open session and its sets (DELETE /exercises/sessions/:id).
    func discard() async -> Bool {
        guard let sessionId, !busy else { return sessionId == nil }
        busy = true
        defer { busy = false }
        do {
            try await APIClient.shared.sendNoContent("/exercises/sessions/\(sessionId)", method: "DELETE")
        } catch let e as APIError where e.status == 404 {
            // Already gone (finished or discarded elsewhere): nothing left to throw away.
        } catch {
            self.error = error.localizedDescription
            return false
        }
        skipRest()
        self.sessionId = nil
        startedAt = nil
        await store.loadActiveSession()
        return true
    }

    func finish() async {
        guard let sessionId, !busy else { return }
        struct Body: Encodable { let notes: String }
        struct Response: Decodable { let duration: Double?; let calories: Double? }
        busy = true
        defer { busy = false }
        do {
            let response: Response = try await APIClient.shared.send("/exercises/sessions/\(sessionId)/finish", method: "PUT",
                                                                     json: Body(notes: "Treino finalizado via app iOS"))
            skipRest()
            let elapsed = Int(Date.now.timeIntervalSince(startedAt ?? .now))
            let duration = Int(response.duration ?? Double(elapsed))
            let calories = Int(response.calories ?? Double(duration) / 60 * 6)
            finished = (duration, calories)
            await store.health.saveWorkout(start: startedAt ?? .now.addingTimeInterval(-Double(duration)), end: .now, kcal: Double(calories))
            async let a: Void = store.loadHistory()
            async let b: Void = store.loadActiveSession()
            async let c: Void = store.loadGamification()
            _ = await (a, b, c)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct WorkoutPlayerView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let planId: String
    let day: WorkoutDay
    @State private var model: WorkoutSessionModel?
    @State private var expanded: String?
    @State private var confirmFinish = false
    @State private var confirmClose = false
    @State private var picker: PickerMode?
    @State private var removing: Exercise?
    @State private var keyboardUp = false

    private enum PickerMode: Identifiable {
        case add
        case swap(Exercise)
        var id: String { switch self { case .add: "add"; case .swap(let e): "swap-\(e.id)" } }
    }

    var body: some View {
        NavigationStack {
            Group {
                if let model {
                    if let finished = model.finished {
                        FinishedView(day: model.day, duration: finished.duration, calories: finished.calories, sets: model.doneSets) { dismiss() }
                    } else {
                        content(model)
                    }
                } else {
                    ProgressView()
                }
            }
            .screen()
        }
        .task {
            let model = WorkoutSessionModel(planId: planId, day: day, store: store)
            self.model = model
            expanded = model.day.exercises.first?.id
            _ = try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound])
            await model.prepare()
            expanded = model.day.exercises.first { ex in model.sets[ex.id]?.contains { !$0.done } ?? false }?.id ?? expanded
        }
        .persistentSystemOverlays(.hidden)
        .onAppear { UIApplication.shared.isIdleTimerDisabled = true }
        .onDisappear { UIApplication.shared.isIdleTimerDisabled = false }
    }

    @ViewBuilder private func content(_ model: WorkoutSessionModel) -> some View {
        ScrollView {
            VStack(spacing: 12) {
                SessionHeader(model: model)
                ForEach(model.day.exercises) { exercise in
                    ExerciseCard(model: model, exercise: exercise, expanded: expanded == exercise.id) {
                        withAnimation(.snappy) { expanded = expanded == exercise.id ? nil : exercise.id }
                    } onSetDone: {
                        // Move on to the next exercise once this one is done.
                        if model.sets[exercise.id]?.allSatisfy(\.done) == true {
                            withAnimation(.snappy) {
                                expanded = model.day.exercises.first { ex in model.sets[ex.id]?.contains { !$0.done } ?? false }?.id
                            }
                        }
                    } onSwap: {
                        picker = .swap(exercise)
                    } onRemove: {
                        removing = exercise
                    }
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.bottom, 24)
        }
        .scrollDismissesKeyboard(.interactively)
        .navigationTitle(model.day.title)
        .navigationBarTitleDisplayMode(.inline)
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { _ in keyboardUp = true }
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in keyboardUp = false }
        .sheet(item: $picker) { mode in
            NavigationStack {
                ExerciseLibraryView(onSelect: { library in
                    picker = nil
                    Task {
                        switch mode {
                        case .add: await model.addExercise(library)
                        case .swap(let exercise): await model.swapExercise(exercise, with: library)
                        }
                        if case .add = mode { expanded = model.day.exercises.last?.id }
                    }
                })
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) { Button("Cancelar") { picker = nil } }
                }
            }
        }
        .confirmationDialog("Remover \(removing?.name ?? "exercício")?", isPresented: Binding(get: { removing != nil }, set: { if !$0 { removing = nil } }), titleVisibility: .visible) {
            Button("Remover do treino", role: .destructive) {
                if let exercise = removing { Task { await model.removeExercise(exercise) } }
                removing = nil
            }
            Button("Cancelar", role: .cancel) { removing = nil }
        } message: { Text("O exercício sai do plano deste dia.") }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Fechar") { if model.started { confirmClose = true } else { dismiss() } }
            }
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("OK") {
                    UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                }
                .bold()
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button { picker = .add } label: {
                    if model.planBusy { ProgressView() } else { Image(systemName: "plus") }
                }
                .disabled(model.planBusy)
                .accessibilityLabel("Adicionar exercício")
            }
        }
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: 10) {
                if let end = model.restEnd {
                    RestBar(end: end, total: model.restTotal, onAdjust: model.adjustRest, onSkip: model.skipRest)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }
                if !keyboardUp {
                    if model.started {
                        Button { confirmFinish = true } label: {
                            HStack { if model.busy { ProgressView().tint(.black) }; Label("Finalizar treino", systemImage: "flag.checkered") }
                        }
                        .buttonStyle(.fitgenPrimary)
                        .disabled(model.busy)
                    } else {
                        Button {
                            Task { _ = await model.start() }
                        } label: {
                            HStack { if model.busy { ProgressView().tint(.black) }; Label("Começar treino", systemImage: "play.fill") }
                        }
                        .buttonStyle(.fitgenPrimary)
                    }
                }
            }
            .padding(.horizontal, Theme.gutter).padding(.bottom, 8)
            .animation(.snappy, value: model.restEnd)
        }
        .confirmationDialog("Finalizar treino?", isPresented: $confirmFinish, titleVisibility: .visible) {
            Button("Finalizar") { Task { await model.finish() } }
            Button("Descartar treino", role: .destructive) { Task { if await model.discard() { dismiss() } } }
            Button("Continuar treinando", role: .cancel) {}
        } message: {
            if model.doneSets < model.totalSets {
                Text("Você registrou \(model.doneSets) de \(model.totalSets) séries.")
            }
        }
        .confirmationDialog("Sair do treino?", isPresented: $confirmClose, titleVisibility: .visible) {
            Button("Continuar depois") { dismiss() }
            Button("Descartar treino", role: .destructive) { Task { if await model.discard() { dismiss() } } }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("O treino fica em andamento e você retoma de onde parou. Descartar apaga as séries registradas.")
        }
        .alert("Algo deu errado", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
            Button("OK") { model.error = nil }
        } message: { Text(model.error ?? "") }
    }
}

private struct SessionHeader: View {
    let model: WorkoutSessionModel

    var body: some View {
        Card {
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Tempo").font(.subheadline).foregroundStyle(Theme.secondary)
                    if let startedAt = model.startedAt {
                        TimelineView(.periodic(from: .now, by: 1)) { context in
                            Text(Format.clock(Int(context.date.timeIntervalSince(startedAt))))
                                .font(.metric(34)).foregroundStyle(Theme.voltText).monospacedDigit()
                        }
                    } else {
                        Text("0:00").font(.metric(34)).foregroundStyle(Theme.secondary)
                    }
                }
                Spacer()
                ZStack {
                    Ring(progress: model.totalSets == 0 ? 0 : Double(model.doneSets) / Double(model.totalSets), color: Theme.voltText, lineWidth: 8, gradient: true)
                    Text("\(model.doneSets)/\(model.totalSets)").font(.metric(15))
                }
                .frame(width: 64, height: 64)
            }
        }
    }
}

private struct ExerciseCard: View {
    let model: WorkoutSessionModel
    let exercise: Exercise
    let expanded: Bool
    let onToggle: () -> Void
    let onSetDone: () -> Void
    let onSwap: () -> Void
    let onRemove: () -> Void

    var body: some View {
        let list = model.sets[exercise.id] ?? []
        let done = list.filter(\.done).count
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 4) {
            Button(action: onToggle) {
                HStack(spacing: 12) {
                    // Still frame while collapsed; the full animation plays below when open.
                    ExerciseAnimation(url: exercise.animationUrl, size: 52, animating: false)
                        .overlay(alignment: .bottomTrailing) {
                            if done == list.count && !list.isEmpty {
                                Image(systemName: "checkmark").font(.caption.bold()).foregroundStyle(.black)
                                    .frame(width: 20, height: 20).background(Theme.volt, in: Circle()).offset(x: 5, y: 5)
                            }
                        }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(exercise.name).font(.headline).multilineTextAlignment(.leading)
                        Text("\(done)/\(list.count) séries · \(exercise.line)").font(.subheadline).foregroundStyle(Theme.secondary)
                    }
                    Spacer()
                    Image(systemName: expanded ? "chevron.up" : "chevron.down").font(.footnote.bold()).foregroundStyle(Theme.secondary)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            Menu {
                Button { onSwap() } label: { Label("Trocar exercício", systemImage: "arrow.triangle.2.circlepath") }
                Button(role: .destructive) { onRemove() } label: { Label("Remover", systemImage: "trash") }
            } label: {
                Image(systemName: "ellipsis").font(.body.bold()).foregroundStyle(Theme.secondary)
                    .frame(width: 36, height: 44).contentShape(Rectangle())
            }
            .disabled(model.planBusy)
            .accessibilityLabel("Opções de \(exercise.name)")
            }

            if expanded {
                if exercise.animationUrl != nil {
                    ExerciseAnimation(url: exercise.animationUrl, size: nil, cornerRadius: 16)
                        .frame(maxWidth: .infinity).frame(height: 220)
                }
                HStack {
                    Text("SÉRIE").frame(width: 40, alignment: .leading)
                    Text("ANTERIOR").frame(maxWidth: .infinity, alignment: .leading)
                    Text("KG").frame(width: 76)
                    Text("REPS").frame(width: 60)
                    Color.clear.frame(width: 54)
                }
                .font(.caption2.bold()).foregroundStyle(Theme.secondary)

                ForEach(list.indices, id: \.self) { index in
                    SetRow(number: index + 1, entry: Binding(
                        get: { model.sets[exercise.id]?[index] ?? SetEntry(weight: nil, reps: 0) },
                        set: { model.sets[exercise.id]?[index] = $0 }
                    ), isNext: list.firstIndex { !$0.done } == index, busy: model.busy,
                    isEditing: model.editing?.exerciseId == exercise.id && model.editing?.index == index,
                    onEdit: { model.editing = (exercise.id, index) }) {
                        Task {
                            if model.editing?.exerciseId == exercise.id && model.editing?.index == index {
                                await model.saveEdit(exercise)
                            } else {
                                await model.complete(exercise, index: index)
                                onSetDone()
                            }
                        }
                    }
                }
                if let notes = exercise.notes, !notes.isEmpty {
                    Label(notes, systemImage: "lightbulb").font(.footnote).foregroundStyle(Theme.secondary)
                }
            }
        }
        .padding(16)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
    }
}

private struct SetRow: View {
    let number: Int
    @Binding var entry: SetEntry
    let isNext: Bool
    let busy: Bool
    let isEditing: Bool
    let onEdit: () -> Void
    let onDone: () -> Void

    private var locked: Bool { entry.done && !isEditing }

    var body: some View {
        HStack {
            Text("\(number)").font(.metric(17)).foregroundStyle(isNext ? Theme.voltText : .primary).frame(width: 40, alignment: .leading)
            Text(entry.previous ?? "—").font(.subheadline).foregroundStyle(Theme.secondary).frame(maxWidth: .infinity, alignment: .leading)
                .accessibilityLabel(entry.previous.map { "Última vez: \($0)" } ?? "Sem registro anterior")
            TextField("—", value: $entry.weight, format: .number.precision(.fractionLength(0...1)))
                .accessibilityLabel("Carga da série \(number), em quilos")
                .keyboardType(.decimalPad).multilineTextAlignment(.center)
                .font(.metric(17)).frame(width: 76, height: 38)
                .background(Theme.cardRaised, in: RoundedRectangle(cornerRadius: 10))
                .disabled(locked)
            TextField("0", value: $entry.reps, format: .number)
                .accessibilityLabel("Repetições da série \(number)")
                .keyboardType(.numberPad).multilineTextAlignment(.center)
                .font(.metric(17)).frame(width: 60, height: 38)
                .background(Theme.cardRaised, in: RoundedRectangle(cornerRadius: 10))
                .disabled(locked)
            Button {
                // A done set is corrected by tapping it: the check opens the edit instead of being a dead button.
                if entry.done && !isEditing { onEdit() } else { onDone() }
            } label: {
                Group {
                    if isEditing {
                        Text("Salvar").font(.caption.bold())
                    } else {
                        Image(systemName: "checkmark").font(.system(size: 16, weight: .heavy))
                    }
                }
                .foregroundStyle(entry.done || isNext || isEditing ? .black : .primary)
                .frame(width: 54, height: 38)
                .background(entry.done || isEditing ? Theme.volt : (isNext ? Theme.volt.opacity(0.25) : Theme.cardRaised),
                            in: RoundedRectangle(cornerRadius: 10))
                .overlay {
                    // The next set gets an outline so it reads as "do this now", apart from the filled done sets.
                    if isNext && !entry.done && !isEditing {
                        RoundedRectangle(cornerRadius: 10).strokeBorder(Theme.voltText, lineWidth: 2)
                    }
                }
            }
            .buttonStyle(.plain)
            .disabled(busy)
            .accessibilityLabel(isEditing ? "Salvar série \(number)" : entry.done ? "Série \(number) concluída" : "Concluir série \(number)")
            .accessibilityRemoveTraits(.isSelected)
            .accessibilityHint(entry.done && !isEditing ? "Toque na linha para corrigir" : "")
        }
        .padding(.vertical, 2)
        .background(locked ? Theme.volt.opacity(0.12) : .clear, in: RoundedRectangle(cornerRadius: 12))
        .contentShape(Rectangle())
        .onTapGesture { if entry.done && !isEditing { onEdit() } }
        .sensoryFeedback(.impact(weight: .medium), trigger: entry.done)
    }
}

private struct RestBar: View {
    let end: Date
    let total: TimeInterval
    let onAdjust: (TimeInterval) -> Void
    let onSkip: () -> Void

    var body: some View {
        TimelineView(.periodic(from: .now, by: 0.5)) { context in
            let left = max(0, end.timeIntervalSince(context.date))
            HStack(spacing: 12) {
                ZStack {
                    Ring(progress: total > 0 ? left / total : 0, color: Theme.water, lineWidth: 6)
                    Image(systemName: "timer").foregroundStyle(Theme.water)
                }
                .frame(width: 46, height: 46)
                VStack(alignment: .leading, spacing: 0) {
                    Text("Descanso").font(.caption).foregroundStyle(Theme.secondary)
                    Text(Format.clock(Int(left.rounded(.up)))).font(.metric(28)).monospacedDigit()
                        .lineLimit(1).fixedSize()
                }
                .layoutPriority(1)
                Spacer(minLength: 0)
                HStack(spacing: 8) {
                    Button("−15") { onAdjust(-15) }.buttonStyle(.bordered).accessibilityLabel("Menos 15 segundos")
                    Button("+15") { onAdjust(15) }.buttonStyle(.bordered).accessibilityLabel("Mais 15 segundos")
                    Button("Pular", action: onSkip).buttonStyle(.fitgenPrimaryCompact)
                }
                .lineLimit(1).fixedSize()
            }
            .font(.subheadline.bold())
            .onChange(of: left == 0) { _, over in if over { onSkip() } }
            .sensoryFeedback(.warning, trigger: left == 0)
        }
        .padding(14)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
    }
}

private struct FinishedView: View {
    let day: WorkoutDay
    let duration: Int
    let calories: Int
    let sets: Int
    let onClose: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            ZStack {
                Circle()
                    .fill(RadialGradient(colors: [Theme.volt.opacity(0.35), .clear], center: .center, startRadius: 10, endRadius: 150))
                    .frame(width: 300, height: 300)
                    .frame(width: 150, height: 150)
                Ring(progress: 1, color: Theme.voltText, lineWidth: 18, gradient: true).frame(width: 150, height: 150)
                Image(systemName: "checkmark").font(.system(size: 54, weight: .heavy)).foregroundStyle(Theme.voltText)
            }
            VStack(spacing: 6) {
                Text("Treino concluído!").font(.system(.largeTitle, design: .rounded).bold())
                Text(day.title).foregroundStyle(Theme.secondary)
            }
            HStack(spacing: 12) {
                stat("Tempo", Format.minutes(duration), Theme.voltText)
                stat("Calorias", "\(calories)", Theme.calories)
                stat("Séries", "\(sets)", Theme.water)
            }
            Spacer()
            VStack(spacing: 10) {
                NavigationLink { HistoryView() } label: {
                    Text("Ver histórico").font(.headline).frame(maxWidth: .infinity, minHeight: 50)
                }
                .buttonStyle(.bordered).buttonBorderShape(.capsule)
                Button(action: onClose) {
                    Text("Concluir")
                }
                .buttonStyle(.fitgenPrimary)
            }
        }
        .padding(Theme.gutter)
        .sensoryFeedback(.success, trigger: true)
    }

    private func stat(_ title: String, _ value: String, _ color: Color) -> some View {
        VStack(spacing: 4) {
            Text(title).font(.subheadline).foregroundStyle(Theme.secondary)
            Text(value).font(.metric(24)).foregroundStyle(color)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 14)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? { indices.contains(index) ? self[index] : nil }
}

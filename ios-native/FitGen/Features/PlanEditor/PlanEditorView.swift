import SwiftUI

private let shortNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

private extension Weekday {
    var short: String { shortNames[rawValue - 1] }
}

/// Rename the plan and its days, add / edit / remove the exercises of a day.
struct PlanEditorView: View {
    let initialPlan: WorkoutPlan

    @Environment(AppStore.self) private var store
    @State private var selectedDayId: String?
    @State private var renaming: RenameTarget?
    @State private var renameText = ""
    @State private var editing: Exercise?
    @State private var picking = false
    @State private var pickedLibrary: LibraryExercise?
    @State private var addingCustom = false
    @State private var toDelete: Exercise?
    @State private var errorMessage: String?

    init(plan: WorkoutPlan) { initialPlan = plan }

    private struct RenameTarget { let isPlan: Bool; let id: String; let name: String }

    /// Latest copy of the plan from the store (it refreshes after every edit).
    private var plan: WorkoutPlan {
        if let current = store.plan.value ?? nil, current.id == initialPlan.id { return current }
        return initialPlan
    }

    private var day: WorkoutDay? {
        let days = plan.sortedDays
        return days.first { $0.id == selectedDayId } ?? days.first { $0.dayOfWeek == Weekday.today.apiName } ?? days.first
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                if plan.sortedDays.count > 1 { dayChips }
                if let day {
                    dayHeader(day)
                    exerciseList(day)
                } else {
                    Card { Text("Este plano ainda não tem treinos.").foregroundStyle(Theme.secondary) }
                }
            }
            .padding(Theme.gutter)
        }
        .screen()
        .navigationTitle("Editar plano")
        .navigationBarTitleDisplayMode(.inline)
        .alert(renaming?.isPlan == true ? "Renomear plano" : "Renomear treino", isPresented: renameBinding) {
            TextField("Nome", text: $renameText)
            Button("Cancelar", role: .cancel) {}
            Button("Salvar") { commitRename() }
        }
        .alert("Remover exercício?", isPresented: Binding(get: { toDelete != nil }, set: { if !$0 { toDelete = nil } }), presenting: toDelete) { ex in
            Button("Cancelar", role: .cancel) {}
            Button("Remover", role: .destructive) { remove(ex) }
        } message: { ex in
            Text("\"\(ex.name)\" será removido deste treino.")
        }
        .alert("Algo deu errado", isPresented: Binding(get: { errorMessage != nil }, set: { if !$0 { errorMessage = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(errorMessage ?? "") }
        .sheet(item: $editing) { ex in
            ExerciseFormSheet(title: "Editar exercício", initial: ExerciseDraft(ex), nameEditable: ex.exerciseLibraryId == nil) { draft in
                try await store.updateExercise(id: ex.id, draft: draft, libraryChanged: false)
            }
            .presentationDetents([.large])
        }
        .sheet(isPresented: $picking) {
            NavigationStack {
                ExerciseLibraryView(onSelect: { ex in
                    picking = false
                    pickedLibrary = ex
                })
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Fechar") { picking = false } }
                    ToolbarItem(placement: .primaryAction) {
                        Button("Personalizado", systemImage: "square.and.pencil") {
                            picking = false
                            addingCustom = true
                        }
                    }
                }
            }
            .tint(Theme.voltText)
        }
        .sheet(item: $pickedLibrary) { lib in
            ExerciseFormSheet(title: "Adicionar exercício", initial: ExerciseDraft(name: lib.name, exerciseLibraryId: lib.id), nameEditable: false) { draft in
                try await store.addExercise(dayId: day?.id ?? "", draft: draft)
            }
        }
        .sheet(isPresented: $addingCustom) {
            ExerciseFormSheet(title: "Exercício personalizado", initial: ExerciseDraft(), nameEditable: true) { draft in
                try await store.addExercise(dayId: day?.id ?? "", draft: draft)
            }
        }
    }

    // MARK: Pieces

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 2) {
                Text(plan.name).font(.title2.weight(.bold)).foregroundStyle(.primary)
                let count = plan.days.count
                Text(count == 1 ? "1 treino por semana" : "\(count) treinos por semana")
                    .font(.footnote).foregroundStyle(Theme.secondary)
            }
            Spacer()
            renameButton("Renomear plano") { startRename(RenameTarget(isPlan: true, id: plan.id, name: plan.name)) }
        }
    }

    private var dayChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(plan.sortedDays) { d in
                    let selected = d.id == day?.id
                    Button { withAnimation(.snappy) { selectedDayId = d.id } } label: {
                        Text(Weekday(apiName: d.dayOfWeek)?.short ?? d.title)
                            .font(.subheadline.weight(.semibold))
                            .padding(.horizontal, 16).padding(.vertical, 9)
                            .foregroundStyle(selected ? Color.black : .primary)
                            .background(selected ? Theme.volt : Theme.card, in: Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(selected ? .isSelected : [])
                }
            }
        }
    }

    private func dayHeader(_ day: WorkoutDay) -> some View {
        Card {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(Weekday(apiName: day.dayOfWeek)?.long ?? "").font(.footnote).foregroundStyle(Theme.secondary)
                    Text(day.title).font(.cardTitle).foregroundStyle(.primary)
                    Text("\(day.exercises.count) exercícios · ~\(day.minutes) min").font(.footnote).foregroundStyle(Theme.secondary)
                }
                Spacer()
                renameButton("Renomear treino") { startRename(RenameTarget(isPlan: false, id: day.id, name: day.title)) }
            }
        }
    }

    private func exerciseList(_ day: WorkoutDay) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(day.exercises.enumerated()), id: \.element.id) { index, ex in
                SwipeRow(onDelete: { toDelete = ex }) {
                    Button { editing = ex } label: { exerciseRow(ex) }.buttonStyle(.plain)
                }
                if index < day.exercises.count - 1 {
                    Divider().overlay(Theme.separator).padding(.leading, 78)
                }
            }
            if day.exercises.isEmpty {
                Text("Nenhum exercício neste dia").foregroundStyle(Theme.secondary).padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            Divider().overlay(Theme.separator)
            Button { picking = true } label: {
                Label("Adicionar exercício", systemImage: "plus.circle.fill")
                    .font(.body.weight(.semibold)).foregroundStyle(Theme.voltText)
                    .frame(maxWidth: .infinity, alignment: .leading).padding(16)
            }
            .buttonStyle(.plain)
        }
        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        .clipShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
    }

    private func exerciseRow(_ ex: Exercise) -> some View {
        HStack(spacing: 12) {
            ExerciseAnimation(url: ex.animationUrl, size: 52, animating: false)
            VStack(alignment: .leading, spacing: 2) {
                Text(ex.name).font(.body).foregroundStyle(.primary).lineLimit(2).multilineTextAlignment(.leading)
                Text(ex.line + (ex.muscleGroup.map { " · \($0)" } ?? "")).font(.footnote).foregroundStyle(Theme.secondary).lineLimit(1)
                if let notes = ex.notes, !notes.isEmpty {
                    Text(notes).font(.footnote).foregroundStyle(Theme.secondary).lineLimit(1)
                }
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.secondary)
        }
        .padding(.horizontal, 16).padding(.vertical, 12)
        .contentShape(Rectangle())
    }

    private func renameButton(_ label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: "pencil").font(.system(size: 14, weight: .semibold)).foregroundStyle(.primary)
                .frame(width: 32, height: 32).background(Theme.cardRaised, in: Circle())
        }
        .accessibilityLabel(label)
    }

    // MARK: Actions

    private var renameBinding: Binding<Bool> {
        Binding(get: { renaming != nil }, set: { if !$0 { renaming = nil } })
    }

    private func startRename(_ target: RenameTarget) {
        renameText = target.name
        renaming = target
    }

    private func commitRename() {
        guard let target = renaming else { return }
        let name = renameText.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty, name != target.name else { return }
        Task {
            do { try await store.rename(isPlan: target.isPlan, id: target.id, name: name) }
            catch { errorMessage = error.localizedDescription }
        }
    }

    private func remove(_ ex: Exercise) {
        Task {
            do { try await store.deleteExercise(id: ex.id) }
            catch { errorMessage = error.localizedDescription }
        }
    }
}

/// Row that reveals a destructive action on swipe (a plain VStack has no native swipe actions).
private struct SwipeRow<Content: View>: View {
    var onDelete: () -> Void
    @ViewBuilder var content: Content
    @State private var offset: CGFloat = 0
    private let width: CGFloat = 88

    var body: some View {
        ZStack(alignment: .trailing) {
            Button(role: .destructive, action: { withAnimation(.snappy) { offset = 0 }; onDelete() }) {
                Image(systemName: "trash.fill").foregroundStyle(.white).frame(width: width).frame(maxHeight: .infinity)
                    .background(Theme.calories)
            }
            .opacity(offset < 0 ? 1 : 0)
            .accessibilityLabel("Remover exercício")
            content
                .background(Theme.card)
                .offset(x: offset)
                .simultaneousGesture(
                    DragGesture(minimumDistance: 20)
                        .onChanged { v in
                            guard abs(v.translation.width) > abs(v.translation.height) else { return }
                            offset = min(0, max(-width - 20, v.translation.width + (offset <= -width ? -width : 0)))
                        }
                        .onEnded { v in
                            withAnimation(.snappy) { offset = v.translation.width < -width / 2 ? -width : 0 }
                        }
                )
        }
        .accessibilityAction(named: "Remover", onDelete)
    }
}

// MARK: - Requests

extension AppStore {
    private struct NameBody: Encodable { let name: String }

    private struct ExerciseBody: Encodable {
        let name: String
        let sets: Int
        let reps: String
        let restSeconds: Int
        let notes: String
        let exerciseLibraryId: String?

        // Omit exercise_library_id when nil (custom exercise / unchanged).
        func encode(to encoder: Encoder) throws {
            var c = encoder.container(keyedBy: CodingKeys.self)
            try c.encode(name, forKey: .name)
            try c.encode(sets, forKey: .sets)
            try c.encode(reps, forKey: .reps)
            try c.encode(restSeconds, forKey: .restSeconds)
            try c.encode(notes, forKey: .notes)
            try c.encodeIfPresent(exerciseLibraryId, forKey: .exerciseLibraryId)
        }
        enum CodingKeys: String, CodingKey { case name, sets, reps, restSeconds, notes, exerciseLibraryId }
    }

    func rename(isPlan: Bool, id: String, name: String) async throws {
        let path = isPlan ? "/workouts/\(id)" : "/workouts/day/\(id)"
        let _: Empty = try await APIClient.shared.send(path, method: "PUT", json: NameBody(name: name))
        await loadPlan()
    }

    func addExercise(dayId: String, draft: ExerciseDraft) async throws {
        let body = ExerciseBody(name: draft.name, sets: draft.sets, reps: draft.reps, restSeconds: draft.restSeconds,
                                notes: draft.notes, exerciseLibraryId: draft.exerciseLibraryId)
        let _: Empty = try await APIClient.shared.send("/workouts/day/\(dayId)/exercises", method: "POST", json: body)
        await loadPlan()
    }

    /// `libraryChanged` sends the library id too (when swapping the exercise); otherwise only the plain fields.
    func updateExercise(id: String, draft: ExerciseDraft, libraryChanged: Bool) async throws {
        let body = ExerciseBody(name: draft.name, sets: draft.sets, reps: draft.reps, restSeconds: draft.restSeconds,
                                notes: draft.notes, exerciseLibraryId: libraryChanged ? draft.exerciseLibraryId : nil)
        let _: Empty = try await APIClient.shared.send("/workouts/exercises/\(id)", method: "PUT", json: body)
        await loadPlan()
    }

    func deleteExercise(id: String) async throws {
        try await APIClient.shared.sendNoContent("/workouts/exercises/\(id)", method: "DELETE")
        await loadPlan()
    }
}

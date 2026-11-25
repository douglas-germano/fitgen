import SwiftUI

/// Editable fields of one exercise of a plan.
struct ExerciseDraft: Sendable, Equatable {
    var name: String
    var sets: Int
    var reps: String
    var restSeconds: Int
    var notes: String
    var exerciseLibraryId: String?

    init(name: String = "", sets: Int = 3, reps: String = "12", restSeconds: Int = 60, notes: String = "", exerciseLibraryId: String? = nil) {
        self.name = name; self.sets = sets; self.reps = reps; self.restSeconds = restSeconds
        self.notes = notes; self.exerciseLibraryId = exerciseLibraryId
    }

    init(_ exercise: Exercise) {
        self.init(name: exercise.name, sets: max(1, exercise.sets), reps: exercise.reps, restSeconds: exercise.restSeconds,
                  notes: exercise.notes ?? "", exerciseLibraryId: exercise.exerciseLibraryId)
    }
}

/// Add / edit an exercise: steppers for sets and rest, free text for reps and notes.
struct ExerciseFormSheet: View {
    let title: String
    let nameEditable: Bool
    let onSave: (ExerciseDraft) async throws -> Void

    @State private var draft: ExerciseDraft
    @State private var saving = false
    @State private var error: String?
    @Environment(\.dismiss) private var dismiss

    init(title: String, initial: ExerciseDraft, nameEditable: Bool, onSave: @escaping (ExerciseDraft) async throws -> Void) {
        self.title = title
        self.nameEditable = nameEditable
        self.onSave = onSave
        _draft = State(initialValue: initial)
    }

    private var valid: Bool {
        !draft.name.trimmingCharacters(in: .whitespaces).isEmpty
            && !draft.reps.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    Card {
                        if nameEditable {
                            field("Nome do exercício") {
                                TextField("Ex: Supino reto", text: $draft.name).textInputAutocapitalization(.sentences)
                            }
                        } else {
                            Text(draft.name).font(.cardTitle).foregroundStyle(.primary)
                        }
                    }
                    Card {
                        stepper("Séries", value: $draft.sets, range: 1...50, step: 1, suffix: "")
                        Divider().overlay(Theme.separator)
                        stepper("Descanso", value: $draft.restSeconds, range: 0...3600, step: 15, suffix: " s")
                    }
                    Card {
                        field("Repetições") {
                            TextField("Ex: 12 ou 8-12", text: $draft.reps).autocorrectionDisabled()
                        }
                        Divider().overlay(Theme.separator)
                        field("Observações") {
                            TextField("Opcional", text: $draft.notes, axis: .vertical).lineLimit(1...4)
                        }
                    }
                    if let error {
                        Text(error).font(.footnote).foregroundStyle(Theme.calories).frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(Theme.gutter)
            }
            .scrollDismissesKeyboard(.interactively)
            .screen()
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    if saving { ProgressView() } else { Button("Salvar", action: save).disabled(!valid).bold() }
                }
            }
        }
        .tint(Theme.voltText)
        .interactiveDismissDisabled(saving)
    }

    private func save() {
        guard valid, !saving else { return }
        var result = draft
        result.name = draft.name.trimmingCharacters(in: .whitespaces)
        result.reps = draft.reps.trimmingCharacters(in: .whitespaces)
        result.notes = draft.notes.trimmingCharacters(in: .whitespacesAndNewlines)
        saving = true
        error = nil
        Task {
            do {
                try await onSave(result)
                dismiss()
            } catch {
                self.error = error.localizedDescription
            }
            saving = false
        }
    }

    private func field(_ label: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label).font(.footnote).foregroundStyle(Theme.secondary)
            content().foregroundStyle(.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func stepper(_ label: String, value: Binding<Int>, range: ClosedRange<Int>, step: Int, suffix: String) -> some View {
        Stepper(value: value, in: range, step: step) {
            HStack {
                Text(label).foregroundStyle(.primary)
                Spacer()
                Text("\(value.wrappedValue)\(suffix)").font(.metric(20)).foregroundStyle(Theme.voltText)
            }
        }
    }
}

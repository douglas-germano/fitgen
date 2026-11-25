import SwiftUI

/// Objetivos e dados físicos. Mirrors mobile/src/app/profile-edit.tsx (PUT /profile/me, or POST /onboarding before onboarding).
struct ProfileEditView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    private struct Details: Decodable {
        var age: Double?
        var gender: String?
        var heightCm: Double?
        var currentWeightKg: Double?
        var targetWeightKg: Double?
        var activityLevel: String?
        var fitnessGoal: String?
        var availableDays: [String]?
        var workoutDurationMinutes: Double?
        var equipmentAvailable: [String]?
        var injuriesLimitations: String?
        var dietaryRestrictions: String?
        var onboardingCompleted: Bool?
    }

    private struct SaveBody: Encodable {
        var age: Int
        var gender: String
        var heightCm: Double
        var currentWeightKg: Double
        var targetWeightKg: Double
        var activityLevel: String
        var fitnessGoal: String
        var availableDays: [String]
        var equipmentAvailable: [String]
        var workoutDurationMinutes: Int
        var injuriesLimitations: String
        var dietaryRestrictions: String
        var experienceLevel: String?
    }

    static let goals: [(String, String)] = [("lose_weight", "Perder peso"), ("gain_muscle", "Ganhar massa"), ("maintain", "Manter peso"), ("gain_strength", "Ganhar força"), ("improve_health", "Melhorar saúde")]
    static let activities: [(String, String)] = [("sedentary", "Sedentário"), ("light", "Leve"), ("moderate", "Moderado"), ("active", "Intenso"), ("very_active", "Muito intenso")]
    static let days: [(String, String)] = Array(zip(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]))
    static let equipment: [(String, String)] = [("bodyweight", "Peso corporal"), ("dumbbells", "Halteres"), ("barbell", "Barra"), ("machines", "Máquinas"), ("bands", "Elásticos")]

    @State private var loaded = false
    @State private var loadError: String?
    @State private var onboarding = false
    @State private var age = ""
    @State private var height = ""
    @State private var weight = ""
    @State private var target = ""
    @State private var duration = "60"
    @State private var gender = "male"
    @State private var activity = "moderate"
    @State private var goal = "improve_health"
    @State private var selectedDays: Set<String> = []
    @State private var selectedEquipment: Set<String> = []
    @State private var injuries = ""
    @State private var diet = ""
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        Group {
            if loaded {
                form
            } else if let loadError {
                ContentUnavailableView("Não foi possível carregar", systemImage: "exclamationmark.triangle", description: Text(loadError))
            } else {
                LoadingView()
            }
        }
        .screen()
        .navigationTitle("Objetivos e dados")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private var form: some View {
        List {
            Section {
                field("Idade", text: $age, unit: "anos", decimal: false)
                field("Altura", text: $height, unit: "cm")
                field("Peso atual", text: $weight, unit: "kg")
                field("Peso desejado", text: $target, unit: "kg")
                Picker("Sexo (cálculo metabólico)", selection: $gender) {
                    Text("Masculino").tag("male")
                    Text("Feminino").tag("female")
                }
            } header: { Text("Dados físicos") }
            .listRowBackground(Theme.card)

            Section("Objetivo") {
                Picker("Objetivo", selection: $goal) { ForEach(Self.goals, id: \.0) { Text($0.1).tag($0.0) } }
                Picker("Nível de atividade", selection: $activity) { ForEach(Self.activities, id: \.0) { Text($0.1).tag($0.0) } }
            }
            .listRowBackground(Theme.card)

            Section("Dias disponíveis") {
                ChipFlow(options: Self.days, selection: $selectedDays)
                    .listRowInsets(EdgeInsets(top: 10, leading: 16, bottom: 10, trailing: 16))
                field("Tempo por treino", text: $duration, unit: "min", decimal: false)
            }
            .listRowBackground(Theme.card)

            Section("Equipamentos disponíveis") {
                ChipFlow(options: Self.equipment, selection: $selectedEquipment)
                    .listRowInsets(EdgeInsets(top: 10, leading: 16, bottom: 10, trailing: 16))
            }
            .listRowBackground(Theme.card)

            Section("Lesões e limitações (opcional)") {
                TextField("Ex.: dor no joelho", text: $injuries, axis: .vertical).lineLimit(2...5)
            }
            .listRowBackground(Theme.card)

            Section("Restrições alimentares (opcional)") {
                TextField("Ex.: sem lactose", text: $diet, axis: .vertical).lineLimit(2...5)
            }
            .listRowBackground(Theme.card)

            Section {
                if let error { Text(error).foregroundStyle(Theme.calories).font(.footnote) }
                Button {
                    Task { await save() }
                } label: {
                    HStack {
                        Spacer()
                        if busy { ProgressView().tint(.black) } else { Text("Salvar").bold() }
                        Spacer()
                    }
                    .foregroundStyle(.black).padding(.vertical, 6)
                }
                .disabled(busy)
                .listRowBackground(Theme.volt)
            }
        }
        .scrollContentBackground(.hidden)
        .scrollDismissesKeyboard(.interactively)
    }

    private func field(_ title: String, text: Binding<String>, unit: String, decimal: Bool = true) -> some View {
        HStack {
            Text(title)
            Spacer()
            TextField("—", text: text)
                .keyboardType(decimal ? .decimalPad : .numberPad)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 90)
            Text(unit).foregroundStyle(Theme.secondary).frame(width: 36, alignment: .leading)
        }
    }

    private static func text(_ value: Double?) -> String {
        guard let value else { return "" }
        return value == value.rounded() ? String(Int(value)) : String(value)
    }

    private func load() async {
        do {
            let d: Details = try await APIClient.shared.get("/profile/me")
            age = Self.text(d.age); height = Self.text(d.heightCm); weight = Self.text(d.currentWeightKg); target = Self.text(d.targetWeightKg)
            duration = d.workoutDurationMinutes.map { Self.text($0) } ?? "60"
            gender = d.gender ?? "male"; activity = d.activityLevel ?? "moderate"; goal = d.fitnessGoal ?? "improve_health"
            selectedDays = Set(d.availableDays ?? []); selectedEquipment = Set(d.equipmentAvailable ?? [])
            injuries = d.injuriesLimitations ?? ""; diet = d.dietaryRestrictions ?? ""
            onboarding = d.onboardingCompleted == false
            loaded = true
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func number(_ text: String) -> Double? {
        Double(text.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: ",", with: "."))
    }

    private func save() async {
        guard !busy else { return }
        guard let age = number(age), age > 0, age == age.rounded(),
              let height = number(height), height > 0,
              let weight = number(weight), weight > 0,
              let target = number(target), target > 0,
              let duration = number(duration), duration > 0, duration == duration.rounded(),
              !selectedDays.isEmpty else {
            error = "Preencha idade, altura, pesos e duração com valores positivos e escolha os dias de treino."
            return
        }
        busy = true; error = nil
        defer { busy = false }
        let body = SaveBody(
            age: Int(age), gender: gender, heightCm: height, currentWeightKg: weight, targetWeightKg: target,
            activityLevel: activity, fitnessGoal: goal,
            availableDays: Self.days.map(\.0).filter(selectedDays.contains),
            equipmentAvailable: Self.equipment.map(\.0).filter(selectedEquipment.contains),
            workoutDurationMinutes: Int(duration), injuriesLimitations: injuries, dietaryRestrictions: diet,
            experienceLevel: onboarding ? "beginner" : nil)
        do {
            try await APIClient.shared.sendNoContent(onboarding ? "/onboarding" : "/profile/me", method: onboarding ? "POST" : "PUT", json: body)
            await store.loadProfile()
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

/// Multi-select chips that wrap onto several lines.
struct ChipFlow: View {
    let options: [(String, String)]
    @Binding var selection: Set<String>

    var body: some View {
        ProfileChipLayout(spacing: 8) {
            ForEach(options, id: \.0) { key, label in
                let on = selection.contains(key)
                Button {
                    if on { selection.remove(key) } else { selection.insert(key) }
                } label: {
                    Text(label).font(.subheadline.weight(.medium))
                        .padding(.horizontal, 14).padding(.vertical, 8)
                        .foregroundStyle(on ? Color.black : Color.primary)
                        .background(on ? Theme.volt : Theme.cardRaised, in: Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

struct ProfileChipLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrange(proposal.width ?? .infinity, subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(bounds.width, subviews)
        for (index, origin) in result.origins.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + origin.x, y: bounds.minY + origin.y), proposal: .unspecified)
        }
    }

    private func arrange(_ width: CGFloat, _ subviews: Subviews) -> (size: CGSize, origins: [CGPoint]) {
        var origins: [CGPoint] = []
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0, maxX: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > 0, x + size.width > width { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            origins.append(CGPoint(x: x, y: y))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
            maxX = max(maxX, x - spacing)
        }
        return (CGSize(width: maxX, height: y + rowHeight), origins)
    }
}

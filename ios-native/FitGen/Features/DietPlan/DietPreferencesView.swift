import SwiftUI

/// Preferences form; Otto builds a new weekly plan from it (Premium).
struct DietPreferencesView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    @State private var goal = "saude"
    @State private var calories = ""
    @State private var meals = "3"
    @State private var budget = "300_500"
    @State private var ingredients = "basicos"
    @State private var cooks = "yes"
    @State private var prep = "15_30"
    @State private var restrictions: Set<String> = []
    @State private var allergies = ""
    @State private var dislikes = ""
    @State private var busy = false
    @State private var error: String?
    @State private var premiumNeeded = false

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                Text("Escolha suas preferências e o Otto monta um cardápio para sua rotina. A geração pode levar alguns instantes.")
                    .font(.subheadline).foregroundStyle(Theme.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)

                Card(title: "Objetivo") {
                    options($goal, [("saude", "Saúde"), ("emagrecimento", "Perder peso"), ("ganho_massa", "Ganhar massa"), ("manutencao", "Manter peso")])
                }
                Card(title: "Meta diária") {
                    HStack {
                        TextField("Sua meta de calorias", text: $calories)
                            .keyboardType(.numberPad).foregroundStyle(.primary)
                        Text("kcal").foregroundStyle(Theme.secondary)
                    }
                    .padding(12).background(Theme.cardRaised, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                Card(title: "Refeições por dia") { options($meals, ["3", "4", "5", "6"].map { ($0, $0) }) }
                Card(title: "Orçamento mensal") {
                    options($budget, [("ate_300", "Até R$ 300"), ("300_500", "R$ 300–500"), ("500_800", "R$ 500–800"), ("acima_800", "Acima de R$ 800")])
                }
                Card(title: "Ingredientes") {
                    options($ingredients, [("basicos", "Básicos"), ("intermediarios", "Variados"), ("sofisticados", "Sofisticados")])
                }
                Card(title: "Você cozinha em casa?") { options($cooks, [("yes", "Sim"), ("no", "Não")]) }
                Card(title: "Tempo de preparo") {
                    options($prep, [("menos_15", "Até 15 min"), ("15_30", "15–30 min"), ("30_60", "30–60 min"), ("mais_60", "Mais de 1h")])
                }
                Card(title: "Restrições alimentares") {
                    FlowChips(items: [("vegetariano", "Vegetariano"), ("vegano", "Vegano"), ("sem_lactose", "Sem lactose"), ("sem_gluten", "Sem glúten")],
                              isSelected: { restrictions.contains($0) }) { value in
                        if restrictions.contains(value) { restrictions.remove(value) } else { restrictions.insert(value) }
                    }
                }
                Card(title: "Alergias (opcional)") { textArea($allergies) }
                Card(title: "Alimentos que não gosta (opcional)") { textArea($dislikes) }

                if let error {
                    Text(error).font(.footnote).foregroundStyle(Theme.calories).frame(maxWidth: .infinity, alignment: .leading)
                }
                Button { Task { await submit() } } label: {
                    HStack(spacing: 10) {
                        if busy { ProgressView().tint(.black) }
                        Text(busy ? "Otto está montando seu plano…" : "Gerar plano com IA").font(.headline)
                    }
                    .foregroundStyle(.black).frame(maxWidth: .infinity).padding(.vertical, 16)
                    .background(Theme.volt.opacity(busy ? 0.6 : 1), in: Capsule())
                }
                .disabled(busy)
                if busy {
                    Text("Isso pode levar até um minuto. Mantenha o app aberto.")
                        .font(.caption).foregroundStyle(Theme.secondary)
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.bottom, 24)
        }
        .scrollDismissesKeyboard(.interactively)
        .screen()
        .navigationTitle("Criar plano alimentar")
        .navigationBarTitleDisplayMode(.inline)
        .interactiveDismissDisabled(busy)
        .alert("Recurso Premium", isPresented: $premiumNeeded) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Gerar o plano alimentar com o Otto faz parte do FitGen Premium. Suas preferências foram mantidas nesta tela.")
        }
    }

    private func options(_ selection: Binding<String>, _ items: [(String, String)]) -> some View {
        FlowChips(items: items, isSelected: { $0 == selection.wrappedValue }) { selection.wrappedValue = $0 }
    }

    private func textArea(_ text: Binding<String>) -> some View {
        TextField("", text: text, axis: .vertical)
            .lineLimit(2...4).foregroundStyle(.primary)
            .padding(12).background(Theme.cardRaised, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func submit() async {
        guard !busy else { return }
        guard let kcal = Int(calories.trimmingCharacters(in: .whitespaces)), kcal > 0 else {
            error = "Informe sua meta diária de calorias em um número inteiro positivo."
            return
        }
        busy = true
        error = nil
        defer { busy = false }
        let prefs = DietPreferences(
            goal: goal, restrictions: restrictions.sorted(),
            allergies: allergies.trimmingCharacters(in: .whitespacesAndNewlines),
            dislikes: dislikes.trimmingCharacters(in: .whitespacesAndNewlines),
            budget: budget, ingredientAccess: ingredients, mealsPerDay: Int(meals) ?? 3,
            cooksAtHome: cooks == "yes", prepTime: prep, calorieGoal: kcal)
        do {
            try await store.createDietPlan(prefs)
            dismiss()
        } catch let e as APIError where e.isPremiumRequired {
            premiumNeeded = true
        } catch {
            self.error = "Não foi possível gerar o plano. Suas preferências foram mantidas para tentar novamente. \(error.localizedDescription)"
        }
    }
}

/// Wrapping row of selectable chips.
private struct FlowChips: View {
    let items: [(String, String)]
    let isSelected: (String) -> Bool
    let onTap: (String) -> Void

    var body: some View {
        FlowLayout(spacing: 8) {
            ForEach(items, id: \.0) { value, label in
                Button { onTap(value) } label: {
                    Text(label).font(.subheadline.weight(.medium))
                        .foregroundStyle(isSelected(value) ? .black : .primary)
                        .padding(.horizontal, 14).padding(.vertical, 9)
                        .background(isSelected(value) ? Theme.volt : Theme.cardRaised, in: Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(isSelected(value) ? .isSelected : [])
            }
        }
    }
}

private struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrange(width: proposal.width ?? .infinity, subviews: subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(width: bounds.width, subviews: subviews)
        for (index, origin) in result.origins.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + origin.x, y: bounds.minY + origin.y), proposal: .unspecified)
        }
    }

    private func arrange(width: CGFloat, subviews: Subviews) -> (size: CGSize, origins: [CGPoint]) {
        var origins: [CGPoint] = []
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0, maxX: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x > 0, x + size.width > width { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            origins.append(CGPoint(x: x, y: y))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
            maxX = max(maxX, x - spacing)
        }
        return (CGSize(width: maxX, height: y + rowHeight), origins)
    }
}

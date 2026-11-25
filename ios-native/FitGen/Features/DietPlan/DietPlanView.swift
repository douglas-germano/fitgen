import SwiftUI

/// Weekly menu made by Otto.
struct DietPlanView: View {
    @Environment(AppStore.self) private var store
    @State private var plan: FullDietPlan?
    @State private var loading = true
    @State private var loadError: String?
    @State private var day = PlanDay.today
    @State private var expanded: Set<MealSlot> = []
    @State private var regenerating = false
    @State private var actionError: String?
    @State private var premiumNeeded = false

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if loading && plan == nil {
                    LoadingView()
                } else if let loadError, plan == nil {
                    Card(title: "Não foi possível carregar") {
                        Text(loadError).font(.subheadline).foregroundStyle(Theme.secondary)
                        Button("Tentar novamente") { Task { await load() } }
                            .buttonStyle(.fitgenPrimaryCompact)
                    }
                } else if let plan, plan.hasMenu {
                    content(plan)
                } else {
                    emptyState
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.bottom, 24)
        }
        .refreshable { await load() }
        .screen()
        .navigationTitle("Plano alimentar")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .alert("Recurso Premium", isPresented: $premiumNeeded) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Gerar um novo cardápio com o Otto faz parte do FitGen Premium.")
        }
        .alert("Erro ao gerar cardápio", isPresented: Binding(get: { actionError != nil }, set: { if !$0 { actionError = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(actionError ?? "")
        }
    }

    private func load() async {
        loading = true
        do {
            plan = try await store.fetchFullDietPlan()
            loadError = nil
        } catch {
            loadError = error.localizedDescription
        }
        loading = false
    }

    private var emptyState: some View {
        Card {
            VStack(spacing: 12) {
                Image(systemName: "fork.knife.circle.fill").font(.system(size: 44)).foregroundStyle(Theme.voltText)
                Text("Nenhum plano ativo").font(.cardTitle)
                Text("Defina suas preferências para o Otto montar o cardápio da semana.")
                    .font(.subheadline).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
                NavigationLink { DietPreferencesView() } label: {
                    Text("Criar plano alimentar").font(.headline).foregroundStyle(.black)
                        .frame(maxWidth: .infinity).padding(.vertical, 14)
                        .background(Theme.volt, in: Capsule())
                }
            }
            .frame(maxWidth: .infinity)
        }
        .padding(.top, 24)
    }

    @ViewBuilder
    private func content(_ plan: FullDietPlan) -> some View {
        dayPicker
        goalCard(plan)

        let meals = plan.meals(on: day)
        Text("Cardápio de \(day.long)")
            .font(.headline).foregroundStyle(.primary)
            .frame(maxWidth: .infinity, alignment: .leading).padding(.top, 4)

        if meals.isEmpty {
            Card {
                Text("Nenhuma refeição planejada para este dia.").font(.subheadline).foregroundStyle(Theme.secondary)
                Button { Task { await regenerate() } } label: {
                    Label(regenerating ? "Gerando…" : "Gerar cardápio do dia", systemImage: "arrow.triangle.2.circlepath")
                }
                .disabled(regenerating)
                .tint(Theme.voltText)
            }
        } else {
            ForEach(meals, id: \.slot) { entry in
                MealCard(slot: entry.slot, meal: entry.meal, isOpen: expanded.contains(entry.slot)) {
                    withAnimation(.snappy) {
                        if expanded.contains(entry.slot) { expanded.remove(entry.slot) } else { expanded.insert(entry.slot) }
                    }
                }
            }
        }

        optionsCard(plan)
    }

    private var dayPicker: some View {
        ScrollViewReader { proxy in
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(PlanDay.allCases) { d in
                        Button {
                            day = d
                            expanded = []
                        } label: {
                            Text(d.short)
                                .font(.system(.subheadline, design: .rounded).weight(.semibold))
                                .foregroundStyle(d == day ? .black : .primary)
                                .padding(.horizontal, 16).padding(.vertical, 10)
                                .background(d == day ? Theme.volt : Theme.card, in: Capsule())
                        }
                        .id(d)
                        .accessibilityLabel(d.long.capitalized)
                        .accessibilityAddTraits(d == day ? .isSelected : [])
                    }
                }
            }
            .onAppear { proxy.scrollTo(day, anchor: .center) }
        }
    }

    private func goalCard(_ plan: FullDietPlan) -> some View {
        Card(title: "Meta diária") {
            MetricValue(value: Format.int(plan.calories), unit: "kcal", color: Theme.calories, size: 34)
            if let t = plan.macroTargets {
                HStack(spacing: 12) {
                    macro("Proteína", t.protein, Theme.protein)
                    macro("Carbos", t.carbs, Theme.water)
                    macro("Gorduras", t.fats, Theme.weight)
                }
            }
        }
    }

    private func macro(_ title: String, _ grams: Double, _ color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.caption).foregroundStyle(Theme.secondary)
            Text("\(Format.int(grams)) g").font(.metric(20)).foregroundStyle(color)
            ProgressLine(progress: 1, color: color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func optionsCard(_ plan: FullDietPlan) -> some View {
        Card(title: "Opções") {
            VStack(spacing: 0) {
                NavigationLink { ShoppingListView() } label: {
                    optionRow("cart.fill", "Lista de compras", plan.shoppingList.isEmpty ? nil : "\(plan.shoppingList.count) itens", chevron: true)
                }
                Divider().overlay(Theme.separator)
                Button { Task { await regenerate() } } label: {
                    optionRow("arrow.triangle.2.circlepath", "Gerar novo cardápio para este dia",
                              regenerating ? "Gerando…" : "O Otto troca as refeições do dia", chevron: false)
                }
                .disabled(regenerating)
                Divider().overlay(Theme.separator)
                NavigationLink { DietPreferencesView() } label: {
                    optionRow("sparkles", "Criar outro plano alimentar", nil, chevron: true)
                }
            }
        }
    }

    private func optionRow(_ icon: String, _ title: String, _ caption: String?, chevron: Bool) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon).foregroundStyle(Theme.voltText).frame(width: 26)
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.body).foregroundStyle(.primary).multilineTextAlignment(.leading)
                if let caption { Text(caption).font(.caption).foregroundStyle(Theme.secondary) }
            }
            Spacer()
            if regenerating && !chevron { ProgressView().tint(.primary) }
            else if chevron { Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Theme.secondary) }
        }
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }

    private func regenerate() async {
        guard !regenerating else { return }
        regenerating = true
        defer { regenerating = false }
        do {
            try await store.regenerateDietDay(day)
            plan = try await store.fetchFullDietPlan()
        } catch let error as APIError where error.isPremiumRequired {
            premiumNeeded = true
        } catch {
            actionError = error.localizedDescription
        }
    }
}

private struct MealCard: View {
    let slot: MealSlot
    let meal: PlannedMeal
    let isOpen: Bool
    let toggle: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button(action: toggle) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(slot.label).font(.cardTitle).foregroundStyle(.primary)
                        if !meal.nome.isEmpty {
                            Text(meal.nome).font(.subheadline).foregroundStyle(Theme.secondary).multilineTextAlignment(.leading)
                        }
                    }
                    Spacer(minLength: 8)
                    VStack(alignment: .trailing, spacing: 2) {
                        MetricValue(value: Format.int(meal.calorias), unit: "kcal", color: Theme.calories, size: 20)
                        Image(systemName: "chevron.down").font(.footnote.weight(.bold)).foregroundStyle(Theme.secondary)
                            .rotationEffect(.degrees(isOpen ? 180 : 0))
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityHint(isOpen ? "Recolher detalhes" : "Mostrar ingredientes e preparo")

            if isOpen {
                if !meal.ingredientes.isEmpty {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Ingredientes").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.voltText)
                        ForEach(Array(meal.ingredientes.enumerated()), id: \.offset) { _, ing in
                            HStack(alignment: .firstTextBaseline, spacing: 8) {
                                Circle().fill(Theme.secondary).frame(width: 4, height: 4).offset(y: -3)
                                Text(ing).font(.subheadline).foregroundStyle(.primary)
                            }
                        }
                    }
                }
                if let preparo = meal.preparo {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Modo de preparo").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.voltText)
                        Text(preparo).font(.subheadline).foregroundStyle(Theme.secondary)
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
    }
}

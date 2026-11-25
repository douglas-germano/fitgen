import SwiftUI

/// Checklist of the plan's groceries. Every toggle is saved to the plan.
struct ShoppingListView: View {
    @Environment(AppStore.self) private var store
    @State private var items: [ShoppingItem] = []
    @State private var loading = true
    @State private var loadError: String?
    @State private var saveError: String?
    @State private var saveTask: Task<Void, Never>?

    private var checked: Int { items.filter(\.checked).count }
    private var total: Double { items.reduce(0) { $0 + ($1.precoAprox ?? 0) } }

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if loading && items.isEmpty {
                    LoadingView()
                } else if let loadError, items.isEmpty {
                    Card(title: "Não foi possível carregar") {
                        Text(loadError).font(.subheadline).foregroundStyle(Theme.secondary)
                    }
                } else if items.isEmpty {
                    Card {
                        Text("Seu plano ainda não tem uma lista de compras.").font(.subheadline).foregroundStyle(Theme.secondary)
                    }
                } else {
                    summary
                    list
                    if let saveError {
                        Text(saveError).font(.footnote).foregroundStyle(Theme.calories)
                    }
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.bottom, 24)
        }
        .refreshable { await load() }
        .screen()
        .navigationTitle("Lista de compras")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private var summary: some View {
        Card(title: "\(checked) de \(items.count) itens") {
            if total > 0 {
                HStack(alignment: .firstTextBaseline) {
                    Text("Total aproximado").font(.subheadline).foregroundStyle(Theme.secondary)
                    Spacer()
                    Text("≈ \(brl(total))").font(.metric(22)).foregroundStyle(Theme.weight)
                }
            }
            ProgressLine(progress: Double(checked) / Double(max(items.count, 1)), color: Theme.voltText)
            Text("Marque o que você já comprou.").font(.caption).foregroundStyle(Theme.secondary)
        }
    }

    private var list: some View {
        VStack(spacing: 0) {
            ForEach(items) { item in
                Button { toggle(item.id) } label: {
                    HStack(spacing: 12) {
                        Image(systemName: item.checked ? "checkmark.circle.fill" : "circle")
                            .font(.title3)
                            .foregroundStyle(item.checked ? Theme.voltText : Theme.secondary)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.item).font(.body).foregroundStyle(item.checked ? Theme.secondary : .primary)
                                .strikethrough(item.checked)
                            if !item.quantidade.isEmpty {
                                Text(item.quantidade).font(.caption).foregroundStyle(Theme.secondary)
                            }
                        }
                        Spacer()
                        if let price = item.precoAprox, price > 0 {
                            Text(brl(price)).font(.subheadline).foregroundStyle(Theme.secondary)
                        }
                    }
                    .padding(.vertical, 12)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(item.item), \(item.quantidade)\(item.checked ? ", comprado" : "")")
                if item.id != items.last?.id { Divider().overlay(Theme.separator) }
            }
        }
        .padding(.horizontal, 16)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
    }

    private func brl(_ value: Double) -> String {
        value.formatted(.currency(code: "BRL").locale(Locale(identifier: "pt_BR")))
    }

    private func load() async {
        loading = true
        do {
            items = try await store.fetchFullDietPlan()?.shoppingList ?? []
            loadError = nil
        } catch {
            loadError = error.localizedDescription
        }
        loading = false
    }

    private func toggle(_ id: UUID) {
        guard let index = items.firstIndex(where: { $0.id == id }) else { return }
        items[index].checked.toggle()
        saveError = nil
        saveTask?.cancel()
        let snapshot = items
        saveTask = Task {
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }
            do { try await store.saveShoppingList(snapshot) }
            catch { saveError = "Não foi possível salvar a lista: \(error.localizedDescription)" }
        }
    }
}

import SwiftUI

/// The FitGen exercise library. Lives inside the caller's NavigationStack.
/// With `onSelect == nil` rows open `ExerciseDetailView`; otherwise it works as a picker.
struct ExerciseLibraryView: View {
    var onSelect: ((LibraryExercise) -> Void)?

    init(onSelect: ((LibraryExercise) -> Void)? = nil) { self.onSelect = onSelect }

    @Environment(AppStore.self) private var store
    @State private var items: [LibraryExercise] = []
    @State private var loading = true
    @State private var error: String?
    @State private var query = ""
    @State private var region: ExerciseRegion = .all

    private var filtered: [LibraryExercise] {
        let words = query.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: nil)
            .split(separator: " ").map(String.init)
        return items.filter { ex in
            (region == .all || ExerciseRegion.of(ex) == region)
                && (words.isEmpty || words.allSatisfy { ex.searchText.contains($0) })
        }
    }

    var body: some View {
        Group {
            if loading && items.isEmpty {
                LoadingView()
            } else if let error, items.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle").font(.largeTitle).foregroundStyle(Theme.protein)
                    Text(error).multilineTextAlignment(.center).foregroundStyle(Theme.secondary)
                    Button("Tentar novamente") { Task { await load() } }.buttonStyle(.fitgenPrimaryCompact)
                }
                .padding(32).frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                content
            }
        }
        .screen()
        .navigationTitle(onSelect == nil ? "Exercícios" : "Selecionar exercício")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Buscar por nome, músculo ou equipamento")
        .autocorrectionDisabled()
        .task { await load() }
    }

    private var content: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(ExerciseRegion.allCases) { r in
                            Button { region = r } label: {
                                Text(r.label).font(.subheadline.weight(.semibold))
                                    .padding(.horizontal, 14).padding(.vertical, 8)
                                    .foregroundStyle(region == r ? Color.black : Color.primary)
                                    .background(region == r ? Theme.volt : Theme.card, in: Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, Theme.gutter)
                }
                Text(filtered.count == 1 ? "1 exercício" : "\(filtered.count) exercícios")
                    .font(.footnote).foregroundStyle(Theme.secondary).padding(.horizontal, Theme.gutter)

                if filtered.isEmpty {
                    Card {
                        VStack(spacing: 6) {
                            Image(systemName: "magnifyingglass").font(.title2).foregroundStyle(Theme.secondary)
                            Text(items.isEmpty ? "Biblioteca vazia" : "Nada encontrado").font(.headline)
                            Text(items.isEmpty ? "Os exercícios ainda não foram carregados."
                                 : "Tente outra busca ou limpe os filtros.")
                                .font(.footnote).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .padding(.horizontal, Theme.gutter)
                } else {
                    LazyVStack(spacing: 0) {
                        ForEach(Array(filtered.enumerated()), id: \.element.id) { index, ex in
                            if index > 0 { Divider().overlay(Theme.separator).padding(.leading, 84) }
                            row(ex)
                        }
                    }
                    .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
                    .padding(.horizontal, Theme.gutter)
                }
            }
            .padding(.vertical, 8)
        }
        .scrollDismissesKeyboard(.immediately)
        .refreshable { await load(force: true) }
    }

    @ViewBuilder
    private func row(_ ex: LibraryExercise) -> some View {
        if let onSelect {
            HStack(spacing: 0) {
                Button { onSelect(ex) } label: {
                    HStack(spacing: 12) {
                        label(ex)
                        Image(systemName: "plus").font(.system(size: 15, weight: .bold)).foregroundStyle(Theme.voltText)
                    }
                    .padding(.vertical, 10).padding(.leading, 14).padding(.trailing, 6)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Adicionar \(ex.name)")
                NavigationLink {
                    ExerciseDetailView(exercise: ex)
                } label: {
                    Image(systemName: "info.circle").font(.title3).foregroundStyle(Theme.secondary)
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Detalhes de \(ex.name)")
            }
        } else {
            NavigationLink {
                ExerciseDetailView(exercise: ex)
            } label: {
                HStack(spacing: 12) {
                    label(ex)
                    Image(systemName: "chevron.right").font(.system(size: 13, weight: .bold)).foregroundStyle(Theme.secondary)
                }
                .padding(.vertical, 10).padding(.horizontal, 14)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
    }

    private func label(_ ex: LibraryExercise) -> some View {
        HStack(spacing: 12) {
            ExerciseAnimation(url: ex.animationUrl ?? ex.thumbnailUrl, size: 56, animating: false)
            VStack(alignment: .leading, spacing: 2) {
                Text(ex.name).font(.body).foregroundStyle(.primary).multilineTextAlignment(.leading).lineLimit(2)
                Text(ex.caption).font(.footnote).foregroundStyle(Theme.secondary).lineLimit(1)
            }
            Spacer(minLength: 0)
        }
    }

    private func load(force: Bool = false) async {
        if force { LibraryCache.shared.items = nil }
        loading = items.isEmpty
        do {
            items = try await store.library().sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
            error = nil
        } catch {
            if items.isEmpty { self.error = error.localizedDescription }
        }
        loading = false
    }
}

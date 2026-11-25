import SwiftUI

/// What to share with the community, plus the blocked people list.
struct CommunitySettingsView: View {
    @Environment(CommunityStore.self) private var community
    @State private var settings: CommunitySettings?
    @State private var blocks: Remote<[CommunityUser]> = .idle
    @State private var loadError: String?
    @State private var unblocking: Set<String> = []
    @State private var alert: String?

    private struct Field: Identifiable {
        let keyPath: WritableKeyPath<CommunitySettings, Bool>
        let title: String
        let caption: String
        var id: String { title }
    }

    private var fields: [Field] {
        [
            Field(keyPath: \.shareWorkouts, title: "Treinos concluídos", caption: "Publicar treinos na sua turma e incluir no ranking."),
            Field(keyPath: \.shareAchievements, title: "Conquistas", caption: "Publicar novas conquistas."),
            Field(keyPath: \.shareStreaks, title: "Sequências", caption: "Publicar marcos de dias seguidos e dias ativos no ranking."),
            Field(keyPath: \.shareChallenges, title: "Desafios concluídos", caption: "Publicar quando você completar um desafio."),
            Field(keyPath: \.shareHydration, title: "Meta de água", caption: "Compartilhar quando bater sua meta de água."),
        ]
    }

    var body: some View {
        Group {
            if let settings {
                ScrollView {
                    VStack(spacing: 20) {
                        SocialRows(title: "O que compartilhar",
                                   footer: "Peso, medidas e fotos de evolução nunca são publicados automaticamente. Desativar não exclui publicações anteriores; você pode removê-las pelo menu de cada publicação.") {
                            ForEach(fields) { field in toggleRow(field, settings: settings) }
                        }
                        SocialRows(title: "Busca") {
                            toggleRow(Field(keyPath: \.discoverable, title: "Aparecer na busca",
                                            caption: "Permitir que outras pessoas encontrem seu perfil pelo nome."), settings: settings)
                        }
                        blockedSection
                    }
                    .padding(.horizontal, Theme.gutter)
                    .padding(.top, 8)
                    .padding(.bottom, 32)
                }
                .refreshable { await load() }
            } else if let loadError {
                ScrollView { ErrorCard(message: loadError) { Task { await load() } }.padding(Theme.gutter) }
            } else {
                LoadingView(cards: [260, 88, 120])
            }
        }
        .screen()
        .navigationTitle("Privacidade")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .socialAlert("Não foi possível salvar", message: $alert)
    }

    private func toggleRow(_ field: Field, settings: CommunitySettings) -> some View {
        Toggle(isOn: Binding(get: { settings[keyPath: field.keyPath] }, set: { update(field.keyPath, $0) })) {
            VStack(alignment: .leading, spacing: 2) {
                Text(field.title).font(.body.weight(.semibold))
                Text(field.caption).font(.footnote).foregroundStyle(Theme.secondary)
            }
        }
        .tint(Theme.volt)
        .padding(.horizontal, 16).padding(.vertical, 12)
    }

    @ViewBuilder
    private var blockedSection: some View {
        switch blocks {
        case .failed:
            ErrorCard(message: "Não foi possível carregar as pessoas bloqueadas.") { Task { await loadBlocks() } }
        case .loaded(let users):
            SocialRows(title: "Pessoas bloqueadas") {
                if users.isEmpty { Text("Nenhuma pessoa bloqueada.").foregroundStyle(Theme.secondary).padding(16) }
                ForEach(users) { user in
                    HStack(spacing: 12) {
                        Avatar(name: user.name, url: user.profilePicture, size: 40)
                        Text(user.name).font(.body.weight(.semibold)).lineLimit(1)
                        Spacer(minLength: 8)
                        Button { Task { await unblock(user) } } label: {
                            if unblocking.contains(user.id) { ProgressView() } else { Text("Desbloquear") }
                        }
                        .buttonStyle(SocialPillStyle())
                        .disabled(unblocking.contains(user.id))
                    }
                    .padding(.horizontal, 16).padding(.vertical, 10)
                }
            }
        default:
            EmptyView()
        }
    }

    // MARK: Actions

    private func load() async {
        do {
            settings = try await community.settings()
            loadError = nil
        } catch {
            if Task.isCancelled || (error as? URLError)?.code == .cancelled { return }
            if settings == nil { loadError = error.localizedDescription }
        }
        await loadBlocks()
    }

    private func loadBlocks() async {
        do { blocks = .loaded(try await community.blocks()) } catch {
            if Task.isCancelled || (error as? URLError)?.code == .cancelled { return }
            if blocks.value == nil { blocks = .failed(error.localizedDescription) }
        }
    }

    private func update(_ keyPath: WritableKeyPath<CommunitySettings, Bool>, _ value: Bool) {
        guard let old = settings else { return }
        var next = old
        next[keyPath: keyPath] = value
        settings = next
        Task {
            do { settings = try await community.updateSettings(next) } catch {
                settings = old
                alert = error.localizedDescription
            }
        }
    }

    private func unblock(_ user: CommunityUser) async {
        unblocking.insert(user.id)
        defer { unblocking.remove(user.id) }
        do {
            try await community.unblock(userId: user.id)
            blocks = .loaded((blocks.value ?? []).filter { $0.id != user.id })
        } catch { alert = error.localizedDescription }
    }
}

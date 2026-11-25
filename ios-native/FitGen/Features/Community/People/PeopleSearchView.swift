import SwiftUI

/// Search people, follow them, and answer friend requests.
struct PeopleSearchView: View {
    @Environment(CommunityStore.self) private var community
    @State private var query = ""
    @State private var results: [UserSearchResult] = []
    @State private var searching = false
    @State private var searchError: String?
    @State private var friends: Remote<FriendsList> = .idle
    @State private var busy: Set<String> = []
    @State private var alert: String?

    private var isSearching: Bool { query.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2 }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                searchField
                if isSearching { resultsSection }
                friendsSections
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
        .scrollDismissesKeyboard(.interactively)
        .screen()
        .navigationTitle("Pessoas")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: query) { await search() }
        .task { await loadFriends() }
        .refreshable { await loadFriends() }
        .socialAlert("Não foi possível concluir", message: $alert)
    }

    // MARK: Search

    private var searchField: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass").foregroundStyle(Theme.secondary)
                TextField("Buscar pessoas por nome", text: $query)
                    .autocorrectionDisabled()
                    .submitLabel(.search)
                if !query.isEmpty {
                    Button { query = "" } label: { Image(systemName: "xmark.circle.fill").foregroundStyle(Theme.secondary) }
                        .accessibilityLabel("Limpar busca")
                }
            }
            .padding(14)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            Text("A busca mostra quem permite ser encontrado e as pessoas dos seus clubes. Ao seguir, a pessoa recebe uma solicitação para aceitar.")
                .font(.footnote).foregroundStyle(Theme.secondary).padding(.horizontal, 6)
        }
    }

    private func search() async {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard q.count >= 2 else { results = []; searching = false; searchError = nil; return }
        searching = true
        try? await Task.sleep(for: .milliseconds(350))
        if Task.isCancelled { return }
        do {
            let found = try await community.searchUsers(q)
            if Task.isCancelled { return }
            results = found; searchError = nil
        } catch {
            if Task.isCancelled || (error as? URLError)?.code == .cancelled { return }
            searchError = error.localizedDescription
        }
        searching = false
    }

    @ViewBuilder
    private var resultsSection: some View {
        if let searchError, !searching {
            ErrorCard(message: searchError) { Task { await search() } }
        } else {
            SocialRows(title: "Resultados") {
                if searching && results.isEmpty {
                    HStack { ProgressView(); Text("Buscando…").foregroundStyle(Theme.secondary) }.padding(16)
                } else if results.isEmpty {
                    Text("Nenhuma pessoa encontrada.").foregroundStyle(Theme.secondary).padding(16)
                }
                ForEach(results) { result in
                    SocialPersonRow(user: result.user, caption: "Nível \(result.user.level)") {
                        followButton(result)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func followButton(_ result: UserSearchResult) -> some View {
        switch result.followState {
        case .self:
            EmptyView()
        case .accepted:
            Button("Seguindo") {}.buttonStyle(SocialPillStyle()).disabled(true)
        case .pending:
            Button("Solicitado") {}.buttonStyle(SocialPillStyle()).disabled(true)
        case .none:
            Button { Task { await follow(result) } } label: {
                if busy.contains(result.id) { ProgressView().tint(.black) } else { Text("Seguir") }
            }
            .buttonStyle(SocialPillStyle(filled: true))
            .disabled(busy.contains(result.id))
            .accessibilityLabel("Seguir \(result.user.name)")
        }
    }

    private func follow(_ result: UserSearchResult) async {
        busy.insert(result.id)
        defer { busy.remove(result.id) }
        do {
            let answer = try await community.follow(userId: result.id)
            if let index = results.firstIndex(where: { $0.id == result.id }) { results[index].followState = answer.state }
            await loadFriends()
        } catch { alert = error.localizedDescription }
    }

    // MARK: Friends and requests

    private func loadFriends() async {
        do { friends = .loaded(try await community.friends()) } catch {
            if Task.isCancelled || (error as? URLError)?.code == .cancelled { return }
            if friends.value == nil { friends = .failed(error.localizedDescription) }
        }
    }

    @ViewBuilder
    private var friendsSections: some View {
        switch friends {
        case .idle, .loading:
            ProgressView().padding(.vertical, 24)
        case .failed(let message):
            ErrorCard(message: message) { Task { await loadFriends() } }
        case .loaded(let list):
            if !list.received.isEmpty {
                SocialRows(title: "Solicitações recebidas") {
                    ForEach(list.received) { card in
                        SocialPersonRow(user: card.user, caption: "Quer seguir você") {
                            HStack(spacing: 6) {
                                Button { Task { await respond(card, accept: true) } } label: { Text("Aceitar") }
                                    .buttonStyle(SocialPillStyle(filled: true))
                                Button { Task { await respond(card, accept: false) } } label: { Text("Recusar") }
                                    .buttonStyle(SocialPillStyle())
                            }
                            .disabled(busy.contains(card.id))
                        }
                    }
                }
            }
            SocialRows(title: "Seguindo") {
                if list.friends.isEmpty {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Ninguém ainda").font(.body.weight(.semibold))
                        Text("As pessoas aparecem aqui depois que aceitarem sua solicitação.").font(.footnote).foregroundStyle(Theme.secondary)
                    }
                    .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                }
                ForEach(list.friends) { card in
                    SocialPersonRow(user: card.user, caption: "Nível \(card.user.level)") { EmptyView() }
                }
            }
            if !list.sent.isEmpty {
                SocialRows(title: "Solicitações enviadas") {
                    ForEach(list.sent) { card in
                        SocialPersonRow(user: card.user, caption: "Aguardando resposta") {
                            Button { Task { await cancel(card) } } label: { Text("Cancelar") }
                                .buttonStyle(SocialPillStyle())
                                .disabled(busy.contains(card.id))
                        }
                    }
                }
            }
        }
    }

    private func respond(_ card: FriendCard, accept: Bool) async {
        busy.insert(card.id)
        defer { busy.remove(card.id) }
        do {
            try await community.respondFriendRequest(id: card.id, accept: accept)
            await loadFriends()
        } catch { alert = error.localizedDescription }
    }

    private func cancel(_ card: FriendCard) async {
        busy.insert(card.id)
        defer { busy.remove(card.id) }
        do {
            try await community.unfollow(userId: card.user.id)
            await loadFriends()
        } catch { alert = error.localizedDescription }
    }
}

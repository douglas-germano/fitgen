import SwiftUI

/// Desafios segment of the Comunidade tab. Owns its ScrollView (and pull to refresh).
struct ChallengesSection: View {
    @Environment(CommunityStore.self) private var community
    @Environment(\.communityHeader) private var header
    @State private var mine: [Challenge]?
    @State private var available: [Challenge]?
    @State private var error: String?
    @State private var actionError: String?

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 14) {
                if let header { header }
                NavigationLink(value: CommunityRoute.createChallenge(groupId: nil)) {
                    Label("Novo desafio", systemImage: "plus")
                }
                .buttonStyle(.fitgenPrimary)

                if let error, mine == nil, available == nil {
                    VStack(spacing: 12) {
                        Text(error).font(.subheadline).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
                        Button("Tentar novamente") { Task { await load() } }.buttonStyle(.fitgenPrimaryCompact)
                    }
                    .frame(maxWidth: .infinity).padding(.vertical, 40)
                } else if mine == nil && available == nil {
                    LoadingView(cards: [260, 260])
                } else {
                    group("Seus desafios", items: mine ?? [], empty: "Participe de um desafio abaixo para começar.")
                    group("Para participar", items: available ?? [],
                          empty: "Novos desafios aparecerão por aqui. Você também pode criar um para seu clube.")
                }
            }
            .padding(.horizontal, Theme.gutter).padding(.top, 8).padding(.bottom, 24)
        }
        .refreshable { await load() }
        .task { await load() }
        .task(id: community.groupsVersion) { if mine != nil { await load() } }
        .alert("Não foi possível participar", isPresented: Binding(get: { actionError != nil }, set: { if !$0 { actionError = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(actionError ?? "") }
    }

    @ViewBuilder
    private func group(_ title: String, items: [Challenge], empty: String) -> some View {
        Text(title).font(.cardTitle).padding(.top, 6)
        if items.isEmpty {
            Text(empty).font(.subheadline).foregroundStyle(Theme.secondary)
                .frame(maxWidth: .infinity, alignment: .leading).padding(16)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        } else {
            ForEach(items) { c in
                ChallengeCard(challenge: c) { await join(c) }
            }
        }
    }

    private func load() async {
        do {
            async let m = community.challenges(.mine)
            async let a = community.challenges(.available)
            let (mineList, availList) = try await (m, a)
            mine = mineList; available = availList; error = nil
        } catch {
            if !Task.isCancelled, mine == nil { self.error = error.localizedDescription }
        }
    }

    private func join(_ c: Challenge) async {
        do {
            _ = try await community.joinChallenge(id: c.id)
            await load()
        } catch { actionError = error.localizedDescription }
    }
}

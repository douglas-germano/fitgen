import SwiftUI

/// Every challenge of a club, as full cards, plus "Novo desafio" for members.
struct GroupChallengesView: View {
    let groupId: String

    @Environment(CommunityStore.self) private var community
    @State private var detail: GroupDetail?
    @State private var loadError: String?

    var body: some View {
        Group {
            if let detail {
                content(detail)
            } else if let loadError {
                ScrollView { ErrorCard(message: loadError) { Task { await load() } }.padding(Theme.gutter) }
            } else {
                LoadingView()
            }
        }
        .screen()
        .navigationTitle(detail.map { "Desafios · \($0.group.name)" } ?? "Desafios do clube")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if detail?.group.isMember == true {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(value: CommunityRoute.createChallenge(groupId: groupId)) { Image(systemName: "plus") }
                        .accessibilityLabel("Novo desafio")
                }
            }
        }
        .task(id: community.groupsVersion) { await load() }
    }

    private func content(_ detail: GroupDetail) -> some View {
        ScrollView {
            LazyVStack(spacing: 14) {
                if detail.challenges.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "trophy").font(.system(size: 36)).foregroundStyle(Theme.voltText)
                        Text(detail.group.isMember ? "Ainda não há desafios neste clube" : "Entre no clube para ver os desafios")
                            .font(.cardTitle).multilineTextAlignment(.center)
                        if detail.group.isMember {
                            Text("Crie um desafio de treinos, minutos ou distância e chame a turma.")
                                .font(.subheadline).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
                        }
                    }
                    .padding(24)
                    .frame(maxWidth: .infinity)
                    .highlightCard()
                }
                ForEach(detail.challenges) { challenge in
                    ChallengeCard(challenge: challenge)
                }
                if detail.group.isMember {
                    NavigationLink(value: CommunityRoute.createChallenge(groupId: groupId)) {
                        Label("Novo desafio", systemImage: "trophy.fill")
                    }
                    .buttonStyle(.fitgenPrimary)
                    .padding(.top, 4)
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.vertical, 12)
        }
        .refreshable { await load() }
    }

    private func load() async {
        do {
            detail = try await community.group(id: groupId)
            loadError = nil
        } catch {
            if Task.isCancelled || (error as? URLError)?.code == .cancelled { return }
            if detail == nil { loadError = error.localizedDescription }
        }
    }
}

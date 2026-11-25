import SwiftUI

/// Every screen reachable inside the Comunidade navigation stack. Push with
/// `NavigationLink(value: CommunityRoute.group(id))`; the destinations are registered by `.communityDestinations()`.
enum CommunityRoute: Hashable {
    case user(String), group(String), groupMembers(String), groupChallenges(String), challenge(String), activity(String)
    case search, createGroup, joinGroup(code: String?), createChallenge(groupId: String?), settings
}

extension View {
    /// Registers the destination for every `CommunityRoute`. Applied once at the stack root.
    func communityDestinations() -> some View {
        navigationDestination(for: CommunityRoute.self) { route in
            switch route {
            case .user(let id): UserProfileView(userId: id)
            case .group(let id): GroupDetailView(groupId: id)
            case .groupMembers(let id): GroupMembersView(groupId: id)
            case .groupChallenges(let id): GroupChallengesView(groupId: id)
            case .challenge(let id): ChallengeDetailView(challengeId: id)
            case .activity(let id): ActivityDetailView(activityId: id)
            case .search: PeopleSearchView()
            case .createGroup: CreateGroupView()
            case .joinGroup(let code): JoinGroupView(code: code)
            case .createChallenge(let groupId): CreateChallengeView(groupId: groupId)
            case .settings: CommunitySettingsView()
            }
        }
    }
}

/// Tab root: Feed · Clubes · Desafios.
struct CommunityView: View {
    private enum Segment: String, CaseIterable, Identifiable {
        case feed = "Feed", clubs = "Clubes", challenges = "Desafios"
        var id: String { rawValue }
    }

    private enum FeedKind: String, CaseIterable, Identifiable {
        case forYou = "Para você", following = "Seguindo"
        var id: String { rawValue }
        var scope: FeedScope { self == .forYou ? .public : .home }
    }

    @Environment(DeepLinks.self) private var links
    @State private var path: [CommunityRoute] = []
    @State private var segment: Segment = .feed
    @State private var feedKind: FeedKind = .forYou
    @State private var composerOpen = false

    var body: some View {
        NavigationStack(path: $path) {
            // The section list is the screen's first scroll view, so the large title collapses
            // and the segment picker scrolls away with the content.
            Group {
                switch segment {
                case .feed:
                    FeedList(scope: feedKind.scope,
                             emptyTitle: feedKind == .forYou ? "Nada por aqui ainda" : "Seu feed está vazio",
                             emptyMessage: feedKind == .forYou
                                ? "Quando alguém publicar para todos, aparece aqui. Que tal começar você?"
                                : "Siga pessoas e entre em clubes para ver os treinos e publicações da sua turma.") {
                        VStack(spacing: 10) {
                            segmentPicker
                            feedToggle
                        }
                    }
                case .clubs:
                    ClubsSection()
                case .challenges:
                    ChallengesSection()
                }
            }
            .environment(\.communityHeader, AnyView(segmentPicker))
            .screen()
            .navigationTitle("Comunidade")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { addMenu }
            }
            .communityDestinations()
            .ottoButton()
            .sheet(isPresented: $composerOpen) {
                PostComposerView(initialAudience: feedKind == .following ? .network : .public)
            }
        }
        .onChange(of: links.pending, initial: true) { _, route in
            guard let route else { return }
            links.pending = nil
            path = [route]
        }
    }

    private var segmentPicker: some View {
        Picker("Seção", selection: $segment) {
            ForEach(Segment.allCases) { Text($0.rawValue).tag($0) }
        }
        .pickerStyle(.segmented)
    }

    private var feedToggle: some View {
        HStack(spacing: 8) {
            ForEach(FeedKind.allCases) { kind in
                let selected = feedKind == kind
                Button { withAnimation(.snappy) { feedKind = kind } } label: {
                    Text(kind.rawValue)
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 14).frame(height: 34)
                        .foregroundStyle(selected ? Color.black : Color.primary)
                        .background {
                            if selected { Capsule().fill(Theme.voltGradient) } else { Capsule().fill(Theme.card) }
                        }
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(selected ? .isSelected : [])
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }

    private var addMenu: some View {
        Menu {
            Button { composerOpen = true } label: { Label("Nova publicação", systemImage: "square.and.pencil") }
            Button { path.append(.search) } label: { Label("Buscar pessoas", systemImage: "magnifyingglass") }
            Button { path.append(.createGroup) } label: { Label("Criar clube", systemImage: "person.3.fill") }
            Button { path.append(.joinGroup(code: nil)) } label: { Label("Entrar com código", systemImage: "ticket") }
            Button { path.append(.createChallenge(groupId: nil)) } label: { Label("Novo desafio", systemImage: "trophy") }
            Divider()
            Button { path.append(.settings) } label: { Label("Privacidade da comunidade", systemImage: "lock.shield") }
        } label: {
            Image(systemName: "plus")
        }
        .accessibilityLabel("Adicionar à comunidade")
    }
}


/// Header (the segment picker) that the Clubes and Desafios lists put at the top of their scroll content.
extension EnvironmentValues {
    @Entry var communityHeader: AnyView? = nil
}

import SwiftUI

/// Clubes segment of the Comunidade tab: my clubs, join / create, the PRO club and public discovery.
/// Owns its ScrollView (and pull to refresh).
struct ClubsSection: View {
    @Environment(CommunityStore.self) private var community
    @Environment(\.communityHeader) private var header
    @Environment(AppStore.self) private var store

    @State private var publicClubs: Remote<[CommunityGroup]> = .idle
    @State private var showAllPopular = false
    @State private var joiningPro = false
    @State private var openedGroup: String?
    @State private var alert: String?

    private var isPremium: Bool { store.profile.value?.premium ?? false }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if let header { header }
                switch community.myGroupsCache {
                case .idle, .loading:
                    LoadingView(cards: [88, 88, 120]).frame(height: 360).padding(.horizontal, -Theme.gutter)
                case .failed(let message):
                    ErrorCard(message: message) { Task { await load() } }
                case .loaded(let mine):
                    loaded(mine)
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.top, 4)
            .padding(.bottom, 24)
        }
        .task(id: community.groupsVersion) { await load() }
        .refreshable { await load() }
        .navigationDestination(item: $openedGroup) { GroupDetailView(groupId: $0) }
        .socialAlert("Não foi possível entrar", message: $alert)
    }

    // MARK: Loading

    private func load() async {
        async let mine: Void = community.loadMyGroups()
        do { publicClubs = .loaded(try await community.publicGroups()) } catch {
            if Task.isCancelled || (error as? URLError)?.code == .cancelled { return }
            if publicClubs.value == nil { publicClubs = .failed(error.localizedDescription) }
        }
        await mine
    }

    // MARK: Content

    @ViewBuilder
    private func loaded(_ mine: [CommunityGroup]) -> some View {
        if mine.isEmpty {
            emptyState
        } else {
            myClubs(mine)
            actions
        }
        proClub(mine)
        discovery(mine)
    }

    private func myClubs(_ mine: [CommunityGroup]) -> some View {
        SocialRows(title: "Meus clubes") {
            ForEach(mine) { group in
                SocialLinkRow(route: .group(group.id)) {
                    ClubRowLabel(group: group, caption: myCaption(group))
                }
            }
        }
    }

    private func myCaption(_ group: CommunityGroup) -> String {
        let visibility = group.premiumOnly ? "PRO" : group.isPublic ? "Público" : "Privado"
        let week = "\(group.weekWorkouts) \(group.weekWorkouts == 1 ? "treino" : "treinos") na semana"
        return "\(visibility) · \(group.peopleLabel) · \(week)"
    }

    private var actions: some View {
        SocialRows {
            SocialLinkRow(route: .joinGroup(code: nil)) {
                Label("Entrar com código", systemImage: "ticket.fill").foregroundStyle(.primary)
            }
            SocialLinkRow(route: .createGroup) {
                Label("Criar clube", systemImage: "plus.circle.fill").foregroundStyle(.primary)
            }
        }
    }

    // MARK: Empty state

    private var emptyState: some View {
        VStack(spacing: 14) {
            PodiumIllustration()
            Text("Seu treino tem turma.").font(.cardTitle)
            Text("Entre em um clube ou crie o seu para treinar com amigos, subir no ranking semanal e topar desafios juntos.")
                .font(.subheadline).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
            VStack(spacing: 10) {
                NavigationLink(value: CommunityRoute.createGroup) { Text("Criar clube") }
                    .buttonStyle(.fitgenPrimary)
                NavigationLink(value: CommunityRoute.joinGroup(code: nil)) {
                    Text("Entrar com código").font(.headline).foregroundStyle(.primary)
                        .frame(maxWidth: .infinity, minHeight: 50)
                        .background(Theme.cardRaised, in: Capsule())
                }
                .buttonStyle(.plain)
            }
            .padding(.top, 6)
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .highlightCard()
    }

    // MARK: PRO club

    @ViewBuilder
    private func proClub(_ mine: [CommunityGroup]) -> some View {
        if let pro = publicClubs.value?.first(where: \.premiumOnly), !pro.isMember, !mine.contains(where: { $0.id == pro.id }) {
            SocialRows(title: "FitGen PRO") {
                HStack(spacing: 12) {
                    ClubAvatar(groupId: pro.id, hasPhoto: pro.hasPhoto, size: 44)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(pro.name).font(.body.weight(.semibold))
                        Text(isPremium ? "Exclusivo para assinantes · você já pode entrar" : "Exclusivo para quem assina o FitGen PRO")
                            .font(.footnote).foregroundStyle(Theme.secondary)
                    }
                    Spacer(minLength: 8)
                    if isPremium {
                        Button { Task { await joinPro(pro) } } label: {
                            if joiningPro { ProgressView().tint(.black) } else { Text("Entrar") }
                        }
                        .buttonStyle(SocialPillStyle(filled: true))
                        .disabled(joiningPro)
                    } else {
                        NavigationLink { SubscriptionView() } label: { Text("Assinar") }
                            .buttonStyle(SocialPillStyle(filled: true))
                    }
                }
                .padding(.horizontal, 16).padding(.vertical, 12)
            }
        }
    }

    private func joinPro(_ pro: CommunityGroup) async {
        joiningPro = true
        defer { joiningPro = false }
        do {
            let joined = try await community.joinGroup(groupId: pro.id)
            openedGroup = joined.id
        } catch {
            alert = error.localizedDescription
        }
    }

    // MARK: Discovery

    @ViewBuilder
    private func discovery(_ mine: [CommunityGroup]) -> some View {
        switch publicClubs {
        case .loaded(let all):
            let found = Self.discover(all)
            if found.popular.isEmpty {
                SocialRows(title: "Clubes públicos") {
                    SocialLinkRow(route: .createGroup) {
                        Label("Ainda não há clubes públicos. Crie o primeiro.", systemImage: "person.3.fill").foregroundStyle(.primary)
                    }
                }
            } else {
                SocialRows(title: "Para você") {
                    if found.forYou.isEmpty {
                        SocialLinkRow(route: .createGroup) {
                            Label("Você já está nos clubes sugeridos. Crie um clube e chame quem você segue.", systemImage: "sparkles")
                                .foregroundStyle(.primary)
                        }
                    }
                    ForEach(found.forYou) { group in
                        SocialLinkRow(route: .group(group.id)) { ClubRowLabel(group: group, caption: suggestionCaption(group)) }
                    }
                }
                let popular = showAllPopular ? found.popular : Array(found.popular.prefix(5))
                VStack(spacing: 8) {
                    SocialRows(title: "Mais populares") {
                        ForEach(popular) { group in
                            SocialLinkRow(route: .group(group.id)) {
                                ClubRowLabel(group: group, caption: "\(group.isMember ? "Membro · " : "")\(group.peopleLabel)")
                            }
                        }
                    }
                    if found.popular.count > 5 {
                        Button(showAllPopular ? "Ver menos" : "Ver todos") { withAnimation(.snappy) { showAllPopular.toggle() } }
                            .font(.subheadline.weight(.semibold))
                    }
                }
            }
        case .failed:
            ErrorCard(message: "Não foi possível carregar os clubes públicos.") { Task { await load() } }
        default:
            EmptyView()
        }
    }

    private func suggestionCaption(_ group: CommunityGroup) -> String {
        var parts: [String] = []
        if group.official { parts.append("Oficial") }
        if group.followedMembers > 0 {
            parts.append("\(group.followedMembers) \(group.followedMembers == 1 ? "pessoa que você segue" : "pessoas que você segue")")
        } else {
            parts.append(group.peopleLabel)
        }
        if let description = group.description, !description.isEmpty { parts.append(description) }
        return parts.joined(separator: " · ")
    }

    /// Port of `discoverClubs` (mobile/src/lib/community.ts): "Para você" and "Mais populares", PRO club excluded.
    static func discover(_ all: [CommunityGroup], limit: Int = 5) -> (forYou: [CommunityGroup], popular: [CommunityGroup]) {
        let clubs = all.filter { !$0.premiumOnly }
        let popular = clubs.sorted { $0.memberCount > $1.memberCount }
        let top = Set(popular.prefix(limit).map(\.id))
        let forYou = clubs
            .filter { !$0.isMember && ($0.followedMembers > 0 || !top.contains($0.id)) }
            .sorted { ($0.followedMembers, $0.memberCount) > ($1.followedMembers, $1.memberCount) }
            .prefix(limit)
        return (Array(forYou), popular)
    }
}

/// Avatar + name + caption of a club.
struct ClubRowLabel: View {
    let group: CommunityGroup
    var caption: String

    var body: some View {
        HStack(spacing: 12) {
            ClubAvatar(groupId: group.id, hasPhoto: group.hasPhoto, size: 44)
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(group.name).font(.body.weight(.semibold)).foregroundStyle(.primary).lineLimit(1)
                    Image(systemName: group.isPublic ? "globe" : "lock.fill").font(.caption2).foregroundStyle(Theme.secondary)
                        .accessibilityLabel(group.isPublic ? "Público" : "Privado")
                }
                Text(caption).font(.footnote).foregroundStyle(Theme.secondary).lineLimit(2).multilineTextAlignment(.leading)
            }
        }
    }
}

/// Decorative podium (no fabricated members or standings).
struct PodiumIllustration: View {
    var body: some View {
        HStack(alignment: .bottom, spacing: 10) {
            column(place: 2, height: 46, size: 40)
            column(place: 1, height: 72, size: 52)
            column(place: 3, height: 34, size: 40)
        }
        .padding(.horizontal, 24).padding(.top, 16)
        .frame(maxWidth: 260)
        .accessibilityHidden(true)
    }

    private func column(place: Int, height: CGFloat, size: CGFloat) -> some View {
        let first = place == 1
        return VStack(spacing: 8) {
            if first { Image(systemName: "crown.fill").foregroundStyle(Theme.voltText) }
            Image(systemName: "person.fill")
                .font(.system(size: size * 0.45))
                .foregroundStyle(first ? Color.black : Theme.secondary)
                .frame(width: size, height: size)
                .background { if first { Circle().fill(Theme.voltGradient) } else { Circle().fill(Theme.cardRaised) } }
            Text("\(place)").font(.metric(15)).foregroundStyle(first ? Theme.voltText : Theme.secondary)
                .frame(maxWidth: .infinity).padding(.top, 8)
                .frame(height: height, alignment: .top)
                .background(UnevenRoundedRectangle(topLeadingRadius: 12, topTrailingRadius: 12)
                    .fill(first ? Theme.volt.opacity(0.22) : Theme.cardRaised))
        }
        .frame(maxWidth: .infinity)
    }
}

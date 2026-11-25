import SwiftUI

/// Another person's profile: identity, counts, follow actions, month stats, shared clubs and posts.
struct UserProfileView: View {
    let userId: String

    @Environment(CommunityStore.self) private var community
    @State private var profile: CommunityProfile?
    @State private var loadError: String?
    @State private var working = false
    @State private var confirmBlock = false
    @State private var confirmReport = false
    @State private var alert: String?
    @State private var notice: String?

    private struct ReloadKey: Hashable { let groups: Int; let feed: Int }

    var body: some View {
        Group {
            if let profile {
                content(profile)
            } else if let loadError {
                ScrollView { ErrorCard(message: loadError) { Task { await load() } }.padding(Theme.gutter) }
            } else {
                LoadingView()
            }
        }
        .screen()
        .navigationTitle(profile?.user.firstName ?? "Perfil")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let profile, !profile.isSelf {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button(role: profile.blockedByMe ? nil : .destructive) { confirmBlock = true } label: {
                            Label(profile.blockedByMe ? "Desbloquear" : "Bloquear pessoa", systemImage: "nosign")
                        }
                        Button { confirmReport = true } label: { Label("Denunciar perfil", systemImage: "flag") }
                    } label: { Image(systemName: "ellipsis.circle") }
                        .accessibilityLabel("Mais opções")
                }
            }
        }
        .task(id: ReloadKey(groups: community.groupsVersion, feed: community.feedVersion)) { await load() }
        .confirmationDialog(profile?.blockedByMe == true ? "Desbloquear pessoa?" : "Bloquear pessoa?",
                            isPresented: $confirmBlock, titleVisibility: .visible) {
            Button("Confirmar", role: profile?.blockedByMe == true ? nil : .destructive) { Task { await toggleBlock() } }
            Button("Cancelar", role: .cancel) {}
        } message: { Text("O bloqueio oculta publicações e remove as conexões.") }
        .confirmationDialog("Denunciar este perfil?", isPresented: $confirmReport, titleVisibility: .visible) {
            Button("Denunciar", role: .destructive) { Task { await report() } }
            Button("Cancelar", role: .cancel) {}
        } message: { Text("Avise a equipe sobre conteúdo impróprio.") }
        .socialAlert("Não foi possível concluir", message: $alert)
        .socialAlert("Denúncia enviada", message: $notice)
    }

    // MARK: Loading and actions

    private func load() async {
        do {
            profile = try await community.profile(userId: userId)
            loadError = nil
        } catch {
            if Task.isCancelled || (error as? URLError)?.code == .cancelled { return }
            if profile == nil { loadError = error.localizedDescription }
        }
    }

    private func toggleFollow(_ p: CommunityProfile) async {
        working = true
        defer { working = false }
        do {
            if p.followState == .none { _ = try await community.follow(userId: userId) } else { try await community.unfollow(userId: userId) }
            await load()
        } catch { alert = error.localizedDescription }
    }

    private func respond(_ requestId: String, accept: Bool) async {
        working = true
        defer { working = false }
        do {
            try await community.respondFriendRequest(id: requestId, accept: accept)
            await load()
        } catch { alert = error.localizedDescription }
    }

    private func toggleBlock() async {
        guard let profile else { return }
        do {
            if profile.blockedByMe { try await community.unblock(userId: userId) } else { try await community.block(userId: userId) }
            await load()
        } catch { alert = error.localizedDescription }
    }

    private func report() async {
        do { try await community.report(.user, id: userId); notice = "Obrigado. A equipe vai analisar." } catch { alert = error.localizedDescription }
    }

    // MARK: Content

    @ViewBuilder
    private func content(_ p: CommunityProfile) -> some View {
        if p.blockedByMe {
            ScrollView {
                VStack(spacing: 16) {
                    header(p)
                    VStack(spacing: 12) {
                        Text("Você bloqueou \(p.user.firstName). As publicações ficam ocultas.")
                            .font(.subheadline).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
                        Button("Desbloquear") { Task { await toggleBlock() } }.buttonStyle(SocialPillStyle(filled: true))
                    }
                    .padding(20).frame(maxWidth: .infinity)
                    .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
                }
                .padding(Theme.gutter)
            }
            .refreshable { await load() }
        } else {
            FeedList(scope: .user(userId), emptyTitle: "Nenhuma publicação",
                     emptyMessage: "\(p.user.firstName) ainda não compartilhou nada com você.") {
                VStack(spacing: 16) {
                    header(p)
                    stats(p)
                    if !p.sharedGroupList.isEmpty { sharedClubs(p) }
                    HStack { Text("Publicações").font(.cardTitle); Spacer() }.padding(.top, 4)
                }
            }
            .refreshable { await load() }
        }
    }

    private func header(_ p: CommunityProfile) -> some View {
        VStack(spacing: 16) {
            VStack(spacing: 12) {
                Avatar(name: p.user.name, url: p.user.profilePicture, size: 104)
                    .padding(4)
                    .overlay(Circle().strokeBorder(Theme.volt, lineWidth: 2))
                Text(p.user.name).font(.title2.weight(.bold)).multilineTextAlignment(.center)
                HStack(spacing: 8) {
                    pill("Nível \(p.user.level)", highlighted: true)
                    if p.followsMe && !p.isSelf { pill("Segue você", highlighted: false) }
                }
            }
            .frame(maxWidth: .infinity)

            HStack(spacing: 0) {
                count(p.followerCount, "Seguidores")
                Divider().frame(height: 28)
                count(p.friendCount, "Seguindo")
                Divider().frame(height: 28)
                count(p.sharedGroups, p.isSelf ? "Clubes" : "Clubes em comum")
            }
            .padding(.vertical, 14)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))

            if let incoming = p.incomingRequestId { incomingCard(p, requestId: incoming) }
            if !p.isSelf && !p.blockedByMe { followButton(p) }
        }
    }

    private func pill(_ text: String, highlighted: Bool) -> some View {
        Text(text).font(.footnote.weight(.semibold))
            .foregroundStyle(highlighted ? Theme.voltText : Color.primary)
            .padding(.horizontal, 10).padding(.vertical, 4)
            .background(highlighted ? Theme.volt.opacity(0.16) : Theme.cardRaised, in: Capsule())
    }

    private func count(_ value: Int, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text("\(value)").font(.metric(22))
            Text(label).font(.caption).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }

    private func incomingCard(_ p: CommunityProfile, requestId: String) -> some View {
        VStack(spacing: 12) {
            Text("\(p.user.firstName) quer seguir você").font(.body.weight(.semibold))
            HStack(spacing: 10) {
                Button { Task { await respond(requestId, accept: true) } } label: { Text("Aceitar").frame(maxWidth: .infinity) }
                    .buttonStyle(SocialPillStyle(filled: true))
                Button { Task { await respond(requestId, accept: false) } } label: { Text("Recusar").frame(maxWidth: .infinity) }
                    .buttonStyle(SocialPillStyle())
            }
            .disabled(working)
        }
        .padding(16).frame(maxWidth: .infinity).highlightCard()
    }

    @ViewBuilder
    private func followButton(_ p: CommunityProfile) -> some View {
        let title: String = switch p.followState {
        case .accepted: "Seguindo"
        case .pending: "Solicitado"
        default: p.followsMe ? "Seguir de volta" : "Seguir"
        }
        VStack(spacing: 6) {
            Button { Task { await toggleFollow(p) } } label: {
                if working { ProgressView() } else {
                    Label(title, systemImage: p.followState == .accepted ? "person.fill.checkmark" : p.followState == .pending ? "clock" : "person.badge.plus")
                }
            }
            .buttonStyle(FollowButtonStyle(filled: p.followState == .none))
            .disabled(working)
            .accessibilityLabel(p.followState == .accepted ? "Deixar de seguir \(p.user.name)"
                                : p.followState == .pending ? "Cancelar solicitação para \(p.user.name)" : "Seguir \(p.user.name)")
            if p.followState == .pending {
                Text("Aguardando \(p.user.firstName) aceitar. Toque para cancelar.").font(.footnote).foregroundStyle(Theme.secondary)
            }
            if p.friendship == .friends {
                Label("Vocês são amigos", systemImage: "heart.fill").font(.footnote).foregroundStyle(Theme.secondary)
            }
        }
    }

    private func stats(_ p: CommunityProfile) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Este mês").font(.footnote.weight(.semibold)).foregroundStyle(Theme.secondary)
                .textCase(.uppercase).padding(.leading, 6)
            HStack(spacing: 10) {
                tile("dumbbell.fill", Theme.protein, "\(p.monthWorkouts)", p.monthWorkouts == 1 ? "treino" : "treinos")
                tile("timer", Theme.distance, "\(p.monthMinutes)", "min")
                tile("flame.fill", Theme.streak, "\(p.workoutStreak)", p.workoutStreak == 1 ? "dia seguido" : "dias seguidos")
            }
        }
    }

    private func tile(_ icon: String, _ color: Color, _ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: icon).foregroundStyle(color)
            Text(value).font(.metric(26)).foregroundStyle(color)
            Text(label).font(.caption).foregroundStyle(Theme.secondary).lineLimit(1).minimumScaleFactor(0.8)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .accessibilityElement(children: .combine)
    }

    private func sharedClubs(_ p: CommunityProfile) -> some View {
        SocialRows(title: p.isSelf ? "Seus clubes" : "Clubes em comum") {
            ForEach(p.sharedGroupList) { group in
                SocialLinkRow(route: .group(group.id)) {
                    Label(group.name, systemImage: "person.3.fill").foregroundStyle(.primary)
                }
            }
        }
    }
}

/// Full-width follow button: volt when not following, neutral otherwise.
private struct FollowButtonStyle: ButtonStyle {
    var filled: Bool
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(filled ? Color.black : Color.primary)
            .frame(maxWidth: .infinity, minHeight: 48)
            .background { if filled { Capsule().fill(Theme.voltGradient) } else { Capsule().fill(Theme.cardRaised) } }
            .opacity(isEnabled ? (configuration.isPressed ? 0.85 : 1) : 0.6)
            .contentShape(Capsule())
    }
}

import SwiftUI
import UIKit

/// A club: header, invite, weekly ranking, challenges and the club feed.
struct GroupDetailView: View {
    let groupId: String

    @Environment(CommunityStore.self) private var community
    @Environment(\.dismiss) private var dismiss
    @State private var detail: GroupDetail?
    @State private var loadError: String?
    @State private var joining = false
    @State private var composer = false
    @State private var confirmLeave = false
    @State private var summary: String?
    @State private var summaryLoading = false
    @State private var copied = false
    @State private var nudging: Set<String> = []
    @State private var alert: String?
    @State private var notice: String?

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
        .navigationTitle(detail?.group.name ?? "Clube")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { toolbar }
        .task(id: community.groupsVersion) { await load() }
        .sheet(isPresented: $composer) { PostComposerView(initialAudience: .group, initialGroupId: groupId) }
        .confirmationDialog("Sair do clube?", isPresented: $confirmLeave, titleVisibility: .visible) {
            Button("Sair do clube", role: .destructive) { Task { await leave() } }
            Button("Cancelar", role: .cancel) {}
        }
        .socialAlert("Não foi possível concluir", message: $alert)
        .socialAlert("Pronto", message: $notice)
    }

    // MARK: Loading and actions

    private func load() async {
        do {
            detail = try await community.group(id: groupId)
            loadError = nil
        } catch {
            if Task.isCancelled || (error as? URLError)?.code == .cancelled { return }
            if detail != nil, let api = error as? APIError, api.status == 403 || api.status == 404 { dismiss(); return }
            if detail == nil { loadError = error.localizedDescription }
        }
    }

    private func join() async {
        joining = true
        defer { joining = false }
        do { _ = try await community.joinGroup(groupId: groupId) } catch { alert = error.localizedDescription }
    }

    private func leave() async {
        do {
            try await community.leaveGroup(id: groupId)
            dismiss()
        } catch { alert = error.localizedDescription }
    }

    private func nudge(_ member: GroupMemberStats) async {
        nudging.insert(member.id)
        defer { nudging.remove(member.id) }
        do { notice = try await community.nudge(groupId: groupId, userId: member.id) } catch { alert = error.localizedDescription }
    }

    private func loadSummary() async {
        summaryLoading = true
        defer { summaryLoading = false }
        do {
            let text = try await community.groupSummary(id: groupId)
            summary = text.isEmpty ? "Ainda não há dados suficientes para o resumo." : text
        } catch { alert = "Resumo indisponível agora." }
    }

    // MARK: Toolbar

    @ToolbarContentBuilder
    private var toolbar: some ToolbarContent {
        if let group = detail?.group, group.isMember {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button { composer = true } label: { Label("Nova publicação", systemImage: "square.and.pencil") }
                    NavigationLink(value: CommunityRoute.createChallenge(groupId: groupId)) {
                        Label("Novo desafio", systemImage: "trophy")
                    }
                    if group.isAdmin {
                        NavigationLink { GroupSettingsView(groupId: groupId) } label: {
                            Label("Configurações do clube", systemImage: "gearshape")
                        }
                    }
                    Divider()
                    Button(role: .destructive) { confirmLeave = true } label: { Label("Sair do clube", systemImage: "rectangle.portrait.and.arrow.right") }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
                .accessibilityLabel("Mais opções do clube")
            }
        }
    }

    // MARK: Content

    @ViewBuilder
    private func content(_ detail: GroupDetail) -> some View {
        if detail.group.isMember {
            FeedList(scope: .group(groupId),
                     emptyTitle: "Nenhuma publicação neste clube",
                     emptyMessage: "Seja o primeiro a compartilhar um treino ou um momento com a turma.",
                     showsGroup: false) {
                memberHeader(detail)
            }
            .refreshable { await load() }
        } else {
            ScrollView {
                VStack(spacing: 16) {
                    hero(detail.group)
                    Text("Entre para acompanhar o feed, o ranking e os desafios deste clube.")
                        .font(.subheadline).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
                    Button { Task { await join() } } label: {
                        if joining { ProgressView() } else { Text("Entrar no clube") }
                    }
                    .buttonStyle(.fitgenPrimary)
                    .disabled(joining)
                }
                .padding(Theme.gutter)
            }
            .refreshable { await load() }
        }
    }

    private func hero(_ group: CommunityGroup) -> some View {
        VStack(spacing: 10) {
            ClubAvatar(groupId: group.id, hasPhoto: group.hasPhoto, size: 84)
            Text(group.name).font(.title2.weight(.bold)).multilineTextAlignment(.center)
            HStack(spacing: 6) {
                Image(systemName: group.premiumOnly ? "star.fill" : group.isPublic ? "globe" : "lock.fill")
                Text("\(group.premiumOnly ? "PRO" : group.isPublic ? "Público" : "Privado") · \(group.peopleLabel)")
            }
            .font(.subheadline).foregroundStyle(Theme.secondary)
            if let description = group.description, !description.isEmpty {
                Text(description).font(.subheadline).multilineTextAlignment(.center)
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .highlightCard()
    }

    private func memberHeader(_ detail: GroupDetail) -> some View {
        VStack(spacing: 20) {
            hero(detail.group)
            if let code = detail.group.inviteCode, !code.isEmpty { invite(detail.group, code: code) }
            ranking(detail)
            challenges(detail)
            HStack {
                Text("Publicações").font(.cardTitle)
                Spacer()
                Button { composer = true } label: { Label("Publicar", systemImage: "square.and.pencil") }
                    .buttonStyle(SocialPillStyle())
            }
            .padding(.top, 4)
        }
        .padding(.bottom, 4)
    }

    // MARK: Invite

    private func invite(_ group: CommunityGroup, code: String) -> some View {
        Card(title: "Convidar") {
            HStack {
                Text(code).font(.system(size: 26, weight: .bold, design: .monospaced)).textSelection(.enabled)
                    .minimumScaleFactor(0.6).lineLimit(1)
                Spacer()
                Button {
                    UIPasteboard.general.string = code
                    copied = true
                    Task { try? await Task.sleep(for: .seconds(2)); copied = false }
                } label: {
                    Label(copied ? "Copiado" : "Copiar", systemImage: copied ? "checkmark" : "doc.on.doc")
                }
                .buttonStyle(SocialPillStyle())
                ShareLink(item: CommunityFormat.inviteMessage(groupName: group.name, code: code)) {
                    Label("Enviar", systemImage: "square.and.arrow.up")
                }
                .buttonStyle(SocialPillStyle(filled: true))
            }
            Text("Quem receber o código entra direto no clube.").font(.footnote).foregroundStyle(Theme.secondary)
        }
    }

    // MARK: Ranking

    private func ranking(_ detail: GroupDetail) -> some View {
        let members = detail.members.filter { !$0.blocked }
        return VStack(alignment: .leading, spacing: 8) {
            SocialRows(title: "Ranking da semana") {
                if members.isEmpty {
                    Text("Ninguém treinou ainda esta semana.").font(.subheadline).foregroundStyle(Theme.secondary).padding(16)
                }
                ForEach(members.prefix(5)) { member in
                    ClubMemberRow(member: member, canNudge: detail.group.isAdmin,
                                  nudging: nudging.contains(member.id)) { Task { await nudge(member) } }
                }
                if members.count > 5 {
                    SocialLinkRow(route: .groupMembers(groupId)) {
                        Text("Ver todos os \(members.count) membros").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.voltText)
                    }
                }
            }
            summaryCard
        }
    }

    private var summaryCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button { Task { await loadSummary() } } label: {
                HStack(spacing: 10) {
                    Image(systemName: "sparkles").foregroundStyle(Theme.voltText)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Resumo da semana").font(.body.weight(.semibold)).foregroundStyle(.primary)
                        Text(summaryLoading ? "Gerando…" : "O Otto resume como foi a semana do clube")
                            .font(.footnote).foregroundStyle(Theme.secondary)
                    }
                    Spacer()
                    if summaryLoading { ProgressView() }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
            }
            .buttonStyle(.plain)
            .disabled(summaryLoading)
            if let summary {
                Text(summary).font(.subheadline).padding(14).frame(maxWidth: .infinity, alignment: .leading)
                    .highlightCard()
            }
        }
    }

    // MARK: Challenges

    private func challenges(_ detail: GroupDetail) -> some View {
        SocialRows(title: "Desafios do clube") {
            ForEach(detail.challenges.prefix(3)) { challenge in
                SocialLinkRow(route: .challenge(challenge.id)) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(challenge.title).font(.body.weight(.semibold)).foregroundStyle(.primary).lineLimit(1)
                        Text("\(challenge.whenLabel) · \(challenge.participantCount) \(challenge.participantCount == 1 ? "participante" : "participantes")")
                            .font(.footnote).foregroundStyle(Theme.secondary)
                    }
                }
            }
            if detail.challenges.count > 3 {
                SocialLinkRow(route: .groupChallenges(groupId)) {
                    Text("Ver todos os \(detail.challenges.count) desafios").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.voltText)
                }
            }
            if detail.challenges.isEmpty {
                Text("Nenhum desafio ainda.").font(.subheadline).foregroundStyle(Theme.secondary).padding(16)
            }
            SocialLinkRow(route: .createChallenge(groupId: groupId)) {
                Label("Novo desafio", systemImage: "trophy.fill").foregroundStyle(Theme.voltText)
            }
        }
    }
}

import SwiftUI

/// One line of a club's weekly ranking: position, avatar, stats and, for admins, a "Cutucar" button on inactive members.
struct ClubMemberRow: View {
    let member: GroupMemberStats
    var canNudge = false
    var nudging = false
    var onNudge: () -> Void = {}

    var body: some View {
        HStack(spacing: 8) {
            NavigationLink(value: CommunityRoute.user(member.id)) {
                HStack(spacing: 10) {
                    Text("\(member.rank)").font(.metric(15))
                        .foregroundStyle(member.rank == 1 ? Theme.voltText : Theme.secondary)
                        .frame(width: 24, alignment: .trailing)
                    Avatar(name: member.user.name, url: member.user.profilePicture, size: 38)
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 6) {
                            Text("\(member.user.name)\(member.isMe ? " (você)" : "")")
                                .font(.body.weight(.semibold)).foregroundStyle(.primary).lineLimit(1)
                            if member.role == .admin {
                                Image(systemName: "shield.fill").font(.caption2).foregroundStyle(Theme.voltText).accessibilityLabel("Admin")
                            }
                            if member.inactive {
                                Text("Inativo").font(.caption2.weight(.bold)).foregroundStyle(Theme.protein)
                                    .padding(.horizontal, 6).padding(.vertical, 2)
                                    .background(Theme.protein.opacity(0.18), in: Capsule())
                            }
                        }
                        Text("\(member.workouts) \(member.workouts == 1 ? "treino" : "treinos") · \(member.minutes) min · \(member.activeDays) \(member.activeDays == 1 ? "dia" : "dias")")
                            .font(.footnote).foregroundStyle(Theme.secondary).lineLimit(1)
                    }
                    Spacer(minLength: 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            if canNudge, member.inactive, !member.isMe {
                Button(action: onNudge) {
                    if nudging { ProgressView() } else { Text("Cutucar") }
                }
                .buttonStyle(SocialPillStyle())
                .disabled(nudging)
                .accessibilityLabel("Cutucar \(member.user.firstName)")
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
    }
}

/// Full weekly ranking of a club, with the Otto summary of the week.
struct GroupMembersView: View {
    let groupId: String

    @Environment(CommunityStore.self) private var community
    @State private var detail: GroupDetail?
    @State private var loadError: String?
    @State private var summary: String?
    @State private var summaryLoading = false
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
        .navigationTitle("Membros e ranking")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: community.groupsVersion) { await load() }
        .socialAlert("Não foi possível concluir", message: $alert)
        .socialAlert("Pronto", message: $notice)
    }

    private func content(_ detail: GroupDetail) -> some View {
        let members = detail.members.filter { !$0.blocked }
        return ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header(detail.group)
                if !detail.group.isMember {
                    Text("Entre no clube para ver os membros e o ranking.")
                        .font(.subheadline).foregroundStyle(Theme.secondary)
                        .frame(maxWidth: .infinity).padding(16).highlightCard()
                } else {
                    SocialRows(title: "Ranking da semana", footer: "Treinos, minutos e dias ativos desde segunda-feira.") {
                        if members.isEmpty {
                            Text("Ninguém treinou ainda esta semana.").font(.subheadline).foregroundStyle(Theme.secondary).padding(16)
                        }
                        ForEach(members) { member in
                            ClubMemberRow(member: member, canNudge: detail.group.isAdmin,
                                          nudging: nudging.contains(member.id)) { Task { await nudge(member) } }
                        }
                    }
                    summaryCard
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.vertical, 12)
        }
        .refreshable { await load() }
    }

    private func header(_ group: CommunityGroup) -> some View {
        HStack(spacing: 14) {
            ClubAvatar(groupId: group.id, hasPhoto: group.hasPhoto, size: 52)
            VStack(alignment: .leading, spacing: 2) {
                Text(group.name).font(.title3.weight(.bold)).lineLimit(2)
                Text("\(group.isPublic ? "Público" : "Privado") · \(group.peopleLabel)")
                    .font(.subheadline).foregroundStyle(Theme.secondary)
            }
            Spacer(minLength: 0)
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

    private func load() async {
        do {
            detail = try await community.group(id: groupId)
            loadError = nil
        } catch {
            if Task.isCancelled || (error as? URLError)?.code == .cancelled { return }
            if detail == nil { loadError = error.localizedDescription }
        }
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
}

import SwiftUI

struct ChallengeDetailView: View {
    let challengeId: String

    @Environment(CommunityStore.self) private var community
    @Environment(\.dismiss) private var dismiss
    @State private var detail: ChallengeDetail?
    @State private var loadError: String?
    @State private var busy = false
    @State private var actionError: String?
    @State private var confirmDelete = false
    @State private var confirmLeave = false

    var body: some View {
        Group {
            if let detail { content(detail) }
            else if let loadError {
                VStack(spacing: 12) {
                    Text(loadError).font(.subheadline).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
                    Button("Tentar novamente") { Task { await load() } }.buttonStyle(.fitgenPrimaryCompact)
                }.padding(32)
            } else { LoadingView(cards: [200, 180, 260]) }
        }
        .screen()
        .navigationTitle("Desafio")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if let detail {
                ToolbarItem(placement: .topBarTrailing) {
                    ShareLink(item: shareText(detail.challenge)) { Image(systemName: "square.and.arrow.up") }
                }
            }
        }
        .task { await load() }
        .alert("Algo deu errado", isPresented: Binding(get: { actionError != nil }, set: { if !$0 { actionError = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(actionError ?? "") }
        .confirmationDialog("Excluir este desafio?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Excluir desafio", role: .destructive) { Task { await delete() } }
            Button("Cancelar", role: .cancel) {}
        } message: { Text("O desafio e o ranking serão removidos para todos.") }
        .confirmationDialog("Sair do desafio?", isPresented: $confirmLeave, titleVisibility: .visible) {
            Button("Sair do desafio", role: .destructive) { Task { await leave() } }
            Button("Cancelar", role: .cancel) {}
        }
    }

    private func content(_ d: ChallengeDetail) -> some View {
        let c = d.challenge
        return ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                VStack(alignment: .leading, spacing: 0) {
                    ChallengeCover(challenge: c, aspect: 16.0 / 8.0)
                    VStack(alignment: .leading, spacing: 10) {
                        HStack { ChallengeStatusPill(challenge: c); Text(c.whenLabel).font(.footnote).foregroundStyle(Theme.secondary) }
                        Text(c.title).font(.system(.title, design: .rounded).weight(.bold))
                        if let text = c.description, !text.isEmpty {
                            Text(text).font(.body).foregroundStyle(Theme.secondary)
                        }
                        VStack(alignment: .leading, spacing: 6) {
                            info("calendar", ChallengeFormat.period(c))
                            info(c.metric?.symbol ?? "trophy.fill", "\(c.metricLabel.isEmpty ? (c.metric?.label ?? "") : c.metricLabel) · meta de \(ChallengeFormat.goal(c))",
                                 tint: c.metric?.tint ?? Theme.secondary)
                            info(c.isPublic ? "globe" : "lock.fill", c.isPublic ? "Desafio público" : "Só para membros do clube")
                        }
                        if let g = c.group, !g.id.isEmpty {
                            NavigationLink(value: CommunityRoute.group(g.id)) {
                                Label(g.name ?? "Clube", systemImage: "person.3.fill").font(.subheadline.weight(.semibold))
                                    .padding(.horizontal, 12).padding(.vertical, 7)
                                    .background(Theme.cardRaised, in: Capsule())
                                    .overlay(alignment: .trailing) { EmptyView() }
                            }.buttonStyle(.plain)
                        }
                    }
                    .padding(16)
                }
                .background(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous).fill(Theme.card))
                .clipShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))

                if c.joined { progressCard(c) }
                actions(d)
                leaderboard(d)
            }
            .padding(.horizontal, Theme.gutter).padding(.vertical, 8).padding(.bottom, 24)
        }
        .refreshable { await load() }
    }

    private func info(_ symbol: String, _ text: String, tint: Color = Theme.secondary) -> some View {
        Label { Text(text).font(.subheadline).foregroundStyle(.primary) } icon: {
            Image(systemName: symbol).foregroundStyle(tint).frame(width: 20)
        }
    }

    private func progressCard(_ c: Challenge) -> some View {
        HStack(spacing: 20) {
            ZStack {
                Ring(progress: c.progressFraction, color: Theme.volt, lineWidth: 16, gradient: true)
                VStack(spacing: 0) {
                    Text("\(c.myProgress ?? 0)").font(.metric(34)).contentTransition(.numericText())
                    Text("de \(c.target)").font(.footnote).foregroundStyle(Theme.secondary)
                }
            }
            .frame(width: 140, height: 140)
            VStack(alignment: .leading, spacing: 6) {
                Text("Seu progresso").font(.cardTitle)
                Text(c.completed ? "Desafio concluído!" : "\(max(0, c.target - (c.myProgress ?? 0))) \(c.unit) para a meta")
                    .font(.subheadline).foregroundStyle(c.completed ? Theme.voltText : Theme.secondary)
                if c.completed { Image(systemName: "checkmark.seal.fill").font(.title2).foregroundStyle(Theme.voltText) }
            }
            Spacer(minLength: 0)
        }
        .padding(16).frame(maxWidth: .infinity, alignment: .leading).highlightCard()
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder
    private func actions(_ d: ChallengeDetail) -> some View {
        let c = d.challenge
        if !c.joined && c.status != .ended {
            Button { Task { await join() } } label: {
                if busy { ProgressView() } else { Text("Participar do desafio") }
            }.buttonStyle(.fitgenPrimary).disabled(busy)
        }
        if c.joined && c.status != .ended && !c.completed {
            Button("Sair do desafio") { confirmLeave = true }
                .font(.subheadline.weight(.semibold)).foregroundStyle(Theme.calories)
                .frame(maxWidth: .infinity).padding(.vertical, 12).disabled(busy)
        }
        if d.canDelete {
            Button { confirmDelete = true } label: { Label("Excluir desafio", systemImage: "trash") }
                .font(.subheadline.weight(.semibold)).foregroundStyle(Theme.calories)
                .frame(maxWidth: .infinity).padding(.vertical, 12).disabled(busy)
        }
    }

    private func leaderboard(_ d: ChallengeDetail) -> some View {
        let target = d.challenge.target
        return Card(title: "Ranking") {
            if d.leaderboard.isEmpty {
                Text("Ninguém participa ainda. Seja o primeiro!").font(.subheadline).foregroundStyle(Theme.secondary)
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(d.leaderboard.enumerated()), id: \.element.id) { index, entry in
                        if index > 0 { Divider().overlay(Theme.separator) }
                        row(entry, target: target, unit: d.challenge.unit)
                    }
                }
            }
        }
    }

    private func row(_ e: LeaderboardEntry, target: Int, unit: String) -> some View {
        NavigationLink(value: CommunityRoute.user(e.user.id)) {
            HStack(spacing: 12) {
                rank(e.rank)
                Avatar(name: e.user.name, url: e.user.profilePicture, size: 40)
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 6) {
                        Text(e.isMe ? "Você" : e.user.name).font(.subheadline.weight(.semibold)).lineLimit(1)
                        if e.completed { Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.voltText).font(.subheadline) }
                        Spacer(minLength: 0)
                        Text("\(e.progress)/\(target)").font(.footnote.monospacedDigit()).foregroundStyle(Theme.secondary)
                    }
                    GeometryReader { geo in
                        Capsule().fill(Theme.cardRaised)
                            .overlay(alignment: .leading) {
                                Capsule().fill(Theme.voltGradient)
                                    .frame(width: geo.size.width * (target > 0 ? min(1, Double(e.progress) / Double(target)) : 0))
                            }
                    }.frame(height: 6)
                }
            }
            .padding(.vertical, 10).padding(.horizontal, e.isMe ? 10 : 0)
            .background { if e.isMe { RoundedRectangle(cornerRadius: 14, style: .continuous).fill(Theme.volt.opacity(0.14)) } }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(e.rank)º, \(e.isMe ? "você" : e.user.name), \(e.progress) de \(target) \(unit)\(e.completed ? ", concluído" : "")")
    }

    @ViewBuilder
    private func rank(_ n: Int) -> some View {
        let medal: Color? = n == 1 ? Color(red: 1, green: 0.8, blue: 0.2) : n == 2 ? Color(white: 0.72) : n == 3 ? Color(red: 0.8, green: 0.5, blue: 0.25) : nil
        ZStack {
            if let medal {
                Circle().fill(medal)
                Text("\(n)").font(.system(.footnote, design: .rounded).weight(.heavy)).foregroundStyle(.black)
            } else {
                Text("\(n)").font(.system(.footnote, design: .rounded).weight(.semibold)).foregroundStyle(Theme.secondary)
            }
        }.frame(width: 28, height: 28)
    }

    private func shareText(_ c: Challenge) -> String {
        "Bora participar do desafio \"\(c.title)\" no FitGen? Meta: \(ChallengeFormat.goal(c)), de \(ChallengeFormat.period(c)).\nhttps://web.fitgen.pro/community/challenge/\(c.id)"
    }

    // MARK: Actions

    private func load() async {
        do { detail = try await community.challenge(id: challengeId); loadError = nil }
        catch { if detail == nil { loadError = error.localizedDescription } }
    }

    private func join() async {
        busy = true; defer { busy = false }
        do { _ = try await community.joinChallenge(id: challengeId); await load() }
        catch { actionError = error.localizedDescription }
    }

    private func leave() async {
        busy = true; defer { busy = false }
        do { _ = try await community.leaveChallenge(id: challengeId); await load() }
        catch { actionError = error.localizedDescription }
    }

    private func delete() async {
        busy = true; defer { busy = false }
        do { try await community.deleteChallenge(id: challengeId); dismiss() }
        catch { actionError = error.localizedDescription }
    }
}

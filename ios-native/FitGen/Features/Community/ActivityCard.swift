import SwiftUI
import UIKit

// MARK: - Describing an activity

extension CommunityActivity {
    /// SF Symbol and tint for the activity type.
    var kindStyle: (symbol: String, color: Color) {
        switch type {
        case .workoutCompleted: ("dumbbell.fill", Theme.protein)
        case .streak: ("flame.fill", Theme.streak)
        case .achievement: ("rosette", Theme.steps)
        case .hydrationGoal: ("drop.fill", Theme.water)
        case .challengeCompleted: ("trophy.fill", Theme.voltText)
        case .groupJoined: ("person.badge.plus", Theme.distance)
        case .post, .unknown: ("square.and.pencil", Theme.voltText)
        }
    }

    /// Headline and detail line for system activities (same copy as the Expo app).
    var headline: (title: String, detail: String?) {
        let who = user.firstName
        switch type {
        case .workoutCompleted:
            let minutes = Int(((payload.number("duration_seconds") ?? 0) / 60).rounded())
            let kcal = Int(payload.number("calories") ?? 0)
            let detail = [minutes > 0 ? "\(minutes) min" : nil, kcal > 0 ? "\(kcal) kcal" : nil].compactMap { $0 }.joined(separator: " · ")
            return ("\(who) concluiu \(payload.string("workout_name") ?? "um treino")", detail.isEmpty ? nil : detail)
        case .streak:
            let labels = ["workout": "de treino", "nutrition": "registrando refeições", "hydration": "batendo a meta de água"]
            let suffix = labels[payload.string("category") ?? ""] ?? ""
            return ("\(who) chegou a \(Int(payload.number("days") ?? 0)) dias seguidos \(suffix)".trimmingCharacters(in: .whitespaces), nil)
        case .achievement:
            return ("\(who) desbloqueou \u{201C}\(payload.string("name") ?? "uma conquista")\u{201D}", payload.string("description"))
        case .hydrationGoal:
            let liters = payload.number("amount_ml").map { Format.liters($0) + " L" }
            return ("\(who) bateu a meta de água do dia", liters)
        case .challengeCompleted:
            return ("\(who) completou o desafio \u{201C}\(payload.string("title") ?? "")\u{201D}", nil)
        case .groupJoined:
            return ("\(who) entrou no clube", payload.string("group_name"))
        case .post, .unknown:
            return (user.name, nil)
        }
    }

    var challengeId: String? { type == .challengeCompleted ? payload.string("challenge_id") : nil }
}

// MARK: - Card

/// One feed item: header, content per type, reaction bar, caption.
struct ActivityCard: View {
    let activity: CommunityActivity
    /// Shows the club chip. Hide it on a club's own feed.
    var showGroup = true
    /// Detail mode: full text, no "ver comentários", comment button does nothing (already there).
    var detail = false
    /// Called after the activity was deleted (the detail screen pops itself).
    var onDeleted: (() -> Void)?

    @Environment(CommunityStore.self) private var community
    @State private var confirmDelete = false
    @State private var confirmReport = false
    @State private var confirmBlock = false
    @State private var notice: String?

    private var a: CommunityActivity { community.resolve(activity) }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            header
            if a.type != .post { systemTile }
            if a.hasImage {
                CommunityImage(path: "/community/activities/\(a.id)/image", aspect: a.imageRatio.aspect)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .accessibilityLabel("Foto da publicação")
            }
            ReactionBar(activity: a, showsComments: !detail)
            caption
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        .accessibilityElement(children: .contain)
        .confirmationDialog("Excluir esta publicação?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Excluir", role: .destructive) { delete() }
            Button("Cancelar", role: .cancel) {}
        } message: { Text("Essa ação não pode ser desfeita.") }
        .confirmationDialog("Denunciar esta publicação?", isPresented: $confirmReport, titleVisibility: .visible) {
            Button("Denunciar", role: .destructive) { report() }
            Button("Cancelar", role: .cancel) {}
        } message: { Text("Nossa equipe vai analisar o conteúdo.") }
        .confirmationDialog("Bloquear \(a.user.firstName)?", isPresented: $confirmBlock, titleVisibility: .visible) {
            Button("Bloquear", role: .destructive) { block() }
            Button("Cancelar", role: .cancel) {}
        } message: { Text("Vocês deixam de ver as publicações um do outro.") }
        .alert("Comunidade", isPresented: Binding(get: { notice != nil }, set: { if !$0 { notice = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(notice ?? "") }
    }

    // MARK: Header

    private var header: some View {
        HStack(alignment: .center, spacing: 10) {
            NavigationLink(value: CommunityRoute.user(a.user.id)) {
                HStack(spacing: 10) {
                    Avatar(name: a.user.name, url: a.user.profilePicture, size: 40)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(a.user.name).font(.subheadline.weight(.semibold)).foregroundStyle(.primary).lineLimit(1)
                        subtitle
                    }
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(a.user.id.isEmpty)
            .accessibilityLabel("Perfil de \(a.user.name)")
            Spacer(minLength: 4)
            menu
        }
    }

    private var subtitle: some View {
        HStack(spacing: 6) {
            Text(CommunityFormat.timeAgo(a.date)).font(.caption).foregroundStyle(Theme.secondary)
            if a.audience == .public {
                Image(systemName: "globe").font(.caption2).foregroundStyle(Theme.secondary).accessibilityLabel("Público")
            }
            if showGroup, let group = a.group, let name = group.name {
                NavigationLink(value: CommunityRoute.group(group.id)) {
                    Label(name, systemImage: "person.3.fill")
                        .font(.caption2.weight(.semibold))
                        .lineLimit(1)
                        .foregroundStyle(Theme.voltText)
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Theme.volt.opacity(0.16), in: Capsule())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Clube \(name)")
            }
        }
    }

    private var menu: some View {
        Menu {
            if a.isMine {
                Button(role: .destructive) { confirmDelete = true } label: { Label("Excluir publicação", systemImage: "trash") }
            } else {
                Button { confirmReport = true } label: { Label("Denunciar", systemImage: "flag") }
                Button(role: .destructive) { confirmBlock = true } label: { Label("Bloquear \(a.user.firstName)", systemImage: "hand.raised") }
            }
        } label: {
            Image(systemName: "ellipsis")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(Theme.secondary)
                .frame(width: 36, height: 36)
                .contentShape(Rectangle())
        }
        .accessibilityLabel("Mais opções")
    }

    // MARK: Content

    @ViewBuilder
    private var systemTile: some View {
        let (title, line) = a.headline
        let style = a.kindStyle
        let tile = HStack(alignment: .center, spacing: 12) {
            Image(systemName: style.symbol)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(style.color)
                .frame(width: 36, height: 36)
                .background(style.color.opacity(0.15), in: Circle())
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 3) {
                Text(title).font(.subheadline).foregroundStyle(.primary).multilineTextAlignment(.leading)
                if let line {
                    Text(line).font(.footnote.weight(.medium)).foregroundStyle(Theme.secondary).multilineTextAlignment(.leading)
                }
            }
            Spacer(minLength: 0)
            if a.challengeId != nil && !detail {
                Image(systemName: "chevron.right").font(.caption.weight(.bold)).foregroundStyle(Theme.secondary)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.cardRaised.opacity(0.6), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        if let id = a.challengeId {
            NavigationLink(value: CommunityRoute.challenge(id)) { tile }.buttonStyle(.plain)
                .accessibilityHint("Abre o desafio")
        } else {
            tile.accessibilityElement(children: .combine)
        }
    }

    @ViewBuilder
    private var caption: some View {
        if let text = a.text, !text.isEmpty {
            (Text(a.user.firstName + " ").fontWeight(.bold) + Text(text))
                .font(.subheadline)
                .lineLimit(detail ? nil : 6)
                .frame(maxWidth: .infinity, alignment: .leading)
                .textSelection(.enabled)
        }
        if !detail && a.commentCount > 0 {
            NavigationLink(value: CommunityRoute.activity(a.id)) {
                Text(a.commentCount == 1 ? "Ver 1 comentário" : "Ver os \(a.commentCount) comentários")
                    .font(.footnote).foregroundStyle(Theme.secondary)
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: Actions

    private func delete() {
        Task {
            do {
                try await community.deleteActivity(id: a.id)
                onDeleted?()
            } catch { notice = error.localizedDescription }
        }
    }

    private func report() {
        Task {
            do { try await community.report(.activity, id: a.id); notice = "Obrigado! Nossa equipe vai analisar." }
            catch { notice = error.localizedDescription }
        }
    }

    private func block() {
        Task {
            do { try await community.block(userId: a.user.id); notice = "\(a.user.firstName) foi bloqueado." }
            catch { notice = error.localizedDescription }
        }
    }
}

// MARK: - Reactions

/// Reaction button (tap = 🔥 or remove mine, long-press = picker), per-kind counts and the comment button.
struct ReactionBar: View {
    let activity: CommunityActivity
    var showsComments = true

    @Environment(CommunityStore.self) private var community
    @State private var failure: String?

    var body: some View {
        HStack(spacing: 6) {
            reactMenu
            ForEach(ReactionKind.allCases.filter { (activity.reactions[$0] ?? 0) > 0 }) { kind in
                countChip(kind)
            }
            Spacer(minLength: 0)
            commentsButton
        }
        .sensoryFeedback(.impact(weight: .light), trigger: activity.myReaction)
        .alert("Não foi possível reagir", isPresented: Binding(get: { failure != nil }, set: { if !$0 { failure = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(failure ?? "") }
    }

    private var reactMenu: some View {
        Menu {
            ForEach(ReactionKind.allCases) { kind in
                Button { react(kind) } label: { Text("\(kind.emoji)  \(kind.label)") }
            }
            if activity.myReaction != nil {
                Button(role: .destructive) { react(nil) } label: { Label("Remover reação", systemImage: "xmark") }
            }
        } label: {
            Group {
                if let mine = activity.myReaction {
                    Text(mine.emoji).font(.system(size: 20))
                } else {
                    Image(systemName: "flame").font(.system(size: 18, weight: .medium)).foregroundStyle(Theme.secondary)
                }
            }
            .frame(width: 44, height: 36)
            .background(activity.myReaction == nil ? Color.clear : Theme.volt.opacity(0.2), in: Capsule())
            .contentShape(Capsule())
        } primaryAction: {
            react(activity.myReaction == nil ? .fire : nil)
        }
        .accessibilityLabel(activity.myReaction.map { "Sua reação: \($0.label)" } ?? "Reagir")
        .accessibilityHint("Toque para reagir com fogo. Mantenha pressionado para escolher outra reação.")
    }

    private func countChip(_ kind: ReactionKind) -> some View {
        let mine = activity.myReaction == kind
        let count = activity.reactions[kind] ?? 0
        return Button { react(mine ? nil : kind) } label: {
            HStack(spacing: 4) {
                Text(kind.emoji).font(.system(size: 15))
                Text("\(count)").font(.footnote.weight(.semibold)).monospacedDigit()
                    .foregroundStyle(mine ? Theme.voltText : Theme.secondary)
            }
            .padding(.horizontal, 10).frame(height: 32)
            .background(mine ? Theme.volt.opacity(0.2) : Theme.cardRaised.opacity(0.7), in: Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(kind.label), \(count)\(mine ? ", sua reação" : "")")
        .accessibilityHint(mine ? "Remove sua reação" : "Reage com \(kind.label)")
    }

    @ViewBuilder
    private var commentsButton: some View {
        let label = HStack(spacing: 5) {
            Image(systemName: "bubble.left").font(.system(size: 17, weight: .medium))
            if activity.commentCount > 0 { Text("\(activity.commentCount)").font(.footnote.weight(.semibold)).monospacedDigit() }
        }
        .foregroundStyle(Theme.secondary)
        .padding(.horizontal, 10).frame(height: 36)
        .contentShape(Rectangle())
        if showsComments {
            NavigationLink(value: CommunityRoute.activity(activity.id)) { label }
                .buttonStyle(.plain)
                .accessibilityLabel(activity.commentCount > 0 ? "\(activity.commentCount) comentários" : "Comentar")
        } else {
            label.accessibilityElement(children: .ignore)
                .accessibilityLabel("\(activity.commentCount) comentários")
        }
    }

    private func react(_ kind: ReactionKind?) {
        Task {
            do { try await community.react(activity, kind: kind) } catch { failure = error.localizedDescription }
        }
    }
}

// MARK: - Image

/// An image behind one of the signed-URL endpoints (`/community/activities/{id}/image`, `/groups/{id}/image`, …).
/// Fills its width at the given aspect ratio (width / height).
struct CommunityImage: View {
    let path: String
    var aspect: Double = 4.0 / 5.0

    @Environment(CommunityStore.self) private var community
    @State private var payload: ImagePayload?
    @State private var inline: UIImage?
    @State private var failed = false

    var body: some View {
        Color(Theme.cardRaised)
            .aspectRatio(aspect, contentMode: .fit)
            .overlay {
                if let inline {
                    Image(uiImage: inline).resizable().scaledToFill()
                } else if let url = payload?.imageURL {
                    AsyncImage(url: url) { phase in
                        switch phase {
                        case .success(let image): image.resizable().scaledToFill()
                        case .failure: unavailable
                        default: ProgressView()
                        }
                    }
                } else if failed {
                    unavailable
                } else {
                    ProgressView()
                }
            }
            .clipped()
            .task(id: path) { await load() }
    }

    private var unavailable: some View {
        VStack(spacing: 6) {
            Image(systemName: "photo").font(.title2)
            Text("Foto indisponível").font(.caption)
        }
        .foregroundStyle(Theme.secondary)
    }

    private func load() async {
        failed = false
        do {
            let result = try await community.imagePayload(path: path)
            payload = result
            inline = result.inlineData.flatMap(UIImage.init(data:))
        } catch {
            if !Task.isCancelled { failed = true }
        }
    }
}

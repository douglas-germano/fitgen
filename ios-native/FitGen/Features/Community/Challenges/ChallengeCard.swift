import SwiftUI

/// Rich challenge card used by the list. Tapping opens the detail; the Join button works in place.
struct ChallengeCard: View {
    let challenge: Challenge
    var onJoin: (() async -> Void)?
    @State private var joining = false

    var body: some View {
        NavigationLink(value: CommunityRoute.challenge(challenge.id)) {
            VStack(alignment: .leading, spacing: 0) {
                ChallengeCover(challenge: challenge)
                    .overlay(alignment: .topTrailing) { ChallengeStatusPill(challenge: challenge).padding(10) }

                VStack(alignment: .leading, spacing: 12) {
                    HStack(alignment: .center, spacing: 14) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(challenge.title).font(.cardTitle).foregroundStyle(.primary)
                                .multilineTextAlignment(.leading).lineLimit(2)
                            HStack(spacing: 5) {
                                Image(systemName: challenge.metric?.symbol ?? "trophy.fill")
                                Text(challenge.metricLabel.isEmpty ? (challenge.metric?.label ?? "") : challenge.metricLabel)
                            }
                            .font(.subheadline).foregroundStyle(challenge.metric?.tint ?? Theme.secondary)
                            Text("\(ChallengeFormat.period(challenge)) · \(challenge.whenLabel)")
                                .font(.footnote).foregroundStyle(Theme.secondary)
                            if let group = challenge.group?.name {
                                Label(group, systemImage: "person.3.fill").font(.footnote).foregroundStyle(Theme.secondary)
                            }
                        }
                        Spacer(minLength: 0)
                        if challenge.joined { progressRing }
                    }

                    HStack {
                        Label("\(challenge.participantCount) \(challenge.participantCount == 1 ? "participante" : "participantes")",
                              systemImage: "person.2.fill")
                            .font(.footnote).foregroundStyle(Theme.secondary)
                        Spacer()
                        if challenge.completed {
                            Label("Concluído", systemImage: "checkmark.seal.fill").font(.footnote.bold()).foregroundStyle(Theme.voltText)
                        } else if !challenge.joined, challenge.status != .ended, let onJoin {
                            Button {
                                joining = true
                                Task { await onJoin(); joining = false }
                            } label: {
                                if joining { ProgressView() } else { Text("Participar") }
                            }
                            .buttonStyle(.fitgenPrimaryCompact).disabled(joining)
                        }
                    }
                }
                .padding(16)
            }
            .background(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous).fill(Theme.card))
            .clipShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
            .contentShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private var progressRing: some View {
        ZStack {
            Ring(progress: challenge.progressFraction, color: Theme.volt, lineWidth: 8, gradient: true)
            VStack(spacing: 0) {
                Text("\(challenge.myProgress ?? 0)").font(.metric(18)).contentTransition(.numericText())
                Text("/\(challenge.target)").font(.caption2).foregroundStyle(Theme.secondary)
            }
        }
        .frame(width: 72, height: 72)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Meu progresso: \(challenge.myProgress ?? 0) de \(challenge.target) \(challenge.unit)")
    }
}

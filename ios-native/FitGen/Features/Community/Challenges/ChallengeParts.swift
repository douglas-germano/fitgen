import SwiftUI

extension ChallengeMetric {
    var symbol: String {
        switch self {
        case .workouts: "dumbbell.fill"
        case .activeDays: "calendar.badge.checkmark"
        case .workoutMinutes: "timer"
        case .hydrationDays: "drop.fill"
        case .meals: "fork.knife"
        }
    }
    var tint: Color {
        switch self {
        case .workouts: Theme.protein
        case .activeDays: Theme.voltText
        case .workoutMinutes: Theme.distance
        case .hydrationDays: Theme.water
        case .meals: Theme.calories
        }
    }
    var caption: String {
        switch self {
        case .workouts: "Treinos concluídos no FitGen"
        case .activeDays: "Dias com algum treino"
        case .workoutMinutes: "Minutos somados de treino"
        case .hydrationDays: "Dias batendo a meta de água"
        case .meals: "Refeições registradas"
        }
    }
}

enum ChallengeFormat {
    /// "24 nov" for a "yyyy-MM-dd" (or ISO) string, read as a calendar day.
    static func day(_ text: String) -> String {
        guard let d = ISODate.parse(text) else { return "" }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC") ?? .gmt
        let style = Date.FormatStyle(calendar: cal, timeZone: cal.timeZone).day().month(.abbreviated).locale(Locale(identifier: "pt_BR"))
        return d.formatted(style).replacingOccurrences(of: ".", with: "")
    }
    static func period(_ c: Challenge) -> String { "\(day(c.startDate)) a \(day(c.endDate))" }
    static func goal(_ c: Challenge) -> String { "\(c.target) \(c.unit)" }
}

/// Status pill: upcoming / active / ended.
struct ChallengeStatusPill: View {
    let challenge: Challenge
    var body: some View {
        let (text, color): (String, Color) = switch challenge.status {
        case .active: ("Ativo", Theme.voltText)
        case .upcoming: ("Em breve", Theme.distance)
        case .ended: ("Encerrado", Theme.secondary)
        }
        Text(text).font(.caption.bold()).foregroundStyle(color)
            .padding(.horizontal, 9).padding(.vertical, 4)
            .background(color.opacity(0.15), in: Capsule())
    }
}

/// Cover photo, or a volt gradient with the metric icon.
struct ChallengeCover: View {
    let challenge: Challenge
    var aspect: Double = 16.0 / 7.0

    var body: some View {
        if challenge.coverImage != nil {
            CommunityImage(path: "/community/challenges/\(challenge.id)/image", aspect: aspect)
        } else {
            let metric = challenge.metric
            ZStack {
                Theme.voltGradient
                Image(systemName: metric?.symbol ?? "trophy.fill")
                    .font(.system(size: 54, weight: .semibold)).foregroundStyle(.black.opacity(0.22))
                    .rotationEffect(.degrees(-8)).offset(x: 70, y: 6)
                Image(systemName: metric?.symbol ?? "trophy.fill")
                    .font(.system(size: 30, weight: .bold)).foregroundStyle(.black)
                    .offset(x: -70, y: -4)
            }
            .frame(maxWidth: .infinity)
            .aspectRatio(aspect, contentMode: .fit)
            .clipped()
        }
    }
}

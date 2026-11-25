import Foundation
import Observation

/// Turns invite and share links into a Comunidade screen.
///
/// Accepts the app scheme (`fitgen://community/join/ABC123`) and the web app links the app shares
/// (`https://web.fitgen.pro/community/join/ABC123`). The web form only reaches the app once universal links
/// are set up (associated domains need the paid Apple account); until then it opens the web app.
/// The route waits in `pending` until the signed-in tabs read it, so a link opened while signed out
/// still lands after login.
@MainActor @Observable
final class DeepLinks {
    var pending: CommunityRoute?

    func open(_ url: URL) {
        if let route = Self.route(for: url) { pending = route }
    }

    static let webHosts: Set<String> = ["web.fitgen.pro", "fitgen.pro", "www.fitgen.pro"]

    static func route(for url: URL) -> CommunityRoute? {
        var parts = url.pathComponents.filter { $0 != "/" && !$0.isEmpty }
        switch url.scheme?.lowercased() {
        case "fitgen":
            // fitgen://community/join/X → host "community"; fitgen:///community/join/X → no host.
            if let host = url.host(), !host.isEmpty { parts.insert(host, at: 0) }
        case "https", "http":
            guard let host = url.host()?.lowercased(), webHosts.contains(host) else { return nil }
        default:
            return nil
        }
        if parts.first?.lowercased() == "community" { parts.removeFirst() }
        guard let kind = parts.first?.lowercased() else { return nil }
        let id = parts.count > 1 ? parts[1].removingPercentEncoding ?? parts[1] : nil

        switch kind {
        case "join":
            let code = id.map(CommunityFormat.normalizeCode)
            return .joinGroup(code: code?.isEmpty == false ? code : nil)
        case "group":
            guard let id else { return nil }
            switch parts.count > 2 ? parts[2].lowercased() : nil {
            case "members": return .groupMembers(id)
            case "challenges": return .groupChallenges(id)
            default: return .group(id)
            }
        case "challenge": return id.map { .challenge($0) }
        case "user": return id.map { .user($0) }
        case "activity": return id.map { .activity($0) }
        case "people": return .search
        default: return nil
        }
    }
}

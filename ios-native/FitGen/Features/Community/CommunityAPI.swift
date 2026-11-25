import Foundation
import Observation
import UIKit

/*
 CommunityStore: every /api/community endpoint used by the Expo app (mobile/src/hooks/community.ts).

 Injected from FitGenApp: `@Environment(CommunityStore.self) private var community`.
 All methods are `async throws` (APIError has a pt-BR `localizedDescription`) and return decoded values;
 mutations that change an activity also publish the new version in `patches` so every visible card updates.

 ── Feed / activities ────────────────────────────────────────────────────────────────────────
 func feed(_ scope: FeedScope, cursor: String? = nil, limit: Int? = nil) async throws -> FeedPage
     FeedScope: .home | .public | .group(id) | .user(id)
 func activity(id: String) async throws -> CommunityActivity
 func createPost(text: String, audience: Audience, groupId: String?, photo: Data?, ratio: ImageRatio) async throws -> CommunityActivity
 func react(_ activity: CommunityActivity, kind: ReactionKind?) async throws        // nil removes my reaction; optimistic
 func reactions(activityId: String) async throws -> [ReactionEntry]
 func comments(activityId: String) async throws -> [CommunityComment]
 func addComment(activityId: String, text: String) async throws -> CommunityComment
 func deleteComment(id: String, activityId: String) async throws
 func deleteActivity(id: String) async throws
 func report(_ target: ReportTarget, id: String, reason: String? = nil) async throws
 func imagePayload(path: String) async throws -> ImagePayload                       // cached ~45 min
 func activityImagePayload(id: String) async throws -> ImagePayload                 // GET /activities/{id}/image
 func groupImagePayload(id: String) async throws -> ImagePayload                    // GET /groups/{id}/image
 func challengeImagePayload(id: String) async throws -> ImagePayload                // GET /challenges/{id}/image

 ── Groups (clubes) ──────────────────────────────────────────────────────────────────────────
 func myGroups() async throws -> [CommunityGroup]                                   // GET /groups
 func publicGroups() async throws -> [CommunityGroup]                               // GET /groups?scope=public
 func group(id: String) async throws -> GroupDetail
 func groupSummary(id: String) async throws -> String                               // Otto's weekly summary
 func groupPreview(code: String) async throws -> GroupPreview
 func createGroup(name: String, description: String?, isPublic: Bool, photo: Data?) async throws -> CommunityGroup
 func joinGroup(code: String) async throws -> CommunityGroup
 func joinGroup(groupId: String) async throws -> CommunityGroup                     // public / PRO clubs
 func leaveGroup(id: String) async throws
 func deleteGroup(id: String) async throws
 func updateGroup(id: String, name: String?, description: String?, isPublic: Bool?) async throws -> CommunityGroup
 func rotateInviteCode(groupId: String) async throws -> String
 func removeMember(groupId: String, userId: String) async throws
 func setMemberRole(groupId: String, userId: String, role: GroupRole) async throws
 func nudge(groupId: String, userId: String) async throws -> String
 func setGroupPhoto(groupId: String, photo: Data?) async throws -> CommunityGroup  // nil removes the photo

 ── Challenges ───────────────────────────────────────────────────────────────────────────────
 func challenges(_ scope: ChallengeScope) async throws -> [Challenge]               // .mine | .available | .public
 func challenge(id: String) async throws -> ChallengeDetail
 func createChallenge(_ new: NewChallenge) async throws -> Challenge
 func joinChallenge(id: String) async throws -> Challenge
 func leaveChallenge(id: String) async throws -> Challenge
 func deleteChallenge(id: String) async throws

 ── People ───────────────────────────────────────────────────────────────────────────────────
 func searchUsers(_ query: String) async throws -> [UserSearchResult]               // >= 2 chars, else []
 func profile(userId: String) async throws -> CommunityProfile
 func follow(userId: String) async throws -> FollowResult                           // PUT; state .pending or .accepted
 func unfollow(userId: String) async throws                                         // DELETE (also cancels a pending request)
 func friends() async throws -> FriendsList                                         // friends + received + sent requests
 func respondFriendRequest(id: String, accept: Bool) async throws                   // accept / decline / cancel
 func removeFriend(userId: String) async throws
 func blocks() async throws -> [CommunityUser]
 func block(userId: String) async throws
 func unblock(userId: String) async throws
 func settings() async throws -> CommunitySettings
 func updateSettings(_ settings: CommunitySettings) async throws -> CommunitySettings

 ── Shared state ─────────────────────────────────────────────────────────────────────────────
 var patches: [String: CommunityActivity]  // latest version of activities changed locally (reactions, comment count)
 var deletedActivityIds: Set<String>
 var feedVersion: Int                      // bumps after a post is created: feeds reload on change
 var groupsVersion: Int                    // bumps after a group / challenge mutation: lists reload on change
 var myGroupsCache: Remote<[CommunityGroup]>; func loadMyGroups() async
 func resolve(_ a: CommunityActivity) -> CommunityActivity   // a with any local patch applied
 func clear()                                                // on sign out

 Navigation: `CommunityRoute` (see CommunityView.swift) is registered at the Comunidade stack root:
   NavigationLink(value: CommunityRoute.user(id)) / .group(id) / .challenge(id) / .activity(id)
   / .search / .createGroup / .joinGroup(code: String?) / .createChallenge(groupId: String?) / .settings
 */

enum FeedScope: Hashable, Sendable {
    case home, `public`, group(String), user(String)

    var query: String {
        switch self {
        case .home: "scope=home"
        case .public: "scope=public"
        case .group(let id): "scope=group&group_id=\(id)"
        case .user(let id): "scope=user&user_id=\(id)"
        }
    }
}

@MainActor @Observable
final class CommunityStore {
    private let api = APIClient.shared
    private static let base = "/community"

    var patches: [String: CommunityActivity] = [:]
    var deletedActivityIds: Set<String> = []
    var feedVersion = 0
    var groupsVersion = 0
    var myGroupsCache: Remote<[CommunityGroup]> = .idle

    @ObservationIgnored private var imageCache: [String: (payload: ImagePayload, at: Date)] = [:]

    func clear() {
        patches = [:]; deletedActivityIds = []; myGroupsCache = .idle; imageCache = [:]
        feedVersion += 1; groupsVersion += 1
    }

    func resolve(_ activity: CommunityActivity) -> CommunityActivity { patches[activity.id] ?? activity }

    func loadMyGroups() async {
        do { myGroupsCache = .loaded(try await myGroups()) } catch { myGroupsCache = .failed(error.localizedDescription) }
    }

    // MARK: Feed

    func feed(_ scope: FeedScope, cursor: String? = nil, limit: Int? = nil) async throws -> FeedPage {
        var query = scope.query
        if let cursor, let encoded = cursor.addingPercentEncoding(withAllowedCharacters: .urlQueryValueAllowed) { query += "&cursor=\(encoded)" }
        if let limit { query += "&limit=\(limit)" }
        let page: FeedPage = try await api.get("\(Self.base)/feed?\(query)")
        // Fresh server data supersedes local patches for these ids.
        for item in page.items { patches[item.id] = nil }
        return page
    }

    func activity(id: String) async throws -> CommunityActivity {
        let activity: CommunityActivity = try await api.get("\(Self.base)/activities/\(id)")
        patches[id] = nil
        return activity
    }

    func createPost(text: String, audience: Audience, groupId: String?, photo: Data?, ratio: ImageRatio) async throws -> CommunityActivity {
        var fields = ["text": text, "audience": audience.rawValue]
        if audience == .group, let groupId { fields["group_id"] = groupId }
        var files: [(name: String, filename: String, data: Data, mime: String)] = []
        if let photo {
            fields["ratio"] = ratio.rawValue
            files.append(("file", "post.jpg", photo, "image/jpeg"))
        }
        let created: CommunityActivity = try await api.upload("\(Self.base)/posts", fields: fields, files: files)
        feedVersion += 1
        return created
    }

    /// Optimistic: the card changes right away and rolls back if the request fails.
    func react(_ activity: CommunityActivity, kind: ReactionKind?) async throws {
        let before = resolve(activity)
        patches[activity.id] = before.reacting(kind)
        do {
            let updated: CommunityActivity
            if let kind {
                updated = try await api.send("\(Self.base)/activities/\(activity.id)/reaction", method: "PUT", json: ReactionBody(kind: kind.rawValue))
            } else {
                updated = try await api.send("\(Self.base)/activities/\(activity.id)/reaction", method: "DELETE", json: Empty())
            }
            patches[activity.id] = updated
        } catch {
            patches[activity.id] = before
            throw error
        }
    }

    func reactions(activityId: String) async throws -> [ReactionEntry] {
        try await lossy("\(Self.base)/activities/\(activityId)/reactions")
    }

    func comments(activityId: String) async throws -> [CommunityComment] {
        try await lossy("\(Self.base)/activities/\(activityId)/comments")
    }

    func addComment(activityId: String, text: String) async throws -> CommunityComment {
        let comment: CommunityComment = try await api.send("\(Self.base)/activities/\(activityId)/comments", method: "POST", json: TextBody(text: text))
        bumpComments(activityId, by: 1)
        return comment
    }

    func deleteComment(id: String, activityId: String) async throws {
        try await api.sendNoContent("\(Self.base)/comments/\(id)", method: "DELETE")
        bumpComments(activityId, by: -1)
    }

    func deleteActivity(id: String) async throws {
        try await api.sendNoContent("\(Self.base)/activities/\(id)", method: "DELETE")
        deletedActivityIds.insert(id)
        patches[id] = nil
    }

    func report(_ target: ReportTarget, id: String, reason: String? = nil) async throws {
        try await api.sendNoContent("\(Self.base)/reports", method: "POST",
                                    json: ReportBody(targetType: target.rawValue, targetId: id, reason: reason))
    }

    private func bumpComments(_ activityId: String, by delta: Int) {
        guard var current = patches[activityId] else { return }
        current.commentCount = max(0, current.commentCount + delta)
        patches[activityId] = current
    }

    // MARK: Images

    /// Temporary signed URL (or inline data) for an image endpoint, cached ~45 minutes (URLs live ~1 h).
    func imagePayload(path: String) async throws -> ImagePayload {
        if let hit = imageCache[path], Date.now.timeIntervalSince(hit.at) < 45 * 60 { return hit.payload }
        let payload: ImagePayload = try await api.get(path)
        imageCache[path] = (payload, .now)
        return payload
    }

    func activityImagePayload(id: String) async throws -> ImagePayload { try await imagePayload(path: "\(Self.base)/activities/\(id)/image") }
    func groupImagePayload(id: String) async throws -> ImagePayload { try await imagePayload(path: "\(Self.base)/groups/\(id)/image") }
    func challengeImagePayload(id: String) async throws -> ImagePayload { try await imagePayload(path: "\(Self.base)/challenges/\(id)/image") }

    // MARK: Groups

    func myGroups() async throws -> [CommunityGroup] { try await lossy("\(Self.base)/groups") }
    func publicGroups() async throws -> [CommunityGroup] { try await lossy("\(Self.base)/groups?scope=public") }

    func group(id: String) async throws -> GroupDetail { try await api.get("\(Self.base)/groups/\(id)") }

    func groupSummary(id: String) async throws -> String {
        struct Summary: Decodable { let text: String? }
        let summary: Summary = try await api.get("\(Self.base)/groups/\(id)/summary")
        return summary.text ?? ""
    }

    func groupPreview(code: String) async throws -> GroupPreview {
        let encoded = code.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? code
        return try await api.get("\(Self.base)/groups/preview/\(encoded)")
    }

    func createGroup(name: String, description: String?, isPublic: Bool, photo: Data?) async throws -> CommunityGroup {
        let created: CommunityGroup
        if let photo {
            var fields = ["name": name, "is_public": isPublic ? "true" : "false"]
            if let description, !description.isEmpty { fields["description"] = description }
            created = try await api.upload("\(Self.base)/groups", fields: fields, files: [("file", "clube.jpg", photo, "image/jpeg")])
        } else {
            created = try await api.send("\(Self.base)/groups", method: "POST",
                                         json: NewGroupBody(name: name, description: description, isPublic: isPublic))
        }
        groupsVersion += 1
        return created
    }

    func joinGroup(code: String) async throws -> CommunityGroup {
        let group: CommunityGroup = try await api.send("\(Self.base)/groups/join", method: "POST", json: JoinBody(code: CommunityFormat.normalizeCode(code), groupId: nil))
        groupsVersion += 1
        return group
    }

    func joinGroup(groupId: String) async throws -> CommunityGroup {
        let group: CommunityGroup = try await api.send("\(Self.base)/groups/join", method: "POST", json: JoinBody(code: nil, groupId: groupId))
        groupsVersion += 1
        return group
    }

    func leaveGroup(id: String) async throws {
        let _: Empty = try await api.send("\(Self.base)/groups/\(id)/leave", method: "POST", json: Empty())
        groupsVersion += 1; feedVersion += 1
    }

    func deleteGroup(id: String) async throws {
        try await api.sendNoContent("\(Self.base)/groups/\(id)", method: "DELETE")
        groupsVersion += 1; feedVersion += 1
    }

    func updateGroup(id: String, name: String?, description: String?, isPublic: Bool?) async throws -> CommunityGroup {
        let group: CommunityGroup = try await api.send("\(Self.base)/groups/\(id)", method: "PUT",
                                                       json: UpdateGroupBody(name: name, description: description, isPublic: isPublic))
        groupsVersion += 1
        return group
    }

    func rotateInviteCode(groupId: String) async throws -> String {
        struct Code: Decodable { let inviteCode: String }
        let code: Code = try await api.send("\(Self.base)/groups/\(groupId)/invite-code", method: "POST", json: Empty())
        groupsVersion += 1
        return code.inviteCode
    }

    func removeMember(groupId: String, userId: String) async throws {
        try await api.sendNoContent("\(Self.base)/groups/\(groupId)/members/\(userId)", method: "DELETE")
        groupsVersion += 1
    }

    func setMemberRole(groupId: String, userId: String, role: GroupRole) async throws {
        try await api.sendNoContent("\(Self.base)/groups/\(groupId)/members/\(userId)/role", method: "PUT", json: RoleBody(role: role.rawValue))
        groupsVersion += 1
    }

    /// Sends a "bora treinar" push to an inactive member; answers with the server's message.
    func nudge(groupId: String, userId: String) async throws -> String {
        struct Message: Decodable { let msg: String? }
        let answer: Message = try await api.send("\(Self.base)/groups/\(groupId)/members/\(userId)/nudge", method: "POST", json: Empty())
        return answer.msg ?? "Lembrete enviado."
    }

    /// Uploads a new club photo (JPEG data) or removes it when `photo` is nil.
    func setGroupPhoto(groupId: String, photo: Data?) async throws -> CommunityGroup {
        let group: CommunityGroup
        if let photo {
            group = try await api.upload("\(Self.base)/groups/\(groupId)/image", fields: [:], files: [("file", "clube.jpg", photo, "image/jpeg")])
        } else {
            group = try await api.send("\(Self.base)/groups/\(groupId)/image", method: "DELETE", json: Empty())
        }
        imageCache["\(Self.base)/groups/\(groupId)/image"] = nil
        groupsVersion += 1
        return group
    }

    // MARK: Challenges

    func challenges(_ scope: ChallengeScope) async throws -> [Challenge] { try await lossy("\(Self.base)/challenges?scope=\(scope.rawValue)") }

    func challenge(id: String) async throws -> ChallengeDetail { try await api.get("\(Self.base)/challenges/\(id)") }

    func createChallenge(_ new: NewChallenge) async throws -> Challenge {
        let created: Challenge = try await api.send("\(Self.base)/challenges", method: "POST", json: new)
        groupsVersion += 1
        return created
    }

    func joinChallenge(id: String) async throws -> Challenge {
        let c: Challenge = try await api.send("\(Self.base)/challenges/\(id)/join", method: "POST", json: Empty())
        groupsVersion += 1
        return c
    }

    func leaveChallenge(id: String) async throws -> Challenge {
        let c: Challenge = try await api.send("\(Self.base)/challenges/\(id)/leave", method: "POST", json: Empty())
        groupsVersion += 1
        return c
    }

    func deleteChallenge(id: String) async throws {
        try await api.sendNoContent("\(Self.base)/challenges/\(id)", method: "DELETE")
        groupsVersion += 1
    }

    // MARK: People

    func searchUsers(_ query: String) async throws -> [UserSearchResult] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard q.count >= 2, let encoded = q.addingPercentEncoding(withAllowedCharacters: .urlQueryValueAllowed) else { return [] }
        return try await lossy("\(Self.base)/users/search?q=\(encoded)")
    }

    func profile(userId: String) async throws -> CommunityProfile { try await api.get("\(Self.base)/users/\(userId)") }

    func follow(userId: String) async throws -> FollowResult {
        let result: FollowResult = try await api.send("\(Self.base)/users/\(userId)/follow", method: "PUT", json: Empty())
        groupsVersion += 1; feedVersion += 1
        return result
    }

    func unfollow(userId: String) async throws {
        let _: Empty = try await api.send("\(Self.base)/users/\(userId)/follow", method: "DELETE", json: Empty())
        groupsVersion += 1; feedVersion += 1
    }

    func friends() async throws -> FriendsList { try await api.get("\(Self.base)/friends") }

    /// Accepts a received request, or declines / cancels one (`id` is the card id from `friends()`).
    func respondFriendRequest(id: String, accept: Bool) async throws {
        if accept {
            try await api.sendNoContent("\(Self.base)/friends/requests/\(id)/accept", method: "POST")
        } else {
            try await api.sendNoContent("\(Self.base)/friends/requests/\(id)", method: "DELETE")
        }
        feedVersion += 1
    }

    func removeFriend(userId: String) async throws {
        try await api.sendNoContent("\(Self.base)/friends/\(userId)", method: "DELETE")
        feedVersion += 1
    }

    func blocks() async throws -> [CommunityUser] { try await lossy("\(Self.base)/blocks") }

    func block(userId: String) async throws {
        try await api.sendNoContent("\(Self.base)/blocks", method: "POST", json: UserIdBody(userId: userId))
        feedVersion += 1; groupsVersion += 1
    }

    func unblock(userId: String) async throws {
        try await api.sendNoContent("\(Self.base)/blocks/\(userId)", method: "DELETE")
        feedVersion += 1; groupsVersion += 1
    }

    func settings() async throws -> CommunitySettings { try await api.get("\(Self.base)/settings") }

    func updateSettings(_ settings: CommunitySettings) async throws -> CommunitySettings {
        try await api.send("\(Self.base)/settings", method: "PUT", json: settings)
    }

    // MARK: Plumbing

    /// Decodes an array, dropping rows that fail instead of failing the whole list.
    private func lossy<T: Decodable & Sendable>(_ path: String) async throws -> [T] {
        let rows: [Lossy<T>] = try await api.get(path)
        return rows.compactMap(\.value)
    }

    private struct ReactionBody: Encodable { let kind: String }
    private struct TextBody: Encodable { let text: String }
    private struct ReportBody: Encodable { let targetType: String; let targetId: String; let reason: String? }
    private struct NewGroupBody: Encodable { let name: String; let description: String?; let isPublic: Bool }
    private struct JoinBody: Encodable { let code: String?; let groupId: String? }
    private struct UpdateGroupBody: Encodable { let name: String?; let description: String?; let isPublic: Bool? }
    private struct RoleBody: Encodable { let role: String }
    private struct UserIdBody: Encodable { let userId: String }
}

extension CharacterSet {
    /// Characters allowed inside a query-string value (stricter than `.urlQueryAllowed`: no `&`, `+`, `=`).
    static let urlQueryValueAllowed: CharacterSet = {
        var set = CharacterSet.urlQueryAllowed
        set.remove(charactersIn: "&+=?#")
        return set
    }()
}

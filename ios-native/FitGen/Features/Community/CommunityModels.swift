import Foundation

// Community shapes returned by /api/community/*. Decoded with `JSONDecoder.api`
// (snake_case -> camelCase), leniently: ids may be ints, numbers may be strings, unknown enum values fall back.

// MARK: - Small enums

enum ReactionKind: String, CaseIterable, Identifiable, Codable, Sendable {
    case fire, clap, muscle, heart
    var id: String { rawValue }
    var emoji: String { switch self { case .fire: "🔥"; case .clap: "👏"; case .muscle: "💪"; case .heart: "❤️" } }
    var label: String { switch self { case .fire: "Fogo"; case .clap: "Palmas"; case .muscle: "Força"; case .heart: "Coração" } }
}

enum ActivityType: String, Sendable {
    case workoutCompleted = "workout_completed", streak, achievement, hydrationGoal = "hydration_goal"
    case challengeCompleted = "challenge_completed", post, groupJoined = "group_joined", unknown
}

enum Audience: String, CaseIterable, Identifiable, Codable, Sendable {
    case network, group, `public`
    var id: String { rawValue }
    var label: String { switch self { case .network: "Quem eu sigo e amigos"; case .group: "Um clube"; case .public: "Todos" } }
    var shortLabel: String { switch self { case .network: "Amigos"; case .group: "Clube"; case .public: "Público" } }
    var systemImage: String { switch self { case .network: "person.2.fill"; case .group: "person.3.fill"; case .public: "globe" } }
}

enum ImageRatio: String, CaseIterable, Identifiable, Codable, Sendable {
    case portrait = "4:5", vertical = "9:16"
    var id: String { rawValue }
    var label: String { self == .portrait ? "Retrato 4:5" : "Vertical 9:16" }
    var aspect: Double { self == .portrait ? 4.0 / 5.0 : 9.0 / 16.0 }
}

enum ChallengeMetric: String, CaseIterable, Identifiable, Codable, Sendable {
    case workouts, activeDays = "active_days", workoutMinutes = "workout_minutes", hydrationDays = "hydration_days", meals
    var id: String { rawValue }
    var label: String {
        switch self {
        case .workouts: "Treinos"; case .activeDays: "Dias ativos"; case .workoutMinutes: "Minutos"
        case .hydrationDays: "Meta de água"; case .meals: "Refeições"
        }
    }
    var unit: String {
        switch self {
        case .workouts: "treinos"; case .activeDays: "dias"; case .workoutMinutes: "min"
        case .hydrationDays: "dias"; case .meals: "refeições"
        }
    }
    var defaultTarget: Int {
        switch self { case .workouts: 12; case .activeDays: 20; case .workoutMinutes: 600; case .hydrationDays: 15; case .meals: 60 }
    }
}

enum FollowState: String, Sendable { case none, pending, accepted, `self` }
enum FriendshipState: String, Sendable { case none, friends, sent, received, `self` }
enum GroupRole: String, Codable, Sendable { case admin, member }
enum ChallengeStatus: String, Sendable { case upcoming, active, ended }
enum ReportTarget: String, Sendable { case activity, comment, user }

// MARK: - Loose JSON (activity payloads)

/// Any JSON value, for the free-form `payload` of an activity.
enum PayloadValue: Decodable, Hashable, Sendable {
    case string(String), number(Double), bool(Bool), array([PayloadValue]), object([String: PayloadValue]), null

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let v = try? c.decode(Bool.self) { self = .bool(v) }
        else if let v = try? c.decode(Double.self) { self = .number(v) }
        else if let v = try? c.decode(String.self) { self = .string(v) }
        else if let v = try? c.decode([PayloadValue].self) { self = .array(v) }
        else if let v = try? c.decode([String: PayloadValue].self) { self = .object(v) }
        else { self = .null }
    }
}

/// Activity payload with snake_case/camelCase tolerant lookups ("duration_seconds" == "durationSeconds").
struct ActivityPayload: Decodable, Hashable, Sendable {
    var values: [String: PayloadValue] = [:]

    init() {}
    init(from decoder: Decoder) throws {
        values = (try? decoder.singleValueContainer().decode([String: PayloadValue].self)) ?? [:]
    }

    private func value(_ key: String) -> PayloadValue? {
        if let v = values[key] { return v }
        let camel = key.split(separator: "_").enumerated().map { $0.offset == 0 ? String($0.element) : $0.element.capitalized }.joined()
        return values[camel]
    }

    func string(_ key: String) -> String? {
        switch value(key) {
        case .string(let s)?: s.isEmpty ? nil : s
        case .number(let n)?: n == n.rounded() ? String(Int(n)) : String(n)
        default: nil
        }
    }

    func number(_ key: String) -> Double? {
        switch value(key) {
        case .number(let n)?: n
        case .string(let s)?: Double(s.replacingOccurrences(of: ",", with: "."))
        default: nil
        }
    }
}

// MARK: - Users and activities

struct CommunityUser: Decodable, Identifiable, Hashable, Sendable {
    let id: String
    var name: String
    var profilePicture: String?
    var level: Int

    enum CodingKeys: String, CodingKey { case id, name, profilePicture, level }

    init(id: String, name: String, profilePicture: String? = nil, level: Int = 1) {
        self.id = id; self.name = name; self.profilePicture = profilePicture; self.level = level
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? UUID().uuidString
        name = (try? c.decodeIfPresent(String.self, forKey: .name)) ?? "Usuário"
        profilePicture = try? c.decodeIfPresent(String.self, forKey: .profilePicture)
        level = c.number(.level).map { Int($0) } ?? 1
    }

    var firstName: String { name.split(separator: " ").first.map(String.init) ?? name }
}

struct GroupRef: Decodable, Hashable, Sendable {
    let id: String
    let name: String?

    enum CodingKeys: String, CodingKey { case id, name }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? ""
        name = try? c.decodeIfPresent(String.self, forKey: .name)
    }
}

struct CommunityActivity: Decodable, Identifiable, Hashable, Sendable {
    let id: String
    let typeRaw: String
    var audience: Audience
    var group: GroupRef?
    var user: CommunityUser
    var payload: ActivityPayload
    var text: String?
    /// Non-nil when the post has a photo; load it with `CommunityStore.imagePayload(path: activity.imagePath)`.
    var image: String?
    let createdAt: String
    var reactions: [ReactionKind: Int]
    var reactionTotal: Int
    var myReaction: ReactionKind?
    var commentCount: Int
    var isMine: Bool

    enum CodingKeys: String, CodingKey {
        case id, type, audience, group, user, payload, text, image, createdAt, reactions, reactionTotal, myReaction, commentCount, isMine
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? UUID().uuidString
        typeRaw = (try? c.decodeIfPresent(String.self, forKey: .type)) ?? "post"
        audience = (try? c.decodeIfPresent(String.self, forKey: .audience)).flatMap(Audience.init(rawValue:)) ?? .network
        group = try? c.decodeIfPresent(GroupRef.self, forKey: .group)
        user = (try? c.decodeIfPresent(CommunityUser.self, forKey: .user)) ?? CommunityUser(id: "", name: "Usuário")
        payload = (try? c.decodeIfPresent(ActivityPayload.self, forKey: .payload)) ?? ActivityPayload()
        text = try? c.decodeIfPresent(String.self, forKey: .text)
        image = try? c.decodeIfPresent(String.self, forKey: .image)
        createdAt = (try? c.decodeIfPresent(String.self, forKey: .createdAt)) ?? ""
        let raw = (try? c.decodeIfPresent([String: Int].self, forKey: .reactions)) ?? [:]
        reactions = Dictionary(raw.compactMap { key, value in ReactionKind(rawValue: key).map { ($0, value) } }, uniquingKeysWith: { a, _ in a })
        reactionTotal = c.number(.reactionTotal).map { Int($0) } ?? reactions.values.reduce(0, +)
        myReaction = (try? c.decodeIfPresent(String.self, forKey: .myReaction)).flatMap(ReactionKind.init(rawValue:))
        commentCount = c.number(.commentCount).map { Int($0) } ?? 0
        isMine = (try? c.decodeIfPresent(Bool.self, forKey: .isMine)) ?? false
    }

    var type: ActivityType { ActivityType(rawValue: typeRaw) ?? .unknown }
    var date: Date? { ISODate.parse(createdAt) }
    var imageRatio: ImageRatio { ImageRatio(rawValue: payload.string("ratio") ?? "") ?? .portrait }
    var hasImage: Bool { image != nil }

    /// A copy with my reaction changed (optimistic update, same maths as the Expo app).
    func reacting(_ kind: ReactionKind?) -> CommunityActivity {
        var copy = self
        if let mine = myReaction { copy.reactions[mine] = max(0, (reactions[mine] ?? 1) - 1) }
        if let kind { copy.reactions[kind, default: 0] += 1 }
        copy.reactions = copy.reactions.filter { $0.value > 0 }
        copy.myReaction = kind
        copy.reactionTotal = copy.reactions.values.reduce(0, +)
        return copy
    }
}

struct FeedPage: Decodable, Sendable {
    let items: [CommunityActivity]
    let nextCursor: String?

    enum CodingKeys: String, CodingKey { case items, nextCursor }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        // Skip rows that fail to decode instead of failing the whole page.
        items = (try? c.decodeIfPresent([Lossy<CommunityActivity>].self, forKey: .items))?.compactMap(\.value) ?? []
        nextCursor = try? c.decodeIfPresent(String.self, forKey: .nextCursor)
    }
}

/// Decodes `T` or nil, so one bad element never breaks a whole array.
struct Lossy<T: Decodable & Sendable>: Decodable, Sendable {
    let value: T?
    init(from decoder: Decoder) throws { value = try? T(from: decoder) }
}

struct CommunityComment: Decodable, Identifiable, Hashable, Sendable {
    let id: String
    let text: String
    let createdAt: String
    let user: CommunityUser
    let isMine: Bool

    enum CodingKeys: String, CodingKey { case id, text, createdAt, user, isMine }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? UUID().uuidString
        text = (try? c.decodeIfPresent(String.self, forKey: .text)) ?? ""
        createdAt = (try? c.decodeIfPresent(String.self, forKey: .createdAt)) ?? ""
        user = (try? c.decodeIfPresent(CommunityUser.self, forKey: .user)) ?? CommunityUser(id: "", name: "Usuário")
        isMine = (try? c.decodeIfPresent(Bool.self, forKey: .isMine)) ?? false
    }
    var date: Date? { ISODate.parse(createdAt) }
}

/// One entry of GET /activities/{id}/reactions.
struct ReactionEntry: Decodable, Hashable, Sendable, Identifiable {
    let kind: ReactionKind
    let user: CommunityUser
    var id: String { user.id + kind.rawValue }

    enum CodingKeys: String, CodingKey { case kind, user }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        kind = (try? c.decodeIfPresent(String.self, forKey: .kind)).flatMap(ReactionKind.init(rawValue:)) ?? .fire
        user = try c.decode(CommunityUser.self, forKey: .user)
    }
}

// MARK: - Groups (clubes)

struct CommunityGroup: Decodable, Identifiable, Hashable, Sendable {
    let id: String
    var name: String
    var description: String?
    var isPublic: Bool
    /// Non-nil when the club has a photo; load it with `CommunityStore.groupImagePayload(id:)` or `CommunityImage`.
    var profilePicture: String?
    var memberCount: Int
    var myRole: GroupRole?
    var inviteCode: String?
    var createdAt: String
    var myRank: Int?
    var weekWorkouts: Int
    /// Public listing only: how many people I follow are members.
    var followedMembers: Int
    /// Created by the FitGen team.
    var official: Bool
    /// The subscribers' club (PRO).
    var premiumOnly: Bool

    enum CodingKeys: String, CodingKey {
        case id, name, description, isPublic, profilePicture, memberCount, myRole, inviteCode, createdAt, myRank, weekWorkouts,
             followedMembers, official, premiumOnly
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? UUID().uuidString
        name = (try? c.decodeIfPresent(String.self, forKey: .name)) ?? "Clube"
        description = try? c.decodeIfPresent(String.self, forKey: .description)
        isPublic = (try? c.decodeIfPresent(Bool.self, forKey: .isPublic)) ?? false
        profilePicture = try? c.decodeIfPresent(String.self, forKey: .profilePicture)
        memberCount = c.number(.memberCount).map { Int($0) } ?? 0
        myRole = (try? c.decodeIfPresent(String.self, forKey: .myRole)).flatMap(GroupRole.init(rawValue:))
        inviteCode = try? c.decodeIfPresent(String.self, forKey: .inviteCode)
        createdAt = (try? c.decodeIfPresent(String.self, forKey: .createdAt)) ?? ""
        myRank = c.number(.myRank).map { Int($0) }
        weekWorkouts = c.number(.weekWorkouts).map { Int($0) } ?? 0
        followedMembers = c.number(.followedMembers).map { Int($0) } ?? 0
        official = (try? c.decodeIfPresent(Bool.self, forKey: .official)) ?? false
        premiumOnly = (try? c.decodeIfPresent(Bool.self, forKey: .premiumOnly)) ?? false
    }

    var isMember: Bool { myRole != nil }
    var isAdmin: Bool { myRole == .admin }
    var hasPhoto: Bool { profilePicture != nil }
    var peopleLabel: String { "\(memberCount) \(memberCount == 1 ? "pessoa" : "pessoas")" }
}

/// GET /groups/preview/{code}: the group plus whether I'm already in / it's full.
@dynamicMemberLookup
struct GroupPreview: Decodable, Hashable, Sendable {
    let group: CommunityGroup
    let isMember: Bool
    let isFull: Bool

    enum CodingKeys: String, CodingKey { case isMember, isFull }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        group = try CommunityGroup(from: decoder)
        isMember = (try? c.decodeIfPresent(Bool.self, forKey: .isMember)) ?? false
        isFull = (try? c.decodeIfPresent(Bool.self, forKey: .isFull)) ?? false
    }
    subscript<V>(dynamicMember keyPath: KeyPath<CommunityGroup, V>) -> V { group[keyPath: keyPath] }
}

struct GroupMemberStats: Decodable, Identifiable, Hashable, Sendable {
    let user: CommunityUser
    let role: GroupRole
    let rank: Int
    let workouts: Int
    let minutes: Int
    let activeDays: Int
    let lastWorkoutAt: String?
    let inactive: Bool
    let isMe: Bool
    let blocked: Bool
    var id: String { user.id }

    enum CodingKeys: String, CodingKey { case user, role, rank, workouts, minutes, activeDays, lastWorkoutAt, inactive, isMe, blocked }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        user = try c.decode(CommunityUser.self, forKey: .user)
        role = (try? c.decodeIfPresent(String.self, forKey: .role)).flatMap(GroupRole.init(rawValue:)) ?? .member
        rank = c.number(.rank).map { Int($0) } ?? 0
        workouts = c.number(.workouts).map { Int($0) } ?? 0
        minutes = c.number(.minutes).map { Int($0) } ?? 0
        activeDays = c.number(.activeDays).map { Int($0) } ?? 0
        lastWorkoutAt = try? c.decodeIfPresent(String.self, forKey: .lastWorkoutAt)
        inactive = (try? c.decodeIfPresent(Bool.self, forKey: .inactive)) ?? false
        isMe = (try? c.decodeIfPresent(Bool.self, forKey: .isMe)) ?? false
        blocked = (try? c.decodeIfPresent(Bool.self, forKey: .blocked)) ?? false
    }
}

struct GroupWeek: Decodable, Hashable, Sendable {
    let start: String
    let end: String
}

@dynamicMemberLookup
struct GroupDetail: Decodable, Hashable, Sendable {
    let group: CommunityGroup
    let members: [GroupMemberStats]
    let week: GroupWeek?
    let challenges: [Challenge]

    enum CodingKeys: String, CodingKey { case members, week, challenges }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        group = try CommunityGroup(from: decoder)
        members = (try? c.decodeIfPresent([Lossy<GroupMemberStats>].self, forKey: .members))?.compactMap(\.value) ?? []
        week = try? c.decodeIfPresent(GroupWeek.self, forKey: .week)
        challenges = (try? c.decodeIfPresent([Lossy<Challenge>].self, forKey: .challenges))?.compactMap(\.value) ?? []
    }
    subscript<V>(dynamicMember keyPath: KeyPath<CommunityGroup, V>) -> V { group[keyPath: keyPath] }
}

// MARK: - Challenges

struct Challenge: Decodable, Identifiable, Hashable, Sendable {
    let id: String
    var title: String
    var description: String?
    /// Non-nil when the challenge has a cover; load it with `CommunityStore.challengeImagePayload(id:)`.
    var coverImage: String?
    let metricRaw: String
    var metricLabel: String
    var target: Int
    var startDate: String
    var endDate: String
    let statusRaw: String
    var isPublic: Bool
    var group: GroupRef?
    var participantCount: Int
    var joined: Bool
    var myProgress: Int?
    var completed: Bool
    var completedAt: String?

    enum CodingKeys: String, CodingKey {
        case id, title, description, coverImage, metric, metricLabel, target, startDate, endDate, status, isPublic, group,
             participantCount, joined, myProgress, completed, completedAt
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? UUID().uuidString
        title = (try? c.decodeIfPresent(String.self, forKey: .title)) ?? "Desafio"
        description = try? c.decodeIfPresent(String.self, forKey: .description)
        coverImage = try? c.decodeIfPresent(String.self, forKey: .coverImage)
        metricRaw = (try? c.decodeIfPresent(String.self, forKey: .metric)) ?? "workouts"
        metricLabel = (try? c.decodeIfPresent(String.self, forKey: .metricLabel)) ?? ""
        target = c.number(.target).map { Int($0) } ?? 0
        startDate = (try? c.decodeIfPresent(String.self, forKey: .startDate)) ?? ""
        endDate = (try? c.decodeIfPresent(String.self, forKey: .endDate)) ?? ""
        statusRaw = (try? c.decodeIfPresent(String.self, forKey: .status)) ?? "active"
        isPublic = (try? c.decodeIfPresent(Bool.self, forKey: .isPublic)) ?? false
        group = try? c.decodeIfPresent(GroupRef.self, forKey: .group)
        participantCount = c.number(.participantCount).map { Int($0) } ?? 0
        joined = (try? c.decodeIfPresent(Bool.self, forKey: .joined)) ?? false
        myProgress = c.number(.myProgress).map { Int($0) }
        completed = (try? c.decodeIfPresent(Bool.self, forKey: .completed)) ?? false
        completedAt = try? c.decodeIfPresent(String.self, forKey: .completedAt)
    }

    var metric: ChallengeMetric? { ChallengeMetric(rawValue: metricRaw) }
    var status: ChallengeStatus { ChallengeStatus(rawValue: statusRaw) ?? .active }
    var unit: String { metric?.unit ?? "" }
    var progressFraction: Double { target > 0 ? min(1, Double(myProgress ?? 0) / Double(target)) : 0 }
    /// "Encerrado", "Começa em 3 dias", "5 dias restantes", "Último dia".
    var whenLabel: String { CommunityFormat.challengeWhen(status: status, start: startDate, end: endDate) }
}

struct LeaderboardEntry: Decodable, Identifiable, Hashable, Sendable {
    let rank: Int
    let user: CommunityUser
    let progress: Int
    let completed: Bool
    let isMe: Bool
    var id: String { user.id }

    enum CodingKeys: String, CodingKey { case rank, user, progress, completed, isMe }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        rank = c.number(.rank).map { Int($0) } ?? 0
        user = try c.decode(CommunityUser.self, forKey: .user)
        progress = c.number(.progress).map { Int($0) } ?? 0
        completed = (try? c.decodeIfPresent(Bool.self, forKey: .completed)) ?? false
        isMe = (try? c.decodeIfPresent(Bool.self, forKey: .isMe)) ?? false
    }
}

@dynamicMemberLookup
struct ChallengeDetail: Decodable, Hashable, Sendable {
    let challenge: Challenge
    let canDelete: Bool
    let leaderboard: [LeaderboardEntry]

    enum CodingKeys: String, CodingKey { case canDelete, leaderboard }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        challenge = try Challenge(from: decoder)
        canDelete = (try? c.decodeIfPresent(Bool.self, forKey: .canDelete)) ?? false
        leaderboard = (try? c.decodeIfPresent([Lossy<LeaderboardEntry>].self, forKey: .leaderboard))?.compactMap(\.value) ?? []
    }
    subscript<V>(dynamicMember keyPath: KeyPath<Challenge, V>) -> V { challenge[keyPath: keyPath] }
}

/// Body of POST /challenges.
struct NewChallenge: Encodable, Sendable {
    var title: String
    var description: String?
    var metric: ChallengeMetric
    var target: Int
    var durationDays: Int
    var groupId: String?
    var isPublic: Bool = false
}

enum ChallengeScope: String, Sendable { case mine, available, `public` }

// MARK: - People

struct FriendCard: Decodable, Identifiable, Hashable, Sendable {
    /// Request id for `received` / `sent` (use with accept / decline); friendship id for `friends`.
    let id: String
    let user: CommunityUser
    let createdAt: String

    enum CodingKeys: String, CodingKey { case id, user, createdAt }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? UUID().uuidString
        user = try c.decode(CommunityUser.self, forKey: .user)
        createdAt = (try? c.decodeIfPresent(String.self, forKey: .createdAt)) ?? ""
    }
}

struct FriendsList: Decodable, Sendable {
    var friends: [FriendCard]
    var received: [FriendCard]
    var sent: [FriendCard]

    enum CodingKeys: String, CodingKey { case friends, received, sent }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        friends = (try? c.decodeIfPresent([Lossy<FriendCard>].self, forKey: .friends))?.compactMap(\.value) ?? []
        received = (try? c.decodeIfPresent([Lossy<FriendCard>].self, forKey: .received))?.compactMap(\.value) ?? []
        sent = (try? c.decodeIfPresent([Lossy<FriendCard>].self, forKey: .sent))?.compactMap(\.value) ?? []
    }
}

struct SharedGroup: Decodable, Hashable, Sendable, Identifiable {
    let id: String
    let name: String
    enum CodingKeys: String, CodingKey { case id, name }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? ""
        name = (try? c.decodeIfPresent(String.self, forKey: .name)) ?? ""
    }
}

@dynamicMemberLookup
struct CommunityProfile: Decodable, Hashable, Sendable {
    let user: CommunityUser
    let monthWorkouts: Int
    let monthMinutes: Int
    let workoutStreak: Int
    let friendCount: Int
    let followerCount: Int
    let followsMe: Bool
    let sharedGroupList: [SharedGroup]
    let following: Bool
    let followState: FollowState
    let followRequestId: String?
    let incomingRequestId: String?
    let sharedGroups: Int
    let friendship: FriendshipState
    let friendshipId: String?
    let blockedByMe: Bool

    enum CodingKeys: String, CodingKey {
        case stats, friendCount, followerCount, followsMe, sharedGroupList, following, followState, followRequestId,
             incomingRequestId, sharedGroups, friendship, friendshipId, blockedByMe
    }
    private struct Stats: Decodable {
        let monthWorkouts: Double?, monthMinutes: Double?, workoutStreak: Double?
        enum CodingKeys: String, CodingKey { case monthWorkouts, monthMinutes, workoutStreak }
        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            monthWorkouts = c.number(.monthWorkouts); monthMinutes = c.number(.monthMinutes); workoutStreak = c.number(.workoutStreak)
        }
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        user = try CommunityUser(from: decoder)
        let stats = try? c.decodeIfPresent(Stats.self, forKey: .stats)
        monthWorkouts = Int(stats?.monthWorkouts ?? 0)
        monthMinutes = Int(stats?.monthMinutes ?? 0)
        workoutStreak = Int(stats?.workoutStreak ?? 0)
        friendCount = c.number(.friendCount).map { Int($0) } ?? 0
        followerCount = c.number(.followerCount).map { Int($0) } ?? 0
        followsMe = (try? c.decodeIfPresent(Bool.self, forKey: .followsMe)) ?? false
        sharedGroupList = (try? c.decodeIfPresent([Lossy<SharedGroup>].self, forKey: .sharedGroupList))?.compactMap(\.value) ?? []
        following = (try? c.decodeIfPresent(Bool.self, forKey: .following)) ?? false
        followState = (try? c.decodeIfPresent(String.self, forKey: .followState)).flatMap(FollowState.init(rawValue:)) ?? .none
        followRequestId = try c.string(.followRequestId)
        incomingRequestId = try c.string(.incomingRequestId)
        sharedGroups = c.number(.sharedGroups).map { Int($0) } ?? sharedGroupList.count
        friendship = (try? c.decodeIfPresent(String.self, forKey: .friendship)).flatMap(FriendshipState.init(rawValue:)) ?? .none
        friendshipId = try c.string(.friendshipId)
        blockedByMe = (try? c.decodeIfPresent(Bool.self, forKey: .blockedByMe)) ?? false
    }
    subscript<V>(dynamicMember keyPath: KeyPath<CommunityUser, V>) -> V { user[keyPath: keyPath] }
    var isSelf: Bool { followState == .`self` || friendship == .`self` }
}

@dynamicMemberLookup
struct UserSearchResult: Decodable, Hashable, Sendable, Identifiable {
    let user: CommunityUser
    var followState: FollowState
    var friendship: FriendshipState
    var id: String { user.id }

    enum CodingKeys: String, CodingKey { case followState, friendship }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        user = try CommunityUser(from: decoder)
        followState = (try? c.decodeIfPresent(String.self, forKey: .followState)).flatMap(FollowState.init(rawValue:)) ?? .none
        friendship = (try? c.decodeIfPresent(String.self, forKey: .friendship)).flatMap(FriendshipState.init(rawValue:)) ?? .none
    }
    subscript<V>(dynamicMember keyPath: KeyPath<CommunityUser, V>) -> V { user[keyPath: keyPath] }
}

/// Answer of PUT /users/{id}/follow (`state` is "pending" or "accepted") and DELETE ("none").
struct FollowResult: Decodable, Sendable {
    let state: FollowState
    let requestId: String?
    enum CodingKeys: String, CodingKey { case state, requestId }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        state = (try? c.decodeIfPresent(String.self, forKey: .state)).flatMap(FollowState.init(rawValue:)) ?? .none
        requestId = try c.string(.requestId)
    }
}

struct CommunitySettings: Codable, Equatable, Sendable {
    var shareWorkouts = true
    var shareAchievements = true
    var shareStreaks = true
    var shareChallenges = true
    var shareHydration = true
    var discoverable = true

    init() {}
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        shareWorkouts = (try? c.decodeIfPresent(Bool.self, forKey: .shareWorkouts)) ?? true
        shareAchievements = (try? c.decodeIfPresent(Bool.self, forKey: .shareAchievements)) ?? true
        shareStreaks = (try? c.decodeIfPresent(Bool.self, forKey: .shareStreaks)) ?? true
        shareChallenges = (try? c.decodeIfPresent(Bool.self, forKey: .shareChallenges)) ?? true
        shareHydration = (try? c.decodeIfPresent(Bool.self, forKey: .shareHydration)) ?? true
        discoverable = (try? c.decodeIfPresent(Bool.self, forKey: .discoverable)) ?? true
    }
}

/// GET /…/image answers: a temporary signed `url` (R2) or a legacy `data_uri`.
struct ImagePayload: Decodable, Sendable {
    let url: String?
    let dataUri: String?

    var imageURL: URL? { url.flatMap(URL.init(string:)) }
    /// Decoded bytes of a legacy `data:image/…;base64,` payload.
    var inlineData: Data? {
        guard let dataUri, let comma = dataUri.firstIndex(of: ",") else { return nil }
        return Data(base64Encoded: String(dataUri[dataUri.index(after: comma)...]))
    }
}

// MARK: - Formatting helpers

enum CommunityFormat {
    /// "agora", "5 min", "3 h", "ontem", "12 nov".
    static func timeAgo(_ date: Date?, now: Date = .now) -> String {
        guard let date else { return "" }
        let diff = max(0, now.timeIntervalSince(date))
        if diff < 60 { return "agora" }
        if diff < 3600 { return "\(Int(diff / 60)) min" }
        if diff < 86_400 { return "\(Int(diff / 3600)) h" }
        if diff < 2 * 86_400 { return "ontem" }
        return Format.dayMonth(date).replacingOccurrences(of: ".", with: "")
    }

    /// Calendar days left (inclusive of today) until a "yyyy-MM-dd" date.
    static func daysLeft(until endDate: String, today: Date = .now) -> Int {
        guard let end = ISODate.parse(endDate) else { return 0 }
        var utc = Calendar(identifier: .gregorian)
        utc.timeZone = TimeZone(identifier: "UTC") ?? .gmt
        let endDay = utc.startOfDay(for: end)
        let todayDay = utc.startOfDay(for: utc.date(from: Calendar.current.dateComponents([.year, .month, .day], from: today)) ?? today)
        return (utc.dateComponents([.day], from: todayDay, to: endDay).day ?? 0) + 1
    }

    static func challengeWhen(status: ChallengeStatus, start: String, end: String) -> String {
        switch status {
        case .ended: return "Encerrado"
        case .upcoming:
            let n = daysLeft(until: start) - 1
            return n <= 1 ? "Começa amanhã" : "Começa em \(n) dias"
        case .active:
            let left = daysLeft(until: end)
            return left <= 1 ? "Último dia" : "\(left) dias restantes"
        }
    }

    /// Codes are typed from messages: uppercase, letters and digits only, 12 max.
    static func normalizeCode(_ value: String) -> String {
        String(value.uppercased().filter { $0.isASCII && ($0.isLetter || $0.isNumber) }.prefix(12))
    }

    static func inviteLink(code: String) -> String { "https://web.fitgen.pro/community/join/\(code)" }

    static func inviteMessage(groupName: String, code: String) -> String {
        "Bora treinar juntos? Entre no meu clube \"\(groupName)\" no FitGen.\n\nCódigo: \(code)\n\(inviteLink(code: code))"
    }
}

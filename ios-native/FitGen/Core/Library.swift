import Foundation

/// An entry of the FitGen exercise library (GET /exercises/library). Shared by the library screens,
/// the exercise picker (add / swap) and the plan editor.
struct LibraryExercise: Decodable, Identifiable, Sendable, Hashable {
    let id: String
    let name: String
    let category: String
    let difficultyLevel: String
    /// Keys; the first one is the primary muscle.
    let muscleGroups: [String]
    let equipmentNeeded: [String]
    let description: String?
    let instructions: [String]
    let tips: [String]
    let commonMistakes: [String]
    let animationUrl: String?
    let thumbnailUrl: String?

    enum CodingKeys: String, CodingKey {
        case id, name, category, difficultyLevel, muscleGroups, equipmentNeeded, description, instructions, tips, commonMistakes, animationUrl, thumbnailUrl
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? UUID().uuidString
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Exercício"
        category = try c.decodeIfPresent(String.self, forKey: .category) ?? "strength"
        difficultyLevel = try c.decodeIfPresent(String.self, forKey: .difficultyLevel) ?? "beginner"
        muscleGroups = (try? c.decodeIfPresent([String].self, forKey: .muscleGroups)) ?? []
        equipmentNeeded = (try? c.decodeIfPresent([String].self, forKey: .equipmentNeeded)) ?? []
        description = try c.decodeIfPresent(String.self, forKey: .description)
        instructions = (try? c.decodeIfPresent([String].self, forKey: .instructions)) ?? []
        tips = (try? c.decodeIfPresent([String].self, forKey: .tips)) ?? []
        commonMistakes = (try? c.decodeIfPresent([String].self, forKey: .commonMistakes)) ?? []
        animationUrl = try c.decodeIfPresent(String.self, forKey: .animationUrl)
        thumbnailUrl = try c.decodeIfPresent(String.self, forKey: .thumbnailUrl)
    }

    var primaryMuscle: String? { muscleGroups.first }
}

extension AppStore {
    /// The whole library; it rarely changes, so it is loaded once per launch.
    func library() async throws -> [LibraryExercise] {
        if let cached = LibraryCache.shared.items { return cached }
        let items: [LibraryExercise] = try await APIClient.shared.get("/exercises/library")
        LibraryCache.shared.items = items
        return items
    }
}

@MainActor
final class LibraryCache {
    static let shared = LibraryCache()
    var items: [LibraryExercise]?
}

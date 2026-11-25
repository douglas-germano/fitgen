import Foundation

struct ProgressPhoto: Decodable, Identifiable, Sendable, Hashable {
    let id: String
    let pose: String
    let takenAt: String
    let url: String?
    enum CodingKeys: String, CodingKey { case id, pose, takenAt, url }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? UUID().uuidString
        pose = try c.decodeIfPresent(String.self, forKey: .pose) ?? "front"
        takenAt = try c.decodeIfPresent(String.self, forKey: .takenAt) ?? ""
        url = try c.decodeIfPresent(String.self, forKey: .url)
    }
    var date: Date? { ISODate.parse(takenAt) }
    var imageURL: URL? { url.flatMap(URL.init(string:)) }
}

enum Pose: String, CaseIterable, Identifiable {
    case front, side, back
    var id: String { rawValue }
    var label: String { switch self { case .front: "Frente"; case .side: "Lado"; case .back: "Costas" } }
}

extension AppStore {
    func progressPhotos() async throws -> [ProgressPhoto] { try await APIClient.shared.get("/progress/photos") }

    func uploadProgressPhoto(_ data: Data, pose: Pose) async throws {
        let _: ProgressPhoto = try await APIClient.shared.upload("/progress/photos", fields: ["pose": pose.rawValue],
                                                                files: [("image", "progresso.jpg", data, "image/jpeg")])
    }

    func deleteProgressPhoto(id: String) async throws {
        try await APIClient.shared.sendNoContent("/progress/photos/\(id)", method: "DELETE")
    }
}

import SwiftUI

struct CoachMessage: Identifiable, Equatable {
    enum Role { case user, otto }
    let id: String
    let role: Role
    let text: String
    let date: Date
    var failed = false
}

private struct ChatHistoryItem: Decodable {
    let id: Int?
    let role: String
    let content: String
    let createdAt: String?

    private enum CodingKeys: String, CodingKey { case id, role, content, createdAt }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        // The id may be an Int or a String depending on the backend model.
        if let n = try? c.decode(Int.self, forKey: .id) { id = n }
        else if let s = try? c.decode(String.self, forKey: .id) { id = Int(s) } else { id = nil }
        role = try c.decode(String.self, forKey: .role)
        content = try c.decode(String.self, forKey: .content)
        createdAt = try? c.decode(String.self, forKey: .createdAt)
    }
}

private struct ChatRequest: Encodable { let message: String }
private struct ChatAnswer: Decodable { let answer: String }

@MainActor @Observable
final class CoachModel {
    var messages: [CoachMessage] = []
    var isLoading = true
    var isSending = false
    var loadError: String?
    var premiumRequired = false

    private let api = APIClient.shared

    func load() async {
        isLoading = messages.isEmpty
        loadError = nil
        do {
            let items: [ChatHistoryItem] = try await api.get("/chat/history?limit=50")
            messages = items.enumerated().map { index, item in
                CoachMessage(id: item.id.map { "srv-\($0)" } ?? "h-\(index)",
                             role: item.role == "user" ? .user : .otto,
                             text: item.content,
                             date: Self.parse(item.createdAt) ?? .now)
            }
        } catch let error as APIError where error.isPremiumRequired {
            premiumRequired = true
        } catch {
            loadError = error.localizedDescription
        }
        isLoading = false
    }

    func send(_ text: String) async {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty, !isSending else { return }
        messages.append(CoachMessage(id: "local-\(UUID().uuidString)", role: .user, text: trimmed, date: .now))
        await deliver(trimmed)
    }

    func retry(_ message: CoachMessage) async {
        guard !isSending, let index = messages.firstIndex(where: { $0.id == message.id }) else { return }
        messages[index].failed = false
        await deliver(message.text)
    }

    private func deliver(_ text: String) async {
        isSending = true
        defer { isSending = false }
        do {
            let answer: ChatAnswer = try await api.send("/chat", method: "POST", json: ChatRequest(message: text))
            messages.append(CoachMessage(id: "local-\(UUID().uuidString)", role: .otto, text: answer.answer, date: .now))
        } catch let error as APIError where error.isPremiumRequired {
            premiumRequired = true
            markLastUserFailed()
        } catch {
            loadError = nil
            markLastUserFailed()
            lastError = error.localizedDescription
        }
    }

    var lastError: String?

    private func markLastUserFailed() {
        if let i = messages.lastIndex(where: { $0.role == .user }) { messages[i].failed = true }
    }

    func clear() async {
        do {
            try await api.sendNoContent("/chat/clear", method: "DELETE")
            messages = []
        } catch {
            lastError = error.localizedDescription
        }
    }

    /// Backend sends naive ISO timestamps (America/Cuiaba); treat them as device-local.
    private static func parse(_ string: String?) -> Date? {
        guard let string else { return nil }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = iso.date(from: string) { return d }
        iso.formatOptions = [.withInternetDateTime]
        if let d = iso.date(from: string) { return d }
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        for format in ["yyyy-MM-dd'T'HH:mm:ss.SSSSSS", "yyyy-MM-dd'T'HH:mm:ss"] {
            f.dateFormat = format
            if let d = f.date(from: string) { return d }
        }
        return nil
    }
}

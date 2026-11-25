import Foundation

struct APIError: LocalizedError, Sendable {
    let status: Int
    let message: String
    var code: String?

    var errorDescription: String? { message }
    var isPremiumRequired: Bool { status == 402 && code == "premium_required" }
}

/// Talks to the FitGen Flask API. Handles the bearer token and one shared refresh on 401.
actor APIClient {
    static let shared = APIClient()

    static let baseURL: URL = {
        let raw = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String
        return URL(string: raw ?? "") ?? URL(string: "https://dev-api.fitgen.pro/api")!
    }()

    private enum Key { static let access = "access_token"; static let refresh = "refresh_token" }

    private var accessToken: String? = Keychain.get(Key.access)
    private var refreshToken: String? = Keychain.get(Key.refresh)
    private var refreshTask: Task<Bool, Never>?

    /// Called on the main actor when the session can't be recovered.
    private var onUnauthorized: (@Sendable () -> Void)?

    nonisolated var hasStoredSession: Bool { Keychain.get(Key.access) != nil }

    func setUnauthorizedHandler(_ handler: @escaping @Sendable () -> Void) { onUnauthorized = handler }

    func saveTokens(access: String, refresh: String?) {
        accessToken = access
        refreshToken = refresh
        Keychain.set(access, for: Key.access)
        Keychain.set(refresh, for: Key.refresh)
    }

    func clearTokens() {
        accessToken = nil
        refreshToken = nil
        Keychain.set(nil, for: Key.access)
        Keychain.set(nil, for: Key.refresh)
    }

    // MARK: Requests

    func get<T: Decodable>(_ path: String, as: T.Type = T.self) async throws -> T {
        try await send(path, method: "GET", body: nil)
    }

    @discardableResult
    func send<T: Decodable>(_ path: String, method: String, json: some Encodable, as: T.Type = T.self) async throws -> T {
        let data = try JSONEncoder.api.encode(json)
        return try await send(path, method: method, body: .json(data))
    }

    func sendNoContent(_ path: String, method: String, json: (any Encodable)? = nil) async throws {
        let body: Body? = try json.map { .json(try JSONEncoder.api.encode($0)) }
        let _: Empty = try await send(path, method: method, body: body)
    }

    func upload<T: Decodable>(_ path: String, fields: [String: String], files: [(name: String, filename: String, data: Data, mime: String)]) async throws -> T {
        let boundary = "FitGen-\(UUID().uuidString)"
        var body = Data()
        for (key, value) in fields {
            body.append("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(key)\"\r\n\r\n\(value)\r\n")
        }
        for file in files {
            body.append("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(file.name)\"; filename=\"\(file.filename)\"\r\nContent-Type: \(file.mime)\r\n\r\n")
            body.append(file.data)
            body.append("\r\n")
        }
        body.append("--\(boundary)--\r\n")
        return try await send(path, method: "POST", body: .multipart(body, boundary: boundary))
    }

    enum Body: Sendable {
        case json(Data)
        case multipart(Data, boundary: String)
    }

    private func send<T: Decodable>(_ path: String, method: String, body: Body?, publicRoute: Bool = false, isRetry: Bool = false) async throws -> T {
        var request = URLRequest(url: URL(string: Self.baseURL.absoluteString + path)!)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.timeoutInterval = 60
        switch body {
        case .json(let data):
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = data
        case .multipart(let data, let boundary):
            request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
            request.httpBody = data
        case nil: break
        }
        if !publicRoute, let accessToken { request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization") }

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw APIError(status: 0, message: "Sem conexão com o servidor. Verifique a rede e tente novamente.")
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0

        if status == 401 && !publicRoute {
            if !isRetry, await refresh() {
                return try await send(path, method: method, body: body, publicRoute: publicRoute, isRetry: true)
            }
            clearTokens()
            onUnauthorized?()
            throw APIError(status: 401, message: "Sua sessão expirou. Entre novamente.")
        }

        guard (200..<300).contains(status) else { throw Self.error(status: status, data: data) }
        if T.self == Empty.self { return Empty() as! T }
        if data.isEmpty, let empty = Empty() as? T { return empty }
        do {
            return try JSONDecoder.api.decode(T.self, from: data)
        } catch {
            #if DEBUG
            print("Decode \(path):", error)
            #endif
            throw APIError(status: status, message: "Resposta inesperada do servidor.")
        }
    }

    /// Public routes (login, register) skip the token and the refresh flow.
    func publicPost<T: Decodable>(_ path: String, json: some Encodable) async throws -> T {
        try await send(path, method: "POST", body: .json(try JSONEncoder.api.encode(json)), publicRoute: true)
    }

    private func refresh() async -> Bool {
        if let refreshTask { return await refreshTask.value }
        guard let token = refreshToken else { return false }
        let task = Task<Bool, Never> {
            var request = URLRequest(url: Self.baseURL.appendingPathComponent("auth/refresh"))
            request.httpMethod = "POST"
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            guard let (data, response) = try? await URLSession.shared.data(for: request),
                  (response as? HTTPURLResponse)?.statusCode == 200,
                  let tokens = try? JSONDecoder.api.decode(LoginResponse.self, from: data) else { return false }
            saveTokens(access: tokens.accessToken, refresh: tokens.refreshToken ?? token)
            return true
        }
        refreshTask = task
        let ok = await task.value
        refreshTask = nil
        return ok
    }

    private static func error(status: Int, data: Data) -> APIError {
        let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        let code = object?["code"] as? String
        if status == 402 && code == "premium_required" {
            return APIError(status: 402, message: "Esse recurso faz parte do FitGen Premium.", code: code)
        }
        var message = ["msg", "message", "error"].lazy.compactMap { object?[$0] as? String }.first
        if let errors = object?["errors"] as? [String: Any] {
            let fields = errors.values.flatMap { ($0 as? [String]) ?? [($0 as? String)].compactMap { $0 } }
            if !fields.isEmpty { message = fields.joined(separator: "\n") }
        }
        let fallback: String = switch status {
        case 404, 405: "Este recurso ainda não está disponível. Tente novamente mais tarde."
        case 429: "Muitas tentativas seguidas. Aguarde um pouco e tente novamente."
        case 500...: "O servidor está com instabilidade. Tente novamente em instantes."
        default: "Falha na requisição (\(status))"
        }
        return APIError(status: status, message: message ?? fallback, code: code)
    }
}

struct Empty: Codable, Sendable {}

private extension Data {
    mutating func append(_ string: String) { append(Data(string.utf8)) }
}

extension JSONDecoder {
    static let api: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return decoder
    }()
}

extension JSONEncoder {
    static let api: JSONEncoder = {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        return encoder
    }()
}

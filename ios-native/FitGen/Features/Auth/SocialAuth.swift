import AuthenticationServices
import CryptoKit
import SwiftUI

/// Google sign-in through the system browser (OAuth code + PKCE with the iOS client id from the Expo app's
/// app.json), so no extra SDK or Info.plist entry is needed. The id_token goes to POST /auth/social.
enum GoogleOAuth {
    static let clientId = "384376883472-vcuta0k7h9kkfsiuus9c700mj5j2p8dg.apps.googleusercontent.com"
    static let scheme = "com.googleusercontent.apps.384376883472-vcuta0k7h9kkfsiuus9c700mj5j2p8dg"
    static var redirect: String { "\(scheme):/oauth2redirect" }

    struct Credential { let idToken: String; let name: String? }
    struct Failure: LocalizedError { let errorDescription: String? }

    private static func random(_ count: Int) -> String {
        var bytes = [UInt8](repeating: 0, count: count)
        _ = SecRandomCopyBytes(kSecRandomDefault, count, &bytes)
        return Data(bytes).base64URL
    }

    /// Opens the Google account picker and returns the id_token, or nil if the user cancelled.
    @MainActor
    static func signIn(using session: WebAuthenticationSession) async throws -> Credential? {
        let verifier = random(48)
        let challenge = Data(SHA256.hash(data: Data(verifier.utf8))).base64URL
        let state = random(16)
        var comps = URLComponents(string: "https://accounts.google.com/o/oauth2/v2/auth")!
        comps.queryItems = [
            .init(name: "client_id", value: clientId),
            .init(name: "redirect_uri", value: redirect),
            .init(name: "response_type", value: "code"),
            .init(name: "scope", value: "openid email profile"),
            .init(name: "code_challenge", value: challenge),
            .init(name: "code_challenge_method", value: "S256"),
            .init(name: "state", value: state),
            .init(name: "prompt", value: "select_account"),
        ]
        let callback: URL
        do {
            callback = try await session.authenticate(using: comps.url!, callbackURLScheme: scheme)
        } catch let error as ASWebAuthenticationSessionError where error.code == .canceledLogin {
            return nil
        }
        let items = URLComponents(url: callback, resolvingAgainstBaseURL: false)?.queryItems ?? []
        guard items.first(where: { $0.name == "state" })?.value == state,
              let code = items.first(where: { $0.name == "code" })?.value else {
            throw Failure(errorDescription: "O Google não concluiu o login. Tente novamente.")
        }

        var request = URLRequest(url: URL(string: "https://oauth2.googleapis.com/token")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        var form = URLComponents()
        form.queryItems = [
            .init(name: "client_id", value: clientId), .init(name: "code", value: code),
            .init(name: "code_verifier", value: verifier), .init(name: "redirect_uri", value: redirect),
            .init(name: "grant_type", value: "authorization_code"),
        ]
        request.httpBody = Data((form.percentEncodedQuery ?? "").utf8)
        guard let (data, response) = try? await URLSession.shared.data(for: request) else {
            throw Failure(errorDescription: "Sem conexão com o Google. Verifique a rede e tente novamente.")
        }
        guard (response as? HTTPURLResponse)?.statusCode == 200,
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let idToken = json["id_token"] as? String else {
            throw Failure(errorDescription: "O Google não retornou o token de login.")
        }
        return Credential(idToken: idToken, name: claim("name", in: idToken))
    }

    private static func claim(_ key: String, in jwt: String) -> String? {
        let parts = jwt.split(separator: ".")
        guard parts.count > 1, let data = Data(base64URL: String(parts[1])),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return nil }
        return json[key] as? String
    }
}

private extension Data {
    var base64URL: String {
        base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

    init?(base64URL string: String) {
        var s = string.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while s.count % 4 != 0 { s += "=" }
        self.init(base64Encoded: s)
    }
}

/// "Continuar com a Apple" + "Continuar com o Google", with shared busy / error handling.
struct SocialSignInButtons: View {
    var referralCode: String = ""
    @Environment(Session.self) private var session
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.webAuthenticationSession) private var webAuth
    @State private var busy: Provider?
    @State private var error: String?

    enum Provider { case apple, google }

    var body: some View {
        VStack(spacing: 12) {
            SignInWithAppleButton(.continue) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { result in
                handleApple(result)
            }
            .signInWithAppleButtonStyle(colorScheme == .dark ? .white : .black)
            .frame(height: 52)
            .clipShape(Capsule())
            .disabled(busy != nil)
            .opacity(busy == .apple ? 0.6 : 1)
            .overlay { if busy == .apple { ProgressView() } }
            .accessibilityLabel("Continuar com a Apple")

            Button(action: google) {
                HStack(spacing: 10) {
                    if busy == .google { ProgressView() } else {
                        Text("G").font(.system(size: 20, weight: .bold, design: .rounded))
                            .foregroundStyle(LinearGradient(colors: [.blue, .red, .yellow, .green], startPoint: .topLeading, endPoint: .bottomTrailing))
                            .accessibilityHidden(true)
                    }
                    Text("Continuar com o Google").font(.headline)
                }
                .foregroundStyle(.primary)
                .frame(maxWidth: .infinity, minHeight: 52)
                .background(Theme.card, in: Capsule())
                .overlay(Capsule().strokeBorder(Theme.separator, lineWidth: 1))
                .contentShape(Capsule())
            }
            .buttonStyle(.plain)
            .disabled(busy != nil)
            .accessibilityLabel("Continuar com o Google")

            if let error { AuthErrorLabel(message: error) }
        }
        .animation(.easeOut(duration: 0.2), value: error)
    }

    private func handleApple(_ result: Result<ASAuthorization, Error>) {
        switch result {
        case .failure(let failure):
            if (failure as? ASAuthorizationError)?.code == .canceled { return }
            // Free developer teams can't carry the Sign in with Apple capability: the system rejects the request.
            fail((failure as? ASAuthorizationError)?.code == .unknown
                 ? "Entrar com a Apple estará disponível na versão da App Store."
                 : "Não foi possível entrar com a Apple.")
        case .success(let auth):
            guard let credential = auth.credential as? ASAuthorizationAppleIDCredential,
                  let data = credential.identityToken, let token = String(data: data, encoding: .utf8) else {
                fail("A Apple não retornou o token de login."); return
            }
            var name: String?
            if let parts = credential.fullName {
                let formatted = PersonNameComponentsFormatter().string(from: parts).trimmingCharacters(in: .whitespaces)
                name = formatted.isEmpty ? nil : formatted
            }
            run(.apple) { try await session.signInSocial(provider: "apple", idToken: token, name: name, referralCode: referralCode) }
        }
    }

    private func google() {
        run(.google) {
            guard let credential = try await GoogleOAuth.signIn(using: webAuth) else { return }
            try await session.signInSocial(provider: "google", idToken: credential.idToken, name: credential.name, referralCode: referralCode)
        }
    }

    private func run(_ provider: Provider, _ work: @escaping @MainActor () async throws -> Void) {
        busy = provider
        error = nil
        Task {
            do { try await work(); Haptics.success() }
            catch {
                fail(provider == .google && (error as? APIError)?.status == 401
                     ? "Não foi possível entrar com o Google. Use e-mail e senha por enquanto."
                     : error.localizedDescription)
            }
            busy = nil
        }
    }

    private func fail(_ message: String) {
        error = message
        Haptics.error()
        busy = nil
    }
}

/// "ou" divider between the form and the social buttons.
struct OrDivider: View {
    var body: some View {
        HStack(spacing: 12) {
            Rectangle().fill(Theme.separator).frame(height: 1)
            Text("ou").font(.footnote).foregroundStyle(Theme.secondary)
            Rectangle().fill(Theme.separator).frame(height: 1)
        }
        .accessibilityHidden(true)
    }
}

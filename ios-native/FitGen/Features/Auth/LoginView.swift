import SwiftUI

struct LoginView: View {
    @Environment(Session.self) private var session
    @State private var email = ""
    @State private var password = ""
    @State private var loading = false
    @State private var error: String?
    @FocusState private var focus: Field?

    enum Field { case email, password }

    private var canSubmit: Bool { !email.trimmingCharacters(in: .whitespaces).isEmpty && !password.isEmpty }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                AuthHeader(icon: "figure.run", title: "Bem-vindo de volta",
                           subtitle: "Entre para ver seu treino e seu dia.")
                    .padding(.top, 8)

                VStack(spacing: 12) {
                    AuthField(icon: "envelope", placeholder: "E-mail", text: $email, isFocused: focus == .email, hasError: error != nil)
                        .textContentType(.username).keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never).autocorrectionDisabled()
                        .focused($focus, equals: .email).submitLabel(.next)
                        .onSubmit { focus = .password }
                    AuthPasswordField(text: $password, isFocused: focus == .password, hasError: error != nil)
                        .focused($focus, equals: .password).submitLabel(.go)
                        .onSubmit(submit)
                }

                if let error { AuthErrorLabel(message: error) }

                NavigationLink(value: AuthRoute.forgot) {
                    Text("Esqueci minha senha").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.voltText)
                        .frame(maxWidth: .infinity, minHeight: 36, alignment: .trailing)
                }

                AuthPrimaryButton(title: "Entrar", loading: loading, action: submit)
                    .disabled(!canSubmit)

                OrDivider().padding(.vertical, 4)
                SocialSignInButtons()

                HStack(spacing: 4) {
                    Text("Ainda não tem conta?").foregroundStyle(Theme.secondary)
                    NavigationLink(value: AuthRoute.register) { Text("Criar conta").bold().foregroundStyle(Theme.voltText) }
                }
                .font(.subheadline)
                .frame(minHeight: 44)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
        .scrollDismissesKeyboard(.interactively)
        .background { AuthBackground(intensity: 0.5) }
        .navigationBarTitleDisplayMode(.inline)
        .animation(.easeOut(duration: 0.2), value: error)
    }

    private func submit() {
        guard !loading, canSubmit else { return }
        focus = nil
        loading = true
        error = nil
        Task {
            do { try await session.signIn(email: email, password: password); Haptics.success() }
            catch let e as APIError where e.status == 401 { error = "E-mail ou senha incorretos."; Haptics.error() }
            catch { self.error = error.localizedDescription; Haptics.error() }
            loading = false
        }
    }
}

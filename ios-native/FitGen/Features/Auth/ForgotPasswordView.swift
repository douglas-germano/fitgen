import SwiftUI

/// Requests the reset e-mail. The backend sends a link to the web reset page (admin site), so there is no
/// in-app "enter the code" step: the Expo app's reset-password screen only runs from a deep link.
struct ForgotPasswordView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var loading = false
    @State private var sent = false
    @State private var error: String?
    @FocusState private var focused: Bool

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if sent { sentState } else { form }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
        .scrollDismissesKeyboard(.interactively)
        .background { AuthBackground(intensity: 0.5) }
        .navigationBarTitleDisplayMode(.inline)
        .animation(.easeOut(duration: 0.25), value: sent)
        .animation(.easeOut(duration: 0.2), value: error)
    }

    private var form: some View {
        VStack(spacing: 20) {
            AuthHeader(icon: "key.fill", title: "Esqueceu a senha?",
                       subtitle: "Informe seu e-mail e enviaremos um link para criar uma nova senha.")
                .padding(.top, 8)
            AuthField(icon: "envelope", placeholder: "seu@email.com", text: $email, isFocused: focused, hasError: error != nil)
                .textContentType(.emailAddress).keyboardType(.emailAddress)
                .textInputAutocapitalization(.never).autocorrectionDisabled()
                .focused($focused).submitLabel(.send)
                .onSubmit(submit)
            if let error { AuthErrorLabel(message: error) }
            AuthPrimaryButton(title: "Enviar link", loading: loading, action: submit)
                .disabled(email.trimmingCharacters(in: .whitespaces).isEmpty)
            Button { dismiss() } label: {
                (Text("Lembrou a senha? ").foregroundStyle(Theme.secondary) + Text("Voltar ao login").bold().foregroundStyle(Theme.voltText))
                    .font(.subheadline).frame(minHeight: 44)
            }
        }
    }

    private var sentState: some View {
        VStack(spacing: 20) {
            Image(systemName: "envelope.badge.fill")
                .font(.system(size: 40, weight: .bold)).foregroundStyle(.black)
                .frame(width: 88, height: 88)
                .background(Theme.voltGradient, in: RoundedRectangle(cornerRadius: 28, style: .continuous))
                .padding(.top, 40)
                .accessibilityHidden(true)
            Text("Enviamos um link para seu e-mail")
                .font(.system(.title, design: .rounded).bold()).multilineTextAlignment(.center)
                .accessibilityAddTraits(.isHeader)
            Text("Se **\(email.trimmingCharacters(in: .whitespaces))** estiver cadastrado, você receberá as instruções para redefinir sua senha em instantes. Confira também a caixa de spam.")
                .foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
            VStack(spacing: 12) {
                Button { dismiss() } label: { Text("Voltar ao login").frame(minHeight: 52) }
                    .buttonStyle(.fitgenPrimary)
                Button { sent = false; email = "" } label: {
                    Text("Usar outro e-mail").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.voltText).frame(minHeight: 44)
                }
            }
            .padding(.top, 8)
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .highlightCard()
        .padding(.top, 24)
        .accessibilityElement(children: .contain)
    }

    private func submit() {
        guard !loading else { return }
        guard AuthValidation.validEmail(email) else { error = "Informe um e-mail válido."; Haptics.error(); return }
        focused = false
        loading = true
        error = nil
        Task {
            do { try await session.requestPasswordReset(email: email); sent = true; Haptics.success() }
            catch { self.error = error.localizedDescription; Haptics.error() }
            loading = false
        }
    }
}

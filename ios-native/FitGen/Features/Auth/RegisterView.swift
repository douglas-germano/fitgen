import SwiftUI

struct RegisterView: View {
    /// Prefilled referral code (e.g. from a deep link).
    var referral: String = ""

    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var email = ""
    @State private var phone = ""
    @State private var password = ""
    @State private var referralCode = ""
    @State private var loading = false
    @State private var created = false
    @State private var error: String?
    @FocusState private var focus: Field?

    enum Field { case name, email, phone, password, referral }

    private var checks: AuthValidation.PasswordChecks { .init(password) }

    var body: some View {
        ScrollView {
            VStack(spacing: 14) {
                AuthHeader(icon: "person.crop.circle.badge.plus", title: "Vamos começar.",
                           subtitle: "Crie sua conta e configure seus objetivos de treino e alimentação.")
                    .padding(.top, 8).padding(.bottom, 6)

                AuthField(icon: "person", placeholder: "Nome completo", text: $name, isFocused: focus == .name)
                    .textContentType(.name).textInputAutocapitalization(.words)
                    .focused($focus, equals: .name).submitLabel(.next).onSubmit { focus = .email }

                AuthField(icon: "envelope", placeholder: "E-mail", text: $email, isFocused: focus == .email)
                    .textContentType(.emailAddress).keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                    .focused($focus, equals: .email).submitLabel(.next).onSubmit { focus = .phone }

                AuthField(icon: "phone", placeholder: "Celular com DDD (opcional)", text: $phone, isFocused: focus == .phone)
                    .textContentType(.telephoneNumber).keyboardType(.numberPad)
                    .focused($focus, equals: .phone)
                    .onChange(of: phone) { _, new in
                        let masked = AuthValidation.maskPhone(new)
                        if masked != new { phone = masked }
                    }

                AuthPasswordField(placeholder: "Senha", text: $password, isFocused: focus == .password, contentType: .newPassword)
                    .focused($focus, equals: .password).submitLabel(.next).onSubmit { focus = .referral }
                strengthMeter

                AuthField(icon: "gift", placeholder: "Código de indicação (opcional)", text: $referralCode, isFocused: focus == .referral)
                    .textInputAutocapitalization(.characters).autocorrectionDisabled()
                    .focused($focus, equals: .referral).submitLabel(.go).onSubmit(submit)
                    .onChange(of: referralCode) { _, new in if new.count > 24 { referralCode = String(new.prefix(24)) } }

                if let error { AuthErrorLabel(message: error) }

                AuthPrimaryButton(title: "Criar conta", loading: loading, action: submit)
                    .padding(.top, 4)

                Text("Ao criar a conta, você concorda com os [Termos de Uso](\(WelcomeView.termsURL.absoluteString)) e a [Política de Privacidade](\(WelcomeView.privacyURL.absoluteString)).")
                    .font(.caption).foregroundStyle(Theme.secondary).multilineTextAlignment(.center).tint(Theme.voltText)

                OrDivider().padding(.vertical, 4)
                SocialSignInButtons(referralCode: referralCode.trimmingCharacters(in: .whitespaces))

                Button { dismiss() } label: {
                    (Text("Já tenho conta · ").foregroundStyle(Theme.secondary) + Text("Entrar").bold().foregroundStyle(Theme.voltText))
                        .font(.subheadline).frame(minHeight: 44)
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
        .scrollDismissesKeyboard(.interactively)
        .background { AuthBackground(intensity: 0.5) }
        .navigationBarTitleDisplayMode(.inline)
        .animation(.easeOut(duration: 0.2), value: error)
        .onAppear { if referralCode.isEmpty { referralCode = referral.uppercased() } }
    }

    private var strengthMeter: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 4) {
                ForEach(0..<4, id: \.self) { i in
                    Capsule().fill(i < checks.score ? strengthColor : Theme.separator).frame(height: 4)
                }
            }
            .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 6) {
                requirement("Pelo menos 8 caracteres", met: checks.length)
                requirement("Uma letra maiúscula", met: checks.upper)
                requirement("Uma letra minúscula", met: checks.lower)
                requirement("Um número", met: checks.digit)
            }
        }
        .padding(.horizontal, 4)
        .animation(.easeOut(duration: 0.2), value: checks.score)
    }

    private var strengthColor: Color {
        switch checks.score { case ...1: Theme.calories; case 2, 3: Theme.protein; default: Theme.voltText }
    }

    private func requirement(_ text: String, met: Bool) -> some View {
        Label {
            Text(text).font(.footnote).foregroundStyle(met ? .primary : Theme.secondary)
        } icon: {
            Image(systemName: met ? "checkmark.circle.fill" : "circle").foregroundStyle(met ? Theme.voltText : Theme.secondary)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(text), \(met ? "atendido" : "pendente")")
    }

    private func submit() {
        guard !loading else { return }
        let validation: String? =
            name.trimmingCharacters(in: .whitespaces).count < 2 ? "Informe seu nome."
            : !AuthValidation.validEmail(email) ? "Informe um e-mail válido."
            : !checks.all ? "A senha precisa ter 8 caracteres, com maiúscula, minúscula e número."
            : nil
        if let validation { error = validation; Haptics.error(); return }
        focus = nil
        loading = true
        error = nil
        Task {
            do {
                if !created {
                    try await session.createAccount(name: name, email: email, password: password,
                                                    phone: phone.filter(\.isNumber), referralCode: referralCode.trimmingCharacters(in: .whitespaces))
                    created = true
                }
                try await session.signIn(email: email, password: password)
                Haptics.success()
            } catch { self.error = error.localizedDescription; Haptics.error() }
            loading = false
        }
    }
}

import SwiftUI

enum AuthRoute: Hashable { case login, register, forgot }

/// First screen when signed out: brand look, Otto, social buttons and the e-mail paths.
struct WelcomeView: View {
    @State private var path: [AuthRoute] = []
    @State private var appeared = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    static let privacyURL = URL(string: "https://fitgen.pro/privacidade")!
    static let termsURL = URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!

    var body: some View {
        NavigationStack(path: $path) {
            GeometryReader { geo in
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        Image("LogoMark")
                            .resizable().scaledToFit()
                            .frame(width: 60, height: 60)
                            .accessibilityLabel("FitGen")
                            .padding(.top, 24)

                        Text("Seu treino e sua dieta, guiados pelo Otto")
                            .font(.system(.largeTitle, design: .rounded).weight(.heavy))
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(.top, 24)
                            .accessibilityAddTraits(.isHeader)

                        Text("Treinos, refeições e evolução em um só lugar, com um coach que conhece a sua rotina.")
                            .font(.body).foregroundStyle(Theme.secondary)
                            .padding(.top, 10)

                        ottoBubble.padding(.top, 24)

                        Spacer(minLength: 28)

                        VStack(spacing: 12) {
                            SocialSignInButtons()
                            Button { path.append(.register) } label: {
                                Text("Criar conta com e-mail").frame(minHeight: 52)
                            }
                            .buttonStyle(.fitgenPrimary)

                            Button { path.append(.login) } label: {
                                (Text("Já tenho conta · ").foregroundStyle(Theme.secondary) + Text("Entrar").bold().foregroundStyle(Theme.voltText))
                                    .font(.subheadline)
                                    .frame(maxWidth: .infinity, minHeight: 44)
                                    .contentShape(Rectangle())
                            }
                            .accessibilityLabel("Já tenho conta, entrar")
                        }

                        Text("Ao continuar, você concorda com os [Termos de Uso](\(Self.termsURL.absoluteString)) e a [Política de Privacidade](\(Self.privacyURL.absoluteString)).")
                            .font(.caption).foregroundStyle(Theme.secondary)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                            .tint(Theme.voltText)
                            .padding(.top, 8)
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 16)
                    .frame(minHeight: geo.size.height)
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared || reduceMotion ? 0 : 16)
                }
                .scrollBounceBehavior(.basedOnSize)
            }
            .background { AuthBackground() }
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: AuthRoute.self) { route in
                switch route {
                case .login: LoginView()
                case .register: RegisterView()
                case .forgot: ForgotPasswordView()
                }
            }
        }
        .tint(Theme.voltText)
        .onAppear { withAnimation(.spring(duration: 0.7)) { appeared = true } }
    }

    private var ottoBubble: some View {
        HStack(alignment: .bottom, spacing: 10) {
            Image("OttoAvatar")
                .resizable().scaledToFill()
                .frame(width: 56, height: 56)
                .clipShape(Circle())
                .overlay(Circle().strokeBorder(Theme.volt, lineWidth: 2))
                .accessibilityHidden(true)
            Text("Oi! Eu sou o Otto, seu coach. Bora montar sua rotina?")
                .font(.subheadline.weight(.medium))
                .padding(.horizontal, 16).padding(.vertical, 12)
                .background(Theme.card, in: UnevenRoundedRectangle(topLeadingRadius: 20, bottomLeadingRadius: 6, bottomTrailingRadius: 20, topTrailingRadius: 20, style: .continuous))
                .overlay(UnevenRoundedRectangle(topLeadingRadius: 20, bottomLeadingRadius: 6, bottomTrailingRadius: 20, topTrailingRadius: 20, style: .continuous)
                    .strokeBorder(Theme.volt.opacity(0.35), lineWidth: 1))
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Otto diz: Oi! Eu sou o Otto, seu coach. Bora montar sua rotina?")
    }
}

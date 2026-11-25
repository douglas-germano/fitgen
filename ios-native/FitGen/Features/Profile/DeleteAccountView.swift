import SwiftUI

/// Account deletion is a support request by email, like mobile/src/app/delete-account.tsx.
struct DeleteAccountView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.openURL) private var openURL
    @State private var fallback = false

    var body: some View {
        List {
            Section {
                VStack(spacing: 12) {
                    Image(systemName: "trash.fill").font(.system(size: 28)).foregroundStyle(Theme.calories)
                        .frame(width: 64, height: 64).background(Theme.cardRaised, in: Circle())
                    Text("Solicitação de exclusão").font(.title3.bold())
                    Text("Envie a solicitação pelo email cadastrado na sua conta. O botão abre uma mensagem para você revisar e enviar no seu aplicativo de email.")
                        .font(.subheadline).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity).padding(.vertical, 8)
            }
            .listRowBackground(Color.clear)

            Section("Seus dados de treino e alimentação") {
                Text("A solicitação inclui a conta, seu histórico de treinos, refeições e preferências. Confirme com o suporte os dados que serão removidos antes da exclusão.")
                    .font(.subheadline)
            }
            .listRowBackground(Theme.card)

            Section {
                Button {
                    request()
                } label: {
                    Label("Abrir email de solicitação", systemImage: "envelope.fill").frame(maxWidth: .infinity)
                }
                .foregroundStyle(Theme.calories)
            } footer: {
                Text("Sua conta continua ativa até o atendimento da solicitação pelo suporte.")
            }
            .listRowBackground(Theme.card)
        }
        .scrollContentBackground(.hidden)
        .screen()
        .navigationTitle("Excluir minha conta")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Solicitar exclusão", isPresented: $fallback) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("Envie um email para suporte@fitgen.com com o assunto “Exclusão de Conta”, usando o email cadastrado.")
        }
    }

    private func request() {
        var components = URLComponents()
        components.scheme = "mailto"
        components.path = "suporte@fitgen.com"
        components.queryItems = [
            URLQueryItem(name: "subject", value: "Exclusão de Conta"),
            URLQueryItem(name: "body", value: "Solicito a exclusão da minha conta FitGen e dos dados associados.\n\nEmail da conta: \(store.profile.value?.email ?? "")"),
        ]
        guard let url = components.url else { fallback = true; return }
        openURL(url) { accepted in if !accepted { fallback = true } }
    }
}

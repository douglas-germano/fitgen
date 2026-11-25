import SwiftUI

/// Change or create a password. Accounts created with Google/Apple have no password (GET /auth/me -> has_password).
struct PasswordView: View {
    @Environment(\.dismiss) private var dismiss

    private struct Me: Decodable { var hasPassword: Bool? }
    private struct Payload: Encodable { var oldPassword: String?; var newPassword: String }

    @State private var hasPassword = true
    @State private var old = ""
    @State private var next = ""
    @State private var confirm = ""
    @State private var busy = false
    @State private var error: String?
    @State private var done = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    if hasPassword {
                        SecureField("Senha atual", text: $old).textContentType(.password)
                    }
                    SecureField("Nova senha", text: $next).textContentType(.newPassword)
                    SecureField("Confirmar nova senha", text: $confirm).textContentType(.newPassword)
                } footer: {
                    Text(hasPassword ? "Use pelo menos 8 caracteres, com maiúscula, minúscula e número."
                         : "Você entra com Google ou Apple. Crie uma senha para também entrar com email.")
                }
                .listRowBackground(Theme.card)

                if let error {
                    Section { Text(error).foregroundStyle(Theme.calories) }.listRowBackground(Theme.card)
                }
            }
            .scrollContentBackground(.hidden)
            .screen()
            .navigationTitle(hasPassword ? "Alterar senha" : "Criar senha")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    if busy { ProgressView() } else { Button("Salvar") { Task { await save() } }.bold() }
                }
            }
            .task {
                if let me: Me = try? await APIClient.shared.get("/auth/me") { hasPassword = me.hasPassword ?? true }
            }
            .alert(hasPassword ? "Senha alterada com sucesso!" : "Senha criada! Agora você também pode entrar com email e senha.", isPresented: $done) {
                Button("OK") { dismiss() }
            }
        }
    }

    /// Same rules as mobile passwordError().
    private func validation(_ password: String) -> String? {
        if password.count < 8 { return "Use pelo menos 8 caracteres." }
        if password.range(of: "[a-z]", options: .regularExpression) == nil
            || password.range(of: "[A-Z]", options: .regularExpression) == nil
            || password.range(of: "[0-9]", options: .regularExpression) == nil {
            return "Inclua uma letra maiúscula, uma minúscula e um número."
        }
        return nil
    }

    private func save() async {
        if hasPassword && old.isEmpty { error = "Informe sua senha atual."; return }
        if let message = validation(next) { error = message; return }
        if next != confirm { error = "As senhas não coincidem."; return }
        busy = true; error = nil
        defer { busy = false }
        do {
            try await APIClient.shared.sendNoContent("/auth/change-password", method: "POST",
                                                     json: Payload(oldPassword: hasPassword ? old : nil, newPassword: next))
            done = true
        } catch {
            self.error = error.localizedDescription
        }
    }
}

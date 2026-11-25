import PhotosUI
import SwiftUI
import UIKit

/// Opened from the avatar on Resumo, like the Apple Fitness account sheet.
struct ProfileView: View {
    @Environment(AppStore.self) private var store
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @AppStorage("appearance") private var appearance = "system"

    @State private var editingName = false
    @State private var name = ""
    @State private var confirmSignOut = false

    @State private var photoOptions = false
    @State private var showLibrary = false
    @State private var showCamera = false
    @State private var pickedItem: PhotosPickerItem?
    @State private var uploading = false
    @State private var photoError: String?
    @State private var supportFallback = false

    @State private var showPassword = false

    private static let supportEmail = "suporte@fitgen.com"

    var body: some View {
        NavigationStack {
            List {
                if let profile = store.profile.value {
                    header(profile)
                    healthSection
                    accountSection(profile)
                    activitySection
                    otherSection
                    signOutSection
                } else if let error = store.profile.error {
                    Text(error).listRowBackground(Theme.card)
                } else {
                    ProgressView().frame(maxWidth: .infinity).listRowBackground(Color.clear)
                }
            }
            .scrollContentBackground(.hidden)
            .screen()
            .navigationTitle("Conta")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("OK") { dismiss() }.bold() } }
            .alert("Alterar nome", isPresented: $editingName) {
                TextField("Nome", text: $name)
                Button("Cancelar", role: .cancel) {}
                Button("Salvar") { Task { try? await store.updateName(name.trimmingCharacters(in: .whitespaces)) } }
            }
            .alert("Erro ao atualizar foto", isPresented: Binding(get: { photoError != nil }, set: { if !$0 { photoError = nil } })) {
                Button("OK", role: .cancel) {}
            } message: { Text(photoError ?? "") }
            .alert("Contato", isPresented: $supportFallback) {
                Button("OK", role: .cancel) {}
            } message: { Text("Envie sua mensagem para \(Self.supportEmail).") }
            .confirmationDialog("Foto de perfil", isPresented: $photoOptions, titleVisibility: .visible) {
                if CameraPicker.isAvailable { Button("Tirar foto") { showCamera = true } }
                Button("Escolher da galeria") { showLibrary = true }
            }
            .photosPicker(isPresented: $showLibrary, selection: $pickedItem, matching: .images)
            .fullScreenCover(isPresented: $showCamera) {
                CameraPicker { data in
                    showCamera = false
                    if let data { Task { await upload(data) } }
                }
                .ignoresSafeArea()
            }
            .onChange(of: pickedItem) { _, item in
                guard let item else { return }
                pickedItem = nil
                Task {
                    guard let raw = try? await item.loadTransferable(type: Data.self),
                          let image = UIImage(data: raw), let jpeg = CameraPicker.Coordinator.resized(image) else {
                        photoError = "Não foi possível ler a imagem escolhida."
                        return
                    }
                    await upload(jpeg)
                }
            }
            .sheet(isPresented: $showPassword) { PasswordView() }
            .confirmationDialog("Sair da conta?", isPresented: $confirmSignOut, titleVisibility: .visible) {
                Button("Sair", role: .destructive) {
                    dismiss()
                    Task { await session.signOut() }
                }
            }
        }
    }

    // MARK: Sections

    private func header(_ profile: Profile) -> some View {
        Section {
            HStack(spacing: 14) {
                Button { photoOptions = true } label: {
                    Avatar(name: profile.name, url: profile.profilePicture, size: 72)
                        .overlay {
                            if uploading {
                                Circle().fill(.black.opacity(0.55))
                                ProgressView().tint(.white)
                            }
                        }
                        .overlay(alignment: .bottomTrailing) {
                            Image(systemName: "camera.fill").font(.caption2).foregroundStyle(.white)
                                .padding(6).background(Theme.cardRaised, in: Circle())
                                .overlay(Circle().stroke(Theme.card, lineWidth: 2))
                        }
                }
                .buttonStyle(.plain)
                .disabled(uploading)
                .accessibilityLabel("Alterar foto")

                VStack(alignment: .leading, spacing: 3) {
                    Text(profile.name).font(.title3.bold())
                    Text(profile.email).font(.subheadline).foregroundStyle(Theme.secondary)
                    if let level = profile.level {
                        Text("Nível \(level)").font(.caption.bold()).foregroundStyle(.black)
                            .padding(.horizontal, 8).padding(.vertical, 2).background(Theme.volt, in: Capsule())
                    }
                }
            }
            .padding(.vertical, 6)
            Button { name = profile.name; editingName = true } label: { rowLabel("Alterar nome", "person.fill") }
            NavigationLink { ProfileEditView() } label: { rowLabel("Objetivos e dados físicos", "target") }
        }
        .listRowBackground(Theme.card)
    }

    private var healthSection: some View {
        Section {
            Button {
                Task { await store.health.connect() }
            } label: {
                HStack {
                    rowLabel("App Saúde", "heart.fill")
                    Spacer()
                    Text(store.health.connected ? "Conectado" : "Conectar")
                        .foregroundStyle(store.health.connected ? Theme.voltText : Theme.secondary)
                }
            }
            .disabled(!store.health.available)
        }
        .listRowBackground(Theme.card)
    }

    private func accountSection(_ profile: Profile) -> some View {
        Section("Conta e preferências") {
            LabeledContent { Text(profile.email).foregroundStyle(Theme.secondary).lineLimit(1) } label: { rowLabel("Email", "envelope.fill") }
            Button { showPassword = true } label: { HStack { rowLabel("Senha", "key.fill"); Spacer(); chevron } }
            NavigationLink { NotificationsView() } label: { rowLabel("Notificações", "bell.fill") }
            NavigationLink { SubscriptionView() } label: {
                HStack { rowLabel("Assinatura", "checkmark.seal.fill"); Spacer(); Text(profile.premium ? "Premium" : "Gratuito").foregroundStyle(Theme.secondary) }
            }
            NavigationLink { ReferralsView() } label: { rowLabel("Indique e ganhe", "person.2.fill") }
            Picker(selection: $appearance) {
                Text("Sistema").tag("system")
                Text("Claro").tag("light")
                Text("Escuro").tag("dark")
            } label: { rowLabel("Aparência", "circle.lefthalf.filled") }
        }
        .listRowBackground(Theme.card)
    }

    private var activitySection: some View {
        Section("Atividades") {
            NavigationLink { AchievementsView() } label: { rowLabel("Minhas conquistas", "trophy.fill") }
            NavigationLink { HistoryView() } label: { rowLabel("Minhas atividades", "figure.strengthtraining.traditional") }
            NavigationLink { OutdoorHistoryView() } label: { rowLabel("Atividades ao ar livre", "figure.run") }
        }
        .listRowBackground(Theme.card)
    }

    private var otherSection: some View {
        Section("Outros") {
            NavigationLink { OnboardingChatView() } label: { rowLabel("Configuração inicial", "bubble.left.and.bubble.right.fill") }
            Link(destination: URL(string: "https://fitgen.pro/privacidade")!) {
                HStack { rowLabel("Política de privacidade", "hand.raised.fill"); Spacer(); chevron }
            }
            Button { contactSupport() } label: { HStack { rowLabel("Ajuda", "questionmark.circle.fill"); Spacer(); chevron } }
            NavigationLink { DeleteAccountView() } label: { rowLabel("Excluir minha conta", "trash.fill") }
        }
        .listRowBackground(Theme.card)
    }

    private var signOutSection: some View {
        Section {
            Button("Sair da conta", role: .destructive) { confirmSignOut = true }
                .frame(maxWidth: .infinity)
        } footer: {
            let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—"
            let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String
            Text("FitGen \(version)\(build.map { " (\($0))" } ?? "")")
                .frame(maxWidth: .infinity)
        }
        .listRowBackground(Theme.card)
    }

    // MARK: Helpers

    private var chevron: some View {
        Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Color(.tertiaryLabel))
    }

    private func rowLabel(_ title: String, _ icon: String) -> some View {
        Label { Text(title).foregroundStyle(.primary) } icon: { Image(systemName: icon).foregroundStyle(Theme.voltText) }
    }

    private func contactSupport() {
        guard let url = URL(string: "mailto:\(Self.supportEmail)") else { return }
        openURL(url) { accepted in if !accepted { supportFallback = true } }
    }

    /// POST /profile/image, multipart field "file" (same as the Expo app).
    private func upload(_ jpeg: Data) async {
        uploading = true
        defer { uploading = false }
        do {
            let _: Empty = try await APIClient.shared.upload("/profile/image", fields: [:],
                files: [(name: "file", filename: "profile.jpg", data: jpeg, mime: "image/jpeg")])
            await store.loadProfile()
        } catch {
            photoError = error.localizedDescription
        }
    }
}

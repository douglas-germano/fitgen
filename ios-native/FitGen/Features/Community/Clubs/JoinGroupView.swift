import SwiftUI

/// Join a club with an invite code: preview the club, then join.
struct JoinGroupView: View {
    /// Invite code from a link or typed text; nil opens an empty field.
    let code: String?

    @Environment(CommunityStore.self) private var community
    @State private var text = ""
    @State private var preview: GroupPreview?
    @State private var previewError: String?
    @State private var checking = false
    @State private var joining = false
    @State private var joined: CommunityGroup?
    @State private var alert: String?
    @FocusState private var focused: Bool

    private var normalized: String { CommunityFormat.normalizeCode(text) }

    var body: some View {
        if let joined {
            GroupDetailView(groupId: joined.id)
        } else {
            ScrollView {
                VStack(spacing: 18) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Código do convite").font(.footnote.weight(.semibold)).foregroundStyle(Theme.secondary).padding(.leading, 6)
                        TextField("ABC123", text: $text)
                            .font(.system(size: 24, weight: .bold, design: .monospaced))
                            .textInputAutocapitalization(.characters)
                            .autocorrectionDisabled()
                            .focused($focused)
                            .padding(14)
                            .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                            .onChange(of: text) { _, value in
                                let clean = CommunityFormat.normalizeCode(value)
                                if clean != value { text = clean }
                            }
                    }
                    previewSection
                }
                .padding(.horizontal, Theme.gutter)
                .padding(.top, 8)
                .padding(.bottom, 32)
            }
            .scrollDismissesKeyboard(.interactively)
            .screen()
            .navigationTitle("Entrar com código")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                if text.isEmpty, let code { text = CommunityFormat.normalizeCode(code) }
                if text.isEmpty { focused = true }
            }
            .task(id: normalized) { await check() }
            .socialAlert("Não foi possível entrar", message: $alert)
        }
    }

    @ViewBuilder
    private var previewSection: some View {
        if checking {
            ProgressView().padding(.vertical, 24)
        } else if let preview {
            VStack(spacing: 12) {
                ClubAvatar(groupId: preview.group.id, hasPhoto: preview.group.hasPhoto, size: 84)
                Text(preview.group.name).font(.title3.weight(.bold)).multilineTextAlignment(.center)
                Text(preview.group.peopleLabel).font(.subheadline).foregroundStyle(Theme.secondary)
                if let description = preview.group.description, !description.isEmpty {
                    Text(description).font(.subheadline).multilineTextAlignment(.center)
                }
                if preview.isMember {
                    NavigationLink(value: CommunityRoute.group(preview.group.id)) { Text("Você já está neste clube. Abrir") }
                        .buttonStyle(.fitgenPrimary)
                } else if preview.isFull {
                    Label("Este clube está cheio.", systemImage: "person.3.fill").foregroundStyle(Theme.secondary)
                } else {
                    Button { Task { await join() } } label: {
                        if joining { ProgressView() } else { Text("Entrar no clube") }
                    }
                    .buttonStyle(.fitgenPrimary)
                    .disabled(joining)
                }
            }
            .padding(20).frame(maxWidth: .infinity).highlightCard()
        } else if let previewError {
            Label(previewError, systemImage: "exclamationmark.circle").font(.subheadline).foregroundStyle(Theme.secondary)
                .multilineTextAlignment(.leading).frame(maxWidth: .infinity, alignment: .leading).padding(.horizontal, 6)
        } else {
            Text("Digite o código que você recebeu para ver o clube antes de entrar.")
                .font(.subheadline).foregroundStyle(Theme.secondary).padding(.horizontal, 6)
        }
    }

    private func check() async {
        preview = nil; previewError = nil
        guard normalized.count >= 4 else { checking = false; return }
        checking = true
        try? await Task.sleep(for: .milliseconds(400))
        if Task.isCancelled { return }
        do { preview = try await community.groupPreview(code: normalized) } catch {
            if Task.isCancelled || (error as? URLError)?.code == .cancelled { return }
            previewError = "Não encontramos um clube com esse código."
        }
        checking = false
    }

    private func join() async {
        joining = true
        defer { joining = false }
        do { joined = try await community.joinGroup(code: normalized) } catch { alert = error.localizedDescription }
    }
}

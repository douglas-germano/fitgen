import SwiftUI

/// One activity with its comments and a composer.
struct ActivityDetailView: View {
    let activityId: String

    @Environment(CommunityStore.self) private var community
    @Environment(\.dismiss) private var dismiss
    @State private var activity: CommunityActivity?
    @State private var comments: [CommunityComment] = []
    @State private var loadError: String?
    @State private var loading = true
    @State private var draft = ""
    @State private var sending = false
    @State private var sendError: String?
    @State private var pendingDelete: CommunityComment?
    @FocusState private var composerFocused: Bool

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let activity {
                    ActivityCard(activity: activity, detail: true) { dismiss() }
                    commentsSection
                } else if loading {
                    LoadingView(cards: [220, 80, 80])
                } else {
                    ErrorCard(message: loadError ?? "Publicação não encontrada.") { Task { await load() } }
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.bottom, 24)
        }
        .scrollDismissesKeyboard(.interactively)
        .screen()
        .navigationTitle("Publicação")
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom, spacing: 0) { if activity != nil { composer } }
        .task { await load() }
        .refreshable { await load() }
        .onChange(of: community.deletedActivityIds) { _, ids in if ids.contains(activityId) { dismiss() } }
        .confirmationDialog("Excluir este comentário?", isPresented: Binding(get: { pendingDelete != nil }, set: { if !$0 { pendingDelete = nil } }),
                            titleVisibility: .visible, presenting: pendingDelete) { comment in
            Button("Excluir", role: .destructive) { delete(comment) }
            Button("Cancelar", role: .cancel) {}
        }
        .alert("Não foi possível enviar", isPresented: Binding(get: { sendError != nil }, set: { if !$0 { sendError = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(sendError ?? "") }
    }

    // MARK: Comments

    private var commentsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(comments.isEmpty ? "Comentários" : "Comentários (\(comments.count))")
                .font(.cardTitle)
                .accessibilityAddTraits(.isHeader)
            if comments.isEmpty {
                Text("Seja o primeiro a comentar.").font(.subheadline).foregroundStyle(Theme.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                ForEach(comments) { comment in row(comment) }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
    }

    private func row(_ comment: CommunityComment) -> some View {
        HStack(alignment: .top, spacing: 10) {
            NavigationLink(value: CommunityRoute.user(comment.user.id)) {
                Avatar(name: comment.user.name, url: comment.user.profilePicture, size: 32)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Perfil de \(comment.user.name)")
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(comment.user.name).font(.footnote.weight(.semibold))
                    Text(CommunityFormat.timeAgo(comment.date)).font(.caption).foregroundStyle(Theme.secondary)
                }
                Text(comment.text).font(.subheadline).textSelection(.enabled)
            }
            Spacer(minLength: 0)
            if comment.isMine || activity?.isMine == true {
                Menu {
                    Button(role: .destructive) { pendingDelete = comment } label: { Label("Excluir comentário", systemImage: "trash") }
                } label: {
                    Image(systemName: "ellipsis").font(.system(size: 14, weight: .semibold)).foregroundStyle(Theme.secondary)
                        .frame(width: 32, height: 32).contentShape(Rectangle())
                }
                .accessibilityLabel("Opções do comentário")
            }
        }
        .accessibilityElement(children: .contain)
    }

    private var composer: some View {
        HStack(alignment: .bottom, spacing: 8) {
            TextField("Escreva um comentário", text: $draft, axis: .vertical)
                .lineLimit(1...4)
                .focused($composerFocused)
                .padding(.horizontal, 14).padding(.vertical, 10)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                .submitLabel(.send)
                .onChange(of: draft) { _, text in if text.count > 500 { draft = String(text.prefix(500)) } }
                .accessibilityLabel("Comentário")
            Button(action: send) {
                Group {
                    if sending { ProgressView().tint(.black) } else { Image(systemName: "arrow.up").font(.system(size: 16, weight: .bold)) }
                }
                .foregroundStyle(.black)
                .frame(width: 40, height: 40)
                .background(Theme.voltGradient, in: Circle())
                .opacity(canSend ? 1 : 0.4)
            }
            .disabled(!canSend)
            .accessibilityLabel("Enviar comentário")
        }
        .padding(.horizontal, Theme.gutter).padding(.vertical, 8)
        .background(.bar)
    }

    private var canSend: Bool { !sending && !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    // MARK: Actions

    private func load() async {
        loadError = nil
        async let fetchedActivity = community.activity(id: activityId)
        async let fetchedComments = community.comments(activityId: activityId)
        do {
            let loaded = try await fetchedActivity
            activity = loaded
            community.patches[loaded.id] = loaded
            comments = (try? await fetchedComments) ?? comments
        } catch {
            if !Task.isCancelled { loadError = error.localizedDescription }
        }
        loading = false
    }

    private func send() {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        sending = true
        Task {
            defer { sending = false }
            do {
                // The server counts the comment; keep a local copy of the activity so the badge updates too.
                if let current = activity { community.patches[current.id] = community.patches[current.id] ?? current }
                let comment = try await community.addComment(activityId: activityId, text: text)
                comments.append(comment)
                draft = ""
            } catch { sendError = error.localizedDescription }
        }
    }

    private func delete(_ comment: CommunityComment) {
        Task {
            do {
                try await community.deleteComment(id: comment.id, activityId: activityId)
                comments.removeAll { $0.id == comment.id }
            } catch { sendError = error.localizedDescription }
        }
    }
}

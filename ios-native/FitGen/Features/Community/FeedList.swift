import SwiftUI

/// Loaded pages of one feed scope.
@MainActor @Observable
final class FeedModel {
    enum Phase: Equatable { case loading, loaded, failed(String) }

    var items: [CommunityActivity] = []
    var phase: Phase = .loading
    var loadingMore = false
    var moreError: String?
    private var nextCursor: String?
    private(set) var scope: FeedScope?

    var hasMore: Bool { nextCursor != nil }

    /// First page. Keeps showing the old items while refreshing the same scope.
    func reload(scope: FeedScope, store: CommunityStore) async {
        if self.scope != scope {
            items = []; nextCursor = nil; phase = .loading
            self.scope = scope
        }
        moreError = nil
        do {
            let page = try await store.feed(scope)
            guard self.scope == scope else { return }
            items = page.items
            nextCursor = page.nextCursor
            phase = .loaded
        } catch {
            if Task.isCancelled || (error as? URLError)?.code == .cancelled { return }
            if items.isEmpty { phase = .failed(error.localizedDescription) } else { moreError = error.localizedDescription }
        }
    }

    func loadMore(store: CommunityStore) async {
        guard let scope, let cursor = nextCursor, !loadingMore else { return }
        loadingMore = true
        moreError = nil
        defer { loadingMore = false }
        do {
            let page = try await store.feed(scope, cursor: cursor)
            guard self.scope == scope else { return }
            let known = Set(items.map(\.id))
            items += page.items.filter { !known.contains($0.id) }
            nextCursor = page.nextCursor
        } catch {
            if !Task.isCancelled { moreError = error.localizedDescription }
        }
    }
}

/// Infinite-scrolling feed (cursor pagination, pull to refresh). Owns its ScrollView; `header` scrolls with the posts.
struct FeedList<Header: View>: View {
    let scope: FeedScope
    /// Text for the empty state, e.g. a club feed can say "Nenhuma publicação neste clube ainda".
    var emptyTitle = "Nada por aqui ainda"
    var emptyMessage = "Quando alguém publicar, aparece aqui. Que tal começar você?"
    var showsGroup = true
    @ViewBuilder var header: Header

    @Environment(CommunityStore.self) private var community
    @State private var model = FeedModel()

    private struct ReloadKey: Hashable { let scope: FeedScope; let version: Int }

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 12) {
                header
                content
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.bottom, 24)
        }
        .scrollDismissesKeyboard(.interactively)
        .task(id: ReloadKey(scope: scope, version: community.feedVersion)) { await model.reload(scope: scope, store: community) }
        .refreshable { await model.reload(scope: scope, store: community) }
    }

    private var visible: [CommunityActivity] {
        model.items.filter { !community.deletedActivityIds.contains($0.id) }
    }

    @ViewBuilder
    private var content: some View {
        switch model.phase {
        case .loading:
            LoadingView(cards: [180, 260, 180]).frame(height: 640).padding(.horizontal, -Theme.gutter)
        case .failed(let message):
            ErrorCard(message: message) { Task { await model.reload(scope: scope, store: community) } }
        case .loaded where visible.isEmpty:
            FeedEmptyState(title: emptyTitle, message: emptyMessage)
        case .loaded:
            ForEach(visible) { activity in
                ActivityCard(activity: activity, showGroup: showsGroup)
                    .onAppear { if activity.id == visible.last?.id { Task { await model.loadMore(store: community) } } }
            }
            footer
        }
    }

    @ViewBuilder
    private var footer: some View {
        if model.loadingMore {
            ProgressView().padding(.vertical, 16).accessibilityLabel("Carregando mais publicações")
        } else if let error = model.moreError {
            ErrorCard(message: error) { Task { await model.loadMore(store: community) } }
        }
    }
}

extension FeedList where Header == EmptyView {
    init(scope: FeedScope, emptyTitle: String = "Nada por aqui ainda",
         emptyMessage: String = "Quando alguém publicar, aparece aqui. Que tal começar você?", showsGroup: Bool = true) {
        self.init(scope: scope, emptyTitle: emptyTitle, emptyMessage: emptyMessage, showsGroup: showsGroup) { EmptyView() }
    }
}

struct FeedEmptyState: View {
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "person.2.fill")
                .font(.system(size: 34))
                .foregroundStyle(Theme.voltText)
                .frame(width: 72, height: 72)
                .background(Theme.volt.opacity(0.16), in: Circle())
                .accessibilityHidden(true)
            Text(title).font(.cardTitle)
            Text(message).font(.subheadline).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
        }
        .padding(.vertical, 48).padding(.horizontal, 24)
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }
}

import SwiftUI

@main
struct FitGenApp: App {
    @State private var session = Session()
    @State private var store = AppStore()
    @State private var community = CommunityStore()
    @State private var links = DeepLinks()
    @AppStorage("appearance") private var appearance = "system"

    var body: some Scene {
        WindowGroup {
            Group {
                switch session.status {
                case .signedIn: SignedInGate()
                case .signedOut: WelcomeView()
                }
            }
            .environment(session)
            .environment(store)
            .environment(community)
            .environment(links)
            .onOpenURL { links.open($0) }
            .tint(Theme.voltText)
            .onChange(of: session.status) { _, status in
                if status == .signedOut { store.clear(); community.clear() }
            }
        }
    }

    private static func scheme(for value: String) -> ColorScheme? {
        switch value {
        case "light": .light
        case "dark": .dark
        default: nil
        }
    }
}

/// Five labeled tabs, like Apple Fitness.
struct MainTabView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.scenePhase) private var scenePhase
    @Environment(DeepLinks.self) private var links
    @State private var tab: AppTab = .summary

    var body: some View {
        TabView(selection: $tab) {
            Tab("Resumo", systemImage: "circle.circle", value: AppTab.summary) {
                TodayView(tab: $tab)
            }
            Tab("Treino", systemImage: "dumbbell.fill", value: AppTab.workout) {
                WorkoutsView()
            }
            Tab("Comunidade", systemImage: "person.2.fill", value: AppTab.community) {
                CommunityView()
            }
            Tab("Dieta", systemImage: "fork.knife", value: AppTab.diet) {
                DietView()
            }
            Tab("Progresso", systemImage: "chart.line.uptrend.xyaxis", value: AppTab.progress) {
                ProgressTabView()
            }
        }
        .task {
            await store.loadToday()
            await store.health.autoImportBodyMetrics(store: store)
        }
        .onChange(of: links.pending, initial: true) { _, route in
            if route != nil { tab = .community }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await store.health.autoImportBodyMetrics(store: store) } }
        }
    }
}

enum AppTab: Hashable { case summary, workout, community, diet, progress }

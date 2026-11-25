import SwiftUI

/// Shown once signed in: checks /profile/me, runs the Otto onboarding full screen when it was never completed,
/// then hands over to the tabs. If the check fails (offline), the user goes straight to the app.
struct SignedInGate: View {
    @Environment(AppStore.self) private var store
    @State private var phase: Phase = .checking

    enum Phase { case checking, onboarding, ready }

    var body: some View {
        ZStack {
            if phase == .ready {
                MainTabView()
            } else {
                ZStack {
                    AuthBackground(intensity: 0.6)
                    Image("LogoMark").resizable().scaledToFit().frame(width: 72, height: 72)
                        .accessibilityLabel("Carregando")
                }
            }
        }
        .fullScreenCover(isPresented: Binding(get: { phase == .onboarding }, set: { if !$0 { phase = .ready } })) {
            OnboardingContainer()
        }
        .task {
            guard phase == .checking else { return }
            await store.loadProfile()
            if let profile = store.profile.value, profile.onboardingCompleted == false {
                phase = .onboarding
            } else {
                phase = .ready
            }
        }
    }
}

/// OnboardingChatView in its own NavigationStack. Its "Concluir" button dismisses the cover, which opens the tabs.
private struct OnboardingContainer: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            OnboardingChatView()
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("Agora não") { dismiss() }.tint(Theme.secondary)
                    }
                }
        }
        .tint(Theme.voltText)
        .interactiveDismissDisabled()
    }
}

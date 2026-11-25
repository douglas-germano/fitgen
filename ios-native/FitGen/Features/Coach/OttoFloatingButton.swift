import SwiftUI

/// Otto, the platform's differentiator, one tap away on every tab's main screen.
/// Added as a bottom safe-area inset so it never covers the last card of the screen.
private struct OttoFloatingButton: ViewModifier {
    @State private var open = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var appeared = false

    func body(content: Content) -> some View {
        content
            .safeAreaInset(edge: .bottom, spacing: 0) {
                HStack {
                    Spacer()
                    Button { open = true } label: {
                        Image("OttoAvatar")
                            .resizable().scaledToFill()
                            .frame(width: 56, height: 56)
                            .clipShape(Circle())
                            .overlay(Circle().strokeBorder(Theme.volt, lineWidth: 3))
                            .overlay(alignment: .topTrailing) {
                                // Small chat badge so it reads as "talk to Otto", not just a photo.
                                Image(systemName: "bubble.left.fill")
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundStyle(.black)
                                    .frame(width: 22, height: 22)
                                    .background(Theme.volt, in: Circle())
                                    .offset(x: 4, y: -4)
                            }
                            .shadow(color: .black.opacity(0.3), radius: 10, y: 4)
                            .frame(width: 60, height: 60)
                            .contentShape(Circle())
                    }
                    .buttonStyle(OttoPressStyle())
                    .scaleEffect(appeared || reduceMotion ? 1 : 0.6)
                    .opacity(appeared || reduceMotion ? 1 : 0)
                    .accessibilityLabel("Conversar com o Otto")
                    .accessibilityHint("Abre o chat com o Otto, seu coach de treino e dieta")
                    .accessibilitySortPriority(1)
                    .accessibilityShowsLargeContentViewer {
                        Label("Otto", systemImage: "bubble.left.fill")
                    }
                }
                .padding(.horizontal, Theme.gutter)
                .padding(.bottom, 8)
            }
            .fullScreenCover(isPresented: $open) { CoachView() }
            .sensoryFeedback(.impact(weight: .light), trigger: open)
            .onAppear {
                withAnimation(.spring(duration: 0.45, bounce: 0.35).delay(0.2)) { appeared = true }
            }
    }
}

private struct OttoPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.92 : 1)
            .animation(.spring(duration: 0.2), value: configuration.isPressed)
    }
}

extension View {
    /// Floating Otto button for a tab's root screen.
    func ottoButton() -> some View { modifier(OttoFloatingButton()) }
}

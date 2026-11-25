import SwiftUI
import UIKit

// MARK: - Haptics

@MainActor
enum Haptics {
    static func success() { UINotificationFeedbackGenerator().notificationOccurred(.success) }
    static func error() { UINotificationFeedbackGenerator().notificationOccurred(.error) }
    static func tap() { UIImpactFeedbackGenerator(style: .light).impactOccurred() }
}

// MARK: - Validation (mirrors mobile/src/lib/forms.ts and the backend's password rules)

enum AuthValidation {
    static func validEmail(_ value: String) -> Bool {
        value.trimmingCharacters(in: .whitespaces).range(of: #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#, options: .regularExpression) != nil
    }

    struct PasswordChecks {
        let length: Bool, lower: Bool, upper: Bool, digit: Bool
        init(_ p: String) {
            length = p.count >= 8
            lower = p.range(of: "[a-z]", options: .regularExpression) != nil
            upper = p.range(of: "[A-Z]", options: .regularExpression) != nil
            digit = p.range(of: "[0-9]", options: .regularExpression) != nil
        }
        var all: Bool { length && lower && upper && digit }
        var score: Int { [length, lower, upper, digit].filter { $0 }.count }
    }

    /// Brazilian phone mask: (11) 91234-5678 / (11) 1234-5678. Returns the formatted text.
    static func maskPhone(_ input: String) -> String {
        let d = String(input.filter(\.isNumber).prefix(11))
        var out = ""
        for (i, c) in d.enumerated() {
            if i == 0 { out += "(" }
            if i == 2 { out += ") " }
            if d.count > 10 ? i == 7 : i == 6 { out += "-" }
            out.append(c)
        }
        return out
    }
}

// MARK: - Background

/// Theme.background with slow-moving volt glows. Static when Reduce Motion is on.
struct AuthBackground: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var intensity: Double = 1

    var body: some View {
        ZStack {
            Theme.background
            TimelineView(.animation(minimumInterval: 1.0 / 30, paused: reduceMotion)) { context in
                let t = reduceMotion ? 0 : context.date.timeIntervalSinceReferenceDate
                GeometryReader { geo in
                    ZStack {
                        blob(Theme.volt, 0.34, size: geo.size.width * 0.9)
                            .offset(x: -geo.size.width * 0.28 + sin(t * 0.35) * 40, y: -geo.size.height * 0.30 + cos(t * 0.30) * 36)
                        blob(Theme.voltDeep, 0.26, size: geo.size.width * 0.8)
                            .offset(x: geo.size.width * 0.34 + cos(t * 0.28) * 36, y: -geo.size.height * 0.08 + sin(t * 0.33) * 44)
                        blob(Theme.voltLime, 0.20, size: geo.size.width * 0.7)
                            .offset(x: -geo.size.width * 0.1 + sin(t * 0.25) * 50, y: geo.size.height * 0.36 + cos(t * 0.31) * 30)
                    }
                    .frame(width: geo.size.width, height: geo.size.height)
                }
            }
        }
        .ignoresSafeArea()
        .accessibilityHidden(true)
    }

    private func blob(_ color: Color, _ opacity: Double, size: CGFloat) -> some View {
        Circle().fill(color.opacity(opacity * intensity)).frame(width: size, height: size).blur(radius: 70)
    }
}

// MARK: - Fields

struct AuthField<Trailing: View>: View {
    var icon: String
    var placeholder: String
    @Binding var text: String
    var isFocused: Bool = false
    var hasError: Bool = false
    @ViewBuilder var trailing: Trailing

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body.weight(.medium))
                .foregroundStyle(isFocused ? Theme.voltText : Theme.secondary)
                .frame(width: 22)
                .accessibilityHidden(true)
            TextField(placeholder, text: $text)
            trailing
        }
        .authFieldChrome(focused: isFocused, error: hasError)
    }
}

extension AuthField where Trailing == EmptyView {
    init(icon: String, placeholder: String, text: Binding<String>, isFocused: Bool = false, hasError: Bool = false) {
        self.init(icon: icon, placeholder: placeholder, text: text, isFocused: isFocused, hasError: hasError) { EmptyView() }
    }
}

/// Password field with a show/hide eye.
struct AuthPasswordField: View {
    var placeholder = "Senha"
    @Binding var text: String
    var isFocused: Bool = false
    var hasError: Bool = false
    var contentType: UITextContentType = .password
    @State private var visible = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "lock")
                .font(.body.weight(.medium))
                .foregroundStyle(isFocused ? Theme.voltText : Theme.secondary)
                .frame(width: 22)
                .accessibilityHidden(true)
            Group {
                if visible { TextField(placeholder, text: $text) } else { SecureField(placeholder, text: $text) }
            }
            .textContentType(contentType)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            Button { visible.toggle(); Haptics.tap() } label: {
                Image(systemName: visible ? "eye.slash" : "eye")
                    .foregroundStyle(Theme.secondary)
                    .frame(width: 32, height: 32)
                    .contentShape(Rectangle())
            }
            .accessibilityLabel(visible ? "Ocultar senha" : "Mostrar senha")
        }
        .authFieldChrome(focused: isFocused, error: hasError)
    }
}

extension View {
    fileprivate func authFieldChrome(focused: Bool, error: Bool) -> some View {
        self.padding(.horizontal, 16)
            .frame(minHeight: 54)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(error ? Theme.calories : focused ? Theme.volt.opacity(0.8) : Theme.separator.opacity(0.6), lineWidth: focused || error ? 1.5 : 1)
            )
            .animation(.easeOut(duration: 0.15), value: focused)
    }
}

struct AuthErrorLabel: View {
    var message: String
    var body: some View {
        Label(message, systemImage: "exclamationmark.circle.fill")
            .font(.footnote)
            .foregroundStyle(Theme.calories)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
            .transition(.opacity.combined(with: .move(edge: .top)))
    }
}

/// Primary CTA with an in-button spinner.
struct AuthPrimaryButton: View {
    var title: String
    var loading: Bool
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Text(title).opacity(loading ? 0 : 1)
                if loading { ProgressView().tint(.black) }
            }
            .frame(minHeight: 52)
        }
        .buttonStyle(.fitgenPrimary)
        .disabled(loading)
        .accessibilityLabel(loading ? "\(title), carregando" : title)
    }
}

struct AuthHeader: View {
    var icon: String
    var title: String
    var subtitle: String

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(.black)
                .frame(width: 56, height: 56)
                .background(Theme.voltGradient, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                .accessibilityHidden(true)
            Text(title)
                .font(.system(.largeTitle, design: .rounded).bold())
                .accessibilityAddTraits(.isHeader)
            Text(subtitle).foregroundStyle(Theme.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// Maps API errors to short, friendly text.
func authMessage(_ error: Error) -> String { error.localizedDescription }

import SwiftUI

/// Apple Fitness look: black background, dark rounded cards, one bright color per metric,
/// big rounded numerals.
enum Theme {
    /// Adaptive color: `light` in light mode, `dark` in dark mode.
    private static func adaptive(light: UInt32, dark: UInt32) -> Color {
        Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(hex: dark) : UIColor(hex: light) })
    }

    static let background = adaptive(light: 0xF2F2F7, dark: 0x000000)
    static let card = adaptive(light: 0xFFFFFF, dark: 0x1C1C1E)
    static let cardRaised = adaptive(light: 0xE9E9EE, dark: 0x2C2C2E)
    static let secondary = adaptive(light: 0x6E6E73, dark: 0x999999)
    static let separator = adaptive(light: 0xD1D1D6, dark: 0x2C2C2E)
    /// Primary text: black on light, white on dark.
    static let primaryText = Color.primary
    static let radius: CGFloat = 22
    static let gutter: CGFloat = 16

    // One color per metric, used everywhere that metric appears.
    /// Bright brand volt: use for fills (buttons, badges) with black text on top.
    static let volt = Color(red: 0.631, green: 0.925, blue: 0.012)      // #A1EC03
    /// Volt for text, icons and strokes on card/background (darker in light mode for contrast).
    static let voltText = adaptive(light: 0x5E9C00, dark: 0xA1EC03)
    static let calories = adaptive(light: 0xE8294F, dark: 0xFF375F)     // calorias
    static let water = adaptive(light: 0x0A9ED6, dark: 0x34C7FF)        // água
    static let protein = adaptive(light: 0xE88A00, dark: 0xFF9E0A)      // proteína
    static let steps = adaptive(light: 0x8E6BE6, dark: 0xB08FFF)        // passos
    static let distance = adaptive(light: 0x1F7AE0, dark: 0x4099FF)     // distância
    static let weight = adaptive(light: 0xC99700, dark: 0xFFCC00)       // peso
    static let streak = adaptive(light: 0xE5600A, dark: 0xFF7319)       // sequência

    // MARK: Volt gradient

    static let voltLime = Color(red: 0.776, green: 1.0, blue: 0.239)    // #C6FF3D
    static let voltDeep = Color(red: 0.298, green: 0.769, blue: 0.090)  // #4CC417
    /// Brand gradient for fills (buttons, banners, ring strokes). Same in both modes; text on it is black.
    static let voltGradient = LinearGradient(
        colors: [voltLime, volt, voltDeep], startPoint: .topLeading, endPoint: .bottomTrailing)
    /// Soft adaptive glow for highlight card backgrounds (volt 22% over card in dark, 30% over white in light).
    static let voltGlow = LinearGradient(
        colors: [voltGlowStart, card], startPoint: .topLeading, endPoint: .bottomTrailing)
    private static let voltGlowStart = adaptiveOpacity(light: (0xA1EC03, 0.30), dark: (0xA1EC03, 0.22))
    private static func adaptiveOpacity(light: (UInt32, CGFloat), dark: (UInt32, CGFloat)) -> Color {
        Color(UIColor { trait in
            let v = trait.userInterfaceStyle == .dark ? dark : light
            return UIColor(hex: v.0).withAlphaComponent(v.1)
        })
    }
}

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
                  blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
    }
}

extension Font {
    /// Big rounded numerals like Apple Fitness.
    static func metric(_ size: CGFloat = 34) -> Font { .system(size: size, weight: .semibold, design: .rounded) }
    static let cardTitle = Font.system(.title3, design: .rounded).weight(.semibold)
}

// MARK: - Card

struct Card<Content: View>: View {
    var title: String?
    var color: Color = .primary
    var showsChevron = false
    /// Fixed height so cards side by side in a grid always match.
    var height: CGFloat? = nil
    /// Volt glow background + gradient stroke instead of the plain card fill.
    var highlight = false
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            if let title {
                HStack {
                    Text(title).font(.cardTitle).foregroundStyle(.primary)
                    Spacer()
                    if showsChevron {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(Theme.secondary)
                            .frame(width: 28, height: 28)
                            .background(Theme.cardRaised, in: Circle())
                    }
                }
            }
            content
            if height != nil { Spacer(minLength: 0) }
        }
        .padding(16)
        .frame(maxWidth: .infinity, minHeight: height, maxHeight: height, alignment: .topLeading)
        .background {
            if highlight { HighlightBackground() }
            else { RoundedRectangle(cornerRadius: Theme.radius, style: .continuous).fill(Theme.card) }
        }
    }
}

/// Card fill with a subtle volt glow (top-leading) and a fading volt stroke.
struct HighlightBackground: View {
    var body: some View {
        let shape = RoundedRectangle(cornerRadius: Theme.radius, style: .continuous)
        shape.fill(Theme.card)
            .overlay(shape.fill(Theme.voltGlow))
            .overlay(shape.strokeBorder(
                LinearGradient(colors: [Theme.volt.opacity(0.6), .clear], startPoint: .topLeading, endPoint: .bottomTrailing),
                lineWidth: 1))
    }
}

extension View {
    /// Highlight card background (volt glow) for views that draw their own padding/content.
    func highlightCard() -> some View { background(HighlightBackground()) }
}

/// Number + unit in the metric's color, like "1.263" or "0,92 KM".
struct MetricValue: View {
    var value: String
    var unit: String? = nil
    var goal: String? = nil
    var color: Color
    var size: CGFloat = 34

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 3) {
            Text(value).font(.metric(size)).foregroundStyle(color).contentTransition(.numericText())
            if let goal {
                Text("/\(goal)").font(.metric(size * 0.55)).foregroundStyle(color.opacity(0.75))
            }
            if let unit {
                Text(unit.uppercased()).font(.metric(size * 0.55)).foregroundStyle(color)
            }
        }
        .lineLimit(1)
        .minimumScaleFactor(0.6)
    }
}

// MARK: - Rings

/// A single progress ring, like a Fitness activity ring.
struct Ring: View {
    var progress: Double
    var color: Color
    var lineWidth: CGFloat = 16
    /// Volt rings only: stroke with the volt gradient (angular, like Apple's rings).
    var gradient = false

    private var strokeStyle: AnyShapeStyle {
        gradient ? AnyShapeStyle(AngularGradient(
            colors: [Theme.voltDeep, Theme.volt, Theme.voltLime], center: .center,
            startAngle: .degrees(0), endAngle: .degrees(360))) : AnyShapeStyle(color)
    }

    var body: some View {
        ZStack {
            Circle().stroke(color.opacity(0.2), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: min(max(progress, 0), 1))
                .stroke(strokeStyle, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
            if progress > 1 {
                // Past the goal: a second lap, like the Fitness rings.
                Circle()
                    .trim(from: 0, to: min(progress - 1, 1))
                    .stroke(strokeStyle, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .shadow(color: .black.opacity(0.5), radius: 2)
            }
        }
        // A stroke is centered on the path: inset by half its width so the ring stays inside its frame.
        .padding(lineWidth / 2)
        .animation(.spring(duration: 0.8), value: progress)
    }
}

/// Concentric rings: outermost first.
struct RingStack: View {
    var rings: [(progress: Double, color: Color)]
    var size: CGFloat = 150
    var lineWidth: CGFloat = 18

    var body: some View {
        ZStack {
            ForEach(Array(rings.enumerated()), id: \.offset) { index, ring in
                Ring(progress: ring.progress, color: ring.color, lineWidth: lineWidth)
                    .padding(CGFloat(index) * (lineWidth + 3))
            }
        }
        .frame(width: size, height: size)
    }
}

/// Thin horizontal bar used for macros.
struct ProgressLine: View {
    var progress: Double
    var color: Color

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(color.opacity(0.2))
                Capsule().fill(color).frame(width: geo.size.width * min(max(progress, 0), 1))
            }
        }
        .frame(height: 6)
        .animation(.spring(duration: 0.6), value: progress)
    }
}

// MARK: - Primary button

/// Capsule CTA filled with the volt gradient, black bold text.
struct PrimaryGradientButtonStyle: ButtonStyle {
    var fullWidth = true
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline.bold())
            .foregroundStyle(.black)
            .tint(.black)
            .padding(.horizontal, fullWidth ? 0 : 20)
            .frame(maxWidth: fullWidth ? .infinity : nil, minHeight: fullWidth ? 50 : 38)
            .background(Theme.voltGradient, in: Capsule())
            .brightness(configuration.isPressed ? 0.06 : 0)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .opacity(isEnabled ? 1 : 0.4)
            .animation(.spring(duration: 0.25), value: configuration.isPressed)
            .contentShape(Capsule())
    }
}

extension ButtonStyle where Self == PrimaryGradientButtonStyle {
    /// Full-width gradient CTA.
    static var fitgenPrimary: PrimaryGradientButtonStyle { PrimaryGradientButtonStyle() }
    /// Compact, content-sized gradient button for inline use.
    static var fitgenPrimaryCompact: PrimaryGradientButtonStyle { PrimaryGradientButtonStyle(fullWidth: false) }
}

// MARK: - Misc

extension View {
    /// Screen background + horizontal gutter used by every tab.
    func screen() -> some View {
        // Always fill the whole screen, even when the content is small (e.g. while loading).
        self.frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Theme.background.ignoresSafeArea())
    }
}

/// Avatar from a URL or the user's initials.
struct Avatar: View {
    var name: String
    var url: String?
    var size: CGFloat = 36

    var body: some View {
        AsyncImage(url: url.flatMap(URL.init(string:))) { image in
            image.resizable().scaledToFill()
        } placeholder: {
            Text(initials).font(.system(size: size * 0.4, weight: .semibold, design: .rounded)).foregroundStyle(.black)
                .frame(maxWidth: .infinity, maxHeight: .infinity).background(Theme.volt)
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .accessibilityLabel("Perfil")
    }

    private var initials: String {
        name.split(separator: " ").prefix(2).compactMap(\.first).map(String.init).joined().uppercased()
    }
}

enum Format {
    static func int(_ value: Double) -> String {
        value.formatted(.number.precision(.fractionLength(0)).locale(Locale(identifier: "pt_BR")))
    }
    static func decimal(_ value: Double, digits: Int = 1) -> String {
        value.formatted(.number.precision(.fractionLength(0...digits)).locale(Locale(identifier: "pt_BR")))
    }
    static func liters(_ ml: Double) -> String { decimal(ml / 1000, digits: 1) }
    static func minutes(_ seconds: Int) -> String { "\(max(1, Int((Double(seconds) / 60).rounded()))) min" }
    static func clock(_ seconds: Int) -> String {
        let s = max(0, seconds)
        return s >= 3600 ? String(format: "%d:%02d:%02d", s / 3600, (s % 3600) / 60, s % 60) : String(format: "%d:%02d", s / 60, s % 60)
    }
    static func dayMonth(_ date: Date) -> String {
        date.formatted(.dateTime.day().month(.abbreviated).locale(Locale(identifier: "pt_BR")))
    }
    static func relativeDay(_ date: Date) -> String {
        if Calendar.current.isDateInToday(date) { return "Hoje" }
        if Calendar.current.isDateInYesterday(date) { return "Ontem" }
        if Calendar.current.isDateInTomorrow(date) { return "Amanhã" }
        return Weekday(date: date).long
    }
}

extension View {
    /// Makes a whole card tappable (with a press highlight) while inner buttons keep their own taps.
    func tappable(_ action: @escaping () -> Void) -> some View {
        self.contentShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
            .onTapGesture(perform: action)
            .accessibilityAddTraits(.isButton)
    }
}


/// Placeholder while a screen loads: a few pulsing card shapes instead of a lone spinner.
struct LoadingView: View {
    var cards: [CGFloat] = [140, 88, 88, 180]
    @State private var pulse = false

    var body: some View {
        VStack(spacing: 12) {
            ForEach(Array(cards.enumerated()), id: \.offset) { _, height in
                RoundedRectangle(cornerRadius: Theme.radius, style: .continuous)
                    .fill(Theme.card)
                    .overlay(alignment: .topLeading) {
                        VStack(alignment: .leading, spacing: 10) {
                            Capsule().fill(Theme.cardRaised).frame(width: 120, height: 14)
                            Capsule().fill(Theme.cardRaised).frame(width: 190, height: 10)
                        }
                        .padding(16)
                    }
                    .frame(height: height)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, Theme.gutter)
        .padding(.top, 8)
        .opacity(pulse ? 0.45 : 1)
        .animation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true), value: pulse)
        .onAppear { pulse = true }
        .accessibilityLabel("Carregando")
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
    }
}
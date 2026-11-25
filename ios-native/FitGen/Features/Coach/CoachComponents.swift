import SwiftUI

struct OttoAvatarView: View {
    var size: CGFloat = 32
    var body: some View {
        Image("OttoAvatar")
            .resizable().scaledToFill()
            .frame(width: size, height: size)
            .background(Theme.volt)
            .clipShape(Circle())
            .accessibilityHidden(true)
    }
}

/// Light markdown: headers, bullets, numbered lists, and inline emphasis.
struct MarkdownText: View {
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(blocks.enumerated()), id: \.offset) { _, block in
                switch block {
                case .header(let s):
                    Text(inline(s)).font(.system(.body, design: .rounded).weight(.bold))
                case .bullet(let marker, let s):
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text(marker).foregroundStyle(Theme.voltText)
                        Text(inline(s))
                    }
                case .paragraph(let s):
                    Text(inline(s))
                }
            }
        }
        .font(.body)
        .foregroundStyle(.primary)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private enum Block { case header(String), bullet(String, String), paragraph(String) }

    private var blocks: [Block] {
        text.components(separatedBy: "\n").compactMap { raw in
            let line = raw.trimmingCharacters(in: .whitespaces)
            if line.isEmpty { return nil }
            if let r = line.range(of: #"^#{1,6}\s+"#, options: .regularExpression) {
                return .header(String(line[r.upperBound...]))
            }
            if let r = line.range(of: #"^[-*•]\s+"#, options: .regularExpression) {
                return .bullet("•", String(line[r.upperBound...]))
            }
            if let r = line.range(of: #"^\d+[.)]\s+"#, options: .regularExpression) {
                let marker = line[..<r.upperBound].trimmingCharacters(in: .whitespaces)
                return .bullet(marker, String(line[r.upperBound...]))
            }
            return .paragraph(line)
        }
    }

    private func inline(_ s: String) -> AttributedString {
        let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        return (try? AttributedString(markdown: s, options: options)) ?? AttributedString(s)
    }
}

struct TypingIndicator: View {
    var body: some View {
        TimelineView(.animation(minimumInterval: 0.15)) { context in
            let t = context.date.timeIntervalSinceReferenceDate
            HStack(spacing: 5) {
                ForEach(0..<3, id: \.self) { i in
                    let phase = (sin(t * 5 - Double(i) * 0.9) + 1) / 2
                    Circle().fill(Theme.secondary).frame(width: 8, height: 8)
                        .opacity(0.35 + 0.65 * phase)
                        .offset(y: -3 * phase)
                }
            }
        }
        .padding(.horizontal, 16).padding(.vertical, 16)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .accessibilityLabel("Otto está digitando")
    }
}

struct PremiumCard: View {
    var body: some View {
        Card(title: nil) {
            VStack(alignment: .leading, spacing: 12) {
                Image(systemName: "sparkles").font(.title2).foregroundStyle(Theme.voltText)
                Text("Conversar com o Otto faz parte do FitGen Premium")
                    .font(.cardTitle).foregroundStyle(.primary)
                Text("Tire dúvidas sobre treino e dieta, troque exercícios e ajuste seu plano conversando com o Otto.")
                    .font(.subheadline).foregroundStyle(Theme.secondary)
                NavigationLink {
                    SubscriptionView()
                } label: {
                    Text("Conhecer o Premium").font(.headline).foregroundStyle(.black)
                        .frame(maxWidth: .infinity).padding(.vertical, 14)
                        .background(Theme.volt, in: Capsule())
                }
            }
        }
        .padding(Theme.gutter)
    }
}

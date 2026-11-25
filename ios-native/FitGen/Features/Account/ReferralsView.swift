import SwiftUI
import UIKit

private struct FriendsProgram: Decodable, Sendable {
    let code: String
    let enabled: Bool?
    let signups: Int?
    let qualified: Int?
    let progress: Int?
    let earnedDays: Int?
    let endsAt: String?
}

private struct Commission: Decodable, Identifiable, Sendable {
    let id: String
    let amount: String
    let currency: String
    let status: String

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        if let s = try? c.decode(String.self, forKey: .id) { id = s }
        else if let n = try? c.decode(Int.self, forKey: .id) { id = String(n) }
        else { id = UUID().uuidString }
        if let s = try? c.decode(String.self, forKey: .amount) { amount = s }
        else if let d = try? c.decode(Double.self, forKey: .amount) { amount = String(d) }
        else { amount = "0" }
        currency = (try? c.decode(String.self, forKey: .currency)) ?? "BRL"
        status = (try? c.decode(String.self, forKey: .status)) ?? ""
    }
    private enum Keys: String, CodingKey { case id, amount, currency, status }

    var statusLabel: String {
        switch status {
        case "pending": "Estimativa pendente de conferência"
        case "approved": "Aprovada"
        case "paid": "Paga"
        case "void": "Anulada"
        case "reversed": "Estornada"
        default: status
        }
    }
    var formatted: String {
        (Double(amount) ?? 0).formatted(.currency(code: currency).locale(Locale(identifier: "pt_BR")))
    }
}

private struct PartnerProgram: Decodable, Sendable {
    let code: String
    let enabled: Bool
    let signups: Int
    let qualified: Int
    let pages: Int
    let commissions: [Commission]
}

struct ReferralsView: View {
    init() {}

    @State private var friends: FriendsProgram?
    @State private var partner: PartnerProgram?
    @State private var page = 1
    @State private var loading = true
    @State private var error: String?
    @State private var copied = false
    @State private var partnerOpen = false

    private func link(_ code: String) -> String { "https://web.fitgen.pro/register?ref=\(code)" }
    private func message(_ code: String) -> String { "Use o código \(code) para entrar no FitGen. \(link(code))" }

    var body: some View {
        ScrollView {
            VStack(spacing: 12) {
                if loading && friends == nil {
                    LoadingView()
                } else if let friends {
                    heroCard(friends)
                    stepsCard
                    statsCard(friends)
                    if let partner { partnerCard(partner) }
                } else {
                    Card(title: "Não foi possível carregar o convite") {
                        Text(error ?? "Tente novamente em instantes.").font(.subheadline).foregroundStyle(Theme.secondary)
                        Button("Tentar novamente") { Task { await load() } }
                            .buttonStyle(.fitgenPrimaryCompact)
                    }
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.vertical, 12)
        }
        .screen()
        .navigationTitle("Indicações")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
    }

    // MARK: Hero

    private func heroCard(_ p: FriendsProgram) -> some View {
        let progress = min(max(p.progress ?? 0, 0), 3)
        return Card(highlight: true) {
            VStack(spacing: 14) {
                HStack(spacing: 12) {
                    Image(systemName: "gift.fill")
                        .font(.system(size: 22)).foregroundStyle(Theme.voltText)
                        .frame(width: 52, height: 52)
                        .background(Theme.cardRaised, in: Circle())
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Ganhe 30 dias de Premium")
                            .font(.system(.title3, design: .rounded).weight(.bold)).foregroundStyle(.primary)
                            .lineLimit(2).minimumScaleFactor(0.8)
                        Text("A cada 3 amigos que assinarem")
                            .font(.subheadline).foregroundStyle(Theme.secondary).lineLimit(1).minimumScaleFactor(0.8)
                    }
                    Spacer(minLength: 0)
                    ZStack {
                        Ring(progress: Double(progress) / 3, color: Theme.voltText, lineWidth: 7, gradient: true)
                        Text("\(progress)/3").font(.metric(15)).foregroundStyle(.primary)
                    }
                    .frame(width: 64, height: 64)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("Progresso: \(progress) de 3 amigos")
                }

                HStack(spacing: 8) {
                    Text(p.code)
                        .font(.system(.body, design: .monospaced).weight(.semibold))
                        .foregroundStyle(.primary).lineLimit(1).minimumScaleFactor(0.6)
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .accessibilityLabel("Seu código: \(p.code)")
                    Button {
                        UIPasteboard.general.string = p.code
                        UINotificationFeedbackGenerator().notificationOccurred(.success)
                        copied = true
                        Task { try? await Task.sleep(for: .seconds(2)); copied = false }
                    } label: {
                        Image(systemName: copied ? "checkmark" : "doc.on.doc")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(copied ? Theme.voltText : .primary)
                            .frame(width: 36, height: 36)
                            .contentTransition(.symbolEffect(.replace))
                    }
                    .accessibilityLabel(copied ? "Código copiado" : "Copiar código")
                }
                .padding(.leading, 18).padding(.trailing, 6)
                .frame(height: 48)
                .background(Theme.cardRaised, in: Capsule())

                ShareLink(item: message(p.code)) {
                    Label("Convidar amigos", systemImage: "square.and.arrow.up")
                        .font(.body.weight(.semibold)).foregroundStyle(.black)
                        .frame(maxWidth: .infinity).frame(height: 50)
                        .background(Theme.volt, in: Capsule())
                }
            }
        }
    }

    // MARK: Steps

    private var stepsCard: some View {
        Card(title: "Como funciona") {
            HStack(alignment: .top, spacing: 8) {
                step(1, "Envie o convite")
                step(2, "Amigo assina")
                step(3, "+30 dias para você")
            }
        }
    }

    private func step(_ n: Int, _ caption: String) -> some View {
        VStack(spacing: 6) {
            Text("\(n)").font(.system(.footnote, design: .rounded).weight(.bold)).foregroundStyle(.black)
                .frame(width: 24, height: 24).background(Theme.volt, in: Circle())
            Text(caption).font(.footnote).foregroundStyle(Theme.secondary)
                .multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .top)
    }

    // MARK: Stats

    private func statsCard(_ p: FriendsProgram) -> some View {
        Card {
            VStack(spacing: 10) {
                HStack(spacing: 0) {
                    stat("\(p.signups ?? 0)", "Cadastros")
                    Divider().frame(height: 32).overlay(Theme.separator)
                    stat("\(p.qualified ?? 0)", "Assinantes")
                    Divider().frame(height: 32).overlay(Theme.separator)
                    stat("\(p.earnedDays ?? 0)", "Dias ganhos")
                }
                if let end = p.endsAt, let date = ISO8601DateFormatter().date(from: end) ?? Self.naive(end), date > .now {
                    Text("Bônus disponível até \(date.formatted(.dateTime.day().month().year().locale(Locale(identifier: "pt_BR")))).")
                        .font(.footnote).foregroundStyle(Theme.secondary)
                }
            }
        }
    }

    private static func naive(_ s: String) -> Date? {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.timeZone = TimeZone(identifier: "UTC")
        for format in ["yyyy-MM-dd'T'HH:mm:ss.SSSSSS", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd"] {
            f.dateFormat = format
            if let d = f.date(from: s) { return d }
        }
        return nil
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(value).font(.metric(22)).foregroundStyle(.primary)
            Text(label).font(.caption).foregroundStyle(Theme.secondary).lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: Partner

    private func partnerCard(_ p: PartnerProgram) -> some View {
        Card {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 12) {
                    Button {
                        withAnimation(.snappy) { partnerOpen.toggle() }
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "briefcase.fill")
                                .font(.system(size: 16)).foregroundStyle(Theme.voltText)
                                .frame(width: 36, height: 36).background(Theme.cardRaised, in: Circle())
                            VStack(alignment: .leading, spacing: 1) {
                                Text("FitGen Parceiros").font(.subheadline.weight(.semibold)).foregroundStyle(.primary)
                                Text("30% de cada pagamento indicado").font(.caption).foregroundStyle(Theme.secondary)
                                    .lineLimit(1).minimumScaleFactor(0.8)
                            }
                            Spacer(minLength: 0)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 12, weight: .bold)).foregroundStyle(Theme.secondary)
                                .rotationEffect(.degrees(partnerOpen ? 90 : 0))
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    if p.enabled {
                        ShareLink(item: "Use o código \(p.code) para entrar no FitGen. https://fitgen.pro/assinar?ref=\(p.code)") {
                            Image(systemName: "square.and.arrow.up")
                                .font(.system(size: 15, weight: .semibold)).foregroundStyle(.primary)
                                .frame(width: 36, height: 36).background(Theme.cardRaised, in: Circle())
                        }
                        .accessibilityLabel("Compartilhar convite de parceiro")
                    }
                }

                if partnerOpen {
                    VStack(alignment: .leading, spacing: 10) {
                        if p.enabled {
                            Text(p.code).font(.system(.footnote, design: .monospaced).weight(.semibold))
                                .foregroundStyle(Theme.voltText).textSelection(.enabled)
                        } else {
                            Text("Convite desativado.").font(.footnote).foregroundStyle(Theme.secondary)
                        }
                        Text("\(p.signups) cadastros · \(p.qualified) assinantes com pagamento")
                            .font(.footnote).foregroundStyle(.primary)
                        ForEach(p.commissions) { row in
                            HStack {
                                Text(row.formatted).font(.subheadline.weight(.semibold)).foregroundStyle(.primary)
                                Spacer()
                                Text(row.statusLabel).font(.caption).foregroundStyle(Theme.secondary).multilineTextAlignment(.trailing)
                            }
                        }
                        if p.pages > 1 {
                            HStack {
                                Button("Anterior") { page -= 1; Task { await loadPartner() } }.disabled(page <= 1)
                                Spacer()
                                Text("\(page) de \(p.pages)").font(.caption).foregroundStyle(Theme.secondary)
                                Spacer()
                                Button("Próxima") { page += 1; Task { await loadPartner() } }.disabled(page >= p.pages)
                            }
                            .tint(Theme.voltText)
                        }
                    }
                }
            }
        }
    }

    // MARK: Network

    private func load() async {
        do {
            friends = try await APIClient.shared.send("/referrals/friends", method: "POST", json: Empty())
            error = nil
        } catch {
            if !Task.isCancelled { self.error = error.localizedDescription }
        }
        loading = false
        await loadPartner()
    }

    /// The partner program is optional: a 404 simply hides the card.
    private func loadPartner() async {
        do { partner = try await APIClient.shared.get("/referrals/partner?page=\(page)") }
        catch let e as APIError where e.status == 404 { partner = nil }
        catch {}
    }
}

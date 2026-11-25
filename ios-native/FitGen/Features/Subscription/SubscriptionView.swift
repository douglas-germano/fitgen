import SwiftUI
import StoreKit
import RevenueCat

struct SubscriptionView: View {
    init() {}

    @Environment(AppStore.self) private var store
    @State private var info: SubscriptionInfo?
    @State private var offering: Offering?
    @State private var selectedId: String?
    @State private var loading = true
    @State private var busy: Busy?
    @State private var error: String?
    @State private var notice: String?

    private enum Busy { case buy, restore, confirm }

    private static let benefits: [(icon: String, text: String)] = [
        ("sparkles", "IA Coach Otto 24h para tirar dúvidas e ajustar seu plano"),
        ("fork.knife", "Plano alimentar com receitas e lista de compras"),
        ("camera.viewfinder", "Calorias da refeição pela foto ou descrição"),
        ("dumbbell.fill", "Novos planos de treino sempre que você evoluir"),
    ]

    private var premium: Bool { info?.premium ?? store.profile.value?.premium ?? false }
    private var packages: [Package] {
        (offering?.availablePackages ?? []).sorted { rank($0) < rank($1) }
    }
    private var selected: Package? { packages.first { $0.identifier == selectedId } }

    private func rank(_ p: Package) -> Int { p.packageType == .annual ? 0 : p.packageType == .monthly ? 1 : 2 }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                benefitsCard
                if loading {
                    ProgressView().frame(maxWidth: .infinity).padding(.vertical, 24)
                } else if premium {
                    currentPlanCard
                } else {
                    paywall
                }
                if let notice { Text(notice).font(.footnote).foregroundStyle(Theme.voltText) }
                if let error { Text(error).font(.footnote).foregroundStyle(Theme.calories) }
                if !premium && !loading { finePrint }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.vertical, 12)
        }
        .screen()
        .navigationTitle("Assinatura")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    // MARK: Sections

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 30))
                .foregroundStyle(.black)
                .frame(width: 56, height: 56)
                .background(Theme.voltGradient, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            Text("FitGen Premium").font(.system(size: 32, weight: .bold, design: .rounded)).foregroundStyle(.primary)
            Text("Registrar treinos, refeições, água e medidas é grátis. O Premium libera toda a inteligência artificial do FitGen.")
                .font(.subheadline).foregroundStyle(Theme.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .highlightCard()
    }

    private var benefitsCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 14) {
                ForEach(Self.benefits, id: \.text) { benefit in
                    HStack(alignment: .top, spacing: 12) {
                        Image(systemName: benefit.icon)
                            .foregroundStyle(Theme.voltText)
                            .frame(width: 24)
                        Text(benefit.text).font(.subheadline).foregroundStyle(.primary)
                        Spacer(minLength: 0)
                    }
                }
            }
        }
    }

    private var currentPlanCard: some View {
        Card(title: "Seu plano") {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("FitGen Premium").font(.title2.weight(.semibold)).foregroundStyle(.primary)
                    Spacer()
                    Text("Ativo").font(.caption.weight(.bold)).foregroundStyle(.black)
                        .padding(.horizontal, 10).padding(.vertical, 4)
                        .background(Theme.volt, in: Capsule())
                }
                row("Origem", sourceLabel)
                if let renewal = renewalText { row(renewal.label, renewal.value) }
                if info?.subscriptionStatus == "past_due" {
                    Text("Pagamento pendente. Atualize a forma de pagamento para manter o acesso.")
                        .font(.footnote).foregroundStyle(Theme.protein)
                }
                manageButton
            }
        }
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack {
            Text(label).foregroundStyle(Theme.secondary)
            Spacer()
            Text(value).foregroundStyle(.primary)
        }
        .font(.subheadline)
    }

    private var sourceLabel: String {
        switch info?.subscriptionSource {
        case "app_store": "App Store"
        case "play_store": "Google Play"
        case "web": "Site fitgen.pro"
        default: "FitGen"
        }
    }

    private var renewalText: (label: String, value: String)? {
        guard let date = info?.expiresAt else { return nil }
        let value = date.formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "pt_BR")))
        return (info?.subscriptionStatus == "canceled" ? "Acesso até" : "Renova em", value)
    }

    @ViewBuilder private var manageButton: some View {
        switch info?.subscriptionSource {
        case "web":
            VStack(alignment: .leading, spacing: 8) {
                Text("Assinatura feita pelo site. Para cancelar ou trocar a forma de pagamento, use o link “Gerenciar assinatura” do recibo enviado ao seu email.")
                    .font(.footnote).foregroundStyle(Theme.secondary)
                secondaryButton("Gerenciar assinatura") { open("https://fitgen.pro/assinar") }
            }
        case "play_store":
            secondaryButton("Gerenciar assinatura") { open("https://play.google.com/store/account/subscriptions?package=com.douglas.fitgen") }
        default:
            secondaryButton("Gerenciar assinatura") { Task { await manage() } }
        }
    }

    private func secondaryButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(.headline).foregroundStyle(.primary)
                .frame(maxWidth: .infinity).padding(.vertical, 14)
                .background(Theme.cardRaised, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private var paywall: some View {
        VStack(spacing: 12) {
            if packages.isEmpty {
                Card {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("Nenhum plano disponível no momento.").foregroundStyle(Theme.secondary)
                        secondaryButton("Tentar novamente") { Task { await load() } }
                    }
                }
            } else {
                ForEach(packages, id: \.identifier) { packageRow($0) }
                Button { Task { await subscribe() } } label: {
                    HStack {
                        if busy == .buy || busy == .confirm { ProgressView().tint(.black) }
                        Text(subscribeTitle).font(.headline)
                    }
                }
                .buttonStyle(.fitgenPrimary)
                .disabled(selected == nil || busy != nil)
            }
        }
    }

    private func packageRow(_ pkg: Package) -> some View {
        let isSelected = pkg.identifier == selectedId
        return Button { selectedId = pkg.identifier } label: {
            HStack(spacing: 12) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title3).foregroundStyle(isSelected ? Theme.voltText : Theme.secondary)
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(title(pkg)).font(.headline).foregroundStyle(.primary)
                        if let days = trialDays(pkg) {
                            Text("\(days) dias grátis").font(.caption2.weight(.bold)).foregroundStyle(.black)
                                .padding(.horizontal, 8).padding(.vertical, 3)
                                .background(Theme.volt, in: Capsule())
                        }
                    }
                    if pkg.packageType == .annual, let perMonth = pkg.storeProduct.localizedPricePerMonth {
                        Text("\(perMonth.replacingOccurrences(of: "\u{00a0}", with: " "))/mês").font(.subheadline).foregroundStyle(Theme.secondary)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(pkg.storeProduct.localizedPriceString).font(.headline).foregroundStyle(.primary)
                    Text(period(pkg)).font(.caption).foregroundStyle(Theme.secondary)
                }
            }
            .padding(16)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous)
                .stroke(isSelected ? Theme.voltText : .clear, lineWidth: 2))
        }
        .buttonStyle(.plain)
    }

    private var finePrint: some View {
        VStack(spacing: 12) {
            Button { Task { await restore() } } label: {
                Text(busy == .restore ? "Restaurando…" : "Restaurar compras").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.voltText)
            }
            .disabled(busy != nil)
            Text(fineText).font(.caption).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
            HStack(spacing: 8) {
                Link("Política de Privacidade", destination: URL(string: "https://fitgen.pro/privacidade")!)
                Text("·").foregroundStyle(Theme.secondary)
                Link("Termos de Uso (Apple)", destination: URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!)
            }
            .font(.caption.weight(.semibold)).tint(Theme.voltText)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 4)
    }

    private var fineText: String {
        let renew = trialDays(selected).map { _ in
            "Após o período grátis, a assinatura é cobrada\(selected.map { " (\($0.storeProduct.localizedPriceString))" } ?? "") e renova automaticamente. "
        } ?? "A assinatura renova automaticamente. "
        return renew + "O pagamento é cobrado na sua conta da Apple na confirmação da compra. Para evitar a cobrança, cancele em Ajustes › Apple ID › Assinaturas pelo menos 24 horas antes do fim do período."
    }

    // MARK: Labels

    private var subscribeTitle: String {
        if busy == .confirm { return "Confirmando assinatura…" }
        if let days = trialDays(selected) { return "Começar \(days) dias grátis" }
        return "Assinar"
    }

    private func title(_ pkg: Package) -> String {
        switch pkg.packageType {
        case .annual: "Anual"
        case .monthly: "Mensal"
        case .weekly: "Semanal"
        case .threeMonth: "Trimestral"
        case .sixMonth: "Semestral"
        default: pkg.storeProduct.localizedTitle.replacingOccurrences(of: #"\s*\(.*\)$"#, with: "", options: .regularExpression)
        }
    }

    private func period(_ pkg: Package) -> String {
        switch pkg.packageType {
        case .annual: "por ano"
        case .monthly: "por mês"
        case .weekly: "por semana"
        case .threeMonth: "a cada 3 meses"
        case .sixMonth: "a cada 6 meses"
        default: ""
        }
    }

    /// Free-trial length in days, when the package has a free introductory offer.
    private func trialDays(_ pkg: Package?) -> Int? {
        guard let intro = pkg?.storeProduct.introductoryDiscount, intro.price == 0 else { return nil }
        let period = intro.subscriptionPeriod
        let unit: Int = switch period.unit {
        case .day: 1
        case .week: 7
        case .month: 30
        case .year: 365
        @unknown default: 1
        }
        return period.value * unit
    }

    // MARK: Actions

    private func open(_ url: String) {
        if let url = URL(string: url) { UIApplication.shared.open(url) }
    }

    private func manage() async {
        if let scene = UIApplication.shared.connectedScenes.first(where: { $0 is UIWindowScene }) as? UIWindowScene {
            do { try await StoreKit.AppStore.showManageSubscriptions(in: scene); return } catch {}
        }
        open("https://apps.apple.com/account/subscriptions")
    }

    private func fetchInfo() async -> SubscriptionInfo? {
        try? await APIClient.shared.get("/profile/me", as: SubscriptionInfo.self)
    }

    private func load() async {
        error = nil
        loading = true
        defer { loading = false }
        info = await fetchInfo()
        if store.profile.value == nil { await store.loadProfile() }
        if premium { return }
        guard let userId = store.profile.value?.id else { return }
        do {
            try await PurchasesService.prepare(userId: userId)
            offering = try await PurchasesService.offering()
            if selected == nil {
                selectedId = packages.first(where: { $0.packageType == .annual })?.identifier ?? packages.first?.identifier
            }
        } catch {
            self.error = "Não foi possível carregar os planos. Verifique sua conexão e tente novamente."
        }
    }

    private func subscribe() async {
        guard let pkg = selected, busy == nil else { return }
        error = nil; notice = nil
        busy = .buy
        do {
            let result = try await Purchases.shared.purchase(package: pkg)
            if result.userCancelled { busy = nil; return }
            await confirmAccess(success: "Tudo certo! Sua assinatura está ativa.")
        } catch {
            busy = nil
            if let rc = error as? ErrorCode, rc == .purchaseCancelledError { return }
            self.error = "A compra não foi finalizada. Você não foi cobrado. Tente novamente."
        }
    }

    private func restore() async {
        guard busy == nil else { return }
        error = nil; notice = nil
        busy = .restore
        do {
            try await PurchasesService.prepare(userId: store.profile.value?.id ?? "")
            let customer = try await Purchases.shared.restorePurchases()
            if PurchasesService.isPremium(customer) {
                await confirmAccess(success: "Assinatura restaurada.")
            } else {
                busy = nil
                error = "Não encontramos uma assinatura ativa nesta conta da Apple."
            }
        } catch {
            busy = nil
            self.error = "Não foi possível restaurar. Tente novamente em instantes."
        }
    }

    /// Asks the backend to sync from RevenueCat, then polls the profile until it reports Premium.
    private func confirmAccess(success: String) async {
        busy = .confirm
        try? await APIClient.shared.sendNoContent("/subscriptions/sync", method: "POST")
        var unlocked = false
        for attempt in 0..<10 {
            if let fresh = await fetchInfo() {
                info = fresh
                if fresh.premium { unlocked = true; break }
            }
            if attempt < 9 { try? await Task.sleep(for: .seconds(2)) }
        }
        await store.loadProfile()
        busy = nil
        if unlocked { notice = success }
        else { notice = "A compra foi recebida e seu acesso será liberado em instantes. Se demorar, toque em “Restaurar compras”." }
    }
}

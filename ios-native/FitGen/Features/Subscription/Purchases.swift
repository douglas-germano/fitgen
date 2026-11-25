import Foundation
import RevenueCat

/// RevenueCat setup. Mirrors mobile/src/lib/purchases.ts: entitlement "premium", the current offering,
/// and the FitGen user id as the RevenueCat app user id (the backend webhook maps purchases to users.id).
enum PurchasesConfig {
    /// RevenueCat Test Store key (also in project.yml as REVENUECAT_IOS_KEY).
    /// It MUST become the production `appl_...` public key before any release build.
    static let apiKey = "test_GNGDxltVJtXcBguhfoqEUemyCHM"
    static let entitlement = "premium"
}

/// Subscription details from /profile/me that `Profile` doesn't carry.
struct SubscriptionInfo: Decodable, Sendable {
    var isPremium: Bool?
    var plan: String?
    var subscriptionSource: String?
    var subscriptionStatus: String?
    var subscriptionExpiresAt: String?

    var premium: Bool { isPremium == true || plan == "premium" }
    var expiresAt: Date? {
        guard let raw = subscriptionExpiresAt else { return nil }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = f.date(from: raw) { return d }
        f.formatOptions = [.withInternetDateTime]
        if let d = f.date(from: raw) { return d }
        let g = DateFormatter()
        g.locale = Locale(identifier: "en_US_POSIX")
        g.timeZone = TimeZone(identifier: "UTC")
        for format in ["yyyy-MM-dd'T'HH:mm:ss.SSSSSS", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd"] {
            g.dateFormat = format
            if let d = g.date(from: raw) { return d }
        }
        return nil
    }
}

@MainActor
enum PurchasesService {
    private static var configuredFor: String?

    /// Configures the SDK on first use and logs in as the FitGen user.
    static func prepare(userId: String) async throws {
        if !Purchases.isConfigured {
            Purchases.configure(withAPIKey: PurchasesConfig.apiKey, appUserID: userId)
            configuredFor = userId
            return
        }
        if configuredFor != userId || Purchases.shared.appUserID != userId {
            _ = try await Purchases.shared.logIn(userId)
            configuredFor = userId
        }
    }

    static func offering() async throws -> Offering? {
        try await Purchases.shared.offerings().current
    }

    static func isPremium(_ info: CustomerInfo) -> Bool {
        info.entitlements.active[PurchasesConfig.entitlement] != nil
    }
}

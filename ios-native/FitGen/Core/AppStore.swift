import Foundation
import Observation

/// Sign-in state for the whole app.
@MainActor @Observable
final class Session {
    enum Status { case signedOut, signedIn }
    var status: Status = APIClient.shared.hasStoredSession ? .signedIn : .signedOut

    init() {
        Task {
            await APIClient.shared.setUnauthorizedHandler { [weak self] in
                Task { @MainActor in self?.status = .signedOut }
            }
        }
    }

    func signIn(email: String, password: String) async throws {
        struct Body: Encodable { let email: String; let password: String }
        let tokens: LoginResponse = try await APIClient.shared.publicPost(
            "/auth/login", json: Body(email: email.trimmingCharacters(in: .whitespaces).lowercased(), password: password))
        await APIClient.shared.saveTokens(access: tokens.accessToken, refresh: tokens.refreshToken)
        status = .signedIn
    }

    /// Creates the account (POST /auth/register) and signs in, like the Expo app.
    func register(name: String, email: String, password: String, phone: String?, referralCode: String?) async throws {
        try await createAccount(name: name, email: email, password: password, phone: phone, referralCode: referralCode)
        try await signIn(email: email, password: password)
    }

    /// Just the POST /auth/register half, so a failed sign-in afterwards can be retried without a 409.
    func createAccount(name: String, email: String, password: String, phone: String?, referralCode: String?) async throws {
        struct Body: Encodable { let name: String; let email: String; let password: String; let phone: String?; let referralCode: String? }
        let cleanEmail = email.trimmingCharacters(in: .whitespaces).lowercased()
        let _: Empty = try await APIClient.shared.publicPost("/auth/register", json: Body(
            name: name.trimmingCharacters(in: .whitespacesAndNewlines), email: cleanEmail, password: password,
            phone: phone.flatMap { $0.isEmpty ? nil : $0 }, referralCode: referralCode.flatMap { $0.isEmpty ? nil : $0 }))
    }

    /// Sign in (or sign up) with a Google / Apple id_token (POST /auth/social).
    func signInSocial(provider: String, idToken: String, name: String?, referralCode: String?) async throws {
        struct Body: Encodable { let provider: String; let idToken: String; let name: String?; let referralCode: String? }
        let tokens: LoginResponse = try await APIClient.shared.publicPost(
            "/auth/social", json: Body(provider: provider, idToken: idToken, name: name,
                                       referralCode: referralCode.flatMap { $0.isEmpty ? nil : $0 }))
        await APIClient.shared.saveTokens(access: tokens.accessToken, refresh: tokens.refreshToken)
        status = .signedIn
    }

    /// Asks the backend to e-mail a reset link (POST /auth/forgot-password). Always 200, to avoid leaking accounts.
    func requestPasswordReset(email: String) async throws {
        struct Body: Encodable { let email: String }
        let _: Empty = try await APIClient.shared.publicPost(
            "/auth/forgot-password", json: Body(email: email.trimmingCharacters(in: .whitespaces).lowercased()))
    }

    func signOut() async {
        await APIClient.shared.clearTokens()
        status = .signedOut
    }
}

/// Loaded state of one remote resource.
enum Remote<Value> {
    case idle, loading, loaded(Value), failed(String)

    var value: Value? { if case .loaded(let v) = self { v } else { nil } }
    var error: String? { if case .failed(let e) = self { e } else { nil } }
    var isLoading: Bool { if case .loading = self { true } else { false } }
}

/// The user's data shared by every tab. Each screen asks for what it needs; values stay cached
/// until a refresh, so switching tabs is instant.
@MainActor @Observable
final class AppStore {
    private let api = APIClient.shared

    var profile: Remote<Profile> = .idle
    var plan: Remote<WorkoutPlan?> = .idle
    var history: Remote<[SessionSummary]> = .idle
    var activeSession: ActiveSession?
    var nutrition: Remote<DailyNutrition> = .idle
    var dietPlan: Remote<DietPlan?> = .idle
    var hydration: Remote<HydrationDaily> = .idle
    var streaks: Streaks?
    var achievements: [Achievement] = []
    var metricHistory: [MetricKind: [HistoryPoint]] = [:]
    var metricsLoaded = false
    var health = HealthService()

    // MARK: Loading

    func loadProfile() async {
        do { profile = .loaded(try await api.get("/profile/me")) } catch { profile = .failed(error.localizedDescription) }
    }

    func loadPlan() async {
        do {
            let plans: [WorkoutPlan] = try await api.get("/workouts")
            guard let active = plans.first(where: \.isActive) else { plan = .loaded(nil); return }
            plan = .loaded(try await api.get("/workouts/\(active.id)"))
        } catch {
            plan = .failed(error.localizedDescription)
        }
    }

    func loadHistory() async {
        do {
            async let native: [SessionSummary] = api.get("/exercises/history?days=90&limit=500")
            async let imported: [SessionSummary] = (try? await api.get("/health/workouts")) ?? []
            let all = try await native + imported
            history = .loaded(all.filter { $0.date != nil }.sorted { $0.startedAt > $1.startedAt })
        } catch {
            history = .failed(error.localizedDescription)
        }
    }

    func loadActiveSession() async {
        do { activeSession = try await api.get("/exercises/sessions/active") }
        catch let error as APIError where error.status == 404 { activeSession = nil }
        catch {}
    }

    func loadNutrition() async {
        do { nutrition = .loaded(try await api.get("/nutrition/daily")) } catch { nutrition = .failed(error.localizedDescription) }
    }

    func loadDietPlan() async {
        do { dietPlan = .loaded(try await api.get("/diet/plan")) }
        catch let error as APIError where error.status == 404 { dietPlan = .loaded(nil) }
        catch { dietPlan = .failed(error.localizedDescription) }
    }

    func loadHydration() async {
        do { hydration = .loaded(try await api.get("/hydration/daily")) } catch { hydration = .failed(error.localizedDescription) }
    }

    func loadGamification() async {
        streaks = try? await api.get("/gamification/streaks")
        achievements = (try? await api.get("/gamification/achievements")) ?? achievements
    }

    func loadMetrics() async {
        await withTaskGroup(of: (MetricKind, [HistoryPoint]?).self) { group in
            for kind in MetricKind.allCases {
                group.addTask { [api] in
                    (kind, try? await api.get("/metrics/history?type=\(kind.rawValue)&limit=400"))
                }
            }
            for await (kind, points) in group {
                if let points {
                    metricHistory[kind] = points.filter { $0.value.isFinite && $0.day != nil }.sorted { $0.date < $1.date }
                }
            }
        }
        metricsLoaded = true
    }

    /// Everything the Resumo tab shows, in parallel.
    func loadToday() async {
        async let a: Void = loadProfile()
        async let b: Void = loadPlan()
        async let c: Void = loadHistory()
        async let d: Void = loadNutrition()
        async let e: Void = loadDietPlan()
        async let f: Void = loadHydration()
        async let g: Void = loadGamification()
        async let h: Void = loadActiveSession()
        async let i: Void = health.refresh()
        async let j: Void = loadMetrics()
        _ = await (a, b, c, d, e, f, g, h, i, j)
    }

    func clear() {
        profile = .idle; plan = .idle; history = .idle; activeSession = nil; nutrition = .idle
        dietPlan = .idle; hydration = .idle; streaks = nil; achievements = []; metricHistory = [:]; metricsLoaded = false
    }

    // MARK: Derived values

    /// The calorie goal: the diet plan, then its macros, then the profile's TDEE. Never an invented number.
    var calorieGoal: Double? {
        if let plan = dietPlan.value ?? nil {
            if let calories = plan.calories, calories > 0 { return calories }
            if let t = plan.macroTargets { return t.protein * 4 + t.carbs * 4 + t.fats * 9 }
        }
        if let tdee = profile.value?.tdee, tdee > 0 { return tdee }
        return nil
    }

    var proteinGoal: Double? { (dietPlan.value ?? nil)?.macroTargets?.protein }

    /// Strength sessions logged in the app (not outdoor, not imported from Health).
    var strengthSessions: [SessionSummary] {
        (history.value ?? []).filter { $0.outdoorType == nil && $0.fromHealth != true }
    }

    func trained(on date: Date) -> Bool {
        strengthSessions.contains { $0.date.map { Calendar.current.isDate($0, inSameDayAs: date) } ?? false }
    }

    /// Workouts done this week vs. planned this week: the weekly goal that replaces a daily streak.
    var weekProgress: (done: Int, planned: Int) {
        let week = Calendar.mondayFirst.dateInterval(of: .weekOfYear, for: .now)
        let done = Set(strengthSessions.compactMap { s -> Int? in
            guard let d = s.date, week?.contains(d) == true else { return nil }
            return Calendar.current.ordinality(of: .day, in: .year, for: d)
        }).count
        return (done, (plan.value ?? nil)?.days.count ?? 0)
    }

    var latestWeight: Double? { metricHistory[.weight]?.last?.value ?? profile.value?.currentWeightKg }

    // MARK: Mutations

    func logWater(_ ml: Int) async throws {
        struct Body: Encodable { let amountMl: Int }
        let _: Empty = try await api.send("/hydration/log", method: "POST", json: Body(amountMl: ml))
        await loadHydration()
    }

    func logMeal(_ entry: MealEntry) async throws {
        let _: Empty = try await api.send("/nutrition/log", method: "POST", json: entry)
        await loadNutrition()
        await health.saveMeal(calories: entry.calories, protein: entry.protein, carbs: entry.carbs, fats: entry.fats)
    }

    func updateMeal(id: String, _ entry: MealEntry) async throws {
        let _: Empty = try await api.send("/nutrition/log/\(id)", method: "PUT", json: entry)
        await loadNutrition()
    }

    func deleteMeal(id: String) async throws {
        try await api.sendNoContent("/nutrition/log/\(id)", method: "DELETE")
        await loadNutrition()
    }

    func estimateMeal(description: String, photo: Data?) async throws -> MealEstimate {
        struct Body: Encodable { let description: String }
        if let photo {
            return try await api.upload("/nutrition/estimate", fields: ["description": description],
                                        files: [("images", "refeicao.jpg", photo, "image/jpeg")])
        }
        return try await api.send("/nutrition/estimate", method: "POST", json: Body(description: description))
    }

    func logMetrics(_ entry: MetricsEntry) async throws {
        let _: Empty = try await api.send("/metrics/log", method: "POST", json: entry)
        await loadMetrics()
        await loadProfile()
    }

    func generatePlan() async throws {
        try await api.sendNoContent("/onboarding/generate-workout", method: "POST")
        await loadPlan()
    }

    func updateName(_ name: String) async throws {
        struct Body: Encodable { let name: String }
        let _: Empty = try await api.send("/profile/me", method: "PUT", json: Body(name: name))
        await loadProfile()
    }

    /// The sets done last time for one library exercise, indexed by set number (1-based).
    func lastSets(libraryId: String) async -> [Int: ExerciseHistory.Session.SetLog] {
        guard let history: ExerciseHistory = try? await api.get("/exercises/library/\(libraryId)/history?page=1"),
              let last = history.sessions.first(where: { !$0.sets.isEmpty }) else { return [:] }
        return Dictionary(last.sets.map { ($0.setNumber, $0) }, uniquingKeysWith: { a, _ in a })
    }
}

enum MetricKind: String, CaseIterable, Identifiable, Sendable {
    case weight, fat, muscle, waist
    var id: String { rawValue }
    var title: String { switch self { case .weight: "Peso"; case .fat: "Gordura"; case .muscle: "Músculo"; case .waist: "Cintura" } }
    var unit: String { switch self { case .weight, .muscle: "kg"; case .fat: "%"; case .waist: "cm" } }
}

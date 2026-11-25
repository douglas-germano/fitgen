import Foundation

// Shapes returned by the FitGen Flask API. Numbers sometimes arrive as strings, so numeric
// fields decode leniently (see `KeyedDecodingContainer.number`).

struct LoginResponse: Decodable, Sendable {
    let accessToken: String
    let refreshToken: String?
    let onboardingCompleted: Bool?
}

struct Profile: Decodable, Sendable {
    let id: String
    var name: String
    let email: String
    let profilePicture: String?
    let age: Int?
    let gender: String?
    let heightCm: Double?
    let currentWeightKg: Double?
    let targetWeightKg: Double?
    let fitnessGoal: String?
    let activityLevel: String?
    let isPremium: Bool?
    let plan: String?
    let subscriptionSource: String?
    let onboardingCompleted: Bool?
    let bmr: Double?
    let tdee: Double?
    let level: Int?
    let xp: Int?

    enum CodingKeys: String, CodingKey {
        case id, name, email, profilePicture, age, gender, heightCm, currentWeightKg, targetWeightKg, fitnessGoal,
             activityLevel, isPremium, plan, subscriptionSource, onboardingCompleted, bmr, tdee, level, xp
    }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? ""
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? ""
        email = try c.decodeIfPresent(String.self, forKey: .email) ?? ""
        profilePicture = try c.decodeIfPresent(String.self, forKey: .profilePicture)
        age = c.number(.age).map { Int($0) }
        gender = try c.decodeIfPresent(String.self, forKey: .gender)
        heightCm = c.number(.heightCm)
        currentWeightKg = c.number(.currentWeightKg)
        targetWeightKg = c.number(.targetWeightKg)
        fitnessGoal = try c.decodeIfPresent(String.self, forKey: .fitnessGoal)
        activityLevel = try c.decodeIfPresent(String.self, forKey: .activityLevel)
        isPremium = try c.decodeIfPresent(Bool.self, forKey: .isPremium)
        plan = try c.decodeIfPresent(String.self, forKey: .plan)
        subscriptionSource = try c.decodeIfPresent(String.self, forKey: .subscriptionSource)
        onboardingCompleted = try c.decodeIfPresent(Bool.self, forKey: .onboardingCompleted)
        bmr = c.number(.bmr)
        tdee = c.number(.tdee)
        level = c.number(.level).map { Int($0) }
        xp = c.number(.xp).map { Int($0) }
    }

    var firstName: String { name.split(separator: " ").first.map(String.init) ?? name }
    var premium: Bool { isPremium == true || plan == "premium" }
}

struct Exercise: Decodable, Identifiable, Sendable, Hashable {
    let id: String
    let name: String
    let sets: Int
    let reps: String
    let restSeconds: Int
    let notes: String?
    let muscleGroup: String?
    let exerciseLibraryId: String?
    /// GIF showing how to perform the exercise (library exercises only).
    let animationUrl: String?

    enum CodingKeys: String, CodingKey { case id, name, sets, reps, restSeconds, notes, muscleGroup, exerciseLibraryId, animationUrl }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? UUID().uuidString
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Exercício"
        sets = max(0, Int(c.number(.sets) ?? 0))
        reps = (try? c.decodeIfPresent(String.self, forKey: .reps)) ?? c.number(.reps).map { String(Int($0)) } ?? "—"
        restSeconds = max(0, Int(c.number(.restSeconds) ?? 0))
        notes = try c.decodeIfPresent(String.self, forKey: .notes)
        muscleGroup = try c.decodeIfPresent(String.self, forKey: .muscleGroup)
        exerciseLibraryId = try c.string(.exerciseLibraryId)
        animationUrl = try c.decodeIfPresent(String.self, forKey: .animationUrl)
    }

    /// "8-12" → 8, the first number of the range.
    var targetReps: Int { Int(reps.split(whereSeparator: { !$0.isNumber }).first ?? "") ?? 10 }
    var line: String { "\(sets) × \(reps.replacingOccurrences(of: "-", with: "–"))" + (restSeconds > 0 ? " · \(restSeconds) s" : "") }
}

struct WorkoutDay: Decodable, Identifiable, Sendable, Hashable {
    let id: String
    let name: String?
    let dayOfWeek: String
    let focus: String?
    let exercises: [Exercise]

    enum CodingKeys: String, CodingKey { case id, name, dayOfWeek, focus, exercises }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? UUID().uuidString
        name = try c.decodeIfPresent(String.self, forKey: .name)
        dayOfWeek = try c.decodeIfPresent(String.self, forKey: .dayOfWeek) ?? ""
        focus = try c.decodeIfPresent(String.self, forKey: .focus)
        exercises = (try? c.decodeIfPresent([Exercise].self, forKey: .exercises)) ?? []
    }

    var title: String {
        if let name, !name.isEmpty { return name }
        if let focus, !focus.isEmpty { return focus }
        return Weekday(apiName: dayOfWeek)?.long ?? "Treino"
    }

    /// Rough duration: 45 s per set plus its rest.
    var minutes: Int { exercises.reduce(0) { $0 + $1.sets * (45 + ($1.restSeconds == 0 ? 60 : $1.restSeconds)) } / 60 }
}

struct WorkoutPlan: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let description: String?
    let isActive: Bool
    let createdAt: String?
    let days: [WorkoutDay]

    enum CodingKeys: String, CodingKey { case id, name, description, isActive, createdAt, days }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? ""
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Plano"
        description = try c.decodeIfPresent(String.self, forKey: .description)
        isActive = try c.decodeIfPresent(Bool.self, forKey: .isActive) ?? false
        createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt)
        days = (try? c.decodeIfPresent([WorkoutDay].self, forKey: .days)) ?? []
    }

    func day(for weekday: Weekday) -> WorkoutDay? { days.first { $0.dayOfWeek == weekday.apiName } }
    var today: WorkoutDay? { day(for: .today) }

    /// The next planned workout after today, within a week.
    var next: (date: Date, day: WorkoutDay)? {
        for offset in 1...7 {
            let date = Calendar.current.date(byAdding: .day, value: offset, to: .now)!
            if let day = day(for: Weekday(date: date)) { return (date, day) }
        }
        return nil
    }

    var sortedDays: [WorkoutDay] {
        days.sorted { (Weekday(apiName: $0.dayOfWeek)?.mondayIndex ?? 9) < (Weekday(apiName: $1.dayOfWeek)?.mondayIndex ?? 9) }
    }
}

struct SessionSummary: Decodable, Identifiable, Sendable {
    let id: String
    let startedAt: String
    let durationSeconds: Int
    let workoutName: String
    let calories: Double?
    let outdoorType: String?
    let fromHealth: Bool?

    enum CodingKeys: String, CodingKey { case id, startedAt, durationSeconds, workoutName, calories, outdoorType, fromHealth }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? UUID().uuidString
        startedAt = try c.decodeIfPresent(String.self, forKey: .startedAt) ?? ""
        durationSeconds = Int(c.number(.durationSeconds) ?? 0)
        workoutName = (try c.decodeIfPresent(String.self, forKey: .workoutName)).flatMap { $0.isEmpty ? nil : $0 } ?? "Treino"
        calories = c.number(.calories)
        outdoorType = try c.decodeIfPresent(String.self, forKey: .outdoorType)
        fromHealth = try c.decodeIfPresent(Bool.self, forKey: .fromHealth)
    }

    var date: Date? { ISODate.parse(startedAt) }
}

struct ActiveSession: Decodable, Sendable {
    struct Log: Decodable, Sendable {
        let exerciseId: String
        let setNumber: Int
        let weightUsedKg: Double
        let repsDone: Int

        enum CodingKeys: String, CodingKey { case exerciseId, setNumber, weightUsedKg, repsDone }
        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            exerciseId = try c.string(.exerciseId) ?? ""
            setNumber = Int(c.number(.setNumber) ?? 0)
            weightUsedKg = c.number(.weightUsedKg) ?? 0
            repsDone = Int(c.number(.repsDone) ?? 0)
        }
    }
    let sessionId: String
    let workoutDayId: String
    let planId: String
    let elapsedSeconds: Int
    let logs: [Log]

    enum CodingKeys: String, CodingKey { case sessionId, workoutDayId, planId, elapsedSeconds, logs }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        sessionId = try c.string(.sessionId) ?? ""
        workoutDayId = try c.string(.workoutDayId) ?? ""
        planId = try c.string(.planId) ?? ""
        elapsedSeconds = Int(c.number(.elapsedSeconds) ?? 0)
        logs = (try? c.decodeIfPresent([Log].self, forKey: .logs)) ?? []
    }
}

/// GET /exercises/library/:id/history — newest session first.
struct ExerciseHistory: Decodable, Sendable {
    struct Session: Decodable, Sendable {
        struct SetLog: Decodable, Sendable {
            let setNumber: Int
            let reps: Int
            let weightKg: Double?
            enum CodingKeys: String, CodingKey { case setNumber, reps, weightKg }
            init(from decoder: Decoder) throws {
                let c = try decoder.container(keyedBy: CodingKeys.self)
                setNumber = Int(c.number(.setNumber) ?? 0)
                reps = Int(c.number(.reps) ?? 0)
                weightKg = c.number(.weightKg)
            }
        }
        let startedAt: String?
        let sets: [SetLog]
    }
    let sessions: [Session]
}

enum MealType: String, CaseIterable, Identifiable, Sendable, Codable {
    case breakfast, lunch, snack, dinner
    var id: String { rawValue }
    var label: String {
        switch self {
        case .breakfast: "Café da manhã"
        case .lunch: "Almoço"
        case .snack: "Lanche"
        case .dinner: "Jantar"
        }
    }
    var symbol: String {
        switch self {
        case .breakfast: "cup.and.saucer.fill"
        case .lunch: "fork.knife"
        case .snack: "carrot.fill"
        case .dinner: "moon.stars.fill"
        }
    }
    /// A sensible default for the current time of day.
    static var now: MealType {
        switch Calendar.current.component(.hour, from: .now) {
        case ..<10: .breakfast
        case ..<15: .lunch
        case ..<18: .snack
        default: .dinner
        }
    }
}

struct LoggedMeal: Decodable, Identifiable, Sendable, Hashable {
    let id: String
    let name: String
    let mealType: String
    let calories: Double
    let protein: Double
    let carbs: Double
    let fats: Double
    let createdAt: String?

    enum CodingKeys: String, CodingKey { case id, name, mealType, calories, protein, carbs, fats, createdAt }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? UUID().uuidString
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Refeição"
        mealType = try c.decodeIfPresent(String.self, forKey: .mealType) ?? "lunch"
        calories = c.number(.calories) ?? 0
        protein = c.number(.protein) ?? 0
        carbs = c.number(.carbs) ?? 0
        fats = c.number(.fats) ?? 0
        createdAt = try c.decodeIfPresent(String.self, forKey: .createdAt)
    }
    var type: MealType { MealType(rawValue: mealType) ?? .lunch }
}

struct Macros: Decodable, Sendable {
    var calories: Double = 0
    var protein: Double = 0
    var carbs: Double = 0
    var fats: Double = 0
    enum CodingKeys: String, CodingKey { case calories, protein, carbs, fats }
    init() {}
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        calories = c.number(.calories) ?? 0
        protein = c.number(.protein) ?? 0
        carbs = c.number(.carbs) ?? 0
        fats = c.number(.fats) ?? 0
    }
}

struct DailyNutrition: Decodable, Sendable {
    let totals: Macros
    let meals: [LoggedMeal]
    enum CodingKeys: String, CodingKey { case totals, meals }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        totals = (try? c.decodeIfPresent(Macros.self, forKey: .totals)) ?? Macros()
        meals = (try? c.decodeIfPresent([LoggedMeal].self, forKey: .meals)) ?? []
    }
}

struct MealEstimate: Codable, Sendable {
    var name: String
    var calories: Double
    var protein: Double
    var carbs: Double
    var fats: Double
    var portionSize: String?

    enum CodingKeys: String, CodingKey { case name, calories, protein, carbs, fats, portionSize }
    init(name: String, calories: Double, protein: Double, carbs: Double, fats: Double, portionSize: String? = nil) {
        self.name = name; self.calories = calories; self.protein = protein; self.carbs = carbs; self.fats = fats; self.portionSize = portionSize
    }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? "Refeição"
        calories = c.number(.calories) ?? 0
        protein = c.number(.protein) ?? 0
        carbs = c.number(.carbs) ?? 0
        fats = c.number(.fats) ?? 0
        portionSize = try c.decodeIfPresent(String.self, forKey: .portionSize)
    }
}

struct MealEntry: Encodable, Sendable {
    let name: String
    let calories: Double
    let protein: Double
    let carbs: Double
    let fats: Double
    let mealType: String
}

struct DietPlan: Decodable, Sendable {
    struct MacroTargets: Decodable, Sendable { let protein: Double; let carbs: Double; let fats: Double
        enum CodingKeys: String, CodingKey { case protein, carbs, fats }
        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            protein = c.number(.protein) ?? 0; carbs = c.number(.carbs) ?? 0; fats = c.number(.fats) ?? 0
        }
    }
    let id: String
    let macroTargets: MacroTargets?
    let calories: Double?
    let shoppingListCount: Int

    enum CodingKeys: String, CodingKey { case id, macroTargets, calories, shoppingList }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? ""
        macroTargets = try? c.decodeIfPresent(MacroTargets.self, forKey: .macroTargets)
        calories = c.number(.calories)
        shoppingListCount = ((try? c.decodeIfPresent([Empty].self, forKey: .shoppingList)) ?? []).count
    }
}

struct HydrationDaily: Decodable, Sendable {
    let totalIntakeMl: Double
    let dailyGoalMl: Double
    enum CodingKeys: String, CodingKey { case totalIntakeMl, dailyGoalMl }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        totalIntakeMl = c.number(.totalIntakeMl) ?? 0
        dailyGoalMl = c.number(.dailyGoalMl) ?? 2500
    }
}

struct HistoryPoint: Decodable, Sendable, Identifiable {
    let date: String
    let value: Double
    var id: String { date }
    enum CodingKeys: String, CodingKey { case date, value }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        date = try c.decodeIfPresent(String.self, forKey: .date) ?? ""
        value = c.number(.value) ?? .nan
    }
    var day: Date? { ISODate.parse(date) }
}

struct MetricsEntry: Encodable, Sendable {
    let weightKg: Double
    let bodyFatPercentage: Double?
    let muscleMassKg: Double?
    let waistCm: Double?
    let notes: String
}

struct Streaks: Decodable, Sendable {
    let workoutStreak: Int
    let nutritionStreak: Int
    let hydrationStreak: Int
    enum CodingKeys: String, CodingKey { case workoutStreak, nutritionStreak, hydrationStreak }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        workoutStreak = Int(c.number(.workoutStreak) ?? 0)
        nutritionStreak = Int(c.number(.nutritionStreak) ?? 0)
        hydrationStreak = Int(c.number(.hydrationStreak) ?? 0)
    }
}

struct Achievement: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let description: String
    let unlocked: Bool
    let unlockedAt: String?
    enum CodingKeys: String, CodingKey { case id, name, description, unlocked, unlockedAt }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.string(.id) ?? UUID().uuidString
        name = try c.decodeIfPresent(String.self, forKey: .name) ?? ""
        description = try c.decodeIfPresent(String.self, forKey: .description) ?? ""
        unlocked = try c.decodeIfPresent(Bool.self, forKey: .unlocked) ?? false
        unlockedAt = try c.decodeIfPresent(String.self, forKey: .unlockedAt)
    }
}

// MARK: - Lenient decoding

extension KeyedDecodingContainer {
    /// A number sent as a JSON number or as a numeric string; nil when missing, null or not numeric.
    func number(_ key: Key) -> Double? {
        if let value = try? decodeIfPresent(Double.self, forKey: key) { return value }
        if let text = try? decodeIfPresent(String.self, forKey: key) { return Double(text.replacingOccurrences(of: ",", with: ".")) }
        return nil
    }

    /// An id sent as a string or as an integer.
    func string(_ key: Key) throws -> String? {
        if let value = try? decodeIfPresent(String.self, forKey: key) { return value }
        if let value = try? decodeIfPresent(Int.self, forKey: key) { return String(value) }
        return nil
    }
}

// MARK: - Dates

enum ISODate {
    nonisolated(unsafe) private static let withFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]; return f
    }()
    nonisolated(unsafe) private static let plain = ISO8601DateFormatter()

    /// Handles "2026-11-24T10:00:00Z", fractional seconds, timezone-less "2026-11-24T10:00:00" and "2026-11-24".
    static func parse(_ text: String) -> Date? {
        if let d = withFraction.date(from: text) ?? plain.date(from: text) { return d }
        let local = DateFormatter()
        local.locale = Locale(identifier: "en_US_POSIX")
        local.timeZone = TimeZone(identifier: "UTC")
        for format in ["yyyy-MM-dd'T'HH:mm:ss.SSSSSS", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd"] {
            local.dateFormat = format
            if let d = local.date(from: text) { return d }
        }
        return nil
    }
}

enum Weekday: Int, CaseIterable, Sendable {
    case sunday = 1, monday, tuesday, wednesday, thursday, friday, saturday

    init(date: Date) { self = Weekday(rawValue: Calendar.current.component(.weekday, from: date)) ?? .monday }
    init?(apiName: String) {
        guard let day = Weekday.allCases.first(where: { $0.apiName == apiName.lowercased() }) else { return nil }
        self = day
    }
    static var today: Weekday { Weekday(date: .now) }

    var apiName: String { ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][rawValue - 1] }
    var long: String { ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][rawValue - 1] }
    var initial: String { ["D", "S", "T", "Q", "Q", "S", "S"][rawValue - 1] }
    /// Monday = 0 … Sunday = 6.
    var mondayIndex: Int { (rawValue + 5) % 7 }
    static var mondayFirst: [Weekday] { [.monday, .tuesday, .wednesday, .thursday, .friday, .saturday, .sunday] }
}

extension Calendar {
    /// Weeks run Monday → Sunday, like the workout plan (pt_BR's default starts on Sunday).
    static let mondayFirst: Calendar = {
        var calendar = Calendar.current
        calendar.firstWeekday = 2
        return calendar
    }()
}

extension WorkoutDay {
    /// "Treino C – Pernas, Glúteos e Core" → "Pernas, Glúteos e Core": the weekday already identifies it.
    var shortTitle: String {
        let pattern = #"^\s*Treino\s+[A-Z0-9]{1,2}\s*[–—:\-]\s*"#
        let trimmed = title.replacingOccurrences(of: pattern, with: "", options: .regularExpression)
        return trimmed.isEmpty ? title : trimmed
    }
}

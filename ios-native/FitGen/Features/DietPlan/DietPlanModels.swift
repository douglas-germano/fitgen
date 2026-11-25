import Foundation

struct PlannedMeal: Decodable, Sendable, Hashable {
    var nome: String
    var calorias: Double
    var ingredientes: [String]
    var preparo: String?

    private enum CodingKeys: String, CodingKey { case nome, calorias, ingredientes, preparo }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        nome = (try? c.decodeIfPresent(String.self, forKey: .nome)) ?? ""
        calorias = c.number(.calorias) ?? 0
        ingredientes = (try? c.decodeIfPresent([String].self, forKey: .ingredientes)) ?? []
        let text = (try? c.decodeIfPresent(String.self, forKey: .preparo)) ?? nil
        preparo = text?.isEmpty == false ? text : nil
    }
}

struct ShoppingItem: Codable, Sendable, Hashable, Identifiable {
    let id = UUID()
    var item: String
    var quantidade: String
    var precoAprox: Double?
    var checked: Bool

    private enum CodingKeys: String, CodingKey { case item, quantidade, precoAprox, checked }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        item = (try? c.decodeIfPresent(String.self, forKey: .item)) ?? ""
        quantidade = (try? c.decodeIfPresent(String.self, forKey: .quantidade)) ?? ""
        precoAprox = c.number(.precoAprox)
        checked = (try? c.decodeIfPresent(Bool.self, forKey: .checked)) ?? false
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(item, forKey: .item)
        try c.encode(quantidade, forKey: .quantidade)
        try c.encodeIfPresent(precoAprox, forKey: .precoAprox)
        try c.encode(checked, forKey: .checked)
    }
}

struct DietMacroTargets: Decodable, Sendable, Hashable {
    var protein: Double
    var carbs: Double
    var fats: Double

    private enum CodingKeys: String, CodingKey { case protein, carbs, fats }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        protein = c.number(.protein) ?? 0
        carbs = c.number(.carbs) ?? 0
        fats = c.number(.fats) ?? 0
    }
}

/// Meal slots in the order they are shown.
enum MealSlot: String, CaseIterable, Sendable {
    case cafe, lancheManha, preTreino, almoco, lanche, posTreino, jantar, ceia

    var label: String {
        switch self {
        case .cafe: "Café da manhã"
        case .lancheManha: "Lanche da manhã"
        case .preTreino: "Pré-treino"
        case .almoco: "Almoço"
        case .lanche: "Lanche"
        case .posTreino: "Pós-treino"
        case .jantar: "Jantar"
        case .ceia: "Ceia"
        }
    }

    /// Server keys arrive as `lanche_manha`, or `lancheManha` when the snake-case decoder touched them.
    static func from(key: String) -> MealSlot? {
        let flat = key.replacingOccurrences(of: "_", with: "").lowercased()
        return allCases.first { $0.rawValue.lowercased() == flat }
    }
}

/// Days of the week, Monday first. `key` is the prefix of the server's day key.
enum PlanDay: String, CaseIterable, Identifiable, Sendable {
    case segunda, terca, quarta, quinta, sexta, sabado, domingo
    var id: String { rawValue }

    var short: String {
        switch self {
        case .segunda: "Seg"
        case .terca: "Ter"
        case .quarta: "Qua"
        case .quinta: "Qui"
        case .sexta: "Sex"
        case .sabado: "Sáb"
        case .domingo: "Dom"
        }
    }

    var long: String {
        switch self {
        case .segunda: "segunda"
        case .terca: "terça"
        case .quarta: "quarta"
        case .quinta: "quinta"
        case .sexta: "sexta"
        case .sabado: "sábado"
        case .domingo: "domingo"
        }
    }

    static var today: PlanDay {
        // Calendar weekday: 1 = domingo ... 7 = sábado.
        switch Calendar.current.component(.weekday, from: Date()) {
        case 1: .domingo
        case 2: .segunda
        case 3: .terca
        case 4: .quarta
        case 5: .quinta
        case 6: .sexta
        default: .sabado
        }
    }

    static func normalize(_ text: String) -> String {
        text.folding(options: [.diacriticInsensitive, .caseInsensitive], locale: nil).lowercased()
    }
}

struct FullDietPlan: Decodable, Sendable {
    var id: String
    /// Normalized day key (e.g. "segunda") → slot → meal.
    var days: [String: [MealSlot: PlannedMeal]]
    var shoppingList: [ShoppingItem]
    var macroTargets: DietMacroTargets?
    var calories: Double

    private struct AnyKey: CodingKey {
        var stringValue: String
        var intValue: Int? { nil }
        init?(stringValue: String) { self.stringValue = stringValue }
        init?(intValue: Int) { nil }
    }

    private enum CodingKeys: String, CodingKey { case id, weeklyPlan, shoppingList, macroTargets, calories }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = (try c.string(.id)) ?? ""
        shoppingList = (try? c.decodeIfPresent([ShoppingItem].self, forKey: .shoppingList)) ?? []
        macroTargets = try? c.decodeIfPresent(DietMacroTargets.self, forKey: .macroTargets)
        calories = c.number(.calories) ?? 0

        var parsed: [String: [MealSlot: PlannedMeal]] = [:]
        if let week = try? c.nestedContainer(keyedBy: AnyKey.self, forKey: .weeklyPlan) {
            for dayKey in week.allKeys {
                guard let dayContainer = try? week.nestedContainer(keyedBy: AnyKey.self, forKey: dayKey) else { continue }
                var meals: [MealSlot: PlannedMeal] = [:]
                for mealKey in dayContainer.allKeys {
                    if let slot = MealSlot.from(key: mealKey.stringValue),
                       let meal = try? dayContainer.decode(PlannedMeal.self, forKey: mealKey) {
                        meals[slot] = meal
                    }
                }
                parsed[PlanDay.normalize(dayKey.stringValue)] = meals
            }
        }
        days = parsed
        if calories == 0, let t = macroTargets { calories = t.protein * 4 + t.carbs * 4 + t.fats * 9 }
    }

    var hasMenu: Bool { days.values.contains { !$0.isEmpty } }

    func meals(on day: PlanDay) -> [(slot: MealSlot, meal: PlannedMeal)] {
        let key = days.keys.first { $0.hasPrefix(day.rawValue) }
        guard let key, let meals = days[key] else { return [] }
        return MealSlot.allCases.compactMap { slot in meals[slot].map { (slot, $0) } }
    }
}

// MARK: - Requests

struct DietPreferences: Encodable, Sendable {
    var goal: String
    var restrictions: [String]
    var allergies: String
    var dislikes: String
    var budget: String
    var ingredientAccess: String
    var mealsPerDay: Int
    var cooksAtHome: Bool
    var prepTime: String
    var calorieGoal: Int
}

extension AppStore {
    /// The full plan, or nil when the user has none yet.
    func fetchFullDietPlan() async throws -> FullDietPlan? {
        do { return try await APIClient.shared.get("/diet/plan") }
        catch let error as APIError where error.status == 404 { return nil }
    }

    func regenerateDietDay(_ day: PlanDay) async throws {
        struct Body: Encodable { let day: String }
        let _: Empty = try await APIClient.shared.send("/diet/regenerate-day", method: "POST", json: Body(day: day.rawValue))
        await loadDietPlan()
    }

    func saveShoppingList(_ items: [ShoppingItem]) async throws {
        struct Body: Encodable { let shoppingList: [ShoppingItem] }
        let _: Empty = try await APIClient.shared.send("/diet/shopping-list", method: "PUT", json: Body(shoppingList: items))
    }

    /// Saves preferences, then has Otto generate the plan (Premium).
    func createDietPlan(_ preferences: DietPreferences) async throws {
        let _: Empty = try await APIClient.shared.send("/diet/onboarding", method: "POST", json: preferences)
        try await APIClient.shared.sendNoContent("/diet/generate", method: "POST")
        await loadDietPlan()
    }
}

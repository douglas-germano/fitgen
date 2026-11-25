import Foundation

/// Portuguese labels for the keys of the backend exercise catalog (ported from mobile/src/lib/exercise-library.ts).
enum ExerciseLabels {
    static let muscles: [String: String] = [
        "chest": "Peito", "upper_chest": "Peito superior", "lats": "Dorsal", "upper_back": "Costas",
        "traps": "Trapézio", "lower_back": "Lombar", "front_delt": "Ombro anterior", "side_delt": "Ombro lateral",
        "rear_delt": "Ombro posterior", "biceps": "Bíceps", "triceps": "Tríceps", "forearms": "Antebraço",
        "abs": "Abdômen", "obliques": "Oblíquos", "quads": "Quadríceps", "hamstrings": "Posterior de coxa",
        "glutes": "Glúteos", "adductors": "Adutores", "abductors": "Abdutores", "calves": "Panturrilha",
        "hip_flexors": "Flexores do quadril", "full_body": "Corpo todo",
        "shoulders": "Ombros", "back": "Costas", "legs": "Pernas", "core": "Core", "arms": "Braços", "cardio": "Cardio",
    ]
    static let equipment: [String: String] = [
        "barbell": "Barra", "dumbbells": "Halteres", "kettlebell": "Kettlebell", "ez_bar": "Barra W",
        "machine": "Máquina", "cable": "Polia", "smith_machine": "Smith", "bench": "Banco",
        "pull_up_bar": "Barra fixa", "parallel_bars": "Paralelas", "resistance_band": "Elástico",
        "bodyweight": "Peso do corpo", "mat": "Colchonete", "box": "Caixote", "jump_rope": "Corda",
        "cardio_machine": "Aparelho de cardio", "ab_wheel": "Roda abdominal", "weight_plate": "Anilha",
    ]
    static let levels: [String: String] = ["beginner": "Iniciante", "intermediate": "Intermediário", "advanced": "Avançado"]
    static let categories: [String: String] = [
        "strength": "Força", "cardio": "Cardio", "flexibility": "Mobilidade", "balance": "Equilíbrio", "plyometric": "Pliometria",
    ]

    static func muscle(_ key: String) -> String { muscles[key] ?? key }
    static func gear(_ key: String) -> String { equipment[key] ?? key }
    static func level(_ key: String) -> String { levels[key] ?? key }
    static func category(_ key: String) -> String { categories[key] ?? key }
}

/// Body regions for the filter chips.
enum ExerciseRegion: String, CaseIterable, Identifiable {
    case all, chest, back, shoulders, arms, core, legs, glutes, cardio, mobility
    var id: String { rawValue }
    var label: String {
        switch self {
        case .all: "Todos"; case .chest: "Peito"; case .back: "Costas"; case .shoulders: "Ombros"
        case .arms: "Braços"; case .core: "Abdômen"; case .legs: "Pernas"; case .glutes: "Glúteos"
        case .cardio: "Cardio"; case .mobility: "Mobilidade"
        }
    }

    private static let byMuscle: [String: ExerciseRegion] = [
        "chest": .chest, "upper_chest": .chest,
        "lats": .back, "upper_back": .back, "traps": .back, "lower_back": .back,
        "front_delt": .shoulders, "side_delt": .shoulders, "rear_delt": .shoulders,
        "biceps": .arms, "triceps": .arms, "forearms": .arms,
        "abs": .core, "obliques": .core, "hip_flexors": .core,
        "quads": .legs, "hamstrings": .legs, "adductors": .legs, "calves": .legs,
        "glutes": .glutes, "abductors": .glutes,
    ]

    static func of(_ ex: LibraryExercise) -> ExerciseRegion? {
        if ex.category == "cardio" || ex.category == "plyometric" { return .cardio }
        if ex.category == "flexibility" || ex.category == "balance" { return .mobility }
        return ex.primaryMuscle.flatMap { byMuscle[$0] }
    }
}

extension LibraryExercise {
    /// "Peito · Halteres"
    var caption: String {
        // "Peso do corpo ou halteres" when the exercise works either way, so the label matches the picture.
        let gear = equipmentNeeded.filter { $0 != "bench" && $0 != "mat" }.prefix(2).map(ExerciseLabels.gear)
        let gearText = gear.isEmpty ? nil : gear.enumerated().map { $0.offset == 0 ? $0.element : $0.element.lowercased() }.joined(separator: " ou ")
        return [primaryMuscle.map(ExerciseLabels.muscle), gearText].compactMap { $0 }.joined(separator: " · ")
    }

    /// Lowercased, accent-free words searched for this exercise.
    var searchText: String {
        ([name] + muscleGroups.map(ExerciseLabels.muscle) + equipmentNeeded.map(ExerciseLabels.gear))
            .joined(separator: " ").folding(options: [.diacriticInsensitive, .caseInsensitive], locale: nil)
    }
}

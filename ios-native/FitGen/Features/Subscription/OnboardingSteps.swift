import Foundation

/// Onboarding questions, ported from mobile/src/lib/onboarding.ts. Stable keys are the API contract.
struct OnboardingStep: Identifiable, Sendable {
    enum Kind: Sendable { case text, number, single, multi, date, time }
    struct Option: Sendable { let value: String; let label: String }

    let key: String
    let section: String
    let question: String
    var hint: String?
    let kind: Kind
    var options: [Option] = []
    var optional = false
    var unit: String?
    var min: Int?
    var max: Int?
    var placeholder: String?

    var id: String { key }
    var usesKeyboard: Bool { kind != .single && kind != .multi }
}

/// A scalar or list answer. Encodes as a JSON string or array of strings.
enum OnboardingAnswer: Equatable, Encodable, Sendable {
    case one(String)
    case many([String])

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .one(let s): try c.encode(s)
        case .many(let a): try c.encode(a)
        }
    }
}

typealias OnboardingAnswers = [String: OnboardingAnswer]

enum OnboardingFlow {
    private static func opts(_ items: [(String, String)]) -> [OnboardingStep.Option] {
        items.map { .init(value: $0.0, label: $0.1) }
    }

    private static let basic = "Sobre você", training = "Seu treino", nutrition = "Sua alimentação"

    static let steps: [OnboardingStep] = [
        .init(key: "name", section: basic, question: "Como você quer que eu te chame?", kind: .text, max: 100, placeholder: "Seu nome"),
        .init(key: "goal", section: basic, question: "O que você quer conquistar agora?", kind: .single, options: opts([("lose_weight", "Perder gordura"), ("gain_muscle", "Ganhar massa muscular"), ("maintain", "Manter meu peso"), ("gain_strength", "Ganhar força"), ("improve_health", "Cuidar da minha saúde")])),
        .init(key: "gender", section: basic, question: "Qual é o seu gênero?", hint: "Essa informação faz parte do seu perfil. Você também pode escolher “Outro”.", kind: .single, options: opts([("male", "Masculino"), ("female", "Feminino"), ("other", "Outro")])),
        .init(key: "birth_date", section: basic, question: "Quando você nasceu?", kind: .date, placeholder: "DD/MM/AAAA"),
        .init(key: "height", section: basic, question: "Qual é a sua altura?", kind: .number, unit: "cm", min: 100, max: 250, placeholder: "Ex.: 175"),
        .init(key: "weight", section: basic, question: "Quanto você pesa hoje?", kind: .number, unit: "kg", min: 20, max: 350, placeholder: "Ex.: 72,5"),
        .init(key: "target_weight", section: basic, question: "Qual peso você quer alcançar ou manter?", hint: "Você pode ajustar sua meta depois, no perfil.", kind: .number, unit: "kg", min: 20, max: 350, placeholder: "Sua meta em kg"),
        .init(key: "experience", section: training, question: "Como está sua experiência com os treinos?", kind: .single, options: opts([("beginner", "Estou começando ou voltando"), ("intermediate", "Já treino com frequência"), ("advanced", "Tenho bastante experiência")])),
        .init(key: "focus", section: training, question: "Qual foco combina mais com seu treino?", kind: .single, options: opts([("hypertrophy", "Hipertrofia"), ("strength", "Força"), ("conditioning", "Condicionamento"), ("health", "Saúde e disposição")])),
        .init(key: "muscles", section: training, question: "Quer dar atenção especial a algum grupo muscular?", hint: "Escolha até 3. O plano continua trabalhando o corpo todo.", kind: .multi, options: opts([("chest", "Peito"), ("back", "Costas"), ("shoulders", "Ombros"), ("arms", "Braços"), ("abs", "Abdômen"), ("glutes", "Glúteos"), ("legs", "Pernas")]), optional: true, max: 3),
        .init(key: "days", section: training, question: "Quais dias funcionam para você treinar?", hint: "Escolha pelo menos um dia da sua semana.", kind: .multi, options: opts([("monday", "Segunda"), ("tuesday", "Terça"), ("wednesday", "Quarta"), ("thursday", "Quinta"), ("friday", "Sexta"), ("saturday", "Sábado"), ("sunday", "Domingo")]), min: 1, max: 7),
        .init(key: "duration", section: training, question: "Quanto tempo você tem por treino?", kind: .single, options: opts([("30", "30 minutos"), ("45", "45 minutos"), ("60", "1 hora"), ("90", "1 hora e meia")])),
        .init(key: "location", section: training, question: "Onde você vai treinar?", kind: .single, options: opts([("gym", "Academia completa"), ("home", "Em casa, com halteres"), ("bodyweight", "Em casa, sem equipamentos")])),
        .init(key: "injuries", section: training, question: "Tem alguma lesão ou limitação que eu deva considerar?", hint: "Descreva os movimentos que precisa evitar ou pule se não houver.", kind: .text, optional: true, max: 600, placeholder: "Ex.: limitação no joelho direito"),
        .init(key: "training_time", section: training, question: "Em qual horário você costuma treinar?", hint: "Vamos guardar como preferência. Isso não ativa lembretes automaticamente.", kind: .time, optional: true, placeholder: "HH:MM"),
        .init(key: "activity", section: training, question: "E fora do treino, como é sua rotina?", kind: .single, options: opts([("sedentary", "Passo a maior parte do dia sentado"), ("light", "Me movimento um pouco"), ("moderate", "Alterno entre sentar e me movimentar"), ("active", "Passo boa parte do dia em movimento"), ("very_active", "Minha rotina exige bastante esforço físico")])),
        .init(key: "meals", section: nutrition, question: "Quais refeições fazem parte do seu dia?", hint: "Selecione de 2 a 8 refeições.", kind: .multi, options: opts([("breakfast", "Café da manhã"), ("morning_snack", "Lanche da manhã"), ("pre_workout", "Pré-treino"), ("lunch", "Almoço"), ("afternoon_snack", "Lanche da tarde"), ("post_workout", "Pós-treino"), ("dinner", "Jantar"), ("supper", "Ceia")]), min: 2, max: 8),
        .init(key: "diet_style", section: nutrition, question: "Você segue algum estilo de alimentação?", kind: .single, options: opts([("classic", "Como de tudo"), ("vegetarian", "Vegetariano"), ("vegan", "Vegano"), ("pescatarian", "Pescetariano"), ("low_carb", "Low carb")])),
        .init(key: "excluded_foods", section: nutrition, question: "Quais alimentos você prefere deixar fora do plano?", hint: "Marque os que não consome. Alergias vêm na próxima pergunta.", kind: .multi, options: opts([("red_meat", "Carne vermelha"), ("pork", "Carne suína"), ("chicken", "Frango"), ("fish", "Peixe"), ("seafood", "Frutos do mar"), ("eggs", "Ovos"), ("dairy", "Leite e derivados"), ("gluten", "Glúten"), ("soy", "Soja"), ("nuts", "Castanhas e amendoim")]), optional: true),
        .init(key: "allergies", section: nutrition, question: "Tem alguma alergia ou intolerância alimentar?", hint: "Escreva todas as que o plano precisa respeitar.", kind: .text, optional: true, max: 600, placeholder: "Ex.: alergia a amendoim, intolerância à lactose"),
        .init(key: "liked_foods", section: nutrition, question: "O que você gosta de comer?", hint: "Conte alguns alimentos que gostaria de ver nas refeições.", kind: .text, optional: true, max: 600, placeholder: "Ex.: arroz, feijão, banana, ovos"),
        .init(key: "disliked_foods", section: nutrition, question: "E o que você não gosta de comer?", kind: .text, optional: true, max: 600, placeholder: "Alimentos que prefere evitar"),
        .init(key: "supplements", section: nutrition, question: "Você já usa algum destes suplementos?", hint: "Vamos registrar o que já faz parte da sua rotina.", kind: .multi, options: opts([("whey", "Whey protein"), ("albumin", "Albumina"), ("creatine", "Creatina"), ("mass_gainer", "Hipercalórico")]), optional: true),
        .init(key: "budget", section: nutrition, question: "Qual é seu orçamento mensal para alimentação?", kind: .single, options: opts([("ate_300", "Até R$ 300"), ("300_500", "R$ 300 a R$ 500"), ("500_800", "R$ 500 a R$ 800"), ("acima_800", "Acima de R$ 800")])),
        .init(key: "ingredients", section: nutrition, question: "Que ingredientes são fáceis de encontrar para você?", kind: .single, options: opts([("basicos", "Os básicos do dia a dia"), ("intermediarios", "Tenho acesso a bastante variedade"), ("sofisticados", "Encontro até ingredientes especiais")])),
        .init(key: "cooks", section: nutrition, question: "Você costuma preparar suas refeições?", kind: .single, options: opts([("sim_todas", "Sim, preparo todas"), ("as_vezes", "Às vezes"), ("raramente", "Raramente"), ("nao", "Não costumo cozinhar")])),
        .init(key: "prep_time", section: nutrition, question: "Quanto tempo você tem para preparar cada refeição?", kind: .single, options: opts([("menos_15", "Menos de 15 minutos"), ("15_30", "15 a 30 minutos"), ("30_60", "30 minutos a 1 hora"), ("mais_60", "Mais de 1 hora")])),
        .init(key: "calories", section: nutrition, question: "Já tem uma meta diária de calorias definida?", hint: "Se recebeu uma orientação, informe aqui. Caso contrário, pode pular.", kind: .number, optional: true, unit: "kcal", min: 500, max: 10000, placeholder: "Sua meta, se já tiver uma"),
    ]

    static func ageFromBirthDate(_ value: String, today: Date = .now) -> Int? {
        let parts = value.split(separator: "/", omittingEmptySubsequences: false).compactMap { Int($0) }
        guard parts.count == 3, value.count == 10 else { return nil }
        let (d, m, y) = (parts[0], parts[1], parts[2])
        var comps = DateComponents(); comps.day = d; comps.month = m; comps.year = y
        let cal = Calendar(identifier: .gregorian)
        guard let date = cal.date(from: comps), cal.dateComponents([.day, .month, .year], from: date) == comps else { return nil }
        return cal.dateComponents([.year], from: date, to: today).year
    }

    /// Empty string means valid.
    static func error(_ step: OnboardingStep, _ answer: OnboardingAnswer?) -> String {
        let isEmpty: Bool = switch answer {
        case nil: true
        case .one(let s): s.isEmpty
        case .many(let a): a.isEmpty
        }
        if isEmpty { return step.optional ? "" : "Responda para continuar." }
        switch (step.kind, answer) {
        case (.multi, .many(let values)):
            if values.contains(where: { v in !step.options.contains { $0.value == v } }) || Set(values).count != values.count { return "Escolha as opções disponíveis." }
            if values.count < (step.min ?? 0) { return "Escolha pelo menos \(step.min ?? 0) opções." }
            if let max = step.max, values.count > max { return "Escolha até \(max) opções." }
            return ""
        case (.single, .one(let v)):
            return step.options.contains { $0.value == v } ? "" : "Escolha uma opção."
        case (.number, .one(let v)):
            let valid = v.range(of: #"^\d+([.,]\d+)?$"#, options: .regularExpression) != nil
            if valid, let num = Double(v.replacingOccurrences(of: ",", with: ".")),
               num >= Double(step.min ?? 0), num <= Double(step.max ?? .max) { return "" }
            return "Informe um valor entre \(step.min ?? 0) e \(step.max ?? 0) \(step.unit ?? "")."
        case (.date, .one(let v)):
            if let age = ageFromBirthDate(v), (10...100).contains(age) { return "" }
            return "Informe uma data válida (DD/MM/AAAA), entre 10 e 100 anos."
        case (.time, .one(let v)):
            return v.range(of: #"^([01]\d|2[0-3]):[0-5]\d$"#, options: .regularExpression) != nil ? "" : "Use o formato HH:MM, como 18:30."
        case (.text, .one(let v)):
            return !v.trimmingCharacters(in: .whitespaces).isEmpty && v.count <= (step.max ?? 600) ? "" : "Use até \(step.max ?? 600) caracteres."
        default:
            return "Resposta inválida."
        }
    }

    static func display(_ step: OnboardingStep, _ answer: OnboardingAnswer?) -> String {
        func label(_ v: String) -> String { step.options.first { $0.value == v }?.label ?? v }
        switch answer {
        case .many(let a) where !a.isEmpty: return a.map(label).joined(separator: " · ")
        case .one(let s) where !s.isEmpty: return label(s) + (step.unit.map { " \($0)" } ?? "")
        default: return "Não informado"
        }
    }

    static func firstUnanswered(_ answers: OnboardingAnswers) -> Int {
        steps.firstIndex { answers[$0.key] == nil || !error($0, answers[$0.key]).isEmpty } ?? steps.count
    }

    /// Keeps only answers that pass validation.
    static func clean(_ answers: OnboardingAnswers) -> OnboardingAnswers {
        answers.filter { key, value in
            guard let step = steps.first(where: { $0.key == key }) else { return false }
            return error(step, value).isEmpty
        }
    }
}

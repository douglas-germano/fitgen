import SwiftUI

/// Conversational onboarding with the coach Otto. Port of mobile/src/app/onboarding.tsx.
struct OnboardingChatView: View {
    init() {}

    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss

    private let steps = OnboardingFlow.steps

    @State private var answers: OnboardingAnswers = [:]
    @State private var index = 0
    @State private var returnTo: Int?
    @State private var ready = false
    @State private var typing = false
    @State private var text = ""
    @State private var selection: [String] = []
    @State private var error: String?
    @State private var saving = false
    @State private var saved = false
    @State private var generating = false
    @State private var workoutCreated = false
    @State private var premiumNeeded = false
    @State private var userId: String?
    @State private var typingTask: Task<Void, Never>?
    @FocusState private var focused: Bool

    private var step: OnboardingStep? { index < steps.count ? steps[index] : nil }
    private var reviewing: Bool { step == nil }

    var body: some View {
        Group {
            if !ready {
                LoadingView()
            } else if saved {
                doneView
            } else if reviewing {
                reviewView
            } else {
                chatView
            }
        }
        .screen()
        .navigationTitle("Seu começo no FitGen")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if ready && !saved && index > 0 {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Voltar") { goBack() }.tint(Theme.voltText)
                }
            }
        }
        .task { await prepare() }
    }

    // MARK: Chat

    private var chatView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 14) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Vamos montar sua rotina.").font(.title2.weight(.bold)).foregroundStyle(.primary)
                        Text("Uma pergunta por vez. Você pode revisar tudo antes de salvar.").font(.subheadline).foregroundStyle(Theme.secondary)
                    }
                    .padding(.bottom, 6)

                    ForEach(Array(steps.prefix(index).enumerated()), id: \.element.key) { i, past in
                        coachBubble(past.question, hint: past.hint)
                        userBubble(OnboardingFlow.display(past, answers[past.key])) { edit(i) }
                    }
                    if let step {
                        if typing { typingBubble } else { coachBubble(step.question, hint: step.hint) }
                    }
                    Color.clear.frame(height: 1).id("bottom")
                }
                .padding(.horizontal, Theme.gutter)
                .padding(.top, 12)
                .padding(.bottom, 8)
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: index) { _, _ in scrollDown(proxy) }
            .onChange(of: typing) { _, _ in scrollDown(proxy) }
            .onChange(of: focused) { _, _ in scrollDown(proxy) }
            .onAppear { scrollDown(proxy) }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) { composer }
    }

    private func scrollDown(_ proxy: ScrollViewProxy) {
        withAnimation(.easeOut(duration: 0.25)) { proxy.scrollTo("bottom", anchor: .bottom) }
    }

    private var otto: some View {
        Image(systemName: "bolt.fill")
            .font(.system(size: 14, weight: .bold)).foregroundStyle(.black)
            .frame(width: 30, height: 30).background(Theme.volt, in: Circle())
            .accessibilityHidden(true)
    }

    private func coachBubble(_ text: String, hint: String?) -> some View {
        HStack(alignment: .bottom, spacing: 8) {
            otto
            VStack(alignment: .leading, spacing: 6) {
                Text(text).foregroundStyle(.primary)
                if let hint { Text(hint).font(.footnote).foregroundStyle(Theme.secondary) }
            }
            .padding(14)
            .background(Theme.card, in: UnevenRoundedRectangle(topLeadingRadius: 20, bottomLeadingRadius: 6, bottomTrailingRadius: 20, topTrailingRadius: 20, style: .continuous))
            Spacer(minLength: 40)
        }
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }

    private func userBubble(_ text: String, onEdit: @escaping () -> Void) -> some View {
        HStack {
            Spacer(minLength: 56)
            Button(action: onEdit) {
                HStack(spacing: 6) {
                    Text(text).multilineTextAlignment(.leading)
                    Image(systemName: "pencil").font(.caption2)
                }
                .foregroundStyle(.black)
                .padding(14)
                .background(Theme.volt, in: UnevenRoundedRectangle(topLeadingRadius: 20, bottomLeadingRadius: 20, bottomTrailingRadius: 6, topTrailingRadius: 20, style: .continuous))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Editar resposta: \(text)")
        }
    }

    private var typingBubble: some View {
        HStack(alignment: .bottom, spacing: 8) {
            otto
            TimelineView(.periodic(from: .now, by: 0.3)) { context in
                let phase = Int(context.date.timeIntervalSinceReferenceDate / 0.3) % 3
                HStack(spacing: 5) {
                    ForEach(0..<3, id: \.self) { i in
                        Circle().fill(Theme.secondary).frame(width: 7, height: 7).opacity(i == phase ? 1 : 0.35)
                    }
                }
                .padding(.horizontal, 18).padding(.vertical, 18)
                .background(Theme.card, in: UnevenRoundedRectangle(topLeadingRadius: 20, bottomLeadingRadius: 6, bottomTrailingRadius: 20, topTrailingRadius: 20, style: .continuous))
            }
            Spacer()
        }
        .accessibilityLabel("Otto está digitando")
    }

    // MARK: Composer

    @ViewBuilder private var composer: some View {
        if let step, !typing {
            VStack(spacing: 10) {
                if let error { Text(error).font(.footnote).foregroundStyle(Theme.calories).frame(maxWidth: .infinity, alignment: .leading) }
                switch step.kind {
                case .single:
                    VStack(spacing: 8) {
                        ForEach(step.options, id: \.value) { option in
                            let selected = currentSingle == option.value
                            Button { accept(.one(option.value)) } label: {
                                HStack {
                                    Text(option.label).foregroundStyle(.primary)
                                    Spacer()
                                    Image(systemName: selected ? "checkmark" : "chevron.right")
                                        .font(.footnote.weight(.semibold))
                                        .foregroundStyle(selected ? Theme.voltText : Theme.secondary)
                                }
                                .padding(.horizontal, 16).padding(.vertical, 13)
                                .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(selected ? Theme.voltText : .clear, lineWidth: 1.5))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                case .multi:
                    ScrollView {
                        WrapLayout(spacing: 8) {
                            ForEach(step.options, id: \.value) { option in
                                let on = selection.contains(option.value)
                                Button { toggle(option.value) } label: {
                                    HStack(spacing: 6) {
                                        if on { Image(systemName: "checkmark").font(.caption.weight(.bold)) }
                                        Text(option.label)
                                    }
                                    .font(.subheadline)
                                    .foregroundStyle(on ? .black : .primary)
                                    .padding(.horizontal, 14).padding(.vertical, 10)
                                    .background(on ? Theme.volt : Theme.card, in: Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .frame(maxHeight: 220)
                    .scrollBounceBehavior(.basedOnSize)
                    primaryButton(reviewTitle) { accept(.many(selection)) }
                    if step.optional { skipButton("Nenhuma destas opções") { accept(.many([])) } }
                default:
                    inputRow(step)
                    if step.optional { skipButton("Pular por enquanto") { accept(.one("")) } }
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.top, 10)
            .padding(.bottom, 8)
            .background(.bar)
        }
    }

    private var currentSingle: String? {
        if case .one(let s)? = answers[step?.key ?? ""] { return s }
        return nil
    }

    private var reviewTitle: String {
        if returnTo != nil { return "Confirmar alteração" }
        return index == steps.count - 1 ? "Revisar minhas respostas" : "Continuar"
    }

    private func inputRow(_ step: OnboardingStep) -> some View {
        HStack(alignment: .bottom, spacing: 10) {
            HStack {
                TextField(step.placeholder ?? "Sua resposta", text: $text, axis: step.kind == .text && step.key != "name" ? .vertical : .horizontal)
                    .lineLimit(1...4)
                    .keyboardType(keyboard(step))
                    .textInputAutocapitalization(step.kind == .text ? .sentences : .never)
                    .focused($focused)
                    .submitLabel(.send)
                    .onSubmit { accept(.one(text.trimmingCharacters(in: .whitespacesAndNewlines))) }
                    .onChange(of: text) { _, new in
                        let masked = mask(new, for: step)
                        if masked != new { text = masked }
                        error = nil
                    }
                if let unit = step.unit { Text(unit).foregroundStyle(Theme.secondary) }
            }
            .padding(.horizontal, 14).padding(.vertical, 12)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))

            Button { accept(.one(text.trimmingCharacters(in: .whitespacesAndNewlines))) } label: {
                Image(systemName: "arrow.up")
                    .font(.headline.weight(.bold)).foregroundStyle(.black)
                    .frame(width: 44, height: 44).background(Theme.volt, in: Circle())
            }
            .accessibilityLabel(reviewTitle)
        }
    }

    private func keyboard(_ step: OnboardingStep) -> UIKeyboardType {
        switch step.kind {
        case .number: .decimalPad
        case .date, .time: .numberPad
        default: .default
        }
    }

    private func mask(_ value: String, for step: OnboardingStep) -> String {
        switch step.kind {
        case .date:
            let d = String(value.filter(\.isNumber).prefix(8))
            var out = ""
            for (i, ch) in d.enumerated() { if i == 2 || i == 4 { out.append("/") }; out.append(ch) }
            return out
        case .time:
            let d = String(value.filter(\.isNumber).prefix(4))
            var out = ""
            for (i, ch) in d.enumerated() { if i == 2 { out.append(":") }; out.append(ch) }
            return out
        case .number: return String(value.filter { $0.isNumber || $0 == "," || $0 == "." }.prefix(8))
        default: return String(value.prefix(step.max ?? 600))
        }
    }

    private func primaryButton(_ title: String, loading: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                if loading { ProgressView().tint(.black) }
                Text(title).font(.headline)
            }
            .foregroundStyle(.black).frame(maxWidth: .infinity).padding(.vertical, 15)
            .background(Theme.volt, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    private func skipButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(.subheadline.weight(.medium)).foregroundStyle(Theme.secondary).padding(.vertical, 4)
        }
    }

    // MARK: Review and done

    private var reviewView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Tudo do seu jeito?").font(.title2.weight(.bold)).foregroundStyle(.primary)
                Text("Confira as respostas. Toque em qualquer uma para ajustar antes de salvar.").font(.subheadline).foregroundStyle(Theme.secondary)
                ForEach(["Sobre você", "Seu treino", "Sua alimentação"], id: \.self) { section in
                    Card(title: section) {
                        VStack(spacing: 0) {
                            let items = steps.enumerated().filter { $0.element.section == section }
                            ForEach(items, id: \.element.key) { i, s in
                                Button { edit(i) } label: {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(s.question).font(.caption).foregroundStyle(Theme.secondary)
                                        HStack {
                                            Text(OnboardingFlow.display(s, answers[s.key])).foregroundStyle(.primary).multilineTextAlignment(.leading)
                                            Spacer()
                                            Image(systemName: "pencil").font(.footnote).foregroundStyle(Theme.secondary)
                                        }
                                    }
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.vertical, 10)
                                    .contentShape(Rectangle())
                                }
                                .buttonStyle(.plain)
                                .disabled(saving)
                                if i != items.last?.offset { Divider().overlay(Theme.separator) }
                            }
                        }
                    }
                }
                Text("Seus planos atuais só mudam se você gerar novos planos.").font(.footnote).foregroundStyle(Theme.secondary)
                if let error { Text(error).font(.footnote).foregroundStyle(Theme.calories) }
                primaryButton("Salvar e continuar", loading: saving) { Task { await save() } }
                    .disabled(saving)
            }
            .padding(Theme.gutter)
        }
    }

    private var doneView: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Image(systemName: "checkmark").font(.system(size: 30, weight: .bold)).foregroundStyle(.black)
                    .frame(width: 72, height: 72).background(Theme.volt, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                Text("Agora o FitGen conhece sua rotina.").font(.system(size: 30, weight: .bold, design: .rounded)).foregroundStyle(.primary)
                Text("Seu perfil, seus objetivos e suas preferências foram salvos. Quer criar o primeiro treino com IA?")
                    .foregroundStyle(Theme.secondary)
                Card {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Perfil e preferências salvos", systemImage: "checkmark.circle.fill").foregroundStyle(.primary)
                        Label(workoutCreated ? "Treino criado" : "Treino ainda não gerado",
                              systemImage: workoutCreated ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(workoutCreated ? .primary : Theme.secondary)
                    }
                    .tint(Theme.voltText)
                }
                if premiumNeeded {
                    Card {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Treino com IA é Premium").font(.headline).foregroundStyle(.primary)
                            Text("Seu perfil já está salvo. Assine o FitGen Premium para gerar treinos com IA.").font(.subheadline).foregroundStyle(Theme.secondary)
                            NavigationLink { SubscriptionView() } label: {
                                Text("Ver o Premium").font(.headline).foregroundStyle(.black)
                                    .frame(maxWidth: .infinity).padding(.vertical, 14)
                                    .background(Theme.volt, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                            }
                        }
                    }
                }
                if let error { Text(error).font(.footnote).foregroundStyle(Theme.calories) }
                if !workoutCreated && !premiumNeeded {
                    primaryButton(generating ? "Criando seu treino…" : error != nil ? "Tentar gerar novamente" : "Criar meu treino com IA", loading: generating) { Task { await generate() } }
                        .disabled(generating)
                }
                Button { dismiss() } label: {
                    Text("Concluir").font(.headline).foregroundStyle(.primary)
                        .frame(maxWidth: .infinity).padding(.vertical, 15)
                        .background(Theme.cardRaised, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
                .buttonStyle(.plain)
                .disabled(generating)
                if generating { Text("Isso pode levar um pouco. Mantenha esta tela aberta.").font(.footnote).foregroundStyle(Theme.secondary) }
            }
            .padding(Theme.gutter)
        }
    }

    // MARK: Flow

    private func goTo(_ next: Int) {
        typingTask?.cancel()
        typing = false
        error = nil
        index = next
        if next < steps.count {
            let s = steps[next]
            switch (s.kind, answers[s.key]) {
            case (.multi, .many(let a)?): selection = a
            case (.multi, _): selection = []
            case (_, .one(let v)?): text = v
            default: text = ""
            }
            focused = s.usesKeyboard
        } else {
            focused = false
        }
    }

    private func goBack() {
        returnTo = nil
        goTo(max(0, index - 1))
    }

    private func edit(_ i: Int) {
        guard !saving else { return }
        returnTo = reviewing ? steps.count : index
        goTo(i)
    }

    private func toggle(_ value: String) {
        guard let step else { return }
        if selection.contains(value) {
            selection.removeAll { $0 == value }
        } else if let max = step.max, selection.count >= max {
            error = "Escolha até \(max) opções."
            return
        } else {
            selection.append(value)
        }
        error = nil
    }

    private func accept(_ answer: OnboardingAnswer) {
        guard let step, !typing else { return }
        var answer = answer
        if case .one(let v) = answer { answer = .one(v.trimmingCharacters(in: .whitespacesAndNewlines)) }
        let message = OnboardingFlow.error(step, answer)
        if !message.isEmpty { error = message; return }
        answers[step.key] = answer
        saveDraft()
        let target = returnTo ?? index + 1
        returnTo = nil
        goTo(target)
        if target < steps.count {
            typing = true
            typingTask = Task {
                try? await Task.sleep(for: .milliseconds(650))
                guard !Task.isCancelled else { return }
                typing = false
                focused = steps[target].usesKeyboard
            }
        }
    }

    // MARK: Data

    private var draftKey: String? { userId.map { "onboarding_draft_\($0)" } }

    private func saveDraft() {
        guard let draftKey, let data = try? JSONEncoder().encode(answers), let json = String(data: data, encoding: .utf8) else { return }
        Keychain.set(json, for: draftKey)
    }

    private func loadDraft() -> OnboardingAnswers {
        guard let draftKey, let json = Keychain.get(draftKey), let data = json.data(using: .utf8),
              let raw = try? JSONDecoder().decode([String: DraftValue].self, from: data) else { return [:] }
        return OnboardingFlow.clean(raw.mapValues(\.answer))
    }

    private func prepare() async {
        guard !ready else { return }
        let raw: [String: JSONValue]? = try? await APIClient.shared.get("/profile/me")
        if let raw { userId = raw["id"]?.scalar }
        if userId == nil { await store.loadProfile(); userId = store.profile.value?.id }
        var merged = OnboardingFlow.clean(prefill(from: raw ?? [:]))
        merged.merge(loadDraft()) { _, draft in draft }
        answers = merged
        let first = OnboardingFlow.firstUnanswered(merged)
        goTo(first)
        // Mid-flow keyboard focus should wait for the first render.
        ready = true
    }

    /// Existing profile fields plus previously saved onboarding answers.
    private func prefill(from root: [String: JSONValue]) -> OnboardingAnswers {
        func norm(_ s: String) -> String { s.replacingOccurrences(of: "_", with: "").lowercased() }
        let top = Dictionary(root.map { (norm($0.key), $0.value) }, uniquingKeysWith: { a, _ in a })
        var saved: [String: JSONValue] = [:]
        if case .object(let o)? = top["onboardinganswers"] { saved = Dictionary(o.map { (norm($0.key), $0.value) }, uniquingKeysWith: { a, _ in a }) }

        var result: OnboardingAnswers = [:]
        for step in steps {
            guard let value = saved[norm(step.key)] else { continue }
            if step.kind == .multi, let list = value.list { result[step.key] = .many(list) }
            else if let s = value.scalar { result[step.key] = .one(s) }
        }
        func set(_ key: String, _ field: String) {
            guard let step = steps.first(where: { $0.key == key }), let value = top[norm(field)] else { return }
            if step.kind == .multi, let list = value.list { result[key] = .many(list) }
            else if let s = value.scalar, !s.isEmpty { result[key] = .one(s) }
        }
        set("name", "name"); set("goal", "fitness_goal"); set("gender", "gender")
        set("height", "height_cm"); set("weight", "current_weight_kg"); set("target_weight", "target_weight_kg")
        set("experience", "experience_level"); set("days", "available_days"); set("activity", "activity_level")
        return result
    }

    private func save() async {
        let missing = OnboardingFlow.firstUnanswered(answers)
        if missing < steps.count { returnTo = steps.count; goTo(missing); return }
        guard !saving else { return }
        saving = true; error = nil
        defer { saving = false }
        struct Body: Encodable { let answers: OnboardingAnswers }
        do {
            try await APIClient.shared.sendNoContent("/onboarding/complete", method: "POST", json: Body(answers: answers))
            if let draftKey { Keychain.set(nil, for: draftKey) }
            await store.loadProfile()
            saved = true
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func generate() async {
        guard !generating else { return }
        generating = true; error = nil
        defer { generating = false }
        do {
            try await APIClient.shared.sendNoContent("/onboarding/generate-workout", method: "POST")
            workoutCreated = true
            await store.loadProfile()
            await store.loadPlan()
        } catch let apiError as APIError where apiError.isPremiumRequired {
            premiumNeeded = true
        } catch {
            self.error = "Não foi possível gerar agora. Seu perfil já está salvo; você pode tentar novamente."
        }
    }
}

// MARK: - Helpers

/// Draft values in the Keychain (string or list).
private struct DraftValue: Decodable {
    let answer: OnboardingAnswer
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let list = try? c.decode([String].self) { answer = .many(list) } else { answer = .one(try c.decode(String.self)) }
    }
}


/// Loose JSON for the profile payload (numbers arrive as numbers or strings).
private enum JSONValue: Decodable {
    case string(String), number(Double), bool(Bool), array([JSONValue]), object([String: JSONValue]), null

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let v = try? c.decode(Bool.self) { self = .bool(v) }
        else if let v = try? c.decode(Double.self) { self = .number(v) }
        else if let v = try? c.decode(String.self) { self = .string(v) }
        else if let v = try? c.decode([JSONValue].self) { self = .array(v) }
        else if let v = try? c.decode([String: JSONValue].self) { self = .object(v) }
        else { self = .null }
    }

    var scalar: String? {
        switch self {
        case .string(let s): s
        case .number(let n): n == n.rounded() ? String(Int(n)) : String(n)
        default: nil
        }
    }
    var list: [String]? {
        if case .array(let a) = self { return a.compactMap(\.scalar) }
        return nil
    }
}

/// Chips that wrap onto several lines.
private struct WrapLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrange(width: proposal.width ?? 320, subviews: subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let layout = arrange(width: bounds.width, subviews: subviews)
        for (subview, origin) in zip(subviews, layout.origins) {
            subview.place(at: CGPoint(x: bounds.minX + origin.x, y: bounds.minY + origin.y), proposal: .unspecified)
        }
    }

    private func arrange(width: CGFloat, subviews: Subviews) -> (size: CGSize, origins: [CGPoint]) {
        var origins: [CGPoint] = []
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0, maxX: CGFloat = 0
        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x > 0, x + size.width > width { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            origins.append(CGPoint(x: x, y: y))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
            maxX = max(maxX, x - spacing)
        }
        return (CGSize(width: maxX, height: y + rowHeight), origins)
    }
}

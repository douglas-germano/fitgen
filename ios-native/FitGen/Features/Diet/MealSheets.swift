import PhotosUI
import SwiftUI

private func successHaptic() {
    UINotificationFeedbackGenerator().notificationOccurred(.success)
}

private func jpegData(from data: Data) -> Data? {
    guard let image = UIImage(data: data) else { return nil }
    let scale = min(1, 1280 / max(image.size.width, image.size.height))
    let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
    return UIGraphicsImageRenderer(size: size).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }.jpegData(compressionQuality: 0.8)
}

// MARK: - Logger (camera first)

/// What the review screen starts from.
private struct ReviewSeed: Identifiable, Hashable {
    let id = UUID()
    let estimate: MealEstimate
    let photo: Data?
    let fromOtto: Bool

    static func == (lhs: ReviewSeed, rhs: ReviewSeed) -> Bool { lhs.id == rhs.id }
    func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

extension MealEstimate: Hashable {
    static func == (lhs: MealEstimate, rhs: MealEstimate) -> Bool {
        lhs.name == rhs.name && lhs.calories == rhs.calories && lhs.protein == rhs.protein && lhs.carbs == rhs.carbs && lhs.fats == rhs.fats
    }
    func hash(into hasher: inout Hasher) { hasher.combine(name); hasher.combine(calories) }
}

/// Log a meal: snap a photo, describe it, or type the numbers. Recent meals are one tap away.
struct MealLoggerSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    @State private var photoItem: PhotosPickerItem?
    @State private var photo: Data?
    @State private var describing = false
    @State private var cameraOpen = false
    @State private var estimating = false
    @State private var premiumBlocked = false
    @State private var error: String?
    @State private var review: ReviewSeed?
    @State private var loggingId: String?
    @FocusState private var textFocused: Bool

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if let photo, let image = UIImage(data: photo) {
                        photoStage(image)
                    } else if describing {
                        composer
                    } else {
                        tiles
                        galleryLink
                    }
                    if premiumBlocked { premiumCard }
                    if let error { errorLine(error) }
                    if photo == nil && !recent.isEmpty && !estimating { recentSection }
                    if photo == nil && !describing && recent.isEmpty { tipsCard }
                }
                .padding(.horizontal, Theme.gutter)
                .padding(.top, 8)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)
            .screen()
            .navigationTitle("Registrar refeição")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar") { dismiss() } }
            }
            .navigationDestination(item: $review) { seed in
                MealReviewView(initial: seed.estimate, photo: seed.photo, fromOtto: seed.fromOtto, mealId: nil, type: .now) { dismiss() }
            }
        }
        .presentationDragIndicator(.visible)
        .fullScreenCover(isPresented: $cameraOpen) {
            CameraPicker { data in
                if let data { photo = data; clearFeedback() }
                cameraOpen = false
            }
            .ignoresSafeArea()
        }
        .onChange(of: photoItem) { _, item in
            guard let item else { return }
            Task {
                if let data = try? await item.loadTransferable(type: Data.self), let jpeg = jpegData(from: data) {
                    photo = jpeg
                    clearFeedback()
                }
                photoItem = nil
            }
        }
    }

    // MARK: Start tiles

    private var tiles: some View {
        HStack(spacing: 12) {
            if CameraPicker.isAvailable {
                Button { cameraOpen = true } label: { TileLabel("camera.fill", "Foto", Theme.calories) }
                    .buttonStyle(.plain).frame(maxWidth: .infinity)
            } else {
                PhotosPicker(selection: $photoItem, matching: .images) { TileLabel("camera.fill", "Foto", Theme.calories) }
                    .buttonStyle(.plain).frame(maxWidth: .infinity)
            }
            Button {
                withAnimation(.snappy) { describing = true }
                textFocused = true
            } label: { TileLabel("text.bubble.fill", "Descrever", Theme.protein) }
                .buttonStyle(.plain).frame(maxWidth: .infinity)
            Button {
                review = ReviewSeed(estimate: MealEstimate(name: "", calories: 0, protein: 0, carbs: 0, fats: 0), photo: nil, fromOtto: false)
            } label: { TileLabel("square.and.pencil", "Manual", Theme.water) }
                .buttonStyle(.plain).frame(maxWidth: .infinity)
        }
    }

    private var galleryLink: some View {
        PhotosPicker(selection: $photoItem, matching: .images) {
            Label("Escolher da galeria", systemImage: "photo.on.rectangle")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Theme.secondary)
        }
    }

    // MARK: Describe

    private var composer: some View {
        Card(title: "Descreva a refeição") {
            TextField("Ex: arroz, feijão, bife e salada", text: $text, axis: .vertical)
                .lineLimit(3...6)
                .focused($textFocused)
                .padding(12)
                .background(Theme.cardRaised, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            HStack {
                PhotosPicker(selection: $photoItem, matching: .images) {
                    Label("Adicionar foto", systemImage: "photo.badge.plus").font(.subheadline.weight(.medium))
                }
                Spacer()
                Button("Voltar") { withAnimation(.snappy) { describing = false; textFocused = false } }
                    .font(.subheadline).foregroundStyle(Theme.secondary)
            }
            ottoButton(enabled: !text.trimmingCharacters(in: .whitespaces).isEmpty)
        }
    }

    // MARK: Photo stage

    private func photoStage(_ image: UIImage) -> some View {
        VStack(spacing: 14) {
            ZStack {
                Image(uiImage: image)
                    .resizable().scaledToFill()
                    .frame(maxWidth: .infinity)
                    .frame(height: 340)
                    .clipShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
                if estimating {
                    RoundedRectangle(cornerRadius: Theme.radius, style: .continuous).fill(.black.opacity(0.6))
                    VStack(spacing: 12) {
                        ProgressView().controlSize(.large).tint(.white)
                        Text("O Otto está analisando…").font(.system(.headline, design: .rounded)).foregroundStyle(.white)
                    }
                }
            }
            .frame(height: 340)
            .overlay(alignment: .topTrailing) {
                if !estimating {
                    Button { withAnimation(.snappy) { photo = nil } } label: {
                        Image(systemName: "xmark").font(.system(size: 13, weight: .bold)).foregroundStyle(.white)
                            .frame(width: 32, height: 32).background(.black.opacity(0.55), in: Circle())
                    }
                    .padding(10)
                    .accessibilityLabel("Remover foto")
                }
            }
            TextField("Detalhes (opcional)", text: $text)
                .focused($textFocused)
                .submitLabel(.done)
                .padding(14)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .disabled(estimating)
            ottoButton(enabled: true)
        }
    }

    private func ottoButton(enabled: Bool) -> some View {
        Button { estimate() } label: {
            HStack(spacing: 8) {
                if estimating { ProgressView().tint(.black) } else { Image(systemName: "sparkles") }
                Text(estimating ? "Analisando…" : "Estimar com o Otto")
            }
            .font(.system(.headline, design: .rounded))
            .foregroundStyle(.black)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(Theme.volt, in: Capsule())
            .opacity(enabled && !estimating ? 1 : 0.45)
        }
        .disabled(!enabled || estimating)
    }

    // MARK: Messages

    private var premiumCard: some View {
        Card {
            Label("A estimativa com o Otto faz parte do FitGen Premium.", systemImage: "lock.fill")
                .font(.subheadline).foregroundStyle(.primary)
            Button {
                review = ReviewSeed(estimate: MealEstimate(name: text.trimmingCharacters(in: .whitespaces), calories: 0, protein: 0, carbs: 0, fats: 0),
                                    photo: photo, fromOtto: false)
            } label: {
                Text("Registrar manualmente").font(.system(.subheadline, design: .rounded).weight(.semibold)).foregroundStyle(.primary)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(Theme.cardRaised, in: Capsule())
            }
        }
    }

    private func errorLine(_ message: String) -> some View {
        Text(message).font(.footnote).foregroundStyle(Theme.calories)
            .frame(maxWidth: .infinity, alignment: .leading)
    }

    /// Fills the first-use screen with how to get a good estimate.
    private var tipsCard: some View {
        Card(title: "Para o Otto acertar") {
            VStack(alignment: .leading, spacing: 10) {
                tip("camera.viewfinder", "Fotografe o prato de cima, com boa luz.")
                tip("text.bubble", "Conte o que a foto não mostra: óleo, molho, açúcar.")
                tip("scalemass", "Revise as porções antes de salvar.")
                tip("arrow.counterclockwise", "Depois, repita refeições com um toque em Recentes.")
            }
        }
    }

    private func tip(_ symbol: String, _ text: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: symbol).foregroundStyle(Theme.voltText).frame(width: 22)
            Text(text).font(.subheadline).foregroundStyle(.primary.opacity(0.85))
        }
    }

    // MARK: Recents

    private var recentSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Recentes").font(.cardTitle).foregroundStyle(.primary)
            VStack(spacing: 0) {
                ForEach(Array(recent.enumerated()), id: \.element.id) { index, meal in
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(meal.name).font(.body.weight(.medium)).foregroundStyle(.primary).lineLimit(1)
                            Text("\(Format.int(meal.calories)) kcal · P \(Format.int(meal.protein)) g")
                                .font(.caption).foregroundStyle(Theme.secondary)
                        }
                        Spacer()
                        Button { logRecent(meal) } label: {
                            Group {
                                if loggingId == meal.id { ProgressView().tint(.black) } else { Image(systemName: "plus").font(.system(size: 15, weight: .bold)) }
                            }
                            .foregroundStyle(.black)
                            .frame(width: 34, height: 34)
                            .background(Theme.volt, in: Circle())
                        }
                        .disabled(loggingId != nil)
                        .accessibilityLabel("Registrar \(meal.name)")
                    }
                    .padding(.vertical, 10)
                    if index < recent.count - 1 { Divider().overlay(Theme.separator) }
                }
            }
            .padding(.horizontal, 16)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        }
    }

    /// Today's distinct meals, newest first.
    private var recent: [LoggedMeal] {
        var seen = Set<String>()
        return (store.nutrition.value?.meals ?? []).reversed().filter { seen.insert($0.name.lowercased()).inserted }.prefix(6).map { $0 }
    }

    // MARK: Actions

    private func clearFeedback() {
        error = nil
        premiumBlocked = false
    }

    private func logRecent(_ meal: LoggedMeal) {
        loggingId = meal.id
        error = nil
        Task {
            do {
                try await store.logMeal(MealEntry(name: meal.name, calories: meal.calories, protein: meal.protein,
                                                  carbs: meal.carbs, fats: meal.fats, mealType: MealType.now.rawValue))
                successHaptic()
                dismiss()
            } catch {
                self.error = error.localizedDescription
            }
            loggingId = nil
        }
    }

    private func estimate() {
        textFocused = false
        estimating = true
        clearFeedback()
        let description = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let image = photo
        Task {
            do {
                var result = try await store.estimateMeal(description: description, photo: image)
                if result.name.trimmingCharacters(in: .whitespaces).isEmpty { result.name = description }
                review = ReviewSeed(estimate: result, photo: image, fromOtto: true)
            } catch let e as APIError where e.isPremiumRequired {
                premiumBlocked = true
            } catch {
                self.error = error.localizedDescription
            }
            estimating = false
        }
    }
}

// MARK: - Review

private enum MacroField: Hashable { case calories, protein, carbs, fats }

/// The confirm/adjust step: hero, calorie ring, macros, portion and meal type.
private struct MealReviewView: View {
    @Environment(AppStore.self) private var store
    let photo: Data?
    let fromOtto: Bool
    let mealId: String?
    let onDone: () -> Void

    /// The values at 1x; shown values are base x portion.
    @State private var base: MealEstimate
    @State private var portion = 1.0
    @State private var type: MealType
    @State private var saving = false
    @State private var error: String?
    @State private var editing: MacroField?
    @State private var draft = ""
    @State private var confirmDelete = false
    @FocusState private var fieldFocused: Bool

    init(initial: MealEstimate, photo: Data?, fromOtto: Bool, mealId: String?, type: MealType, onDone: @escaping () -> Void) {
        _base = State(initialValue: initial)
        _type = State(initialValue: type)
        self.photo = photo
        self.fromOtto = fromOtto
        self.mealId = mealId
        self.onDone = onDone
    }

    private var isEditing: Bool { mealId != nil }
    private var canSave: Bool { !saving && !base.name.trimmingCharacters(in: .whitespaces).isEmpty }

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                hero
                nameField
                ringCard
                macroRow
                portionCard
                typePicker
                if fromOtto {
                    Label("Inclua óleo, manteiga e molhos", systemImage: "info.circle")
                        .font(.footnote).foregroundStyle(Theme.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                if let error {
                    Text(error).font(.footnote).foregroundStyle(Theme.calories).frame(maxWidth: .infinity, alignment: .leading)
                }
                if isEditing {
                    Button("Excluir refeição", role: .destructive) { confirmDelete = true }
                        .font(.system(.subheadline, design: .rounded).weight(.semibold))
                        .padding(.top, 4)
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.top, 8)
            .padding(.bottom, 24)
        }
        .scrollDismissesKeyboard(.interactively)
        .screen()
        .navigationTitle(isEditing ? "Editar refeição" : "Revisar refeição")
        .navigationBarTitleDisplayMode(.inline)
        .safeAreaInset(edge: .bottom) { saveBar }
        .toolbar {
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                Button("OK") { commitEditing() }.bold()
            }
        }
        .confirmationDialog("Excluir \"\(base.name)\"?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Excluir", role: .destructive) { delete() }
        }
        .sensoryFeedback(.selection, trigger: portion)
    }

    // MARK: Sections

    @ViewBuilder private var hero: some View {
        if let photo, let image = UIImage(data: photo) {
            Image(uiImage: image).resizable().scaledToFill()
                .frame(maxWidth: .infinity).frame(height: 220)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        }
    }

    private var nameField: some View {
        TextField("O que você comeu?", text: $base.name)
            .font(.system(size: 24, weight: .bold, design: .rounded))
            .multilineTextAlignment(.center)
            .padding(.horizontal, 8)
            .submitLabel(.done)
    }

    private var ringCard: some View {
        Card {
            ZStack {
                Ring(progress: scaled(.calories) / 800, color: Theme.calories, lineWidth: 18)
                VStack(spacing: 0) {
                    numberView(.calories, size: 44, color: Theme.calories)
                    Text("kcal").font(.system(.subheadline, design: .rounded).weight(.semibold)).foregroundStyle(Theme.secondary)
                }
                .padding(.horizontal, 30)
            }
            .frame(width: 190, height: 190)
            .frame(maxWidth: .infinity)
        }
    }

    private var macroRow: some View {
        HStack(spacing: 10) {
            macroPill("Proteína", .protein, Theme.protein, reference: 50)
            macroPill("Carbos", .carbs, Theme.water, reference: 100)
            macroPill("Gorduras", .fats, Theme.weight, reference: 40)
        }
    }

    private func macroPill(_ title: String, _ field: MacroField, _ color: Color, reference: Double) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title).font(.caption.weight(.medium)).foregroundStyle(Theme.secondary)
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                numberView(field, size: 24, color: color)
                Text("g").font(.metric(13)).foregroundStyle(color)
            }
            ProgressLine(progress: scaled(field) / reference, color: color)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var portionCard: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Porção").font(.cardTitle).foregroundStyle(.primary)
                if let size = base.portionSize, !size.isEmpty {
                    Text(size).font(.caption).foregroundStyle(Theme.secondary).lineLimit(1)
                }
            }
            Spacer()
            stepButton("minus", enabled: portion > 0.5) { portion = max(0.5, portion - 0.5) }
            Text("\(Format.decimal(portion))x")
                .font(.metric(22)).foregroundStyle(.primary)
                .frame(minWidth: 56)
                .contentTransition(.numericText())
            stepButton("plus", enabled: portion < 3) { portion = min(3, portion + 0.5) }
        }
        .padding(16)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        .animation(.snappy, value: portion)
    }

    private func stepButton(_ symbol: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button {
            commitEditing()
            action()
        } label: {
            Image(systemName: symbol).font(.system(size: 16, weight: .bold))
                .foregroundStyle(enabled ? .primary : Theme.secondary.opacity(0.5))
                .frame(width: 40, height: 40)
                .background(Theme.cardRaised, in: Circle())
        }
        .disabled(!enabled)
        .accessibilityLabel(symbol == "plus" ? "Aumentar porção" : "Diminuir porção")
    }

    private var typePicker: some View {
        Picker("Refeição", selection: $type) {
            ForEach(MealType.allCases) { Text($0.label).tag($0) }
        }
        .pickerStyle(.segmented)
    }

    private var saveBar: some View {
        Button { save() } label: {
            HStack {
                if saving { ProgressView().tint(.black) }
                Text(isEditing ? "Salvar" : "Salvar refeição")
            }
            .font(.system(.headline, design: .rounded))
            .foregroundStyle(.black)
            .frame(maxWidth: .infinity, minHeight: 54)
            .background(Theme.volt, in: Capsule())
            .opacity(canSave ? 1 : 0.45)
        }
        .disabled(!canSave)
        .padding(.horizontal, Theme.gutter)
        .padding(.top, 10)
        .padding(.bottom, 8)
        .background(Theme.background.opacity(0.92))
    }

    // MARK: Numbers

    private func scaled(_ field: MacroField) -> Double {
        switch field {
        case .calories: base.calories * portion
        case .protein: base.protein * portion
        case .carbs: base.carbs * portion
        case .fats: base.fats * portion
        }
    }

    private func setScaled(_ field: MacroField, _ value: Double) {
        let v = max(0, value) / portion
        switch field {
        case .calories: base.calories = v
        case .protein: base.protein = v
        case .carbs: base.carbs = v
        case .fats: base.fats = v
        }
    }

    @ViewBuilder private func numberView(_ field: MacroField, size: CGFloat, color: Color) -> some View {
        if editing == field {
            TextField("0", text: $draft)
                .keyboardType(.numberPad)
                .focused($fieldFocused)
                .font(.metric(size)).foregroundStyle(color)
                .multilineTextAlignment(field == .calories ? .center : .leading)
                .minimumScaleFactor(0.6)
                .onChange(of: fieldFocused) { _, focused in if !focused { commitEditing() } }
        } else {
            Button {
                commitEditing()
                draft = String(Int(scaled(field).rounded()))
                editing = field
                fieldFocused = true
            } label: {
                Text(Format.int(scaled(field))).font(.metric(size)).foregroundStyle(color)
                    .contentTransition(.numericText())
                    .lineLimit(1).minimumScaleFactor(0.6)
            }
            .buttonStyle(.plain)
        }
    }

    private func commitEditing() {
        guard let field = editing else { return }
        editing = nil
        fieldFocused = false
        let cleaned = draft.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespaces)
        if let value = Double(cleaned) { setScaled(field, value) }
    }

    // MARK: Actions

    private func save() {
        commitEditing()
        saving = true
        error = nil
        let entry = MealEntry(name: base.name.trimmingCharacters(in: .whitespaces),
                              calories: scaled(.calories).rounded(), protein: scaled(.protein).rounded(),
                              carbs: scaled(.carbs).rounded(), fats: scaled(.fats).rounded(), mealType: type.rawValue)
        Task {
            do {
                if let mealId { try await store.updateMeal(id: mealId, entry) } else { try await store.logMeal(entry) }
                successHaptic()
                onDone()
            } catch {
                self.error = error.localizedDescription
            }
            saving = false
        }
    }

    private func delete() {
        guard let mealId else { return }
        saving = true
        Task {
            do {
                try await store.deleteMeal(id: mealId)
                successHaptic()
                onDone()
            } catch {
                self.error = error.localizedDescription
            }
            saving = false
        }
    }
}

// MARK: - Editor

/// Edit or delete a logged meal.
struct MealEditorSheet: View {
    @Environment(\.dismiss) private var dismiss
    let meal: LoggedMeal

    var body: some View {
        NavigationStack {
            MealReviewView(initial: MealEstimate(name: meal.name, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fats: meal.fats),
                           photo: nil, fromOtto: false, mealId: meal.id, type: meal.type) { dismiss() }
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancelar") { dismiss() } }
                }
        }
        .presentationDragIndicator(.visible)
    }
}

private struct TileLabel: View {
    let symbol: String
    let label: String
    let color: Color

    init(_ symbol: String, _ label: String, _ color: Color) {
        self.symbol = symbol; self.label = label; self.color = color
    }

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: symbol)
                .font(.system(size: 30, weight: .semibold))
                .foregroundStyle(color)
            Text(label).font(.system(.subheadline, design: .rounded).weight(.semibold)).foregroundStyle(.primary)
                .lineLimit(1).minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, minHeight: 112, maxHeight: 112)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        .contentShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
    }
}

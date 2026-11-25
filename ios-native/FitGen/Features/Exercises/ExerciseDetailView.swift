import SwiftUI

/// GET /exercises/library/:id/history?page=N
struct LibraryHistoryPage: Decodable, Sendable {
    struct Session: Decodable, Sendable, Identifiable {
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
        let id: String
        let startedAt: String?
        let sets: [SetLog]
        enum CodingKeys: String, CodingKey { case id, startedAt, sets }
        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            id = try c.string(.id) ?? UUID().uuidString
            startedAt = try c.decodeIfPresent(String.self, forKey: .startedAt)
            sets = (try? c.decodeIfPresent([SetLog].self, forKey: .sets)) ?? []
        }
    }
    let sessions: [Session]
    let hasMore: Bool
    enum CodingKeys: String, CodingKey { case sessions, hasMore }
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        sessions = (try? c.decodeIfPresent([Session].self, forKey: .sessions)) ?? []
        hasMore = (try? c.decodeIfPresent(Bool.self, forKey: .hasMore)) ?? false
    }
}

extension AppStore {
    func libraryHistory(id: String, page: Int) async throws -> LibraryHistoryPage {
        try await APIClient.shared.get("/exercises/library/\(id)/history?page=\(page)")
    }
}

struct ExerciseDetailView: View {
    let exercise: LibraryExercise

    @Environment(AppStore.self) private var store
    @State private var sessions: [LibraryHistoryPage.Session] = []
    @State private var page = 0
    @State private var hasMore = false
    @State private var loadingHistory = false
    @State private var historyError: String?
    @State private var premiumRequired = false
    @State private var started = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                ExerciseAnimation(url: exercise.animationUrl, size: nil, animating: true, cornerRadius: Theme.radius)
                    .aspectRatio(1, contentMode: .fit)
                    .frame(maxWidth: .infinity)
                    .accessibilityElement().accessibilityLabel("Demonstração de \(exercise.name)")

                Text(exercise.name).font(.system(.title, design: .rounded).weight(.bold)).foregroundStyle(.primary)
                chips
                if let d = exercise.description, !d.isEmpty {
                    Text(d).font(.body).foregroundStyle(Theme.secondary)
                }

                if !exercise.instructions.isEmpty {
                    Card(title: "Como fazer") {
                        VStack(alignment: .leading, spacing: 12) {
                            ForEach(Array(exercise.instructions.enumerated()), id: \.offset) { i, step in
                                HStack(alignment: .top, spacing: 12) {
                                    Text("\(i + 1)").font(.system(size: 12, weight: .bold, design: .rounded)).foregroundStyle(.black)
                                        .frame(width: 24, height: 24).background(Theme.volt, in: Circle())
                                    Text(step).foregroundStyle(.primary).frame(maxWidth: .infinity, alignment: .leading)
                                }
                            }
                        }
                    }
                }
                bullets("Dicas", icon: "lightbulb.fill", color: Theme.weight, items: exercise.tips)
                bullets("Erros comuns", icon: "exclamationmark.circle.fill", color: Theme.calories, items: exercise.commonMistakes)
                history
            }
            .padding(Theme.gutter)
        }
        .screen()
        .navigationTitle("Exercício")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            guard !started else { return }
            started = true
            await loadMore()
        }
    }

    // MARK: Chips

    private var chips: some View {
        FlowChips(items: chipItems)
    }

    private var chipItems: [(String, Color)] {
        var out: [(String, Color)] = []
        for (i, m) in exercise.muscleGroups.enumerated() {
            out.append((ExerciseLabels.muscle(m), i == 0 ? Theme.voltText : Theme.steps))
        }
        for e in exercise.equipmentNeeded { out.append((ExerciseLabels.gear(e), Theme.water)) }
        out.append((ExerciseLabels.level(exercise.difficultyLevel), Theme.protein))
        out.append((ExerciseLabels.category(exercise.category), Theme.secondary))
        return out
    }

    @ViewBuilder
    private func bullets(_ title: String, icon: String, color: Color, items: [String]) -> some View {
        if !items.isEmpty {
            Card(title: title) {
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: icon).font(.system(size: 14)).foregroundStyle(color).frame(width: 24)
                            Text(item).foregroundStyle(Theme.secondary).frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                }
            }
        }
    }

    // MARK: History

    @ViewBuilder
    private var history: some View {
        Text("Seu histórico").font(.cardTitle).foregroundStyle(.primary).padding(.top, 8)
        if premiumRequired {
            Card {
                Label("O histórico deste exercício faz parte do FitGen Premium.", systemImage: "lock.fill")
                    .foregroundStyle(Theme.secondary)
            }
        } else {
            ForEach(sessions) { session in
                Card(title: session.startedAt.flatMap(ISODate.parse).map(Format.dayMonth) ?? "Treino") {
                    VStack(spacing: 8) {
                        ForEach(Array(session.sets.enumerated()), id: \.offset) { _, set in
                            HStack {
                                Text("Série \(set.setNumber)").foregroundStyle(Theme.secondary)
                                Spacer()
                                Text(setText(set)).font(.body.monospacedDigit()).foregroundStyle(.primary)
                            }
                        }
                    }
                }
            }
            if sessions.isEmpty && !loadingHistory && historyError == nil {
                Card {
                    Text("As séries aparecem aqui depois que você finalizar um treino com este exercício.")
                        .font(.footnote).foregroundStyle(Theme.secondary)
                }
            }
            if let historyError {
                Text(historyError).font(.footnote).foregroundStyle(Theme.secondary)
            }
            if loadingHistory {
                ProgressView().frame(maxWidth: .infinity)
            } else if hasMore || historyError != nil {
                Button { Task { await loadMore() } } label: {
                    Text(historyError != nil ? "Tentar novamente" : "Ver mais")
                        .font(.headline).foregroundStyle(.black)
                        .frame(maxWidth: .infinity).padding(.vertical, 14)
                        .background(Theme.volt, in: Capsule())
                }
            }
        }
    }

    private func setText(_ set: LibraryHistoryPage.Session.SetLog) -> String {
        if let w = set.weightKg, w > 0 { return "\(Format.decimal(w)) kg × \(set.reps)" }
        return "\(set.reps) reps"
    }

    private func loadMore() async {
        guard !loadingHistory else { return }
        loadingHistory = true
        historyError = nil
        defer { loadingHistory = false }
        do {
            let next = try await store.libraryHistory(id: exercise.id, page: page + 1)
            sessions += next.sessions
            page += 1
            hasMore = next.hasMore
        } catch let e as APIError where e.isPremiumRequired {
            premiumRequired = true
        } catch {
            historyError = "Não foi possível carregar o histórico."
        }
    }
}

/// Chips that wrap onto several lines.
private struct FlowChips: View {
    let items: [(String, Color)]

    var body: some View {
        FlowLayout(spacing: 8) {
            ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                Text(item.0).font(.footnote.weight(.semibold)).foregroundStyle(item.1)
                    .padding(.horizontal, 12).padding(.vertical, 6)
                    .background(item.1.opacity(0.15), in: Capsule())
            }
        }
    }
}

private struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrange(proposal.width ?? .infinity, subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(bounds.width, subviews)
        for (i, origin) in result.origins.enumerated() {
            subviews[i].place(at: CGPoint(x: bounds.minX + origin.x, y: bounds.minY + origin.y), proposal: .unspecified)
        }
    }

    private func arrange(_ width: CGFloat, _ subviews: Subviews) -> (size: CGSize, origins: [CGPoint]) {
        var origins: [CGPoint] = []
        var x: CGFloat = 0, y: CGFloat = 0, rowHeight: CGFloat = 0, maxX: CGFloat = 0
        for sub in subviews {
            let s = sub.sizeThatFits(.unspecified)
            if x > 0 && x + s.width > width { x = 0; y += rowHeight + spacing; rowHeight = 0 }
            origins.append(CGPoint(x: x, y: y))
            x += s.width + spacing
            rowHeight = max(rowHeight, s.height)
            maxX = max(maxX, x - spacing)
        }
        return (CGSize(width: maxX, height: y + rowHeight), origins)
    }
}

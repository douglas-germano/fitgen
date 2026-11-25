import SwiftUI

/// New challenge form. The API starts the challenge today and takes a duration, so the end date picker maps to `durationDays`.
/// The API has no cover upload for challenges, so there is no photo field.
struct CreateChallengeView: View {
    /// Preselects the club when opened from a club screen.
    let groupId: String?

    @Environment(CommunityStore.self) private var community
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var details = ""
    @State private var metric: ChallengeMetric = .workouts
    @State private var target = ChallengeMetric.workouts.defaultTarget
    @State private var endDate = Calendar.current.date(byAdding: .day, value: 30, to: .now) ?? .now
    @State private var isPublic = false
    @State private var selectedGroup: String?
    @State private var groups: [CommunityGroup]?
    @State private var groupsFailed = false
    @State private var saving = false
    @State private var error: String?
    @State private var created: String?

    private var today: Date { Calendar.current.startOfDay(for: .now) }
    private var minEnd: Date { Calendar.current.date(byAdding: .day, value: 1, to: today) ?? today }
    private var maxEnd: Date { Calendar.current.date(byAdding: .day, value: 90, to: today) ?? today }
    private var durationDays: Int {
        (Calendar.current.dateComponents([.day], from: today, to: Calendar.current.startOfDay(for: endDate)).day ?? 0) + 1
    }
    private var countsDays: Bool { metric == .activeDays || metric == .hydrationDays }
    private var dateError: String? {
        if durationDays < 1 || durationDays > 90 { return "A duração vai de 1 a 90 dias." }
        if countsDays && target > durationDays { return "A meta não pode ter mais dias do que a duração do desafio." }
        return nil
    }
    private var scopeOk: Bool { isPublic || selectedGroup != nil }
    private var valid: Bool { !title.trimmingCharacters(in: .whitespaces).isEmpty && dateError == nil && scopeOk && target >= 1 }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("O progresso é atualizado pelos registros do FitGen, e quem participa vê o progresso dos outros.")
                    .font(.footnote).foregroundStyle(Theme.secondary)

                Card(title: "Sobre") {
                    TextField("Ex: 12 treinos em dezembro", text: $title).textFieldStyle(.plain)
                        .padding(12).background(Theme.cardRaised, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .onChange(of: title) { _, v in if v.count > 80 { title = String(v.prefix(80)) } }
                    TextField("Descrição (opcional)", text: $details, axis: .vertical).lineLimit(2...5)
                        .padding(12).background(Theme.cardRaised, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }

                Card(title: "Medir por") {
                    VStack(spacing: 0) {
                        ForEach(ChallengeMetric.allCases) { m in
                            if m != ChallengeMetric.allCases.first { Divider().overlay(Theme.separator) }
                            Button {
                                metric = m; target = m.defaultTarget
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: m.symbol).foregroundStyle(m.tint).frame(width: 28)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(m.label).font(.subheadline.weight(.semibold)).foregroundStyle(.primary)
                                        Text(m.caption).font(.footnote).foregroundStyle(Theme.secondary)
                                    }
                                    Spacer()
                                    Image(systemName: m == metric ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(m == metric ? Theme.voltText : Theme.secondary).font(.title3)
                                }
                                .padding(.vertical, 10).contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            .accessibilityAddTraits(m == metric ? .isSelected : [])
                        }
                    }
                }

                Card(title: "Meta e período") {
                    Stepper(value: $target, in: 1...1000, step: stepSize) {
                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                            Text("\(target)").font(.metric(26)).contentTransition(.numericText())
                            Text(metric.unit).font(.subheadline).foregroundStyle(Theme.secondary)
                        }
                    }
                    Divider().overlay(Theme.separator)
                    HStack { Text("Início"); Spacer(); Text("Hoje").foregroundStyle(Theme.secondary) }
                    DatePicker("Término", selection: $endDate, in: minEnd...maxEnd, displayedComponents: .date)
                        .environment(\.locale, Locale(identifier: "pt_BR"))
                    Text("Duração: \(durationDays) \(durationDays == 1 ? "dia" : "dias")")
                        .font(.footnote).foregroundStyle(Theme.secondary)
                    if let dateError { Text(dateError).font(.footnote).foregroundStyle(Theme.calories) }
                }

                Card(title: "Quem participa") {
                    Toggle(isOn: $isPublic) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Desafio público").font(.subheadline.weight(.semibold))
                            Text("Qualquer pessoa do FitGen pode participar.").font(.footnote).foregroundStyle(Theme.secondary)
                        }
                    }.tint(Theme.volt)
                    if !isPublic { clubPicker }
                }

                if valid {
                    Text("“\(title.trimmingCharacters(in: .whitespaces))”: \(target) \(metric.unit) em \(durationDays) \(durationDays == 1 ? "dia" : "dias"). Começa hoje.")
                        .font(.footnote).foregroundStyle(Theme.secondary)
                }

                Button { Task { await submit() } } label: {
                    if saving { ProgressView() } else { Text("Criar desafio") }
                }
                .buttonStyle(.fitgenPrimary).disabled(!valid || saving)
            }
            .padding(.horizontal, Theme.gutter).padding(.vertical, 8).padding(.bottom, 24)
        }
        .scrollDismissesKeyboard(.interactively)
        .screen()
        .navigationTitle("Novo desafio")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadGroups() }
        .navigationDestination(item: $created) { ChallengeDetailView(challengeId: $0) }
        .alert("Erro ao criar desafio", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
            Button("OK", role: .cancel) {}
        } message: { Text(error ?? "") }
    }

    private var stepSize: Int { metric == .workoutMinutes ? 30 : 1 }

    @ViewBuilder
    private var clubPicker: some View {
        if groupsFailed {
            Button("Não foi possível carregar os clubes. Tentar novamente") { Task { await loadGroups() } }
                .font(.footnote).foregroundStyle(Theme.calories)
        } else if let groups {
            if groups.isEmpty {
                NavigationLink(value: CommunityRoute.createGroup) {
                    Label("Crie um clube primeiro", systemImage: "person.3.fill").font(.subheadline)
                }
            } else {
                ForEach(groups) { g in
                    Button { selectedGroup = g.id } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "person.3.fill").foregroundStyle(Theme.voltText).frame(width: 28)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(g.name).font(.subheadline.weight(.semibold)).foregroundStyle(.primary)
                                Text("\(g.memberCount) \(g.memberCount == 1 ? "pessoa" : "pessoas")")
                                    .font(.footnote).foregroundStyle(Theme.secondary)
                            }
                            Spacer()
                            Image(systemName: g.id == selectedGroup ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(g.id == selectedGroup ? Theme.voltText : Theme.secondary).font(.title3)
                        }
                        .padding(.vertical, 6).contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(g.id == selectedGroup ? .isSelected : [])
                }
            }
        } else { ProgressView().frame(maxWidth: .infinity) }
    }

    private func loadGroups() async {
        groupsFailed = false
        do {
            let list = try await community.myGroups()
            groups = list
            if selectedGroup == nil {
                if let groupId, list.contains(where: { $0.id == groupId }) { selectedGroup = groupId }
                else if groupId == nil { selectedGroup = list.first?.id }
            }
            if groupId != nil && selectedGroup == nil { isPublic = true }
        } catch { groupsFailed = true }
    }

    private func submit() async {
        saving = true; defer { saving = false }
        let desc = details.trimmingCharacters(in: .whitespacesAndNewlines)
        let body = NewChallenge(title: title.trimmingCharacters(in: .whitespaces), description: desc.isEmpty ? nil : desc,
                                metric: metric, target: target, durationDays: durationDays,
                                groupId: isPublic ? nil : selectedGroup, isPublic: isPublic)
        do { created = try await community.createChallenge(body).id }
        catch { self.error = error.localizedDescription }
    }
}

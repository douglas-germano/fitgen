import SwiftUI
import UIKit
import UserNotifications

// MARK: - Model

private struct AppNotification: Decodable, Identifiable, Sendable {
    let id: String
    let title: String
    let message: String
    let type: String
    var isRead: Bool
    let createdAt: String

    var date: Date? { NotificationDates.parse(createdAt) }

    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        if let s = try? c.decode(String.self, forKey: .id) { id = s }
        else if let n = try? c.decode(Int.self, forKey: .id) { id = String(n) }
        else { id = UUID().uuidString }
        title = (try? c.decode(String.self, forKey: .title)) ?? ""
        message = (try? c.decode(String.self, forKey: .message)) ?? ""
        type = (try? c.decode(String.self, forKey: .type)) ?? ""
        isRead = (try? c.decode(Bool.self, forKey: .isRead)) ?? false
        createdAt = (try? c.decode(String.self, forKey: .createdAt)) ?? ""
    }
    private enum Keys: String, CodingKey { case id, title, message, type, isRead, createdAt }

    var icon: (name: String, color: Color) {
        switch type {
        case "achievement": ("flame.fill", Theme.streak)
        case "hydration": ("drop.fill", Theme.water)
        case "workout": ("dumbbell.fill", Theme.voltText)
        case "nutrition": ("fork.knife", Theme.protein)
        case "social": ("person.2.fill", Theme.steps)
        default: ("bell.fill", Theme.calories)
        }
    }
}

private enum NotificationDates {
    nonisolated(unsafe) private static let withFraction: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]; return f
    }()
    nonisolated(unsafe) private static let plain = ISO8601DateFormatter()
    static func parse(_ s: String) -> Date? {
        if let d = withFraction.date(from: s) ?? plain.date(from: s) { return d }
        // Naive timestamps from the server are UTC.
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX"); f.timeZone = TimeZone(identifier: "UTC")
        for format in ["yyyy-MM-dd'T'HH:mm:ss.SSSSSS", "yyyy-MM-dd'T'HH:mm:ss", "yyyy-MM-dd HH:mm:ss"] {
            f.dateFormat = format
            if let d = f.date(from: s) { return d }
        }
        return nil
    }
}

// MARK: - Reminders

private enum ReminderKeys {
    static let workoutOn = "reminder.workout.enabled"
    static let workoutTime = "reminder.workout.minutes"
    static let waterOn = "reminder.water.enabled"
    static let prefix = "fitgen.reminder."
}

@MainActor
private enum ReminderScheduler {
    static let center = UNUserNotificationCenter.current()

    static func authorization() async -> UNAuthorizationStatus {
        await center.notificationSettings().authorizationStatus
    }

    /// Asks once; returns whether notifications are allowed.
    static func requestIfNeeded() async -> Bool {
        switch await authorization() {
        case .authorized, .provisional, .ephemeral: return true
        case .notDetermined: return (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        default: return false
        }
    }

    static func clear(_ group: String) async {
        let pending = await center.pendingNotificationRequests()
        let ids = pending.map(\.identifier).filter { $0.hasPrefix(ReminderKeys.prefix + group) }
        center.removePendingNotificationRequests(withIdentifiers: ids)
    }

    private static let weekdays: [String: Int] = [
        "sunday": 1, "domingo": 1, "monday": 2, "segunda": 2, "segunda-feira": 2,
        "tuesday": 3, "terca": 3, "terça": 3, "terça-feira": 3, "wednesday": 4, "quarta": 4, "quarta-feira": 4,
        "thursday": 5, "quinta": 5, "quinta-feira": 5, "friday": 6, "sexta": 6, "sexta-feira": 6,
        "saturday": 7, "sabado": 7, "sábado": 7,
    ]

    static func scheduleWorkout(days: [WorkoutDay], minutes: Int) async {
        await clear("workout")
        for day in days {
            guard let weekday = weekdays[day.dayOfWeek.lowercased()] else { continue }
            let label = (day.focus ?? day.name)?.trimmingCharacters(in: .whitespaces)
            let content = UNMutableNotificationContent()
            content.title = "Hora de treinar"
            content.body = label.map { $0.isEmpty ? "O Otto separou seu treino de hoje 💪" : "O Otto separou seu treino de \($0.lowercased()) 💪" } ?? "O Otto separou seu treino de hoje 💪"
            content.sound = .default
            var comps = DateComponents()
            comps.weekday = weekday; comps.hour = minutes / 60; comps.minute = minutes % 60
            let request = UNNotificationRequest(
                identifier: "\(ReminderKeys.prefix)workout.\(weekday)", content: content,
                trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: true))
            try? await center.add(request)
        }
    }

    static func scheduleWater() async {
        await clear("water")
        let messages = [
            "Hora de se hidratar! O Otto separou um copo d'água pra você 💧",
            "Já bebeu água? Seu corpo agradece 💧",
            "Pausa rápida: um copo d'água e segue o dia 💪",
            "O Otto lembra: água é parte do treino 💧",
        ]
        for (index, hour) in stride(from: 9, through: 21, by: 2).enumerated() {
            let content = UNMutableNotificationContent()
            content.title = "Lembrete de água"
            content.body = messages[index % messages.count]
            content.sound = .default
            var comps = DateComponents(); comps.hour = hour; comps.minute = 0
            let request = UNNotificationRequest(
                identifier: "\(ReminderKeys.prefix)water.\(hour)", content: content,
                trigger: UNCalendarNotificationTrigger(dateMatching: comps, repeats: true))
            try? await center.add(request)
        }
    }
}

// MARK: - View

struct NotificationsView: View {
    init() {}

    @Environment(AppStore.self) private var store
    @Environment(\.scenePhase) private var scenePhase

    @State private var items: [AppNotification] = []
    @State private var loading = true
    @State private var loadError: String?
    @State private var markingAll = false

    @AppStorage(ReminderKeys.workoutOn) private var workoutOn = false
    @AppStorage(ReminderKeys.workoutTime) private var workoutMinutes = 18 * 60
    @AppStorage(ReminderKeys.waterOn) private var waterOn = false
    @State private var denied = false

    private var planDays: [WorkoutDay] { (store.plan.value ?? nil)?.days ?? [] }
    private var workoutTime: Binding<Date> {
        Binding {
            Calendar.current.date(bySettingHour: workoutMinutes / 60, minute: workoutMinutes % 60, second: 0, of: .now) ?? .now
        } set: { date in
            let c = Calendar.current.dateComponents([.hour, .minute], from: date)
            workoutMinutes = (c.hour ?? 18) * 60 + (c.minute ?? 0)
        }
    }

    private var unreadCount: Int { items.filter { !$0.isRead }.count }
    private var sorted: [AppNotification] { items.sorted { ($0.date ?? .distantPast) > ($1.date ?? .distantPast) } }
    private var today: [AppNotification] { sorted.filter { $0.date.map(Calendar.current.isDateInToday) ?? false } }
    private var earlier: [AppNotification] { sorted.filter { !($0.date.map(Calendar.current.isDateInToday) ?? false) } }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                remindersCard
                if loading && items.isEmpty {
                    LoadingView(cards: [72, 72, 72, 72, 72])
                } else if let loadError, items.isEmpty {
                    Card(title: "Não foi possível carregar") {
                        Text(loadError).font(.subheadline).foregroundStyle(Theme.secondary)
                        Button("Tentar novamente") { Task { await load() } }
                            .buttonStyle(.fitgenPrimaryCompact)
                    }
                } else if items.isEmpty {
                    Card {
                        VStack(spacing: 8) {
                            Image(systemName: "bell").font(.largeTitle).foregroundStyle(Theme.secondary)
                            Text("Nenhuma notificação por enquanto").font(.headline).foregroundStyle(.primary)
                            Text("Avisos sobre metas, conquistas e a comunidade aparecem aqui.")
                                .font(.subheadline).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                    }
                } else {
                    section("Hoje", today)
                    section("Anteriores", earlier)
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.vertical, 12)
        }
        .screen()
        .navigationTitle("Notificações")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if unreadCount > 0 {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { Task { await markAll() } } label: {
                        if markingAll { ProgressView() } else { Image(systemName: "checkmark.circle") }
                    }
                    .accessibilityLabel("Marcar todas como lidas")
                    .disabled(markingAll)
                }
            }
        }
        .task { await load() }
        .refreshable { await load() }
        .task { await refreshPermission() }
        .onChange(of: scenePhase) { _, phase in if phase == .active { Task { await refreshPermission() } } }
        .onChange(of: workoutMinutes) { _, _ in if workoutOn { Task { await ReminderScheduler.scheduleWorkout(days: planDays, minutes: workoutMinutes) } } }
        .onChange(of: planDays.map(\.id)) { _, _ in if workoutOn { Task { await ReminderScheduler.scheduleWorkout(days: planDays, minutes: workoutMinutes) } } }
    }

    // MARK: Reminders UI

    private var remindersCard: some View {
        Card(title: "Lembretes") {
            VStack(alignment: .leading, spacing: 12) {
                Toggle(isOn: Binding(get: { workoutOn }, set: { setWorkout($0) })) {
                    Label { Text("Lembrete de treino").foregroundStyle(.primary) } icon: { Image(systemName: "dumbbell.fill").foregroundStyle(Theme.voltText) }
                }
                .tint(Theme.voltText)
                if workoutOn {
                    DatePicker("Horário", selection: workoutTime, displayedComponents: .hourAndMinute)
                        .foregroundStyle(.primary)
                    Text(planDays.isEmpty ? "Você ainda não tem um plano ativo. Os lembretes começam quando ele existir."
                         : "Nos dias do seu plano, com a voz do Otto.")
                        .font(.footnote).foregroundStyle(Theme.secondary)
                }
                Divider().overlay(Theme.separator)
                Toggle(isOn: Binding(get: { waterOn }, set: { setWater($0) })) {
                    Label { Text("Lembrete de água").foregroundStyle(.primary) } icon: { Image(systemName: "drop.fill").foregroundStyle(Theme.water) }
                }
                .tint(Theme.water)
                if waterOn {
                    Text("A cada 2 horas, das 9h às 21h.").font(.footnote).foregroundStyle(Theme.secondary)
                }
                if denied {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("As notificações estão desativadas para o FitGen. Ative nos Ajustes do iPhone para receber os lembretes do Otto.")
                            .font(.footnote).foregroundStyle(Theme.calories)
                        Button("Abrir Ajustes") {
                            if let url = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(url) }
                        }
                        .buttonStyle(.bordered).tint(Theme.voltText)
                    }
                }
            }
        }
    }

    private func setWorkout(_ on: Bool) {
        Task {
            if on {
                guard await ReminderScheduler.requestIfNeeded() else { workoutOn = false; denied = true; return }
                workoutOn = true; denied = false
                await ReminderScheduler.scheduleWorkout(days: planDays, minutes: workoutMinutes)
            } else {
                workoutOn = false
                await ReminderScheduler.clear("workout")
            }
        }
    }

    private func setWater(_ on: Bool) {
        Task {
            if on {
                guard await ReminderScheduler.requestIfNeeded() else { waterOn = false; denied = true; return }
                waterOn = true; denied = false
                await ReminderScheduler.scheduleWater()
            } else {
                waterOn = false
                await ReminderScheduler.clear("water")
            }
        }
    }

    private func refreshPermission() async {
        let status = await ReminderScheduler.authorization()
        denied = status == .denied
        if denied {
            // Permission revoked in Settings: reflect it and drop stale schedules.
            if workoutOn { workoutOn = false; await ReminderScheduler.clear("workout") }
            if waterOn { waterOn = false; await ReminderScheduler.clear("water") }
        }
    }

    // MARK: List

    @ViewBuilder private func section(_ title: String, _ list: [AppNotification]) -> some View {
        if !list.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                Text(title).font(.cardTitle).foregroundStyle(.primary).padding(.leading, 4)
                VStack(spacing: 0) {
                    ForEach(Array(list.enumerated()), id: \.element.id) { index, item in
                        row(item)
                        if index < list.count - 1 { Divider().overlay(Theme.separator).padding(.leading, 62) }
                    }
                }
                .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
            }
        }
    }

    private func row(_ item: AppNotification) -> some View {
        let icon = item.icon
        return Button { Task { await markRead(item) } } label: {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: icon.name).font(.system(size: 16, weight: .semibold)).foregroundStyle(icon.color)
                    .frame(width: 36, height: 36).background(icon.color.opacity(0.18), in: Circle())
                VStack(alignment: .leading, spacing: 3) {
                    Text(item.title).font(.subheadline.weight(.semibold)).foregroundStyle(.primary).multilineTextAlignment(.leading)
                    if !item.message.isEmpty {
                        Text(item.message).font(.footnote).foregroundStyle(Theme.secondary).multilineTextAlignment(.leading)
                    }
                    if let date = item.date {
                        Text(date.formatted(.relative(presentation: .named, unitsStyle: .abbreviated).locale(Locale(identifier: "pt_BR"))))
                            .font(.caption).foregroundStyle(Theme.secondary)
                    }
                }
                Spacer(minLength: 8)
                if !item.isRead { Circle().fill(Theme.volt).frame(width: 9, height: 9).padding(.top, 6) }
            }
            .padding(14)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(item.isRead ? "" : "Não lida. ")\(item.title). \(item.message)")
    }

    // MARK: Network

    private func load() async {
        do {
            items = try await APIClient.shared.get("/notifications/")
            loadError = nil
        } catch {
            if !Task.isCancelled { loadError = error.localizedDescription }
        }
        loading = false
    }

    private func markRead(_ item: AppNotification) async {
        guard !item.isRead, let index = items.firstIndex(where: { $0.id == item.id }) else { return }
        items[index].isRead = true
        do { try await APIClient.shared.sendNoContent("/notifications/\(item.id)/read", method: "POST") }
        catch { if let i = items.firstIndex(where: { $0.id == item.id }) { items[i].isRead = false } }
    }

    /// The API has no bulk endpoint (the Expo app also marks one by one).
    private func markAll() async {
        markingAll = true
        let ids = items.filter { !$0.isRead }.map(\.id)
        await withTaskGroup(of: Void.self) { group in
            for id in ids {
                group.addTask { try? await APIClient.shared.sendNoContent("/notifications/\(id)/read", method: "POST") }
            }
        }
        await load()
        markingAll = false
    }
}

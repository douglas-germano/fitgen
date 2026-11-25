import SwiftUI

/// Unlocked achievements first (newest on top), then the ones still to earn.
struct AchievementsView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        let unlocked = store.achievements.filter(\.unlocked).sorted { ($0.unlockedAt ?? "") > ($1.unlockedAt ?? "") }
        let locked = store.achievements.filter { !$0.unlocked }
        ScrollView {
            VStack(spacing: 12) {
                Card {
                    HStack(alignment: .firstTextBaseline) {
                        MetricValue(value: "\(unlocked.count)", goal: "\(store.achievements.count)", color: Theme.voltText, size: 34)
                        Text("conquistas").font(.subheadline).foregroundStyle(Theme.secondary)
                        Spacer()
                    }
                    ProgressLine(progress: store.achievements.isEmpty ? 0 : Double(unlocked.count) / Double(store.achievements.count), color: Theme.voltText)
                }
                if !unlocked.isEmpty { section("Conquistadas", unlocked) }
                if !locked.isEmpty { section("A conquistar", locked) }
                if store.achievements.isEmpty {
                    Text("Complete treinos e registre refeições para ganhar conquistas.")
                        .foregroundStyle(Theme.secondary).padding(.top, 24)
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.bottom, 24)
        }
        .refreshable { await store.loadGamification() }
        .screen()
        .navigationTitle("Conquistas")
    }

    private func section(_ title: String, _ items: [Achievement]) -> some View {
        Card(title: title) {
            ForEach(items) { item in
                HStack(spacing: 12) {
                    Image(systemName: item.unlocked ? "medal.fill" : "lock.fill")
                        .font(.title3)
                        .foregroundStyle(item.unlocked ? AnyShapeStyle(LinearGradient(colors: [Theme.voltText, .yellow], startPoint: .top, endPoint: .bottom)) : AnyShapeStyle(Theme.secondary))
                        .frame(width: 42, height: 42).background(Theme.cardRaised, in: Circle())
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.name).font(.body.weight(.medium)).foregroundStyle(item.unlocked ? .primary : Theme.secondary)
                        Text(item.description).font(.caption).foregroundStyle(Theme.secondary).lineLimit(2)
                    }
                    Spacer()
                    if let date = item.unlockedAt.flatMap(ISODate.parse) {
                        Text(Format.dayMonth(date)).font(.caption).foregroundStyle(Theme.secondary)
                    }
                }
                .padding(.vertical, 2)
            }
        }
    }
}

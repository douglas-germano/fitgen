import SwiftUI

/// Past outdoor activities. Push it inside an existing NavigationStack.
struct OutdoorHistoryView: View {
    @Environment(AppStore.self) private var store
    @State private var records: [OutdoorRecord]?
    @State private var error: String?
    @State private var deleting: OutdoorRecord?
    @State private var deleteError: String?

    init() {}

    var body: some View {
        ScrollView {
            if let records {
                if records.isEmpty {
                    ContentUnavailableView("Nenhuma atividade ainda", systemImage: "figure.run",
                                           description: Text("Suas corridas, caminhadas e pedais dos últimos 90 dias aparecem aqui."))
                        .padding(.top, 60)
                } else {
                    LazyVStack(spacing: 10) {
                        ForEach(records) { record in
                            NavigationLink { OutdoorDetailView(id: record.id) } label: { row(record) }
                                .buttonStyle(.plain)
                                .contextMenu {
                                    Button(role: .destructive) { deleting = record } label: { Label("Excluir atividade", systemImage: "trash") }
                                }
                        }
                    }
                    .padding(.horizontal, Theme.gutter)
                }
            } else if let error {
                ContentUnavailableView {
                    Label("Não foi possível carregar", systemImage: "wifi.slash")
                } description: { Text(error) } actions: {
                    Button("Tentar novamente") { Task { await load() } }
                }.padding(.top, 60)
            } else {
                LoadingView(cards: [96, 96, 96, 96])
            }
        }
        .screen()
        .navigationTitle("Ao ar livre")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
        .refreshable { await load() }
        .confirmationDialog("Excluir esta atividade?", isPresented: Binding(get: { deleting != nil }, set: { if !$0 { deleting = nil } }),
                            titleVisibility: .visible) {
            Button("Excluir", role: .destructive) { if let record = deleting { Task { await delete(record) } } }
            Button("Cancelar", role: .cancel) { deleting = nil }
        } message: { Text("O percurso e as métricas serão apagados. Isso não remove o treino do app Saúde.") }
        .alert("Não foi possível excluir", isPresented: Binding(get: { deleteError != nil }, set: { if !$0 { deleteError = nil } })) {
            Button("OK") { deleteError = nil }
        } message: { Text(deleteError ?? "") }
    }

    private func delete(_ record: OutdoorRecord) async {
        deleting = nil
        do {
            try await store.deleteOutdoor(id: record.id)
            withAnimation { records?.removeAll { $0.id == record.id } }
        } catch { deleteError = error.localizedDescription }
    }

    private func row(_ r: OutdoorRecord) -> some View {
        let kind = r.kind
        return Card {
            HStack(spacing: 14) {
                Image(systemName: kind.icon)
                    .font(.system(size: 20, weight: .semibold)).foregroundStyle(.black)
                    .frame(width: 44, height: 44).background(kind.color, in: Circle())
                VStack(alignment: .leading, spacing: 3) {
                    Text(kind.title).font(.headline).foregroundStyle(.primary)
                    Text(r.date.map { "\(Format.relativeDay($0)), \(Format.dayMonth($0))" } ?? "").font(.footnote).foregroundStyle(Theme.secondary)
                    if r.distanceMeters < 50 {
                        Text("Toque e segure para excluir").font(.caption2).foregroundStyle(Theme.secondary)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 3) {
                    MetricValue(value: r.distanceText, unit: "km", color: kind.color, size: 24)
                    Text("\(r.durationText) · " + (kind.usesSpeed ? "\(r.speedText) km/h" : "\(r.paceText) /km"))
                        .font(.footnote).foregroundStyle(Theme.secondary)
                }
            }
        }
    }

    private func load() async {
        error = nil
        do { records = try await store.loadOutdoorHistory() } catch {
            if records == nil { self.error = error.localizedDescription }
        }
    }
}

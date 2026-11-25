import SwiftUI
import MapKit

/// Summary of one outdoor activity: route map, stats and a share card.
struct OutdoorDetailView: View {
    @Environment(AppStore.self) private var store
    private let id: String
    @State private var record: OutdoorRecord?
    @State private var error: String?
    @State private var shareImage: UIImage?

    /// Loads the activity (with route) from the API.
    init(id: String) { self.id = id }
    /// Shows an activity already in hand.
    init(record: OutdoorRecord) { self.id = record.id; _record = State(initialValue: record) }

    var body: some View {
        ScrollView {
            if let record {
                content(record)
            } else if let error {
                ContentUnavailableView {
                    Label("Não foi possível abrir", systemImage: "exclamationmark.triangle")
                } description: { Text(error) } actions: {
                    Button("Tentar novamente") { Task { await load() } }
                }.padding(.top, 80)
            } else {
                LoadingView()
            }
        }
        .screen()
        .navigationTitle(record?.kind.fullName ?? "Atividade")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if let shareImage, let record {
                    ShareLink(item: Image(uiImage: shareImage),
                              preview: SharePreview(record.kind.fullName, image: Image(uiImage: shareImage))) {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
            }
        }
        .task { if record == nil { await load() } }
        .task(id: record?.id) { renderShare() }
    }

    @ViewBuilder
    private func content(_ r: OutdoorRecord) -> some View {
        let kind = r.kind
        VStack(spacing: 12) {
            OutdoorRouteMap(segments: r.segments, color: kind.color)
                .frame(height: 280)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))

            Card {
                VStack(alignment: .leading, spacing: 4) {
                    Label(kind.title, systemImage: kind.icon).font(.cardTitle).foregroundStyle(kind.color)
                    Text(r.dateText.capitalized).font(.subheadline).foregroundStyle(Theme.secondary)
                    MetricValue(value: r.distanceText, unit: "km", color: kind.color, size: 56)
                }
            }

            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                stat("Tempo", r.durationText, nil, Theme.voltText, "timer")
                if kind.usesSpeed {
                    stat("Velocidade média", r.speedText, "km/h", Theme.water, "speedometer")
                } else {
                    stat("Ritmo médio", r.paceText, "/km", Theme.steps, "speedometer")
                }
                if let kcal = r.calories {
                    stat("Calorias", Format.int(kcal), "kcal", Theme.calories, "flame.fill")
                }
                if !kind.usesSpeed {
                    stat("Velocidade", r.speedText, "km/h", Theme.distance, "gauge.with.dots.needle.50percent")
                }
            }

            if let shareImage {
                ShareLink(item: Image(uiImage: shareImage),
                          preview: SharePreview(kind.fullName, image: Image(uiImage: shareImage))) {
                    Label("Compartilhar", systemImage: "square.and.arrow.up")
                        .font(.headline).foregroundStyle(.black)
                        .frame(maxWidth: .infinity).padding(.vertical, 16)
                        .background(Theme.volt, in: Capsule())
                }
            }
        }
        .padding(.horizontal, Theme.gutter)
        .padding(.bottom, 24)
    }

    private func stat(_ title: String, _ value: String, _ unit: String?, _ color: Color, _ icon: String) -> some View {
        Card(height: 96) {
            VStack(alignment: .leading, spacing: 6) {
                Label(title, systemImage: icon).font(.footnote.weight(.semibold)).foregroundStyle(Theme.secondary).lineLimit(1)
                MetricValue(value: value, unit: unit, color: color, size: 30)
            }
        }
    }

    private func load() async {
        error = nil
        do { record = try await store.loadOutdoor(id: id) } catch { self.error = error.localizedDescription }
    }

    private func renderShare() {
        guard let record else { return }
        let renderer = ImageRenderer(content: OutdoorShareCard(record: record))
        renderer.scale = 3
        shareImage = renderer.uiImage
    }
}

/// Route drawn on Apple Maps: one polyline per segment, start and end markers.
struct OutdoorRouteMap: View {
    let segments: [[CLLocationCoordinate2D]]
    var color: Color

    var body: some View {
        Map(initialPosition: .rect(Self.rect(for: segments)), interactionModes: [.pan, .zoom]) {
            ForEach(Array(segments.enumerated()), id: \.offset) { _, segment in
                if segment.count > 1 {
                    MapPolyline(coordinates: segment).stroke(color, style: StrokeStyle(lineWidth: 6, lineCap: .round, lineJoin: .round))
                }
            }
            if let first = segments.first?.first {
                Annotation("Início", coordinate: first) {
                    Circle().fill(.white).frame(width: 14, height: 14).overlay(Circle().stroke(color, lineWidth: 4))
                }
            }
            if let last = segments.last?.last {
                Annotation("Fim", coordinate: last) {
                    Image(systemName: "flag.checkered.circle.fill").font(.title2).foregroundStyle(.white, color)
                }
            }
        }
        .mapStyle(.standard(elevation: .flat))
    }

    static func rect(for segments: [[CLLocationCoordinate2D]]) -> MKMapRect {
        let points = segments.flatMap { $0 }.map { MKMapPoint($0) }
        guard let first = points.first else { return .world }
        var rect = MKMapRect(origin: first, size: MKMapSize(width: 0, height: 0))
        for p in points { rect = rect.union(MKMapRect(origin: p, size: MKMapSize(width: 0, height: 0))) }
        let pad = max(rect.width, rect.height) * 0.25 + 300
        return rect.insetBy(dx: -pad, dy: -pad)
    }
}

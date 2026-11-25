import SwiftUI
import MapKit

/// Records a run, walk or bike ride with GPS. Present as a fullScreenCover.
struct OutdoorRecorderView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    private enum Stage {
        case recording
        case saving(OutdoorResult)
        case done(OutdoorRecord)
        /// Saving failed: the local summary is shown with a retry button.
        case failed(OutdoorResult, OutdoorRecord, String)
    }

    @State private var tracker = OutdoorTracker()
    @State private var stage: Stage = .recording
    @State private var camera: MapCameraPosition = .userLocation(followsHeading: false, fallback: .automatic)
    @State private var confirmFinish = false
    @State private var confirmClose = false
    @State private var tooShort = false
    @State private var healthSaved = false

    init() {}

    var body: some View {
        NavigationStack {
            Group {
                switch stage {
                case .recording: recorder
                case .saving(let result):
                    VStack(spacing: 16) {
                        ProgressView().controlSize(.large)
                        Text("Salvando \(result.kind.title.lowercased())…").foregroundStyle(Theme.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity).screen()
                case .done(let record):
                    OutdoorDetailView(record: record)
                case .failed(let result, let record, let message):
                    OutdoorDetailView(record: record)
                        .safeAreaInset(edge: .bottom) { retryBar(result, message) }
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { closeTapped() } label: { Image(systemName: "xmark") }
                        .accessibilityLabel("Fechar")
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
        .preferredColorScheme(.dark)
        .interactiveDismissDisabled(tracker.isActive)
        .task {
            tracker.prepare()
            if store.profile.value == nil { await store.loadProfile() }
        }
        .onDisappear { tracker.releaseIfIdle() }
        .confirmationDialog("Finalizar atividade?", isPresented: $confirmFinish, titleVisibility: .visible) {
            Button("Finalizar e salvar") { finish() }
            Button("Continuar", role: .cancel) {}
        }
        .confirmationDialog("Descartar atividade?", isPresented: $confirmClose, titleVisibility: .visible) {
            Button("Descartar", role: .destructive) { tracker.discard(); dismiss() }
            Button("Continuar gravando", role: .cancel) {}
        } message: { Text("O trajeto gravado será perdido.") }
        .alert("Atividade muito curta", isPresented: $tooShort) {
            Button("Descartar", role: .destructive) { tracker.discard(); dismiss() }
            Button("Continuar", role: .cancel) {}
        } message: { Text("Para salvar, grave pelo menos 30 segundos e 50 metros.") }
    }

    // MARK: Recording

    private var recorder: some View {
        VStack(spacing: 0) {
            Map(position: $camera) {
                UserAnnotation()
                ForEach(Array(tracker.segments.enumerated()), id: \.offset) { _, segment in
                    if segment.count > 1 {
                        MapPolyline(coordinates: segment)
                            .stroke(tracker.kind.color, style: StrokeStyle(lineWidth: 6, lineCap: .round, lineJoin: .round))
                    }
                }
            }
            .mapStyle(.standard(elevation: .flat))
            .mapControls { MapUserLocationButton() }
            .overlay(alignment: .top) {
                if tracker.weakSignal && tracker.phase == .recording {
                    Label("Sinal de GPS fraco", systemImage: "location.slash")
                        .font(.footnote.weight(.semibold)).padding(.horizontal, 12).padding(.vertical, 6)
                        .background(.ultraThinMaterial, in: Capsule()).padding(.top, 8)
                }
            }

            panel
        }
        .screen()
    }

    private var panel: some View {
        VStack(spacing: 18) {
            if tracker.isDenied {
                permissionDenied
            } else if tracker.phase == .idle {
                picker
                bigButton("Iniciar \(tracker.kind.title.lowercased())", color: tracker.kind.color, icon: "play.fill") {
                    if tracker.isAuthorized { tracker.start() } else { tracker.prepare() }
                }
                if !tracker.isAuthorized {
                    Text("Permita o acesso à localização para gravar o trajeto.")
                        .font(.footnote).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
                }
            } else {
                liveStats
                HStack(spacing: 12) {
                    if tracker.phase == .recording {
                        bigButton("Pausar", color: Theme.protein, icon: "pause.fill") { tracker.pause() }
                    } else {
                        bigButton("Retomar", color: tracker.kind.color, icon: "play.fill") { tracker.resume() }
                    }
                    bigButton("Finalizar", color: Theme.calories, icon: "stop.fill") { confirmFinish = true }
                }
            }
        }
        .padding(.horizontal, Theme.gutter)
        .padding(.top, 16)
        .padding(.bottom, 12)
        .background(Theme.card.clipShape(UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28)).ignoresSafeArea(edges: .bottom))
    }

    private var picker: some View {
        HStack(spacing: 8) {
            ForEach(OutdoorKind.allCases) { kind in
                let selected = tracker.kind == kind
                Button { tracker.kind = kind } label: {
                    Label(kind.title, systemImage: kind.icon)
                        .font(.system(.subheadline, design: .rounded).weight(.semibold))
                        .foregroundStyle(selected ? .black : .primary)
                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                        .background(selected ? kind.color : Theme.cardRaised, in: Capsule())
                }
                .buttonStyle(.plain)
            }
        }
    }

    private var liveStats: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let seconds = tracker.elapsed(at: context.date)
            VStack(spacing: 14) {
                MetricValue(value: Format.clock(seconds), color: tracker.phase == .paused ? Theme.protein : .primary, size: 64)
                HStack {
                    liveStat("Distância", OutdoorFormat.km(tracker.meters), "km", tracker.kind.color)
                    if tracker.kind.usesSpeed {
                        liveStat("Velocidade", OutdoorFormat.speed(seconds: seconds, meters: tracker.meters), "km/h", Theme.water)
                    } else {
                        liveStat("Ritmo", OutdoorFormat.pace(seconds: seconds, meters: tracker.meters), "/km", Theme.steps)
                    }
                }
                if tracker.phase == .paused {
                    Text("Pausado").font(.footnote.weight(.semibold)).foregroundStyle(Theme.protein)
                }
            }
        }
    }

    private func liveStat(_ title: String, _ value: String, _ unit: String, _ color: Color) -> some View {
        VStack(spacing: 2) {
            Text(title.uppercased()).font(.caption.weight(.semibold)).foregroundStyle(Theme.secondary)
            MetricValue(value: value, unit: unit, color: color, size: 34)
        }
        .frame(maxWidth: .infinity)
    }

    private var permissionDenied: some View {
        VStack(spacing: 12) {
            Image(systemName: "location.slash.fill").font(.largeTitle).foregroundStyle(Theme.calories)
            Text("Sem acesso à localização").font(.headline)
            Text("Ative a localização do FitGen em Ajustes para gravar seu trajeto.")
                .font(.subheadline).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
            bigButton("Abrir Ajustes", color: Theme.volt, icon: "gearshape.fill") {
                if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
            }
        }
    }

    private func bigButton(_ title: String, color: Color, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(.system(.headline, design: .rounded)).foregroundStyle(.black)
                .frame(maxWidth: .infinity).padding(.vertical, 16)
                .background(color, in: Capsule())
        }
        .buttonStyle(.plain)
    }

    private func retryBar(_ result: OutdoorResult, _ message: String) -> some View {
        VStack(spacing: 8) {
            Text(message).font(.footnote).foregroundStyle(Theme.calories).multilineTextAlignment(.center)
            bigButton("Tentar salvar novamente", color: Theme.volt, icon: "arrow.clockwise") { Task { await save(result) } }
        }
        .padding(.horizontal, Theme.gutter).padding(.vertical, 12)
        .background(.ultraThinMaterial)
    }

    // MARK: Actions

    private func closeTapped() {
        switch stage {
        case .recording: tracker.isActive ? (confirmClose = true) : dismiss()
        case .saving: break
        case .done: dismiss()
        case .failed: dismiss()
        }
    }

    private func finish() {
        guard let result = tracker.finish() else { return }
        if result.meters < 50 || result.duration < 30 {
            tooShort = true
            // Nothing recorded worth keeping: offer to discard (tracker is already stopped).
            return
        }
        Task { await save(result) }
    }

    private func save(_ result: OutdoorResult) async {
        stage = .saving(result)
        let weight = store.profile.value?.currentWeightKg
        let kcal = OutdoorFormat.calories(kind: result.kind, meters: result.meters, weightKg: weight, seconds: result.duration)
        do {
            let record = try await store.saveOutdoor(id: result.id, kind: result.kind, start: result.start, end: result.end,
                                                     duration: result.duration, route: result.route)
            stage = .done(record)
            if !healthSaved {
                healthSaved = true
                await store.health.saveOutdoorWorkout(kind: result.kind, start: result.start, end: result.end,
                                                      meters: record.distanceMeters, kcal: record.calories ?? kcal, locations: result.locations)
            }
        } catch {
            let local = OutdoorRecord(id: result.id, kind: result.kind, start: result.start, end: result.end,
                                      duration: result.duration, meters: result.meters, calories: kcal, route: result.route)
            stage = .failed(result, local, error.localizedDescription)
        }
    }
}

import PhotosUI
import SwiftUI

struct ProgressPhotosView: View {
    @Environment(AppStore.self) private var store
    @State private var photos: [ProgressPhoto] = []
    @State private var loaded = false
    @State private var pose: Pose = .front
    @State private var beforeID: String?
    @State private var nowID: String?

    @State private var pickerItem: PhotosPickerItem?
    @State private var showGallery = false
    @State private var cameraOpen = false
    @State private var pendingData: Data?
    @State private var askPose = false
    @State private var uploading = false
    @State private var error: String?
    @State private var viewing: ProgressPhoto?

    /// Photos of the selected pose, oldest first.
    private var ofPose: [ProgressPhoto] {
        photos.filter { $0.pose == pose.rawValue }.sorted { $0.takenAt < $1.takenAt }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                Picker("Pose", selection: $pose) {
                    ForEach(Pose.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)

                if loaded && photos.isEmpty {
                    emptyState
                } else {
                    comparison
                    grid
                }
                if let error { Text(error).font(.caption).foregroundStyle(Theme.calories) }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.bottom, 24)
        }
        .screen()
        .navigationTitle("Fotos de progresso")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    if CameraPicker.isAvailable {
                        Button { cameraOpen = true } label: { Label("Tirar foto", systemImage: "camera") }
                    }
                    Button { showGallery = true } label: { Label("Escolher da galeria", systemImage: "photo.on.rectangle") }
                } label: { Image(systemName: "plus") }
                .disabled(uploading)
                .accessibilityLabel("Adicionar foto")
            }
        }
        .overlay { if uploading { uploadingOverlay } }
        .task { await load() }
        .photosPicker(isPresented: $showGallery, selection: $pickerItem, matching: .images)
        .onChange(of: pickerItem) { _, new in
            guard let new else { return }
            Task {
                if let data = try? await new.loadTransferable(type: Data.self), let image = UIImage(data: data),
                   let jpeg = CameraPicker.Coordinator.resized(image) {
                    pendingData = jpeg
                    askPose = true
                }
                pickerItem = nil
            }
        }
        .onChange(of: pose) { _, _ in beforeID = nil; nowID = nil }
        .fullScreenCover(isPresented: $cameraOpen) {
            CameraPicker { data in
                cameraOpen = false
                if let data { pendingData = data; askPose = true }
            }
            .ignoresSafeArea()
        }
        .fullScreenCover(item: $viewing) { photo in
            PhotoViewer(photos: ofPose.reversed(), start: photo) { await delete($0) }
        }
        .confirmationDialog("Qual é a pose desta foto?", isPresented: $askPose, titleVisibility: .visible) {
            // Default (currently selected) pose first.
            ForEach([pose] + Pose.allCases.filter { $0 != pose }) { p in
                Button(p.label) { if let data = pendingData { Task { await upload(data, pose: p) } } }
            }
            Button("Cancelar", role: .cancel) { pendingData = nil }
        }
    }

    // MARK: Comparison

    @ViewBuilder private var comparison: some View {
        let list = ofPose
        if list.count >= 2 {
            let before = list.first { $0.id == beforeID } ?? list[0]
            let now = list.first { $0.id == nowID } ?? list[list.count - 1]
            VStack(spacing: 10) {
                PhotoComparisonSlider(before: before, now: now)
                HStack(spacing: 8) {
                    dateMenu(title: "Antes", selected: before, list: list) { beforeID = $0.id }
                    dateMenu(title: "Agora", selected: now, list: list) { nowID = $0.id }
                }
            }
        } else {
            HStack(spacing: 10) {
                Image(systemName: "rectangle.split.2x1").foregroundStyle(Theme.secondary)
                Text("Tire outra foto de \(pose.label) para comparar")
                    .font(.subheadline).foregroundStyle(Theme.secondary)
                Spacer(minLength: 0)
            }
            .padding(16)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        }
    }

    private func dateMenu(title: String, selected: ProgressPhoto, list: [ProgressPhoto],
                          pick: @escaping (ProgressPhoto) -> Void) -> some View {
        Menu {
            ForEach(list.reversed()) { photo in
                Button(photo.date.map(Format.dayMonth) ?? "—") { pick(photo) }
            }
        } label: {
            HStack(spacing: 4) {
                Text("\(title): \(selected.date.map(Format.dayMonth) ?? "—")")
                Image(systemName: "chevron.down").font(.caption2.weight(.bold))
            }
            .font(.footnote.weight(.semibold))
            .foregroundStyle(.primary)
            .frame(maxWidth: .infinity, minHeight: 36)
            .background(Theme.card, in: Capsule())
        }
    }

    // MARK: Grid

    private var grid: some View {
        let list = Array(ofPose.reversed())
        let groups = Dictionary(grouping: list) { monthKey($0) }
        let keys = groups.keys.sorted(by: >)
        return LazyVStack(alignment: .leading, spacing: 12) {
            ForEach(keys, id: \.self) { key in
                let items = groups[key] ?? []
                Section {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                        ForEach(items) { photo in
                            Button { viewing = photo } label: { PhotoThumb(photo: photo) }.buttonStyle(.plain)
                        }
                    }
                } header: {
                    Text(monthTitle(items.first?.date)).font(.cardTitle).foregroundStyle(.primary)
                }
            }
        }
    }

    private func monthKey(_ photo: ProgressPhoto) -> String { String(photo.takenAt.prefix(7)) }

    private func monthTitle(_ date: Date?) -> String {
        guard let date else { return "Sem data" }
        return date.formatted(.dateTime.month(.wide).year().locale(Locale(identifier: "pt_BR"))).capitalized
    }

    // MARK: Empty / overlay

    private var emptyState: some View {
        VStack(spacing: 18) {
            Image(systemName: "camera.fill").font(.system(size: 40)).foregroundStyle(Theme.voltText)
                .padding(.top, 24)
            Text("Acompanhe sua evolução").font(.cardTitle).foregroundStyle(.primary)
            Button {
                if CameraPicker.isAvailable { cameraOpen = true } else { showGallery = true }
            } label: {
                Text("Tirar primeira foto").font(.headline).foregroundStyle(.black)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .background(Theme.volt, in: Capsule())
            }
            VStack(alignment: .leading, spacing: 10) {
                tip("figure.stand", "Use sempre a mesma pose")
                tip("sun.max", "Mantenha a mesma luz")
                tip("arrow.left.and.right", "Fique na mesma distância da câmera")
                tip("lock.fill", "Suas fotos são privadas, só você vê")
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        }
    }

    private func tip(_ icon: String, _ text: String) -> some View {
        Label { Text(text).font(.subheadline).foregroundStyle(Theme.secondary) }
            icon: { Image(systemName: icon).foregroundStyle(Theme.voltText).frame(width: 24) }
    }

    private var uploadingOverlay: some View {
        VStack(spacing: 10) {
            ProgressView()
            Text("Enviando…").font(.footnote.weight(.semibold))
        }
        .padding(24)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    // MARK: Actions

    private func load() async {
        if let list = try? await store.progressPhotos() { photos = list }
        loaded = true
    }

    private func upload(_ data: Data, pose target: Pose) async {
        uploading = true
        error = nil
        do {
            try await store.uploadProgressPhoto(data, pose: target)
            pose = target
            await load()
        } catch { self.error = error.localizedDescription }
        pendingData = nil
        uploading = false
    }

    private func delete(_ photo: ProgressPhoto) async {
        do { try await store.deleteProgressPhoto(id: photo.id); await load() }
        catch { self.error = error.localizedDescription }
    }
}

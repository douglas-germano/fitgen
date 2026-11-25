import PhotosUI
import SwiftUI
import UIKit

/// New post: text, optional photo (camera or library, 4:5 or 9:16), audience (friends / club / public).
/// Presented as a sheet; `onPosted` runs after a successful publish.
struct PostComposerView: View {
    var initialAudience: Audience = .network
    var initialGroupId: String?
    var onPosted: ((CommunityActivity) -> Void)?

    @Environment(CommunityStore.self) private var community
    @Environment(\.dismiss) private var dismiss
    @State private var text = ""
    @State private var audience: Audience
    @State private var groupId: String?
    @State private var ratio: ImageRatio = .portrait
    @State private var source: UIImage?
    @State private var pickerItem: PhotosPickerItem?
    @State private var cameraOpen = false
    @State private var publishing = false
    @State private var error: String?
    @FocusState private var focused: Bool

    private let limit = 1000

    init(initialAudience: Audience = .network, initialGroupId: String? = nil, onPosted: ((CommunityActivity) -> Void)? = nil) {
        self.initialAudience = initialAudience
        self.initialGroupId = initialGroupId
        self.onPosted = onPosted
        _audience = State(initialValue: initialAudience)
        _groupId = State(initialValue: initialGroupId)
    }

    private var groups: [CommunityGroup] { (community.myGroupsCache.value ?? []).filter { !$0.premiumOnly || $0.isMember } }
    private var trimmed: String { text.trimmingCharacters(in: .whitespacesAndNewlines) }
    private var canPublish: Bool {
        !publishing && (!trimmed.isEmpty || source != nil) && (audience != .group || groupId != nil)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    textCard
                    photoCard
                    audienceCard
                    if let error {
                        Label(error, systemImage: "exclamationmark.triangle.fill")
                            .font(.footnote).foregroundStyle(Theme.calories)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
                .padding(.horizontal, Theme.gutter)
                .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.interactively)
            .screen()
            .navigationTitle("Nova publicação")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancelar") { dismiss() }.disabled(publishing) }
                ToolbarItem(placement: .confirmationAction) {
                    Button { publish() } label: {
                        if publishing { ProgressView() } else { Text("Publicar").fontWeight(.semibold) }
                    }
                    .disabled(!canPublish)
                }
            }
            .task {
                if community.myGroupsCache.value == nil { await community.loadMyGroups() }
                if audience == .group, groupId == nil { groupId = groups.first?.id }
            }
            .onChange(of: pickerItem) { _, item in
                guard let item else { return }
                Task {
                    if let data = try? await item.loadTransferable(type: Data.self), let image = UIImage(data: data) { source = image }
                    pickerItem = nil
                }
            }
            .onChange(of: audience) { _, value in
                if value == .group, groupId == nil { groupId = groups.first?.id }
            }
            .fullScreenCover(isPresented: $cameraOpen) {
                CameraPicker { data in
                    cameraOpen = false
                    if let data, let image = UIImage(data: data) { source = image }
                }
                .ignoresSafeArea()
            }
            .interactiveDismissDisabled(publishing || !trimmed.isEmpty || source != nil)
        }
    }

    // MARK: Sections

    private var textCard: some View {
        Card {
            TextField("Compartilhe um momento com sua turma", text: $text, axis: .vertical)
                .lineLimit(4...12)
                .focused($focused)
                .onChange(of: text) { _, value in if value.count > limit { text = String(value.prefix(limit)) } }
                .accessibilityLabel("Texto da publicação")
            HStack {
                Spacer()
                Text("\(text.count)/\(limit)").font(.caption).monospacedDigit()
                    .foregroundStyle(text.count > limit - 50 ? Theme.calories : Theme.secondary)
            }
        }
    }

    private var photoCard: some View {
        Card(title: "Foto") {
            if let source {
                FeedPhotoPreview(image: source, ratio: ratio)
                    .frame(maxWidth: ratio == .vertical ? 220 : .infinity)
                    .frame(maxWidth: .infinity)
                    .accessibilityLabel("Prévia da foto")
                Picker("Formato", selection: $ratio) {
                    ForEach(ImageRatio.allCases) { Text($0.label).tag($0) }
                }
                .pickerStyle(.segmented)
                Button(role: .destructive) { withAnimation(.snappy) { self.source = nil } } label: {
                    Label("Remover foto", systemImage: "trash").font(.subheadline.weight(.medium))
                }
            } else {
                HStack(spacing: 10) {
                    if CameraPicker.isAvailable {
                        Button { cameraOpen = true } label: { PickTile("camera.fill", "Câmera") }.buttonStyle(.plain)
                    }
                    PhotosPicker(selection: $pickerItem, matching: .images) { PickTile("photo.on.rectangle", "Galeria") }
                        .buttonStyle(.plain)
                }
            }
        }
    }

    private var audienceCard: some View {
        Card(title: "Quem pode ver") {
            ForEach(Audience.allCases) { option in
                Button { withAnimation(.snappy) { audience = option } } label: {
                    HStack(spacing: 12) {
                        Image(systemName: option.systemImage).frame(width: 28).foregroundStyle(Theme.voltText)
                        Text(option.label).foregroundStyle(.primary)
                        Spacer()
                        if audience == option { Image(systemName: "checkmark.circle.fill").foregroundStyle(Theme.voltText) }
                    }
                    .contentShape(Rectangle())
                    .padding(.vertical, 4)
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(audience == option ? .isSelected : [])
            }
            if audience == .group { groupPicker }
        }
    }

    @ViewBuilder
    private var groupPicker: some View {
        switch community.myGroupsCache {
        case .idle, .loading:
            ProgressView().frame(maxWidth: .infinity)
        case .failed(let message):
            Text(message).font(.footnote).foregroundStyle(Theme.calories)
        case .loaded:
            if groups.isEmpty {
                Text("Você ainda não participa de nenhum clube. Crie um ou entre com um código.")
                    .font(.footnote).foregroundStyle(Theme.secondary)
            } else {
                Picker("Clube", selection: Binding(get: { groupId ?? groups[0].id }, set: { groupId = $0 })) {
                    ForEach(groups) { Text($0.name).tag($0.id) }
                }
                .pickerStyle(.menu)
                .accessibilityLabel("Clube da publicação")
            }
        }
    }

    // MARK: Publish

    private func publish() {
        focused = false
        publishing = true
        error = nil
        let photo = source.flatMap { FeedPhoto.prepare($0, ratio: ratio) }
        Task {
            defer { publishing = false }
            do {
                let created = try await community.createPost(text: trimmed, audience: audience, groupId: audience == .group ? groupId : nil,
                                                             photo: photo, ratio: ratio)
                onPosted?(created)
                dismiss()
            } catch {
                self.error = error.localizedDescription
            }
        }
    }
}

// MARK: - Photo preparation

/// Centre-crop to the post ratio, 1080 px wide at most, JPEG 80% (same as the Expo app).
enum FeedPhoto {
    static func cropRect(size: CGSize, aspect: Double) -> CGRect {
        guard size.width > 0, size.height > 0 else { return .zero }
        if size.width / size.height > aspect {
            let w = (size.height * aspect).rounded()
            return CGRect(x: ((size.width - w) / 2).rounded(.down), y: 0, width: w, height: size.height)
        }
        let h = (size.width / aspect).rounded()
        return CGRect(x: 0, y: ((size.height - h) / 2).rounded(.down), width: size.width, height: h)
    }

    static func prepare(_ image: UIImage, ratio: ImageRatio) -> Data? {
        let normalized = UIGraphicsImageRenderer(size: image.size).image { _ in image.draw(at: .zero) }   // bakes in orientation
        let crop = cropRect(size: normalized.size, aspect: ratio.aspect)
        guard let cg = normalized.cgImage?.cropping(to: CGRect(x: crop.minX * normalized.scale, y: crop.minY * normalized.scale,
                                                              width: crop.width * normalized.scale, height: crop.height * normalized.scale)) else { return nil }
        let cropped = UIImage(cgImage: cg, scale: 1, orientation: .up)
        let width = min(1080, cropped.size.width)
        let size = CGSize(width: width, height: (width / ratio.aspect).rounded())
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        return UIGraphicsImageRenderer(size: size, format: format).image { _ in cropped.draw(in: CGRect(origin: .zero, size: size)) }
            .jpegData(compressionQuality: 0.8)
    }
}

private struct FeedPhotoPreview: View {
    let image: UIImage
    let ratio: ImageRatio

    var body: some View {
        Color.clear
            .aspectRatio(ratio.aspect, contentMode: .fit)
            .overlay { Image(uiImage: image).resizable().scaledToFill() }
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

private struct PickTile: View {
    let symbol: String
    let title: String
    init(_ symbol: String, _ title: String) { self.symbol = symbol; self.title = title }

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: symbol).font(.system(size: 22, weight: .semibold)).foregroundStyle(Theme.voltText)
            Text(title).font(.subheadline.weight(.medium)).foregroundStyle(.primary)
        }
        .frame(maxWidth: .infinity, minHeight: 76)
        .background(Theme.cardRaised.opacity(0.6), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .contentShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

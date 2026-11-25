import SwiftUI

/// Compact entry point shown in the Progress tab; the whole card opens `ProgressPhotosView`.
struct ProgressPhotosCard: View {
    @Environment(AppStore.self) private var store
    @State private var photos: [ProgressPhoto] = []

    init() {}

    private var latest: [ProgressPhoto] {
        Array(photos.sorted { $0.takenAt > $1.takenAt }.prefix(3))
    }

    var body: some View {
        NavigationLink {
            ProgressPhotosView()
        } label: {
            Card(title: "Fotos de progresso", showsChevron: true) {
                if photos.isEmpty {
                    HStack(spacing: 12) {
                        Image(systemName: "camera.fill")
                            .font(.title3)
                            .foregroundStyle(Theme.voltText)
                            .frame(width: 44, height: 44)
                            .background(Theme.cardRaised, in: Circle())
                        Text("Registre sua evolução com fotos privadas")
                            .font(.subheadline).foregroundStyle(Theme.secondary)
                            .multilineTextAlignment(.leading)
                    }
                } else {
                    HStack(spacing: 8) {
                        ForEach(latest) { photo in
                            PhotoThumb(photo: photo)
                        }
                        ForEach(0..<(3 - latest.count), id: \.self) { _ in
                            Color.clear.aspectRatio(3 / 4, contentMode: .fit)
                        }
                    }
                    Text(summary).font(.footnote).foregroundStyle(Theme.secondary)
                }
            }
        }
        .buttonStyle(.plain)
        .task { await load() }
    }

    private var summary: String {
        let count = photos.count
        let noun = count == 1 ? "foto" : "fotos"
        let last = latest.first?.date.map(Format.dayMonth) ?? ""
        return last.isEmpty ? "\(count) \(noun)" : "\(count) \(noun) · Última: \(last)"
    }

    private func load() async {
        if let list = try? await store.progressPhotos() { photos = list }
    }
}

/// Rounded 3:4 thumbnail for a private (signed URL) photo.
struct PhotoThumb: View {
    let photo: ProgressPhoto

    var body: some View {
        Theme.cardRaised
            .aspectRatio(3 / 4, contentMode: .fit)
            .overlay {
                AsyncImage(url: photo.imageURL) { phase in
                    switch phase {
                    case .success(let image): image.resizable().scaledToFill()
                    case .failure: Image(systemName: "photo").foregroundStyle(Theme.secondary)
                    default: ProgressView()
                    }
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

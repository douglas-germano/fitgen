import SwiftUI

/// Full-screen pager over a pose's photos.
struct PhotoViewer: View {
    let photos: [ProgressPhoto]
    @State var selection: String
    let onDelete: (ProgressPhoto) async -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var confirm = false

    init(photos: [ProgressPhoto], start: ProgressPhoto, onDelete: @escaping (ProgressPhoto) async -> Void) {
        self.photos = photos
        self._selection = State(initialValue: start.id)
        self.onDelete = onDelete
    }

    private var current: ProgressPhoto? { photos.first { $0.id == selection } }

    var body: some View {
        NavigationStack {
            TabView(selection: $selection) {
                ForEach(photos) { photo in
                    AsyncImage(url: photo.imageURL) { phase in
                        switch phase {
                        case .success(let image): image.resizable().scaledToFit()
                        case .failure: Image(systemName: "photo").font(.largeTitle).foregroundStyle(Theme.secondary)
                        default: ProgressView()
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .tag(photo.id)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .background(Theme.background)
            .navigationTitle(current?.date.map { $0.formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "pt_BR"))) } ?? "Foto")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { dismiss() } label: { Image(systemName: "xmark") }
                        .accessibilityLabel("Fechar")
                }
                ToolbarItem(placement: .bottomBar) {
                    Button("Excluir", role: .destructive) { confirm = true }
                }
            }
            .confirmationDialog("Excluir esta foto?", isPresented: $confirm, titleVisibility: .visible) {
                Button("Excluir", role: .destructive) {
                    if let photo = current { Task { await onDelete(photo); dismiss() } }
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}

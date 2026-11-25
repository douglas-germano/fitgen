import SwiftUI
import UIKit

/// New club: photo, name, description and visibility. After creating, the screen becomes the club itself.
struct CreateGroupView: View {
    @Environment(CommunityStore.self) private var community
    @State private var name = ""
    @State private var about = ""
    @State private var isPublic = false
    @State private var photo: Data?
    @State private var creating = false
    @State private var created: CommunityGroup?
    @State private var alert: String?

    private var trimmed: String { name.trimmingCharacters(in: .whitespacesAndNewlines) }

    var body: some View {
        if let created {
            GroupDetailView(groupId: created.id)
        } else {
            ScrollView {
                VStack(spacing: 18) {
                    ClubPhotoControl(preview: photo.flatMap(UIImage.init(data:)), onPick: { photo = $0 },
                                     onRemove: { photo = nil })
                        .padding(.top, 8)
                    SocialField(title: "Nome do clube", text: $name, prompt: "Ex.: Turma da manhã", limit: 60)
                    SocialField(title: "Descrição (opcional)", text: $about, prompt: "Conte do que se trata o clube", axis: .vertical, limit: 280)
                    ClubVisibilityPicker(isPublic: $isPublic)
                    Button { Task { await create() } } label: {
                        if creating { ProgressView() } else { Text("Criar clube") }
                    }
                    .buttonStyle(.fitgenPrimary)
                    .disabled(trimmed.isEmpty || creating)
                    .padding(.top, 4)
                }
                .padding(.horizontal, Theme.gutter)
                .padding(.bottom, 32)
            }
            .scrollDismissesKeyboard(.interactively)
            .screen()
            .navigationTitle("Criar clube")
            .navigationBarTitleDisplayMode(.inline)
            .socialAlert("Não foi possível criar", message: $alert)
        }
    }

    private func create() async {
        creating = true
        defer { creating = false }
        do {
            let description = about.trimmingCharacters(in: .whitespacesAndNewlines)
            created = try await community.createGroup(name: trimmed, description: description.isEmpty ? nil : description,
                                                      isPublic: isPublic, photo: photo)
        } catch { alert = error.localizedDescription }
    }
}

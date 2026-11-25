import PhotosUI
import SwiftUI
import UIKit

// Small building blocks shared by the clubs and people screens.

extension View {
    /// Simple "OK" alert driven by an optional message.
    func socialAlert(_ title: String, message: Binding<String?>) -> some View {
        alert(title, isPresented: Binding(get: { message.wrappedValue != nil }, set: { if !$0 { message.wrappedValue = nil } })) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(message.wrappedValue ?? "")
        }
    }
}

/// Section title + rounded card whose rows are separated by dividers.
struct SocialRows<Content: View>: View {
    var title: String?
    var footer: String?
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let title {
                Text(title).font(.footnote.weight(.semibold)).foregroundStyle(Theme.secondary)
                    .textCase(.uppercase).padding(.leading, 6).accessibilityAddTraits(.isHeader)
            }
            VStack(spacing: 0) {
                Group(subviews: content) { subviews in
                    ForEach(subviews.indices, id: \.self) { index in
                        subviews[index]
                        if index < subviews.count - 1 { Divider().padding(.leading, 16) }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
            if let footer {
                Text(footer).font(.footnote).foregroundStyle(Theme.secondary).padding(.horizontal, 6)
            }
        }
    }
}

/// Small capsule button for rows (filled = volt gradient).
struct SocialPillStyle: ButtonStyle {
    var filled = false
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(filled ? Color.black : Color.primary)
            .padding(.horizontal, 14)
            .frame(minHeight: 32)
            .background { if filled { Capsule().fill(Theme.voltGradient) } else { Capsule().fill(Theme.cardRaised) } }
            .opacity(isEnabled ? (configuration.isPressed ? 0.8 : 1) : 0.45)
            .contentShape(Capsule())
    }
}

/// Club photo (circle) or a placeholder icon.
struct ClubAvatar: View {
    let groupId: String
    var hasPhoto: Bool
    var size: CGFloat = 44
    @Environment(CommunityStore.self) private var community

    var body: some View {
        Group {
            if hasPhoto {
                CommunityImage(path: "/community/groups/\(groupId)/image", aspect: 1)
                    .id(community.groupsVersion)
            } else {
                Image(systemName: "person.3.fill")
                    .font(.system(size: size * 0.4, weight: .semibold))
                    .foregroundStyle(.black)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Theme.voltGradient)
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .accessibilityHidden(true)
    }
}

/// A person row: avatar + name + caption open the profile; `trailing` holds the actions.
struct SocialPersonRow<Trailing: View>: View {
    let user: CommunityUser
    var caption: String?
    @ViewBuilder var trailing: Trailing

    var body: some View {
        HStack(spacing: 10) {
            NavigationLink(value: CommunityRoute.user(user.id)) {
                HStack(spacing: 12) {
                    Avatar(name: user.name, url: user.profilePicture, size: 44)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(user.name).font(.body.weight(.semibold)).foregroundStyle(.primary).lineLimit(1)
                        if let caption { Text(caption).font(.footnote).foregroundStyle(Theme.secondary).lineLimit(1) }
                    }
                    Spacer(minLength: 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            trailing
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
    }
}

/// A plain row that is a whole link.
struct SocialLinkRow<Label: View>: View {
    let route: CommunityRoute
    @ViewBuilder var label: Label

    var body: some View {
        NavigationLink(value: route) {
            HStack(spacing: 12) {
                label
                Spacer(minLength: 0)
                Image(systemName: "chevron.right").font(.system(size: 13, weight: .bold)).foregroundStyle(Theme.secondary)
            }
            .padding(.horizontal, 16).padding(.vertical, 12)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

/// Club photo with gallery / camera / remove actions. `preview` is a locally picked image (create flow).
struct ClubPhotoControl: View {
    var preview: UIImage?
    var groupId: String?
    var hasPhoto = false
    var busy = false
    var onPick: (Data) -> Void
    var onRemove: (() -> Void)?

    @State private var item: PhotosPickerItem?
    @State private var cameraOpen = false

    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                if let preview {
                    Image(uiImage: preview).resizable().scaledToFill()
                        .frame(width: 96, height: 96).clipShape(Circle())
                } else if let groupId {
                    ClubAvatar(groupId: groupId, hasPhoto: hasPhoto, size: 96)
                } else {
                    ClubAvatar(groupId: "", hasPhoto: false, size: 96)
                }
                if busy { ProgressView().frame(width: 96, height: 96).background(.black.opacity(0.35), in: Circle()) }
            }
            HStack(spacing: 8) {
                PhotosPicker(selection: $item, matching: .images) {
                    Label("Galeria", systemImage: "photo.on.rectangle")
                }
                .buttonStyle(SocialPillStyle())
                if CameraPicker.isAvailable {
                    Button { cameraOpen = true } label: { Label("Câmera", systemImage: "camera") }
                        .buttonStyle(SocialPillStyle())
                }
                if let onRemove, preview != nil || hasPhoto {
                    Button(role: .destructive, action: onRemove) { Label("Remover", systemImage: "trash") }
                        .buttonStyle(SocialPillStyle())
                }
            }
            .disabled(busy)
        }
        .frame(maxWidth: .infinity)
        .onChange(of: item) { _, newItem in
            guard let newItem else { return }
            Task {
                if let data = try? await newItem.loadTransferable(type: Data.self), let image = UIImage(data: data),
                   let jpeg = CameraPicker.Coordinator.resized(image) {
                    onPick(jpeg)
                }
                item = nil
            }
        }
        .fullScreenCover(isPresented: $cameraOpen) {
            CameraPicker { data in
                cameraOpen = false
                if let data { onPick(data) }
            }
            .ignoresSafeArea()
        }
    }
}

/// Public / private choice for a club.
struct ClubVisibilityPicker: View {
    @Binding var isPublic: Bool

    var body: some View {
        VStack(spacing: 8) {
            option(title: "Privado", caption: "Só entra quem tem o código de convite.", icon: "lock.fill", selected: !isPublic) { isPublic = false }
            option(title: "Público", caption: "Aparece na lista de clubes e qualquer pessoa pode entrar.", icon: "globe", selected: isPublic) { isPublic = true }
        }
    }

    private func option(title: String, caption: String, icon: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon).foregroundStyle(Theme.voltText).frame(width: 28)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.body.weight(.semibold)).foregroundStyle(.primary)
                    Text(caption).font(.footnote).foregroundStyle(Theme.secondary).multilineTextAlignment(.leading)
                }
                Spacer(minLength: 0)
                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(selected ? Theme.voltText : Theme.secondary)
            }
            .padding(14)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(selected ? Theme.volt : .clear, lineWidth: 1.5)
            }
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}

/// Rounded text field used by the forms.
struct SocialField: View {
    let title: String
    @Binding var text: String
    var prompt: String = ""
    var axis: Axis = .horizontal
    var limit: Int = 100

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.footnote.weight(.semibold)).foregroundStyle(Theme.secondary).padding(.leading, 6)
            TextField(prompt, text: $text, axis: axis)
                .lineLimit(axis == .vertical ? 3...6 : 1...1)
                .padding(14)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .onChange(of: text) { _, value in if value.count > limit { text = String(value.prefix(limit)) } }
        }
    }
}

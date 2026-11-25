import SwiftUI

/// "Antes" (left) and "Agora" (right) overlaid in one 3:4 frame with a draggable divider.
struct PhotoComparisonSlider: View {
    let before: ProgressPhoto
    let now: ProgressPhoto
    @State private var split: CGFloat = 0.5

    var body: some View {
        Theme.cardRaised
            .aspectRatio(3 / 4, contentMode: .fit)
            .overlay {
                GeometryReader { geo in
                    let w = geo.size.width
                    let x = w * split
                    ZStack(alignment: .leading) {
                        image(now).frame(width: w, height: geo.size.height)
                        image(before).frame(width: w, height: geo.size.height)
                            .mask(alignment: .leading) { Rectangle().frame(width: x) }

                        Rectangle().fill(.white).frame(width: 2, height: geo.size.height).offset(x: x - 1)
                        Image(systemName: "arrow.left.and.right")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.black)
                            .frame(width: 36, height: 36)
                            .background(.white, in: Circle())
                            .shadow(radius: 4)
                            .offset(x: x - 18)

                        VStack {
                            Spacer()
                            HStack {
                                label("Antes", date: before)
                                Spacer()
                                label("Agora", date: now)
                            }
                            .padding(10)
                        }
                    }
                    .contentShape(Rectangle())
                    .gesture(DragGesture(minimumDistance: 0).onChanged { value in
                        split = min(1, max(0, value.location.x / max(w, 1)))
                    })
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("Comparação antes e agora")
            .accessibilityAdjustableAction { direction in
                switch direction {
                case .increment: split = min(1, split + 0.1)
                case .decrement: split = max(0, split - 0.1)
                @unknown default: break
                }
            }
    }

    private func image(_ photo: ProgressPhoto) -> some View {
        AsyncImage(url: photo.imageURL) { phase in
            switch phase {
            case .success(let image): image.resizable().scaledToFill()
            case .failure: Image(systemName: "photo").foregroundStyle(Theme.secondary)
            default: ProgressView()
            }
        }
        .clipped()
    }

    private func label(_ title: String, date: ProgressPhoto) -> some View {
        Text("\(title) · \(date.date.map(Format.dayMonth) ?? "")")
            .font(.caption2.weight(.semibold))
            .foregroundStyle(.white)
            .padding(.horizontal, 8).padding(.vertical, 4)
            .background(.black.opacity(0.55), in: Capsule())
    }
}

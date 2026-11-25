import ImageIO
import SwiftUI
import UIKit

/// Downloads and decodes exercise GIFs once; frames stay in memory for the session.
actor GIFCache {
    static let shared = GIFCache()
    private var images: [URL: UIImage] = [:]
    private var tasks: [URL: Task<UIImage?, Never>] = [:]

    func image(for url: URL) async -> UIImage? {
        if let image = images[url] { return image }
        if let task = tasks[url] { return await task.value }
        let task = Task<UIImage?, Never> {
            guard let (data, _) = try? await URLSession.shared.data(from: url) else { return nil }
            return Self.decode(data)
        }
        tasks[url] = task
        let image = await task.value
        tasks[url] = nil
        if let image { images[url] = image }
        return image
    }

    /// Builds an animated UIImage from the GIF's frames and their delays.
    private static func decode(_ data: Data) -> UIImage? {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { return UIImage(data: data) }
        let count = CGImageSourceGetCount(source)
        guard count > 1 else { return UIImage(data: data) }
        var frames: [UIImage] = []
        var duration: Double = 0
        let options = [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceThumbnailMaxPixelSize: 480,
                       kCGImageSourceCreateThumbnailWithTransform: true] as CFDictionary
        for index in 0..<count {
            guard let cg = CGImageSourceCreateThumbnailAtIndex(source, index, options) else { continue }
            let props = CGImageSourceCopyPropertiesAtIndex(source, index, nil) as? [CFString: Any]
            let gif = props?[kCGImagePropertyGIFDictionary] as? [CFString: Any]
            let delay = (gif?[kCGImagePropertyGIFUnclampedDelayTime] as? Double) ?? (gif?[kCGImagePropertyGIFDelayTime] as? Double) ?? 0.1
            duration += delay < 0.02 ? 0.1 : delay
            frames.append(UIImage(cgImage: cg))
        }
        return UIImage.animatedImage(with: frames, duration: duration)
    }
}

private struct AnimatedImageView: UIViewRepresentable {
    let image: UIImage
    let animating: Bool

    func makeUIView(context: Context) -> UIImageView {
        let view = UIImageView()
        view.contentMode = .scaleAspectFit
        view.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        view.setContentCompressionResistancePriority(.defaultLow, for: .vertical)
        return view
    }

    func updateUIView(_ view: UIImageView, context: Context) {
        if animating {
            if view.image !== image { view.image = image }
            if !view.isAnimating { view.startAnimating() }
        } else {
            // Still frame: the first frame of the GIF.
            view.image = image.images?.first ?? image
        }
    }
}

/// The exercise's animation on a white tile (the GIFs have white backgrounds), or a dumbbell.
struct ExerciseAnimation: View {
    let url: String?
    var size: CGFloat? = 56
    var animating = true
    var cornerRadius: CGFloat = 12
    @State private var image: UIImage?
    @State private var failed = false

    var body: some View {
        ZStack {
            if let image {
                Color.white
                AnimatedImageView(image: image, animating: animating).padding(4)
            } else {
                Theme.cardRaised
                if failed || url == nil {
                    Image(systemName: "dumbbell.fill").foregroundStyle(Theme.secondary)
                } else {
                    ProgressView().controlSize(.small)
                }
            }
        }
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .task(id: url) {
            guard let url = url.flatMap(URL.init(string:)) else { return }
            image = await GIFCache.shared.image(for: url)
            failed = image == nil
        }
        .accessibilityHidden(true)
    }
}

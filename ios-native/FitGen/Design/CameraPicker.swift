import SwiftUI
import UIKit

/// The system camera, returning the photo as JPEG data (or nil when cancelled).
struct CameraPicker: UIViewControllerRepresentable {
    let onFinish: (Data?) -> Void

    static var isAvailable: Bool { UIImagePickerController.isSourceTypeAvailable(.camera) }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .camera
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ controller: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(onFinish: onFinish) }

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let onFinish: (Data?) -> Void
        init(onFinish: @escaping (Data?) -> Void) { self.onFinish = onFinish }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            let image = info[.originalImage] as? UIImage
            onFinish(image.flatMap(Self.resized))
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { onFinish(nil) }

        /// Long side at most 1280 px, JPEG 80%: plenty for the meal estimate, small upload.
        static func resized(_ image: UIImage) -> Data? {
            let scale = min(1, 1280 / max(image.size.width, image.size.height))
            let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
            return UIGraphicsImageRenderer(size: size).image { _ in image.draw(in: CGRect(origin: .zero, size: size)) }
                .jpegData(compressionQuality: 0.8)
        }
    }
}

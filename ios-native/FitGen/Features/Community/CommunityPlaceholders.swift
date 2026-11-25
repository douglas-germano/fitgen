import SwiftUI

// Placeholders for screens other developers are building. Keep the `init` signatures; they are
// referenced by `CommunityRoute` (see CommunityView.swift) and by the feed.

/// Shared empty look for the placeholders.
struct CommunityPlaceholder: View {
    let title: String
    let systemImage: String
    var detail: String = "Em construção."

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: systemImage).font(.system(size: 40)).foregroundStyle(Theme.voltText)
            Text(title).font(.cardTitle)
            Text(detail).font(.subheadline).foregroundStyle(Theme.secondary).multilineTextAlignment(.center)
        }
        .padding(32)
        .screen()
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
    }
}



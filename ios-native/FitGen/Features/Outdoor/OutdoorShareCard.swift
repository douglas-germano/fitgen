import SwiftUI
import CoreLocation

/// The image people share: brand, route outline and the key numbers. Rendered with ImageRenderer,
/// so it draws the route itself instead of using a MapKit view.
struct OutdoorShareCard: View {
    let record: OutdoorRecord

    var body: some View {
        let kind = record.kind
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 10) {
                Image("LogoMark").resizable().scaledToFit().frame(width: 34, height: 34)
                Text("FitGen").font(.system(size: 22, weight: .heavy, design: .rounded)).foregroundStyle(.white)
                Spacer()
                Label(kind.title, systemImage: kind.icon)
                    .font(.system(size: 15, weight: .semibold, design: .rounded)).foregroundStyle(kind.color)
            }

            RouteOutline(segments: record.segments, color: kind.color)
                .frame(maxWidth: .infinity)
                .frame(height: 230)
                .padding(.vertical, 16)

            MetricValue(value: record.distanceText, unit: "km", color: kind.color, size: 64)
            Text(record.date.map { $0.formatted(.dateTime.day().month(.wide).year().locale(Locale(identifier: "pt_BR"))) } ?? "")
                .font(.system(size: 15, design: .rounded)).foregroundStyle(Theme.secondary)

            HStack(spacing: 0) {
                item("Tempo", record.durationText)
                item(kind.usesSpeed ? "Velocidade" : "Ritmo", kind.usesSpeed ? record.speedText + " km/h" : record.paceText + " /km")
                if let kcal = record.calories { item("Calorias", Format.int(kcal) + " kcal") }
            }
            .padding(.top, 18)
        }
        .padding(24)
        .frame(width: 360, height: 450)
        .background(LinearGradient(colors: [Color(red: 0.07, green: 0.09, blue: 0.04), .black], startPoint: .top, endPoint: .bottom))
        .environment(\.colorScheme, .dark)
    }

    private func item(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title.uppercased()).font(.system(size: 11, weight: .semibold, design: .rounded)).foregroundStyle(Theme.secondary)
            Text(value).font(.system(size: 18, weight: .semibold, design: .rounded)).foregroundStyle(.white)
                .lineLimit(1).minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// A route scaled to fit its frame (equirectangular, corrected for latitude).
struct RouteOutline: View {
    let segments: [[CLLocationCoordinate2D]]
    var color: Color

    var body: some View {
        Canvas { context, size in
            let all = segments.flatMap { $0 }
            guard let first = all.first else { return }
            var minLat = first.latitude, maxLat = first.latitude, minLon = first.longitude, maxLon = first.longitude
            for p in all {
                minLat = min(minLat, p.latitude); maxLat = max(maxLat, p.latitude)
                minLon = min(minLon, p.longitude); maxLon = max(maxLon, p.longitude)
            }
            let lonScale = cos((minLat + maxLat) / 2 * .pi / 180)
            let width = max((maxLon - minLon) * lonScale, 1e-6), height = max(maxLat - minLat, 1e-6)
            let scale = min((size.width - 20) / width, (size.height - 20) / height)
            let offsetX = (size.width - width * scale) / 2, offsetY = (size.height - height * scale) / 2
            func point(_ c: CLLocationCoordinate2D) -> CGPoint {
                CGPoint(x: offsetX + (c.longitude - minLon) * lonScale * scale, y: offsetY + (maxLat - c.latitude) * scale)
            }
            for segment in segments where segment.count > 1 {
                var path = Path()
                path.move(to: point(segment[0]))
                segment.dropFirst().forEach { path.addLine(to: point($0)) }
                context.stroke(path, with: .color(color.opacity(0.25)), style: StrokeStyle(lineWidth: 14, lineCap: .round, lineJoin: .round))
                context.stroke(path, with: .color(color), style: StrokeStyle(lineWidth: 5, lineCap: .round, lineJoin: .round))
            }
            let start = point(first), end = point(all[all.count - 1])
            context.fill(Path(ellipseIn: CGRect(x: start.x - 6, y: start.y - 6, width: 12, height: 12)), with: .color(.white))
            context.fill(Path(ellipseIn: CGRect(x: end.x - 7, y: end.y - 7, width: 14, height: 14)), with: .color(color))
        }
    }
}

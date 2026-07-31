import AppKit
import Foundation

struct RenderJob: Codable {
    let path: String
    let width: Int
    let height: Int
    let title: String
    let body: String
    let badge: String
    let cta: String
}

guard CommandLine.arguments.count == 2 else {
    fputs("Usage: render_rtl.swift <jobs.json>\n", stderr)
    exit(2)
}

let jobsURL = URL(fileURLWithPath: CommandLine.arguments[1])
let jobs = try JSONDecoder().decode([RenderJob].self, from: Data(contentsOf: jobsURL))

func color(_ red: CGFloat, _ green: CGFloat, _ blue: CGFloat) -> NSColor {
    NSColor(srgbRed: red / 255, green: green / 255, blue: blue / 255, alpha: 1)
}

func font(size: CGFloat, weight: NSFont.Weight) -> NSFont {
    if let arabic = NSFont(name: "SF Arabic", size: size) {
        return arabic
    }
    return NSFont.systemFont(ofSize: size, weight: weight)
}

func topRect(width: CGFloat, height: CGFloat, top: CGFloat, rectWidth: CGFloat, rectHeight: CGFloat) -> NSRect {
    NSRect(
        x: (width - rectWidth) / 2,
        y: height - top - rectHeight,
        width: rectWidth,
        height: rectHeight
    )
}

func drawCentered(
    _ text: String,
    in rect: NSRect,
    size: CGFloat,
    weight: NSFont.Weight,
    textColor: NSColor,
    lineHeight: CGFloat
) {
    let paragraph = NSMutableParagraphStyle()
    paragraph.alignment = .center
    paragraph.baseWritingDirection = .rightToLeft
    paragraph.lineBreakMode = .byWordWrapping
    paragraph.minimumLineHeight = lineHeight
    paragraph.maximumLineHeight = lineHeight
    let attributes: [NSAttributedString.Key: Any] = [
        .font: font(size: size, weight: weight),
        .foregroundColor: textColor,
        .paragraphStyle: paragraph,
    ]
    NSAttributedString(string: text, attributes: attributes).draw(
        with: rect,
        options: [.usesLineFragmentOrigin, .usesFontLeading, .truncatesLastVisibleLine]
    )
}

for job in jobs {
    guard let source = NSImage(contentsOfFile: job.path) else {
        throw NSError(domain: "AlmostASO", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not open \(job.path)"])
    }

    let width = CGFloat(job.width)
    let height = CGFloat(job.height)
    guard let bitmap = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: job.width,
        pixelsHigh: job.height,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else {
        throw NSError(domain: "AlmostASO", code: 2, userInfo: [NSLocalizedDescriptionKey: "Could not create bitmap"])
    }

    guard let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
        throw NSError(domain: "AlmostASO", code: 3, userInfo: [NSLocalizedDescriptionKey: "Could not create graphics context"])
    }

    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = context
    context.imageInterpolation = .high
    source.draw(
        in: NSRect(x: 0, y: 0, width: width, height: height),
        from: NSRect(origin: .zero, size: source.size),
        operation: .copy,
        fraction: 1
    )

    drawCentered(
        "\(job.badge)  ·  7.0.1",
        in: topRect(width: width, height: height, top: height * 0.052, rectWidth: width * 0.78, rectHeight: height * 0.06),
        size: max(18, width * 0.021),
        weight: .semibold,
        textColor: color(80, 62, 145),
        lineHeight: max(22, width * 0.027)
    )
    drawCentered(
        job.title,
        in: topRect(width: width, height: height, top: height * 0.145, rectWidth: width * 0.82, rectHeight: height * 0.145),
        size: max(44, width * 0.064),
        weight: .bold,
        textColor: color(31, 28, 52),
        lineHeight: max(54, width * 0.076)
    )
    drawCentered(
        job.body,
        in: topRect(width: width, height: height, top: height * 0.718, rectWidth: width * 0.67, rectHeight: height * 0.115),
        size: max(25, width * 0.029),
        weight: .regular,
        textColor: color(83, 80, 101),
        lineHeight: max(34, width * 0.041)
    )
    drawCentered(
        job.cta,
        in: topRect(width: width, height: height, top: height * 0.848, rectWidth: width * 0.42, rectHeight: height * 0.052),
        size: max(22, width * 0.027),
        weight: .semibold,
        textColor: .white,
        lineHeight: max(28, width * 0.034)
    )

    context.flushGraphics()
    NSGraphicsContext.restoreGraphicsState()

    guard let jpeg = bitmap.representation(using: .jpeg, properties: [.compressionFactor: 0.88]) else {
        throw NSError(domain: "AlmostASO", code: 4, userInfo: [NSLocalizedDescriptionKey: "Could not encode JPEG"])
    }
    try jpeg.write(to: URL(fileURLWithPath: job.path), options: .atomic)
}

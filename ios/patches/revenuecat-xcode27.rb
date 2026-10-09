# Backport the constructor move from RevenueCat 5.78.0 (upstream PR #6949).
# Defining it inside the struct suppresses Swift 6.4's conflicting synthesized init.
module AlmostRevenueCatXcode27
  def self.apply(path)
    return unless File.exist?(path)

    source = File.read(path)
    marker = '    // Almost: RevenueCat Xcode 27 constructor compatibility'
    return if source.include?(marker)

    constructor = <<~SWIFT.lines.map { |line| line.strip.empty? ? line : "    #{line}" }.join
      /// "Designated" initializer
      private init(stringRepresentation: String, underlyingColor: (any Sendable)?) {
          self.stringRepresentation = stringRepresentation
          self._underlyingColor = underlyingColor
      }
    SWIFT
    anchor = "    fileprivate var _underlyingColor: (any Sendable)?\n"
    unless source.scan(constructor).length == 1 && source.scan(anchor).length == 1
      raise 'RevenueCat PaywallColor changed; review the Xcode 27 compatibility patch before installing pods'
    end

    # Newer SDKs already place this initializer in the base struct.
    return if source.index(constructor) < source.index('// MARK: - Public constructors')

    patched = source.sub(constructor, '').sub(anchor, "#{anchor}\n#{marker}\n#{constructor}")
    File.chmod(File.stat(path).mode | 0200, path)
    File.write(path, patched)
  end
end

# Simulator-only framework copies. Device archives keep Google's original binaries.
module AlmostMLKitSimulator
  def self.apply(installer)
    installer.aggregate_targets.each do |aggregate|
      aggregate.xcconfigs.each_key do |configuration|
        path = aggregate.xcconfig_path(configuration)
        source = File.read(path)
        source = source.gsub('$(ALMOST_MLKIT_SIMULATOR_FRAMEWORKS) ', '')
        source = source.gsub(/^ALMOST_MLKIT_SIMULATOR_FRAMEWORKS\[sdk=iphonesimulator\*\].*\n?/, '')
        source = source.gsub(/^EXCLUDED_ARCHS\[sdk=iphonesimulator\*\] = (.*)$/) do
          "EXCLUDED_ARCHS[sdk=iphonesimulator*] = #{Regexp.last_match(1).split.reject { |arch| arch == 'arm64' }.join(' ')}"
        end
        source = source.sub(/^FRAMEWORK_SEARCH_PATHS = /, 'FRAMEWORK_SEARCH_PATHS = $(ALMOST_MLKIT_SIMULATOR_FRAMEWORKS) ')
        source += "\nALMOST_MLKIT_SIMULATOR_FRAMEWORKS[sdk=iphonesimulator*] = \"$(PODS_CONFIGURATION_BUILD_DIR)/AlmostMLKitSimulator\"\n"
        File.write(path, source)
      end
      target = installer.pods_project.targets.find { |item| item.name == aggregate.label }
      next unless target

      phase_name = '[Almost] Prepare ML Kit simulator copies'
      phase = target.shell_script_build_phases.find { |item| item.name == phase_name }
      phase ||= target.new_shell_script_build_phase(phase_name)
      phase.shell_script = <<~SH
        set -eu
        if [ "$PLATFORM_NAME" = "iphonesimulator" ]; then
          /usr/bin/python3 "$PODS_ROOT/../patches/mlkit-simulator.py" \\
            --pods-root "$PODS_ROOT" \\
            --output "$PODS_CONFIGURATION_BUILD_DIR/AlmostMLKitSimulator"
        fi
      SH
      phase.always_out_of_date = '1'
    end
    installer.pods_project.save
  end
end

/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.tasks

import com.facebook.react.utils.Os.cliPath
import com.facebook.react.utils.detectOSAwareHermesCommand
import com.facebook.react.utils.moveTo
import com.facebook.react.utils.windowsAwareCommandLine
import java.io.File
import java.io.FileInputStream
import org.gradle.api.DefaultTask
import org.gradle.api.file.ConfigurableFileTree
import org.gradle.api.file.DirectoryProperty
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.*

abstract class BundleHermesCTask : DefaultTask() {

  init {
    group = "react"
  }

  @get:Internal abstract val root: DirectoryProperty

  @get:InputFiles
  val sources: ConfigurableFileTree =
      project.fileTree(root) {
        it.include("**/*.js")
        it.include("**/*.jsx")
        it.include("**/*.ts")
        it.include("**/*.tsx")
        it.exclude("**/android/**/*")
        it.exclude("**/ios/**/*")
        it.exclude("**/build/**/*")
        it.exclude("**/node_modules/**/*")
      }

  @get:Input abstract val nodeExecutableAndArgs: ListProperty<String>

  @get:InputFile abstract val cliFile: RegularFileProperty

  @get:Internal abstract val reactNativeDir: DirectoryProperty

  @get:Input abstract val bundleCommand: Property<String>

  @get:InputFile abstract val entryFile: RegularFileProperty

  @get:InputFile @get:Optional abstract val bundleConfig: RegularFileProperty

  @get:Input abstract val bundleAssetName: Property<String>

  @get:Input abstract val minifyEnabled: Property<Boolean>

  @get:Input abstract val hermesEnabled: Property<Boolean>

  @get:Input abstract val devEnabled: Property<Boolean>

  @get:Input abstract val extraPackagerArgs: ListProperty<String>

  @get:Input abstract val hermesCommand: Property<String>

  @get:Input abstract val hermesFlags: ListProperty<String>

  @get:OutputDirectory abstract val jsBundleDir: DirectoryProperty

  @get:OutputDirectory abstract val resourcesDir: DirectoryProperty

  @get:OutputDirectory abstract val jsIntermediateSourceMapsDir: RegularFileProperty

  @get:OutputDirectory abstract val jsSourceMapsDir: DirectoryProperty

  @TaskAction
  fun run() {
    jsBundleDir.get().asFile.mkdirs()
    resourcesDir.get().asFile.mkdirs()
    jsIntermediateSourceMapsDir.get().asFile.mkdirs()
    jsSourceMapsDir.get().asFile.mkdirs()
    val bundleAssetFilename = bundleAssetName.get()

    val bundleFile = File(jsBundleDir.get().asFile, bundleAssetFilename)
    val packagerSourceMap = resolvePackagerSourceMapFile(bundleAssetFilename)
    val outputSourceMap = resolveOutputSourceMap(bundleAssetFilename)

    val bundleCommand = getBundleCommand(bundleFile, packagerSourceMap)
    logger.lifecycle(
        "[react-native-gradle-plugin] Bundling JS: ${bundleFile.absolutePath} (cwd=${root.get().asFile})")
    runCommand(bundleCommand)
    logger.lifecycle(
        "[react-native-gradle-plugin] Bundle finished. exists=${bundleFile.exists()} size=${bundleFile.length()}")

    val isHermesEnabled = hermesEnabled.get()
    if (isHermesEnabled && bundleFile.isHermesBytecodeBundle()) {
      logger.lifecycle(
          "[react-native-gradle-plugin] ${bundleFile.name} already contains Hermes bytecode, skipping hermesc.")
      copyPackagerMapIfNeeded(packagerSourceMap, outputSourceMap)
      return
    }

    if (isHermesEnabled) {
      val detectedHermesCommand = detectOSAwareHermesCommand(root.get().asFile, hermesCommand.get())
      val bytecodeFile = File("${bundleFile}.hbc")
      val compilerSourceMap = resolveCompilerSourceMap(bundleAssetFilename)

      val hermesCommand = getHermescCommand(detectedHermesCommand, bytecodeFile, bundleFile)
      runCommand(hermesCommand)
      bytecodeFile.moveTo(bundleFile)

      if (hermesFlags.get().contains("-output-source-map")) {
        val hermesTempSourceMapFile = File("$bytecodeFile.map")
        hermesTempSourceMapFile.moveTo(compilerSourceMap)

        val reactNativeDir = reactNativeDir.get().asFile
        val composeScriptFile = File(reactNativeDir, "scripts/compose-source-maps.js")
        val composeSourceMapsCommand =
            getComposeSourceMapsCommand(
                composeScriptFile, packagerSourceMap, compilerSourceMap, outputSourceMap)
        runCommand(composeSourceMapsCommand)
      }
    }
  }

  internal fun resolvePackagerSourceMapFile(bundleAssetName: String) =
      if (hermesEnabled.get()) {
        File(jsIntermediateSourceMapsDir.get().asFile, "$bundleAssetName.packager.map")
      } else {
        resolveOutputSourceMap(bundleAssetName)
      }

  internal fun resolveOutputSourceMap(bundleAssetName: String) =
      File(jsSourceMapsDir.get().asFile, "$bundleAssetName.map")

  internal fun resolveCompilerSourceMap(bundleAssetName: String) =
      File(jsIntermediateSourceMapsDir.get().asFile, "$bundleAssetName.compiler.map")

  private fun runCommand(command: List<Any>) {
    project.exec {
      it.workingDir(root.get().asFile)
      it.commandLine(command)
    }
  }

  internal fun getBundleCommand(bundleFile: File, sourceMapFile: File): List<Any> {
    val rootFile = root.get().asFile
    val commandLine =
        mutableListOf<String>().apply {
          addAll(nodeExecutableAndArgs.get())
          add(cliFile.get().asFile.cliPath(rootFile))
          add(bundleCommand.get())
          add("--platform")
          add("android")
          add("--dev")
          add(devEnabled.get().toString())
          add("--reset-cache")
          add("--entry-file")
          add(entryFile.get().asFile.cliPath(rootFile))
          add("--bundle-output")
          add(bundleFile.cliPath(rootFile))
          add("--assets-dest")
          add(resourcesDir.get().asFile.cliPath(rootFile))
          add("--sourcemap-output")
          add(sourceMapFile.cliPath(rootFile))
          if (bundleConfig.isPresent) {
            add("--config")
            add(bundleConfig.get().asFile.cliPath(rootFile))
          }
          add("--minify")
          add(minifyEnabled.get().toString())
          addAll(extraPackagerArgs.get())
          add("--verbose")
        }
    return windowsAwareCommandLine(commandLine)
  }

  internal fun getHermescCommand(
      hermesCommand: String,
      bytecodeFile: File,
      bundleFile: File
  ): List<Any> {
    val rootFile = root.get().asFile
    return windowsAwareCommandLine(
        hermesCommand,
        "-emit-binary",
        "-max-diagnostic-width=80",
        "-out",
        bytecodeFile.cliPath(rootFile),
        bundleFile.cliPath(rootFile),
        *hermesFlags.get().toTypedArray())
  }

  internal fun getComposeSourceMapsCommand(
      composeScript: File,
      packagerSourceMap: File,
      compilerSourceMap: File,
      outputSourceMap: File
  ): List<Any> {
    val rootFile = root.get().asFile
    return windowsAwareCommandLine(
        *nodeExecutableAndArgs.get().toTypedArray(),
        composeScript.cliPath(rootFile),
        packagerSourceMap.cliPath(rootFile),
        compilerSourceMap.cliPath(rootFile),
        "-o",
        outputSourceMap.cliPath(rootFile))
  }

  private fun copyPackagerMapIfNeeded(packagerSourceMap: File, outputSourceMap: File) {
    if (!packagerSourceMap.exists()) {
      return
    }
    if (!outputSourceMap.parentFile.exists()) {
      outputSourceMap.parentFile.mkdirs()
    }
    packagerSourceMap.copyTo(outputSourceMap, overwrite = true)
  }

  private fun File.isHermesBytecodeBundle(): Boolean {
    if (!exists() || length() < 4) {
      return false
    }
    val header = ByteArray(4)
    FileInputStream(this).use { stream ->
      val read = stream.read(header)
      if (read < header.size) {
        return false
      }
    }
    return header[0] == 0xC6.toByte() && header[1] == 0x1F.toByte() && header[2] == 0xBC.toByte()
  }
}

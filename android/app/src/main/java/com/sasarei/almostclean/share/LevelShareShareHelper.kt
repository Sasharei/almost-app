package com.sasarei.almostclean.share

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.io.OutputStream

object LevelShareShareHelper {
  const val EXTRA_IMAGE_URI = "level_share_image_uri"
  const val EXTRA_TITLE = "level_share_title"
  const val EXTRA_MESSAGE = "level_share_message"

  fun createShareUri(context: Context, rawUri: String): Uri {
    val parsedUri = Uri.parse(rawUri)
    val now = System.currentTimeMillis()
    val shareDir = File(context.cacheDir, "level-share")
    if (!shareDir.exists() && !shareDir.mkdirs()) {
      throw IllegalStateException("Unable to create level share cache directory")
    }
    val shareFile = File(shareDir, "almost-level-share-$now.png")

    openInputStreamForUri(context, parsedUri, rawUri).use { input ->
      if (input == null) {
        throw IllegalStateException("Unable to open source image stream")
      }
      FileOutputStream(shareFile).use { output ->
        copyStream(input, output)
      }
    }

    return FileProvider.getUriForFile(
      context,
      "${context.packageName}.levelshare.fileprovider",
      shareFile
    )
  }

  fun createChooserIntent(context: Context, shareUri: Uri, title: String?, message: String?): Intent {
    val sendIntent =
      Intent(Intent.ACTION_SEND).apply {
        type = "image/png"
        putExtra(Intent.EXTRA_STREAM, shareUri)
        clipData = ClipData.newUri(context.contentResolver, "level-share", shareUri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        if (!title.isNullOrBlank()) {
          putExtra(Intent.EXTRA_SUBJECT, title)
        }
        if (!message.isNullOrBlank()) {
          putExtra(Intent.EXTRA_TEXT, message)
        }
      }

    val resolvedActivities = context.packageManager.queryIntentActivities(sendIntent, 0)
    resolvedActivities.forEach { info ->
      val packageName = info?.activityInfo?.packageName
      if (!packageName.isNullOrBlank()) {
        context.grantUriPermission(
          packageName,
          shareUri,
          Intent.FLAG_GRANT_READ_URI_PERMISSION
        )
      }
    }

    return Intent.createChooser(sendIntent, title ?: "").apply {
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      clipData = ClipData.newUri(context.contentResolver, "level-share", shareUri)
    }
  }

  private fun openInputStreamForUri(context: Context, parsedUri: Uri, rawUri: String): InputStream? {
    return when (parsedUri.scheme?.lowercase()) {
      "content" -> context.contentResolver.openInputStream(parsedUri)
      "file" -> {
        val path = parsedUri.path ?: throw IllegalStateException("Image file path is missing")
        val file = File(path)
        if (!file.exists()) {
          throw IllegalStateException("Image file does not exist")
        }
        FileInputStream(file)
      }
      else -> {
        val file = File(rawUri.removePrefix("file://"))
        if (!file.exists()) {
          throw IllegalStateException("Unsupported image URI: $rawUri")
        }
        FileInputStream(file)
      }
    }
  }

  private fun copyStream(input: InputStream, output: OutputStream) {
    val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
    var bytesRead = input.read(buffer)
    while (bytesRead >= 0) {
      if (bytesRead > 0) {
        output.write(buffer, 0, bytesRead)
      }
      bytesRead = input.read(buffer)
    }
    output.flush()
  }
}

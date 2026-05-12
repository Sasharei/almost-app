package com.sasarei.almostclean.share

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.util.Log
import androidx.core.content.FileProvider
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil
import java.io.File
import java.io.FileOutputStream
import kotlin.math.max

class LevelShareModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "LevelShare"

  @ReactMethod
  fun shareImage(imageUri: String?, title: String?, message: String?, promise: Promise) {
    val rawUri = imageUri?.trim()
    if (rawUri.isNullOrEmpty()) {
      promise.reject("level_share_invalid_uri", "Image URI is required")
      return
    }

    try {
      val activity = reactContext.currentActivity
      val context = activity ?: reactContext
      val shareUri = LevelShareShareHelper.createShareUri(context, rawUri)
      val chooserIntent = LevelShareShareHelper.createChooserIntent(context, shareUri, title, message)

      UiThreadUtil.runOnUiThread(
        Runnable {
          try {
            if (activity != null) {
              activity.startActivity(chooserIntent)
            } else {
              chooserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
              reactContext.startActivity(chooserIntent)
            }

            promise.resolve(true)
          } catch (error: Exception) {
            Log.e("LevelShare", "Unable to open Android share chooser", error)
            promise.reject("level_share_launch_error", error.message, error)
          }
        }
      )
    } catch (error: Exception) {
      Log.e("LevelShare", "Unable to prepare Android share image", error)
      promise.reject("level_share_prepare_error", error.message, error)
    }
  }

  @ReactMethod
  fun shareLevelCard(
    level: Double,
    badge: String?,
    cardTitle: String?,
    subtitle: String?,
    join: String?,
    handle: String?,
    brand: String?,
    hint: String?,
    title: String?,
    message: String?,
    promise: Promise
  ) {
    try {
      val activity = reactContext.currentActivity
      val context = activity ?: reactContext
      val shareUri =
        createGeneratedCardUri(
          level = max(1, level.toInt()),
          badge = badge.orEmpty().ifBlank { "ALMOST HERO" },
          cardTitle = cardTitle.orEmpty().ifBlank { "LEVEL ${max(1, level.toInt())}" },
          subtitle = subtitle.orEmpty(),
          join = join.orEmpty(),
          handle = handle.orEmpty(),
          brand = brand.orEmpty().ifBlank { "Almost" },
          hint = hint.orEmpty().ifBlank { "APP" }
        )
      val chooserIntent = LevelShareShareHelper.createChooserIntent(context, shareUri, title, message)

      UiThreadUtil.runOnUiThread(
        Runnable {
          try {
            if (activity != null) {
              activity.startActivity(chooserIntent)
            } else {
              chooserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
              reactContext.startActivity(chooserIntent)
            }
            promise.resolve(true)
          } catch (error: Exception) {
            Log.e("LevelShare", "Unable to open generated level share chooser", error)
            promise.reject("level_share_launch_error", error.message, error)
          }
        }
      )
    } catch (error: Exception) {
      Log.e("LevelShare", "Unable to generate Android level share card", error)
      promise.reject("level_share_generate_error", error.message, error)
    }
  }

  private fun createGeneratedCardUri(
    level: Int,
    badge: String,
    cardTitle: String,
    subtitle: String,
    join: String,
    handle: String,
    brand: String,
    hint: String
  ): android.net.Uri {
    val width = 1080
    val height = 1440
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    canvas.drawColor(Color.rgb(5, 11, 25))

    paint.style = Paint.Style.FILL
    paint.color = Color.rgb(255, 184, 72)
    canvas.drawRoundRect(RectF(300f, 96f, 780f, 186f), 45f, 45f, paint)

    drawCenteredText(canvas, badge.uppercase(), 540f, 153f, 34f, Color.rgb(12, 18, 31), true)
    drawCenteredText(canvas, cardTitle.uppercase(), 540f, 340f, 74f, Color.WHITE, true)
    drawCenteredText(canvas, subtitle, 540f, 448f, 36f, Color.rgb(190, 194, 205), false)

    drawCenteredBitmapResource(canvas, "assets_cat_mascot", RectF(360f, 550f, 720f, 910f))

    drawCenteredText(canvas, join, 540f, 1040f, 38f, Color.WHITE, true)
    drawCenteredText(canvas, handle, 540f, 1115f, 34f, Color.rgb(188, 192, 203), true)

    drawRoundedAppLogo(canvas, RectF(365f, 1230f, 485f, 1350f))
    drawLeftText(canvas, brand, 520f, 1288f, 44f, Color.WHITE, true)
    drawLeftText(canvas, hint, 520f, 1340f, 30f, Color.rgb(190, 194, 205), false)

    val shareDir = File(reactContext.cacheDir, "level-share")
    if (!shareDir.exists() && !shareDir.mkdirs()) {
      throw IllegalStateException("Unable to create level share cache directory")
    }
    val shareFile = File(shareDir, "almost-level-share-generated-${System.currentTimeMillis()}.png")
    FileOutputStream(shareFile).use { output ->
      if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) {
        throw IllegalStateException("Unable to encode generated level share card")
      }
    }
    bitmap.recycle()

    return FileProvider.getUriForFile(
      reactContext,
      "${reactContext.packageName}.levelshare.fileprovider",
      shareFile
    )
  }

  private fun drawCenteredBitmapResource(canvas: Canvas, resourceName: String, target: RectF) {
    val bitmap = decodeDrawableResource(resourceName) ?: return
    val source = Rect(0, 0, bitmap.width, bitmap.height)
    canvas.drawBitmap(bitmap, source, target, Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG))
    bitmap.recycle()
  }

  private fun drawRoundedAppLogo(canvas: Canvas, target: RectF) {
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    paint.color = Color.WHITE
    canvas.drawRoundRect(target, 28f, 28f, paint)
    val logo = decodeDrawableResource("assets_almost_icon")
    if (logo != null) {
      val inset = 14f
      canvas.drawBitmap(
        logo,
        Rect(0, 0, logo.width, logo.height),
        RectF(target.left + inset, target.top + inset, target.right - inset, target.bottom - inset),
        Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
      )
      logo.recycle()
    } else {
      drawCenteredText(canvas, "Almost", target.centerX(), target.centerY() + 8f, 24f, Color.rgb(8, 12, 24), true)
    }
  }

  private fun decodeDrawableResource(resourceName: String): Bitmap? {
    val resourceId = reactContext.resources.getIdentifier(resourceName, "drawable", reactContext.packageName)
    if (resourceId == 0) return null
    return BitmapFactory.decodeResource(reactContext.resources, resourceId)
  }

  private fun drawCenteredText(
    canvas: Canvas,
    text: String,
    centerX: Float,
    baselineY: Float,
    size: Float,
    color: Int,
    bold: Boolean
  ) {
    if (text.isBlank()) return
    val paint = TextPaint(Paint.ANTI_ALIAS_FLAG)
    paint.color = color
    paint.textSize = size
    paint.textAlign = Paint.Align.CENTER
    paint.isFakeBoldText = bold
    canvas.drawText(text, centerX, baselineY, paint)
  }

  private fun drawLeftText(
    canvas: Canvas,
    text: String,
    left: Float,
    baselineY: Float,
    size: Float,
    color: Int,
    bold: Boolean
  ) {
    if (text.isBlank()) return
    val paint = TextPaint(Paint.ANTI_ALIAS_FLAG)
    paint.color = color
    paint.textSize = size
    paint.textAlign = Paint.Align.LEFT
    paint.isFakeBoldText = bold
    canvas.drawText(text, left, baselineY, paint)
  }
}

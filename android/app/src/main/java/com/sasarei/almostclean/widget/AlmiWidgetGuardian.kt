package com.sasarei.almostclean.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.graphics.*
import android.net.Uri
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.text.TextDirectionHeuristics
import android.widget.RemoteViews
import com.sasarei.almostclean.R
import org.json.JSONObject
import kotlin.math.*

internal object AlmiWidgetGuardian {
  private const val HOUR = 3600000L
  fun render(context: Context, manager: AppWidgetManager, id: Int, size: WidgetSize, data: WidgetData): RemoteViews? {
    if (!data.hasData) return null
    val prefs = context.getSharedPreferences(WidgetDataStore.PREFS_NAME, 0)
    val snapshot = try { JSONObject(prefs.getString("widget_almi_context", "") ?: "") } catch (_: Exception) { return null }
    if (snapshot.optInt("version") != 1) return null
    val copy = snapshot.optJSONObject("copy") ?: return null
    val now = System.currentTimeMillis()
    val financial = snapshot.optLong("financialUpdatedAt")
    val event = snapshot.optLong("eventAt")
    val eventScene = snapshot.optString("eventScene")
    val ttl = when (eventScene) { "empty_treasury", "savings_guard" -> 6 * HOUR; "spending_fire" -> 4 * HOUR; else -> 0L }
    var scene = "balance"
    var key = "balance"
    if (ttl > 0 && financial in 1..now && now - financial < 24 * HOUR && event in 1..now && now < min(event + ttl, financial + 24 * HOUR)) {
      scene = eventScene; key = scene
    } else {
      val last = prefs.getLong("widget_almi_last_opened", 0)
      if (last in 1..now && now - last >= 24 * HOUR) {
        val day = (now - last) / (24 * HOUR)
        if ((now - last) % (24 * HOUR) < 6 * HOUR) { scene = "neglected"; key = if (day % 2L == 1L) "neglected" else "neglected_long" }
      }
    }
    if (scene == "balance") return null
    val caption = copy.optString(key)
    if (caption.isBlank()) return null
    val options = manager.getAppWidgetOptions(id)
    val small = size == WidgetSize.SMALL
    val large = size == WidgetSize.LARGE
    val density = context.resources.displayMetrics.density
    val minWidth = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, if (small) 155 else 320).coerceAtLeast(120)
    val minHeight = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, if (large) 320 else 155).coerceAtLeast(120)
    // Bound bitmap allocation and render once per permitted widget refresh.
    val scale = min(density, 2f)
    val width = (minWidth * scale).toInt().coerceIn(120, 1024)
    val height = (minHeight * scale).toInt().coerceIn(120, 1024)
    val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(bitmap)
    val dark = data.themeId == "dark"
    val pro = data.themeId == "pro"
    val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    paint.color = Color.parseColor(if (dark) "#19364A" else if (pro) "#EAE1FF" else "#E5F0FF")
    canvas.drawRoundRect(RectF(0f, 0f, width.toFloat(), height.toFloat()), 22 * scale, 22 * scale, paint)
    val rtl = snapshot.optBoolean("rtl")
    val asset = when (scene) { "empty_treasury" -> R.drawable.almi_treasury; "spending_fire" -> R.drawable.almi_fire; "savings_guard" -> R.drawable.almi_savings; else -> R.drawable.almi_neglected }
    val image = BitmapFactory.decodeResource(context.resources, asset) ?: return null
    val imageSize = if (small) width * 1.05f else if (large) width * 0.95f else min(width * .72f, height * 1.12f)
    val imageLeft = if (rtl) -8 * scale else width - imageSize + 8 * scale
    val imageTop = height - imageSize + if (small) height * .18f else height * .04f
    canvas.save()
    if (rtl) canvas.scale(-1f, 1f, imageLeft + imageSize / 2, 0f)
    canvas.drawBitmap(image, null, RectF(imageLeft, imageTop, imageLeft + imageSize, imageTop + imageSize), null)
    canvas.restore()
    image.recycle()
    val margin = 8 * scale
    val padding = 12 * scale
    val bubbleWidth = if (small) width - 2 * margin else width * .54f
    val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG)
    textPaint.color = Color.parseColor(if (dark) "#F2F5FA" else "#152035")
    textPaint.typeface = Typeface.create("sans-serif", Typeface.BOLD)
    textPaint.textSize = (if (small) 12 else if (large) 22 else 16) * scale * context.resources.configuration.fontScale.coerceIn(1f, 1.5f)
    fun layout(): StaticLayout = StaticLayout.Builder.obtain(caption, 0, caption.length, textPaint, (bubbleWidth - 2 * padding).toInt().coerceAtLeast(40))
      .setTextDirection(if (rtl) TextDirectionHeuristics.RTL else TextDirectionHeuristics.LTR)
      .setAlignment(Layout.Alignment.ALIGN_NORMAL).setIncludePad(false).build()
    var text = layout()
    while (text.height + 2 * padding > height * .72f && textPaint.textSize > 10 * scale) { textPaint.textSize -= scale; text = layout() }
    val bubbleLeft = if (rtl) width - margin - bubbleWidth else margin
    val bubbleBottom = margin + text.height + 2 * padding
    paint.color = Color.parseColor(if (dark) "#263A50" else if (pro) "#FFFAFF" else "#FFFFFF")
    canvas.drawRoundRect(RectF(bubbleLeft, margin, bubbleLeft + bubbleWidth, bubbleBottom), 18 * scale, 18 * scale, paint)
    val tail = Path()
    val tailX = if (rtl) bubbleLeft + 16 * scale else bubbleLeft + bubbleWidth - 26 * scale
    tail.moveTo(tailX, bubbleBottom - 4 * scale); tail.lineTo(tailX + 10 * scale, bubbleBottom + 8 * scale); tail.lineTo(tailX + 20 * scale, bubbleBottom - 4 * scale); tail.close()
    canvas.drawPath(tail, paint)
    canvas.save(); canvas.translate(bubbleLeft + padding, margin + padding); text.draw(canvas); canvas.restore()
    val views = RemoteViews(context.packageName, R.layout.almi_widget_scene)
    views.setImageViewBitmap(R.id.almi_scene_image, bitmap)
    views.setContentDescription(R.id.almi_scene_image, caption + ". " + copy.optString("open"))
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("com.sasarei.almostclean://home")).apply { setPackage(context.packageName); addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP) }
    val pending = PendingIntent.getActivity(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    views.setOnClickPendingIntent(R.id.almi_scene_image, pending)
    return views
  }
}

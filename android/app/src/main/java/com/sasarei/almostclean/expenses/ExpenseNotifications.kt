package com.sasarei.almostclean.expenses

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.sasarei.almostclean.MainActivity
import com.sasarei.almostclean.R
import java.util.concurrent.Executors

class ExpenseNotifications : NotificationListenerService() {
  private val worker = Executors.newSingleThreadExecutor()
  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val prefs = getSharedPreferences("bank-expenses", MODE_PRIVATE)
    if (prefs.getLong("premiumUntil", 0) <= System.currentTimeMillis() || !prefs.getBoolean("enabled", false) || sbn.packageName == packageName ||
      !prefs.getStringSet("sources", emptySet())!!.contains(sbn.packageName) ||
      sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
    val extra = sbn.notification.extras
    val body = extra.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.takeIf { it.isNotBlank() }
      ?: extra.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
    val text = listOf(extra.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty(), body).joinToString("\n")
    // No replay of notifications already on the device when permission is granted.
    if (sbn.postTime < prefs.getLong("enabledAt", Long.MAX_VALUE)) return
    worker.execute {
      if (prefs.getLong("premiumUntil", 0) <= System.currentTimeMillis() || !prefs.getBoolean("enabled", false) || !prefs.getStringSet("sources", emptySet())!!.contains(sbn.packageName) || sbn.postTime < prefs.getLong("enabledAt", Long.MAX_VALUE)) return@execute
      runCatching {
        val label = packageManager.getApplicationLabel(packageManager.getApplicationInfo(sbn.packageName, 0)).toString()
        val inserted = ExpenseStore(this).use { it.capture(sbn.packageName, label, text, "${sbn.key}:${sbn.postTime}", sbn.postTime) }
        if (inserted) showReceiptNotice()
      }
      // Notification contents and financial values are never logged or sent to analytics.
    }
  }

  private fun showReceiptNotice() {
    if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
    val prefs = getSharedPreferences("bank-expenses", MODE_PRIVATE)
    val title = prefs.getString("noticeTitle", null) ?: return
    val body = prefs.getString("noticeBody", null) ?: return
    val manager = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(NotificationChannel("bank-expenses", title, NotificationManager.IMPORTANCE_DEFAULT))
    val intent = Intent(this, MainActivity::class.java).setAction(Intent.ACTION_VIEW)
      .setData(android.net.Uri.parse("com.sasarei.almostclean://bank-expenses"))
    val pending = PendingIntent.getActivity(this, 7802, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val builder = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, "bank-expenses") else Notification.Builder(this)
    manager.notify(7802, builder.setSmallIcon(R.drawable.notification_icon).setContentTitle(title)
      .setContentText(body).setVisibility(Notification.VISIBILITY_PRIVATE).setContentIntent(pending).setAutoCancel(true).build())
  }

  override fun onDestroy() { worker.shutdown(); super.onDestroy() }
}

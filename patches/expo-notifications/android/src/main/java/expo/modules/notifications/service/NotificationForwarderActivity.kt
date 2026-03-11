package expo.modules.notifications.service

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import expo.modules.notifications.BuildConfig
import expo.modules.notifications.service.delegates.ExpoHandlingDelegate

/**
 * An internal Activity that passes given Intent extras from
 * [NotificationsService.createNotificationResponseIntent]
 * and send broadcasts to [NotificationsService].
 */
class NotificationForwarderActivity : Activity() {
  companion object {
    private const val TAG = "NotificationForwarder"
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val broadcastIntent = try {
      NotificationsService.createNotificationResponseBroadcastIntent(applicationContext, intent.extras)
    } catch (error: Throwable) {
      Log.w(TAG, "Skipping notification forward: invalid or missing notification payload", error)
      finish()
      return
    }
    val notificationResponse = try {
      NotificationsService.getNotificationResponseFromBroadcastIntent(broadcastIntent)
    } catch (error: Throwable) {
      Log.w(TAG, "Skipping notification forward: failed to parse notification response", error)
      finish()
      return
    }
    ExpoHandlingDelegate.openAppToForeground(this, notificationResponse)
    sendBroadcast(broadcastIntent)
    finish()
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    // This Activity is expected to launch with new task, supposedly
    // there's no way for `onNewIntent` to be called.
    if (BuildConfig.DEBUG) {
      throw AssertionError()
    }
  }
}

package com.sasarei.almostclean.expenses

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager
import org.json.JSONObject
import java.util.concurrent.Executors

class BankExpensesModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  private val worker = Executors.newSingleThreadExecutor()
  override fun getName() = "BankExpenses"
  private fun prefs() = context.getSharedPreferences("bank-expenses", 0)
  private fun run(promise: Promise, operation: () -> Any) {
    worker.execute { try { promise.resolve(operation()) } catch (_: Exception) { promise.reject("bank_expenses_error", "bank_expenses_error") } }
  }
  @ReactMethod fun status(promise: Promise) = run(promise) {
    JSONObject().put("enabled", prefs().getBoolean("enabled", false))
      .put("authorized", NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName))
      .put("sources", org.json.JSONArray(prefs().getStringSet("sources", emptySet())!!.toList())).toString()
  }
  @ReactMethod fun setPremiumAccess(expiresAt: Double, promise: Promise) = run(promise) {
    check(prefs().edit().putLong("premiumUntil", if (expiresAt.isFinite()) expiresAt.toLong() else 0).commit()); true
  }
  @ReactMethod fun setNoticeCopy(title: String, body: String, promise: Promise) = run(promise) {
    check(prefs().edit().putString("noticeTitle", title).putString("noticeBody", body).commit()); true
  }
  @ReactMethod fun configure(enabled: Boolean, sources: ReadableArray, title: String, body: String, promise: Promise) = run(promise) {
    val selected = (0 until sources.size()).mapNotNull { sources.getString(it) }.filter { it != context.packageName }.toSet()
    require(!enabled || selected.isNotEmpty())
    require(!enabled || prefs().getLong("premiumUntil", 0) > System.currentTimeMillis())
    val edit = prefs().edit().putBoolean("enabled", enabled).putStringSet("sources", selected)
      .putString("noticeTitle", title).putString("noticeBody", body)
    if (enabled && !prefs().getBoolean("enabled", false)) edit.putLong("enabledAt", System.currentTimeMillis())
    check(edit.commit()); true
  }
  @ReactMethod fun sources(promise: Promise) = run(promise) {
    val apps = context.packageManager.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
    val entries = apps.distinctBy { it.activityInfo.packageName }.filter { it.activityInfo.packageName != context.packageName }
      .map { JSONObject().put("id", it.activityInfo.packageName).put("label", it.loadLabel(context.packageManager).toString()) }
      .sortedBy { it.getString("label").lowercase() }
    org.json.JSONArray(entries).toString()
  }
  @ReactMethod fun openPermission(promise: Promise) {
    try {
      context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        .putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, ComponentName(context, ExpenseNotifications::class.java).flattenToString()))
      promise.resolve(true)
    } catch (_: Exception) { promise.reject("bank_expenses_error", "bank_expenses_error") }
  }
  @ReactMethod fun page(offset: Double, promise: Promise) = run(promise) { ExpenseStore(context).use { it.page(offset.toInt()).toString() } }
  @ReactMethod fun update(id: String, amount: String, currency: String, delete: Boolean, promise: Promise) = run(promise) {
    ExpenseStore(context).use { it.update(id, amount, currency, delete) }; true
  }
  @ReactMethod fun reset(promise: Promise) = run(promise) {
    check(prefs().edit().clear().commit()); ExpenseStore(context).use { it.reset() }; true
  }
  override fun invalidate() { worker.shutdown(); super.invalidate() }
}

class BankExpensesPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = listOf(BankExpensesModule(context))
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}

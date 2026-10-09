package com.sasarei.almostclean.expenses

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteOpenHelper
import android.database.sqlite.SQLiteDatabase
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.util.UUID

/** Local-only ledger, separate from temptation/reward accounting. Deletions retain dedupe keys. */
class ExpenseStore(private val context: Context) : SQLiteOpenHelper(context, "bank-expenses.db", null, 1) {
  override fun onCreate(db: SQLiteDatabase) {
    db.execSQL("CREATE TABLE receipts (id TEXT PRIMARY KEY, source TEXT NOT NULL, label TEXT NOT NULL, text TEXT NOT NULL, amount TEXT, currency TEXT, created INTEGER NOT NULL, status TEXT NOT NULL, fingerprint TEXT NOT NULL)")
    db.execSQL("CREATE INDEX receipts_recent ON receipts(created DESC)")
    db.execSQL("CREATE TABLE deliveries (delivery TEXT PRIMARY KEY)")
  }
  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) = Unit

  fun capture(source: String, label: String, text: String, delivery: String, created: Long): Boolean {
    val parsed = ExpenseParser.parse(text)
    if (!parsed.expense) return false
    val fingerprint = MessageDigest.getInstance("SHA-256").digest(ExpenseParser.normalize(text).toByteArray()).joinToString("") { "%02x".format(it) }
    val db = writableDatabase
    db.beginTransaction()
    try {
      val preferences = context.getSharedPreferences("bank-expenses", 0)
      if (preferences.getLong("premiumUntil", 0) <= System.currentTimeMillis() || !preferences.getBoolean("enabled", false) || !preferences.getStringSet("sources", emptySet())!!.contains(source) || created < preferences.getLong("enabledAt", Long.MAX_VALUE)) return false
      val marker = ContentValues().apply { put("delivery", delivery) }
      if (db.insertWithOnConflict("deliveries", null, marker, SQLiteDatabase.CONFLICT_IGNORE) == -1L) return false
      db.rawQuery("SELECT id FROM receipts WHERE source=? AND fingerprint=? AND ABS(created-?)<120000 LIMIT 1", arrayOf(source, fingerprint, created.toString())).use {
        if (it.moveToFirst()) { db.setTransactionSuccessful(); return false }
      }
      // Cross-app reports of the same amount are review candidates, never silently dropped.
      var status = if (parsed.automatic()) "saved" else "review"
      if (parsed.automatic()) db.rawQuery("SELECT id FROM receipts WHERE source<>? AND amount=? AND currency=? AND ABS(created-?)<120000 LIMIT 1", arrayOf(source, parsed.amount, parsed.currency, created.toString())).use {
        if (it.moveToFirst()) status = "review"
      }
      db.insertOrThrow("receipts", null, ContentValues().apply {
        put("id", UUID.randomUUID().toString()); put("source", source); put("label", label.take(160))
        put("text", if (status == "review") text.take(2000) else "")
        put("amount", parsed.amount); put("currency", parsed.currency); put("created", created)
        put("status", status); put("fingerprint", fingerprint)
      })
      db.setTransactionSuccessful()
      return true
    } finally { db.endTransaction() }
  }

  fun page(offset: Int): JSONObject {
    val db = readableDatabase
    db.beginTransactionNonExclusive()
    try {
    val items = JSONArray()
    db.rawQuery("SELECT id,label,text,amount,currency,created,status FROM receipts WHERE status<>'deleted' ORDER BY created DESC,id LIMIT 50 OFFSET ?", arrayOf(offset.coerceAtLeast(0).toString())).use { cursor ->
      while (cursor.moveToNext()) items.put(JSONObject().apply {
        put("id", cursor.getString(0)); put("label", cursor.getString(1)); put("text", cursor.getString(2))
        put("amount", cursor.getString(3) ?: ""); put("currency", cursor.getString(4) ?: "")
        put("created", cursor.getLong(5)); put("status", cursor.getString(6))
      })
    }
    val count = db.rawQuery("SELECT COUNT(*) FROM receipts WHERE status<>'deleted'", null).use { it.moveToFirst(); it.getInt(0) }
    val revision = db.rawQuery("SELECT COALESCE(MAX(rowid),0) FROM receipts", null).use { it.moveToFirst(); it.getLong(0) }
    db.setTransactionSuccessful()
    return JSONObject().put("items", items).put("total", count).put("revision", revision)
    } finally { db.endTransaction() }
  }

  fun update(id: String, amount: String, currency: String, delete: Boolean) {
    val values = ContentValues()
    if (delete) { values.put("status", "deleted"); values.put("text", "") }
    else {
      require(currency.matches(Regex("[A-Z]{3}")))
      java.util.Currency.getInstance(currency)
      val parsed = ExpenseParser.parseAmount(amount, currency) ?: throw IllegalArgumentException("amount")
      values.put("status", "saved"); values.put("text", ""); values.put("amount", parsed); values.put("currency", currency)
    }
    writableDatabase.update("receipts", values, "id=? AND status<>'deleted'", arrayOf(id))
  }

  fun reset() { writableDatabase.delete("receipts", null, null); writableDatabase.delete("deliveries", null, null) }
}

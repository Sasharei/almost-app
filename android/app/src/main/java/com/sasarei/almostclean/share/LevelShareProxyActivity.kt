package com.sasarei.almostclean.share

import android.app.Activity
import android.os.Bundle
import android.util.Log

class LevelShareProxyActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    if (savedInstanceState != null) {
      finish()
      return
    }

    try {
      val rawUri =
        intent?.getStringExtra(LevelShareShareHelper.EXTRA_IMAGE_URI)?.trim()
          ?: throw IllegalStateException("Image URI is required")
      val title = intent?.getStringExtra(LevelShareShareHelper.EXTRA_TITLE)
      val message = intent?.getStringExtra(LevelShareShareHelper.EXTRA_MESSAGE)
      val shareUri = LevelShareShareHelper.createShareUri(this, rawUri)
      val chooserIntent = LevelShareShareHelper.createChooserIntent(this, shareUri, title, message)
      startActivity(chooserIntent)
    } catch (error: Exception) {
      Log.e("LevelShareProxy", "Unable to open Android share chooser", error)
    } finally {
      finish()
    }
  }
}

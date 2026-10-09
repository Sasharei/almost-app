package com.sasarei.almostclean.design

import android.content.res.ColorStateList
import android.graphics.Color
import android.view.ContextThemeWrapper
import android.widget.FrameLayout
import androidx.core.view.ViewCompat
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.ViewManager
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.Event
import com.google.android.material.bottomnavigation.BottomNavigationView
import com.google.android.material.navigation.NavigationBarView
import com.sasarei.almostclean.R
import org.json.JSONArray

class MaterialNavigationPackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> = emptyList()
  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> = listOf(MaterialNavigationManager())
}

private class MaterialTabEvent(surfaceId: Int, viewTag: Int, private val key: String) : Event<MaterialTabEvent>(surfaceId, viewTag) {
  override fun getEventName() = "topTabPress"
  override fun getEventData() = Arguments.createMap().apply { putString("key", key) }
}

class MaterialNavigationView(private val reactContext: ThemedReactContext) : FrameLayout(reactContext) {
  private val navigation = BottomNavigationView(ContextThemeWrapper(reactContext, R.style.AlmostMaterialTheme))
  private val keys = mutableMapOf<Int, String>()
  private var updating = false
  private var selectedKey: String? = null
  private var itemsSource = ""

  init {
    addView(navigation, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
    navigation.labelVisibilityMode = NavigationBarView.LABEL_VISIBILITY_LABELED
    navigation.isItemHorizontalTranslationEnabled = false
    navigation.elevation = 0f
    navigation.itemIconSize = (24 * resources.displayMetrics.density).toInt()
    navigation.isItemActiveIndicatorEnabled = true
    // The React safe-area host already owns the system-bar inset. Material's
    // default inset listener otherwise adds it inside the fixed 80dp bar and
    // squeezes the icon/label region down to 32dp on three-button navigation.
    navigation.setPadding(0, 0, 0, 0)
    ViewCompat.setOnApplyWindowInsetsListener(navigation) { view, insets ->
      view.setPadding(0, 0, 0, 0)
      insets
    }
    navigation.setOnItemSelectedListener { item ->
      if (!updating) keys[item.itemId]?.let { key ->
        UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)?.dispatchEvent(
          MaterialTabEvent(UIManagerHelper.getSurfaceId(reactContext), id, key)
        )
      }
      // React owns selection, including locked tabs and tutorial interception.
      updating
    }
    navigation.setOnItemReselectedListener { item ->
      if (!updating) keys[item.itemId]?.let { key ->
        UIManagerHelper.getEventDispatcherForReactTag(reactContext, id)?.dispatchEvent(
          MaterialTabEvent(UIManagerHelper.getSurfaceId(reactContext), id, key)
        )
      }
    }
  }

  fun setItems(source: String?) {
    if (source == null || source == itemsSource) return
    val items = runCatching { JSONArray(source) }.getOrNull() ?: return
    itemsSource = source
    updating = true
    navigation.menu.clear()
    keys.clear()
    for (index in 0 until minOf(5, items.length())) {
      val item = items.optJSONObject(index) ?: continue
      val key = item.optString("key")
      val itemId = 100 + index
      keys[itemId] = key
      val icon = when (key) {
        "cart" -> R.drawable.material_tab_progress
        "pending" -> R.drawable.material_tab_pause
        "purchases" -> R.drawable.material_tab_budget
        "profile" -> R.drawable.material_tab_profile
        else -> R.drawable.material_tab_today
      }
      navigation.menu.add(0, itemId, index, item.optString("title")).setIcon(icon)
      if (!item.isNull("badgeValue")) {
        navigation.getOrCreateBadge(itemId).apply {
          number = item.optString("badgeValue").replace("+", "").toIntOrNull() ?: 1
          maxCharacterCount = 3
          backgroundColor = Color.rgb(186, 26, 26)
          badgeTextColor = Color.WHITE
          isVisible = true
        }
      } else navigation.removeBadge(itemId)
    }
    updating = false
    setSelectedKey(selectedKey)
    requestLayout()
  }

  fun setSelectedKey(key: String?) {
    selectedKey = key
    val itemId = keys.entries.firstOrNull { it.value == key }?.key ?: return
    updating = true
    navigation.selectedItemId = itemId
    updating = false
  }

  fun setPalette(source: String?) {
    val palette = runCatching { org.json.JSONObject(source ?: "{}") }.getOrNull() ?: return
    fun color(key: String, fallback: String) = runCatching { Color.parseColor(palette.optString(key, fallback)) }.getOrDefault(Color.parseColor(fallback))
    val active = color("active", "#485ED7")
    val inactive = color("inactive", "#687083")
    val colors = ColorStateList(arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf()), intArrayOf(active, inactive))
    navigation.itemIconTintList = colors
    navigation.itemTextColor = colors
    navigation.itemActiveIndicatorColor = ColorStateList.valueOf(color("indicator", "#D8DDF9"))
    navigation.setBackgroundColor(color("surface", "#EBEDF4"))
  }

  // Fabric assigns this host's frame directly. Its native children are outside Yoga,
  // so explicitly measure and lay them out after both frame and menu changes.
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    layoutNavigation(right - left, bottom - top)
  }

  private fun layoutNavigation(childWidth: Int = width, childHeight: Int = height) {
    if (childWidth <= 0 || childHeight <= 0) return
    navigation.measure(
      MeasureSpec.makeMeasureSpec(childWidth, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(childHeight, MeasureSpec.EXACTLY)
    )
    navigation.layout(0, 0, childWidth, childHeight)
  }

  override fun requestLayout() {
    super.requestLayout()
    post { layoutNavigation() }
  }
}

class MaterialNavigationManager : SimpleViewManager<MaterialNavigationView>() {
  override fun getName() = "NativeMaterialNavigation"
  override fun createViewInstance(context: ThemedReactContext) = MaterialNavigationView(context)
  @ReactProp(name = "itemsJson") fun setItems(view: MaterialNavigationView, value: String?) = view.setItems(value)
  @ReactProp(name = "selectedKey") fun setSelectedKey(view: MaterialNavigationView, value: String?) = view.setSelectedKey(value)
  @ReactProp(name = "paletteJson") fun setPalette(view: MaterialNavigationView, value: String?) = view.setPalette(value)
  override fun getExportedCustomBubblingEventTypeConstants(): Map<String, Any> = mapOf(
    "topTabPress" to mapOf("phasedRegistrationNames" to mapOf("bubbled" to "onTabPress"))
  )
}

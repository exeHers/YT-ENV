package com.ytenv.audio

import java.util.concurrent.ConcurrentHashMap

class WidgetLayoutStore {
    private val layouts = ConcurrentHashMap<String, LayoutPreset>()
    private var activeThemeId: String = "amoled_dark"

    fun saveLayout(layoutPreset: LayoutPreset) {
        layouts[layoutPreset.id] = layoutPreset
    }

    fun getLayout(id: String): LayoutPreset? = layouts[id]

    fun setActiveTheme(themeId: String) {
        activeThemeId = themeId
    }

    fun activeTheme(): String = activeThemeId
}

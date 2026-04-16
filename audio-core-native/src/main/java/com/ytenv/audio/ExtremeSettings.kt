package com.ytenv.audio

import java.util.concurrent.ConcurrentHashMap

class ExtremeSettingsStore {
    private val values = ConcurrentHashMap<String, Any>().apply {
        put(KEY_BUFFER_AHEAD_SECONDS, 10)
        put(KEY_FORCE_OPUS_256, false)
        put(KEY_DYNAMIC_NORMALIZATION, true)
        put(KEY_UI_REFRESH_RATE, 120)
        put(KEY_CUSTOM_SVG_ICON_URI, "")
        put(KEY_GEQ_PRESET_NAME, "Default")
    }

    private val graphicEqBandGains = FloatArray(15) { 0.0f }

    fun schema(toggleSettings: List<FeatureToggleSetting>): List<SettingsCategory> {
        return listOf(
            SettingsCategory(
                id = "sync",
                title = "Account Sync",
                items = listOf(
                    SettingsItem.ToggleItem(
                        key = "secure_sync_enabled",
                        title = "Secure Account Sync",
                        description = "Uses standards-based sign-in flow with encrypted local token storage.",
                        enabled = true
                    ),
                    SettingsItem.ActionItem(
                        key = "sync_now",
                        title = "Sync Account",
                        description = "Start one-tap account sync flow."
                    ),
                    SettingsItem.InfoItem(
                        key = "sync_policy",
                        title = "Safety Policy",
                        description = "Direct cookie interception is disabled. Session sync uses compliant auth flow."
                    )
                )
            ),
            SettingsCategory(
                id = "playback",
                title = "Playback",
                items = listOf(
                    SettingsItem.RangeItem(
                        key = KEY_BUFFER_AHEAD_SECONDS,
                        title = "Buffer Ahead",
                        description = "Preload media to smooth network drops.",
                        value = getInt(KEY_BUFFER_AHEAD_SECONDS),
                        min = 5,
                        max = 30,
                        unit = "s"
                    ),
                    SettingsItem.ToggleItem(
                        key = KEY_FORCE_OPUS_256,
                        title = "Force Opus 256kbps",
                        description = "Prefer 256kbps Opus streams when available.",
                        enabled = getBoolean(KEY_FORCE_OPUS_256)
                    ),
                    SettingsItem.ToggleItem(
                        key = KEY_DYNAMIC_NORMALIZATION,
                        title = "Dynamic Normalization",
                        description = "Auto-balance perceived loudness across tracks.",
                        enabled = getBoolean(KEY_DYNAMIC_NORMALIZATION)
                    )
                )
            ),
            SettingsCategory(
                id = "visuals",
                title = "Visuals",
                items = listOf(
                    SettingsItem.ChoiceItem(
                        key = KEY_UI_REFRESH_RATE,
                        title = "UI Refresh Rate",
                        description = "Lock render loop for stability and battery control.",
                        selectedValue = getInt(KEY_UI_REFRESH_RATE),
                        choices = listOf(60, 120)
                    ),
                    SettingsItem.TextItem(
                        key = KEY_CUSTOM_SVG_ICON_URI,
                        title = "Custom SVG Icon Upload",
                        description = "Provide SVG source URI for icon pack override.",
                        value = getString(KEY_CUSTOM_SVG_ICON_URI)
                    )
                )
            ),
            SettingsCategory(
                id = "audio",
                title = "Audio",
                items = listOf(
                    SettingsItem.InfoItem(
                        key = "geq_description",
                        title = "15-Band Graphic Equalizer",
                        description = "Modular EQ with per-band gain and preset save/recall."
                    ),
                    SettingsItem.TextItem(
                        key = KEY_GEQ_PRESET_NAME,
                        title = "Save Preset",
                        description = "Store current 15-band curve under a custom name.",
                        value = getString(KEY_GEQ_PRESET_NAME)
                    )
                )
            ),
            SettingsCategory(
                id = "experimental",
                title = "Experimental / Insane Mode",
                items = toggleSettings.map {
                    SettingsItem.ToggleItem(
                        key = it.featureKey,
                        title = it.title,
                        description = it.description,
                        enabled = it.enabled
                    )
                }
            )
        )
    }

    fun setBoolean(key: String, value: Boolean) {
        values[key] = value
    }

    fun setInt(key: String, value: Int) {
        values[key] = value
    }

    fun setText(key: String, value: String) {
        values[key] = value
    }

    fun setEqBandGain(index: Int, dbGain: Float) {
        if (index in graphicEqBandGains.indices) {
            graphicEqBandGains[index] = dbGain.coerceIn(-12.0f, 12.0f)
        }
    }

    fun getEqBandGains(): List<Float> = graphicEqBandGains.toList()

    private fun getBoolean(key: String): Boolean = values[key] as? Boolean ?: false
    private fun getInt(key: String): Int = values[key] as? Int ?: 0
    private fun getString(key: String): String = values[key] as? String ?: ""

    companion object {
        const val KEY_BUFFER_AHEAD_SECONDS = "buffer_ahead_seconds"
        const val KEY_FORCE_OPUS_256 = "force_opus_256"
        const val KEY_DYNAMIC_NORMALIZATION = "dynamic_normalization"
        const val KEY_UI_REFRESH_RATE = "ui_refresh_rate"
        const val KEY_CUSTOM_SVG_ICON_URI = "custom_svg_icon_uri"
        const val KEY_GEQ_PRESET_NAME = "geq_preset_name"
    }
}

data class SettingsCategory(
    val id: String,
    val title: String,
    val items: List<SettingsItem>
)

sealed class SettingsItem {
    data class ToggleItem(
        val key: String,
        val title: String,
        val description: String,
        val enabled: Boolean
    ) : SettingsItem()

    data class RangeItem(
        val key: String,
        val title: String,
        val description: String,
        val value: Int,
        val min: Int,
        val max: Int,
        val unit: String
    ) : SettingsItem()

    data class ChoiceItem(
        val key: String,
        val title: String,
        val description: String,
        val selectedValue: Int,
        val choices: List<Int>
    ) : SettingsItem()

    data class TextItem(
        val key: String,
        val title: String,
        val description: String,
        val value: String
    ) : SettingsItem()

    data class ActionItem(
        val key: String,
        val title: String,
        val description: String
    ) : SettingsItem()

    data class InfoItem(
        val key: String,
        val title: String,
        val description: String
    ) : SettingsItem()
}

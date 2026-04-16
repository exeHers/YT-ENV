package com.ytenv.audio

object AutomationIntentContract {
    const val ACTION_SET_PRESET = "com.ytenv.SET_PRESET"
    const val ACTION_SET_THEME = "com.ytenv.SET_THEME"
    const val ACTION_SET_BUFFER_MS = "com.ytenv.SET_BUFFER_MS"
    const val ACTION_SET_FEATURE_TOGGLE = "com.ytenv.SET_FEATURE_TOGGLE"

    const val EXTRA_PRESET_NAME = "preset_name"
    const val EXTRA_THEME_ID = "theme_id"
    const val EXTRA_BUFFER_MS = "buffer_ms"
    const val EXTRA_FEATURE_KEY = "feature_key"
    const val EXTRA_FEATURE_ENABLED = "feature_enabled"
}

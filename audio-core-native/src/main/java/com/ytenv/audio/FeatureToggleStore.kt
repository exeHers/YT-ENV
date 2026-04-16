package com.ytenv.audio

import java.util.concurrent.ConcurrentHashMap

class FeatureToggleStore {
    private val state = ConcurrentHashMap<String, Boolean>().apply {
        FeatureToggle.entries.forEach { put(it.key, it.defaultEnabled) }
    }

    fun setEnabled(feature: FeatureToggle, enabled: Boolean) {
        state[feature.key] = enabled
    }

    fun setEnabled(featureKey: String, enabled: Boolean): Boolean {
        val feature = FeatureToggle.fromKey(featureKey) ?: return false
        setEnabled(feature, enabled)
        return true
    }

    fun isEnabled(feature: FeatureToggle): Boolean = state[feature.key] ?: feature.defaultEnabled

    fun allSettings(): List<FeatureToggleSetting> {
        return FeatureToggle.entries.map { feature ->
            FeatureToggleSetting(
                featureKey = feature.key,
                title = feature.title,
                description = feature.description,
                enabled = isEnabled(feature)
            )
        }
    }
}

data class FeatureToggleSetting(
    val featureKey: String,
    val title: String,
    val description: String,
    val enabled: Boolean
)

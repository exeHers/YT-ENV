package com.ytenv.app

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.ytenv.audio.AutomationIntentContract
import com.ytenv.audio.AudioEngineController
import com.ytenv.audio.FeatureToggleStore
import com.ytenv.audio.LayoutPreset
import com.ytenv.audio.WidgetLayoutStore

class MainActivity : AppCompatActivity() {
    private val audioEngineController = AudioEngineController()
    private val widgetLayoutStore = WidgetLayoutStore()
    private val featureToggleStore = FeatureToggleStore()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        seedStarterLayout()
        handleAutomationIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleAutomationIntent(intent)
    }

    private fun handleAutomationIntent(intent: Intent?) {
        when (intent?.action) {
            AutomationIntentContract.ACTION_SET_PRESET -> {
                val preset = intent.getStringExtra(AutomationIntentContract.EXTRA_PRESET_NAME) ?: return
                audioEngineController.applyPreset(preset)
            }
            AutomationIntentContract.ACTION_SET_THEME -> {
                val theme = intent.getStringExtra(AutomationIntentContract.EXTRA_THEME_ID) ?: return
                widgetLayoutStore.setActiveTheme(theme)
            }
            AutomationIntentContract.ACTION_SET_BUFFER_MS -> {
                val bufferMs = intent.getIntExtra(AutomationIntentContract.EXTRA_BUFFER_MS, 50)
                audioEngineController.setAudioBufferMs(bufferMs)
            }
            AutomationIntentContract.ACTION_SET_FEATURE_TOGGLE -> {
                val featureKey = intent.getStringExtra(AutomationIntentContract.EXTRA_FEATURE_KEY) ?: return
                val enabled = intent.getBooleanExtra(AutomationIntentContract.EXTRA_FEATURE_ENABLED, false)
                featureToggleStore.setEnabled(featureKey, enabled)
            }
            else -> Unit
        }
    }

    fun currentFeatureSettings() = featureToggleStore.allSettings()

    private fun seedStarterLayout() {
        widgetLayoutStore.saveLayout(
            LayoutPreset(
                id = "default",
                widgets = listOf(
                    LayoutPreset.Widget("play_button", "control", 16, 640, 160, 160, true, 10),
                    LayoutPreset.Widget("progress_bar", "timeline", 16, 590, 680, 30, true, 9),
                    LayoutPreset.Widget("lyrics", "lyrics_panel", 16, 100, 680, 470, true, 1)
                )
            )
        )
    }
}

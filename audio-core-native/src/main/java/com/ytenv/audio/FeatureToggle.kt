package com.ytenv.audio

enum class FeatureToggle(
    val key: String,
    val title: String,
    val description: String,
    val defaultEnabled: Boolean = false
) {
    ADAPTIVE_SAFE_GAIN_AI(
        key = "adaptive_safe_gain_ai",
        title = "Adaptive Safe Gain AI",
        description = "Learns listening habits and automatically sets safe loudness."
    ),
    BINAURAL_HEAD_TRACKING(
        key = "binaural_head_tracking",
        title = "Binaural Head Tracking Mode",
        description = "Locks the virtual sound stage using motion sensors."
    ),
    CROWD_SOURCED_EQ_INTELLIGENCE(
        key = "crowd_sourced_eq_intelligence",
        title = "Crowd-Sourced EQ Intelligence",
        description = "Uses community-backed curves for headphone and genre matching."
    ),
    SESSION_DNA(
        key = "session_dna",
        title = "Session DNA",
        description = "Saves complete playback states for instant restoration."
    ),
    NEURAL_STEM_FOCUS(
        key = "neural_stem_focus",
        title = "Neural Stem Focus",
        description = "Emphasizes selected stems (vocals, bass, drums) in real time."
    ),
    LATENCY_AWARE_GAMING_PROFILE(
        key = "latency_aware_gaming_profile",
        title = "Latency-Aware Gaming Profile",
        description = "Optimizes audio path for lower latency during gameplay."
    ),
    ANTI_FATIGUE_MODE(
        key = "anti_fatigue_mode",
        title = "Anti-Fatigue Mode",
        description = "Smooths spectral harshness during long listening sessions."
    ),
    OFFLINE_SEMANTIC_LYRICS_MOOD_SEARCH(
        key = "offline_semantic_lyrics_mood_search",
        title = "Offline Semantic Lyrics + Mood Search",
        description = "Finds tracks by local mood and lyric intent."
    );

    companion object {
        fun fromKey(key: String): FeatureToggle? = entries.firstOrNull { it.key == key }
    }
}

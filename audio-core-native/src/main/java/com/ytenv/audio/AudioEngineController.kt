package com.ytenv.audio

class AudioEngineController {
    init {
        System.loadLibrary("ytenv_audio")
    }

    fun setAudioBufferMs(bufferMs: Int) {
        nativeSetAudioBufferMs(bufferMs.coerceIn(5, 500))
    }

    fun applyPreset(presetName: String) {
        nativeApplyPreset(presetName)
    }

    external fun nativeSetAudioBufferMs(bufferMs: Int)
    external fun nativeApplyPreset(presetName: String)
}

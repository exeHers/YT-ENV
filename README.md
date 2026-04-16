# YT ENV - Sovereign Audio Environment

Initial architecture scaffold for an Android-first modular audio platform.

## Implemented in this pass

- Multi-module Android project (`app`, `audio-core-native`)
- Native DSP rack abstraction in C++ with plugin chain placeholders:
  - 15-band parametric EQ plugin
  - Compressor plugin
  - Stereo widener plugin
- JNI bridge (`AudioEngineController`) for:
  - Buffer control (5 ms to 500 ms)
  - Preset apply trigger
- Intent contract for Tasker/system automation triggers:
  - `com.ytenv.SET_PRESET`
  - `com.ytenv.SET_THEME`
  - `com.ytenv.SET_BUFFER_MS`
  - `com.ytenv.SET_FEATURE_TOGGLE`
- Widget layout schema (`LayoutPreset`) and in-memory layout store.
- Advanced feature toggle registry/store for opt-in "insane mode" capabilities.

## Next implementation steps

1. Integrate Oboe stream lifecycle and exclusive mode capability probe.
2. Replace placeholder DSP blocks with production algorithms.
3. Add Compose widget editor and persistent layout storage.
4. Add AutoEq dataset ingestion and headphone matching pipeline.
5. Implement secure cache layer and metadata override DB.

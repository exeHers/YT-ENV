#include <jni.h>

#include <memory>
#include <mutex>
#include <string>

#include "dsp_rack.h"

namespace {
std::mutex gRackMutex;
std::unique_ptr<ytenv::DspRack> gRack;

ytenv::DspRack& rack() {
    std::scoped_lock lock(gRackMutex);
    if (!gRack) {
        gRack = std::make_unique<ytenv::DspRack>();
        gRack->addDefaultChain();
    }
    return *gRack;
}
}  // namespace

extern "C" JNIEXPORT void JNICALL
Java_com_ytenv_audio_AudioEngineController_nativeSetAudioBufferMs(
    JNIEnv* env, jobject thiz, jint bufferMs) {
    (void)env;
    (void)thiz;
    rack().setBufferMs(static_cast<int>(bufferMs));
}

extern "C" JNIEXPORT void JNICALL
Java_com_ytenv_audio_AudioEngineController_nativeApplyPreset(
    JNIEnv* env, jobject thiz, jstring presetName) {
    (void)thiz;
    const char* presetChars = env->GetStringUTFChars(presetName, nullptr);
    const std::string preset = presetChars ? presetChars : "";
    if (presetChars) {
        env->ReleaseStringUTFChars(presetName, presetChars);
    }
    rack().applyPreset(preset);
}

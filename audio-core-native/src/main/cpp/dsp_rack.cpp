#include "dsp_rack.h"

namespace ytenv {

void ParametricEqPlugin::process(AudioBuffer& buffer) {
    (void)buffer;
    // Placeholder: 15-band biquad bank with coefficient interpolation.
}

void CompressorPlugin::process(AudioBuffer& buffer) {
    (void)buffer;
    // Placeholder: RMS detector + soft knee gain computer.
}

void StereoWidenerPlugin::process(AudioBuffer& buffer) {
    (void)buffer;
    // Placeholder: M/S conversion with side-gain and safety limiter.
}

void DspRack::addDefaultChain() {
    plugins_.clear();
    plugins_.push_back(std::make_unique<ParametricEqPlugin>());
    plugins_.push_back(std::make_unique<CompressorPlugin>());
    plugins_.push_back(std::make_unique<StereoWidenerPlugin>());
}

void DspRack::applyPreset(const std::string& presetName) {
    // Placeholder for AutoEq and user preset application.
    (void)presetName;
}

void DspRack::process(AudioBuffer& buffer) {
    for (auto& plugin : plugins_) {
        plugin->process(buffer);
    }
}

void DspRack::setBufferMs(int bufferMs) {
    bufferMs_ = std::clamp(bufferMs, 5, 500);
}

}  // namespace ytenv

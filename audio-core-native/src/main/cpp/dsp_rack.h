#pragma once

#include <algorithm>
#include <memory>
#include <string>
#include <vector>

namespace ytenv {

struct AudioBuffer {
    float* left = nullptr;
    float* right = nullptr;
    int frames = 0;
};

class DspPlugin {
public:
    virtual ~DspPlugin() = default;
    virtual void process(AudioBuffer& buffer) = 0;
    virtual const char* name() const = 0;
};

class ParametricEqPlugin final : public DspPlugin {
public:
    void process(AudioBuffer& buffer) override;
    const char* name() const override { return "parametric_eq_15_band"; }
};

class CompressorPlugin final : public DspPlugin {
public:
    void process(AudioBuffer& buffer) override;
    const char* name() const override { return "compressor"; }
};

class StereoWidenerPlugin final : public DspPlugin {
public:
    void process(AudioBuffer& buffer) override;
    const char* name() const override { return "stereo_widener"; }
};

class DspRack {
public:
    void addDefaultChain();
    void applyPreset(const std::string& presetName);
    void process(AudioBuffer& buffer);
    void setBufferMs(int bufferMs);
    int bufferMs() const { return bufferMs_; }

private:
    int bufferMs_ = 50;
    std::vector<std::unique_ptr<DspPlugin>> plugins_;
};

}  // namespace ytenv

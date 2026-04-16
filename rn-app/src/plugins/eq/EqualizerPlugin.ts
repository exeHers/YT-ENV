import {Plugin} from '../Plugin';

export type EqPreset = {
  id: string;
  name: string;
  gainsDb: number[]; // 15 bands
};

export class EqualizerPlugin implements Plugin {
  id = 'equalizer';
  displayName = '15-Band Parametric EQ';

  private currentBands = new Array<number>(15).fill(0);
  private presets: EqPreset[] = [{id: 'default', name: 'Default', gainsDb: new Array(15).fill(0)}];

  async initialize(): Promise<void> {}
  async shutdown(): Promise<void> {}

  setBandGain(index: number, gainDb: number): void {
    if (index < 0 || index >= this.currentBands.length) return;
    this.currentBands[index] = Math.max(-12, Math.min(12, gainDb));
  }

  getBandGains(): number[] {
    return [...this.currentBands];
  }

  savePreset(name: string): EqPreset {
    const preset: EqPreset = {
      id: `preset-${Date.now()}`,
      name,
      gainsDb: [...this.currentBands],
    };
    this.presets.push(preset);
    return preset;
  }

  listPresets(): EqPreset[] {
    return [...this.presets];
  }
}

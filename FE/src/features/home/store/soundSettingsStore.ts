import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SoundSettings {
  bgmEnabled: boolean;
  bgmVolume: number;
  sfxEnabled: boolean;
  sfxVolume: number;
}

interface SoundSettingsState extends SoundSettings {
  updateSettings: (settings: SoundSettings) => void;
}

const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  bgmEnabled: true,
  bgmVolume: 75,
  sfxEnabled: true,
  sfxVolume: 60,
};

export const useSoundSettingsStore = create<SoundSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SOUND_SETTINGS,
      updateSettings: (settings) => set(settings),
    }),
    {
      name: 'sound-settings-store',
    }
  )
);

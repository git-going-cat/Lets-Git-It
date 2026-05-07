import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AudioState {
  bgmEnabled: boolean;
  bgmVolume: number;
  sfxEnabled: boolean;
  sfxVolume: number;
  setBgmEnabled: (enabled: boolean) => void;
  setBgmVolume: (volume: number) => void;
  setSfxEnabled: (enabled: boolean) => void;
  setSfxVolume: (volume: number) => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set) => ({
      bgmEnabled: true,
      bgmVolume: 10,
      sfxEnabled: false,
      sfxVolume: 60,
      setBgmEnabled: (bgmEnabled) => set({ bgmEnabled }),
      setBgmVolume: (bgmVolume) => set({ bgmVolume }),
      setSfxEnabled: (sfxEnabled) => set({ sfxEnabled }),
      setSfxVolume: (sfxVolume) => set({ sfxVolume }),
    }),
    { name: 'audio-settings' }
  )
);

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
      bgmEnabled: true, // BGM 기본 활성 — 게임 분위기 즉시 제공
      bgmVolume: 10,
      sfxEnabled: false, // SFX 기본 비활성 — Phaser SFX 미구현 상태에서 의도치 않은 재생 방지
      sfxVolume: 60,
      setBgmEnabled: (bgmEnabled) => set({ bgmEnabled }),
      setBgmVolume: (bgmVolume) => set({ bgmVolume }),
      setSfxEnabled: (sfxEnabled) => set({ sfxEnabled }),
      setSfxVolume: (sfxVolume) => set({ sfxVolume }),
    }),
    { name: 'audio-settings' }
  )
);

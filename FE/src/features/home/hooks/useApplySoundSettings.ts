import { useEffect } from 'react';

import { useSoundSettingsStore } from '../store/soundSettingsStore';

type AudioChannel = 'bgm' | 'sfx';

function applyAudioSettings(channel: AudioChannel, enabled: boolean, volume: number) {
  const audioElements = document.querySelectorAll<HTMLAudioElement>(
    `audio[data-audio-channel="${channel}"]`
  );

  audioElements.forEach((audio) => {
    audio.volume = volume / 100;
    audio.muted = !enabled;
  });
}

/**
 * 전역 사운드 설정을 DOM 오디오 요소에 반영합니다.
 */
export function useApplySoundSettings() {
  const bgmEnabled = useSoundSettingsStore((state) => state.bgmEnabled);
  const bgmVolume = useSoundSettingsStore((state) => state.bgmVolume);
  const sfxEnabled = useSoundSettingsStore((state) => state.sfxEnabled);
  const sfxVolume = useSoundSettingsStore((state) => state.sfxVolume);

  useEffect(() => {
    applyAudioSettings('bgm', bgmEnabled, bgmVolume);
  }, [bgmEnabled, bgmVolume]);

  useEffect(() => {
    applyAudioSettings('sfx', sfxEnabled, sfxVolume);
  }, [sfxEnabled, sfxVolume]);
}

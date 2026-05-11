import { useEffect } from 'react';

import bgmSrc from '@/assets/sounds/bg_music.mp3';
import { useAudioStore } from '@/shared/store/audioStore';

/**
 * React Strict Mode의 이중 마운트로 인한 Audio 인스턴스 중복 생성을 막기 위해
 * 모듈 레벨 싱글톤으로 관리합니다.
 */
let _audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!_audio) {
    _audio = new Audio(bgmSrc);
    _audio.loop = true;
    _audio.volume = useAudioStore.getState().bgmVolume / 100;
  }
  return _audio;
}

/**
 * 전역 BGM을 재생·정지하고 볼륨을 조절하는 훅.
 * audioStore의 bgmEnabled/bgmVolume 변화를 구독해 Audio 싱글톤에 반영합니다.
 * 브라우저 자동재생 정책 차단 시 첫 사용자 상호작용에 재시도합니다.
 */
export function useBgm() {
  const { bgmEnabled, bgmVolume } = useAudioStore();

  useEffect(() => {
    const audio = getAudio();

    if (!bgmEnabled) {
      audio.pause();
      return;
    }

    const retry = () => {
      if (!useAudioStore.getState().bgmEnabled) return;
      void audio.play().catch(() => {});
    };

    void audio.play().catch(() => {
      document.addEventListener('click', retry, { once: true });
      document.addEventListener('keydown', retry, { once: true });
    });

    return () => {
      document.removeEventListener('click', retry);
      document.removeEventListener('keydown', retry);
    };
  }, [bgmEnabled]);

  useEffect(() => {
    getAudio().volume = bgmVolume / 100;
  }, [bgmVolume]);
}

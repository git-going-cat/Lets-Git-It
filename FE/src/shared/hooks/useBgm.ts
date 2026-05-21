import { useEffect } from 'react';

import bgmSrc from '@/assets/sounds/bg_music.mp3';
import { useAudioStore } from '@/shared/store/audioStore';

/**
 * React Strict Mode의 이중 마운트로 인한 Audio 인스턴스 중복 생성을 막기 위해
 * 모듈 레벨 싱글톤으로 관리합니다.
 */
let _audio: HTMLAudioElement | null = null;

function getAudio(src: string): HTMLAudioElement {
  if (!_audio) {
    _audio = new Audio(src);
    _audio.loop = true;
    _audio.volume = useAudioStore.getState().bgmVolume / 100;
  } else if (_audio.src !== new URL(src, document.baseURI).href) {
    // 라우트별 트랙이 달라지는 경우 싱글톤 교체
    _audio.pause();
    _audio.src = src;
    _audio.load();
  }
  return _audio;
}

interface UseBgmOptions {
  /** 사용할 BGM 트랙 src (생략 시 기본 트랙) */
  src?: string;
  /** true면 훅 마운트(라우트 진입) 시 currentTime=0으로 리셋 */
  resetOnMount?: boolean;
}

/**
 * 전역 BGM을 재생·정지하고 볼륨을 조절하는 훅.
 * src가 바뀌면 새 트랙으로 자동 교체합니다.
 * resetOnMount=true면 라우트 진입 시 처음부터 재생합니다.
 * 브라우저 자동재생 정책 차단 시 첫 사용자 상호작용에 재시도합니다.
 */
export function useBgm({ src = bgmSrc, resetOnMount = false }: UseBgmOptions = {}) {
  const { bgmEnabled, bgmVolume } = useAudioStore();

  useEffect(() => {
    if (resetOnMount) {
      getAudio(src).currentTime = 0;
    }
    // resetOnMount는 마운트 시점만 적용. 의존성 누락 의도적 무시.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    const audio = getAudio(src);

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
  }, [bgmEnabled, src]);

  useEffect(() => {
    getAudio(src).volume = bgmVolume / 100;
  }, [bgmVolume, src]);
}

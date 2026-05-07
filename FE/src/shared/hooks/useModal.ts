import { useEffect } from 'react';

interface UseModalOptions {
  isOpen: boolean;
  onClose?: () => void;
}

/**
 * 모달 공통 동작을 제공합니다.
 *
 * - ESC 키 입력 시 onClose 호출
 * - 모달 열림 시 배경 스크롤 잠금
 *
 * 게임 씬 입력 차단은 Phaser에서 처리하므로 이 훅에서는 다루지 않습니다.
 */
export function useModal({ isOpen, onClose }: UseModalOptions) {
  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);
}

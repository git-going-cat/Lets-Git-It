import { useEffect, useRef } from 'react';

interface UseModalOptions {
  isOpen: boolean;
  onClose?: () => void;
}

let nextModalId = 0;
const modalStack: number[] = [];

function removeModalFromStack(modalId: number) {
  const index = modalStack.lastIndexOf(modalId);
  if (index >= 0) {
    modalStack.splice(index, 1);
  }
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
  const modalIdRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  const canClose = onClose !== undefined;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || !canClose) return;

    if (modalIdRef.current === null) {
      nextModalId += 1;
      modalIdRef.current = nextModalId;
    }

    const modalId = modalIdRef.current;
    if (modalId === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (modalStack[modalStack.length - 1] !== modalId) return;

      onCloseRef.current?.();
    };

    modalStack.push(modalId);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      removeModalFromStack(modalId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, canClose]);

  useEffect(() => {
    if (!isOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);
}

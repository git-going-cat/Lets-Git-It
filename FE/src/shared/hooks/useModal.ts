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

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * 모달 공통 동작을 제공합니다.
 *
 * - ESC 키 입력 시 onClose 호출 (가장 위 모달만 반응 — 중첩 모달 안전)
 * - 모달 열림 시 배경 스크롤 잠금
 * - 열릴 때 컨테이너로 자동 포커스(첫 focusable 직행 금지 — 직전 keydown key-repeat 사고 방지), 닫힐 때 트리거 요소로 포커스 복귀
 * - Tab / Shift+Tab focus trap (모달 외부로 포커스 이탈 방지)
 *
 * 게임 씬 입력 차단은 Phaser에서 처리하므로 이 훅에서는 다루지 않습니다.
 *
 * @returns `containerRef` — 모달 컨테이너 div에 할당. focus trap / 자동 포커스 대상 영역. ref가 가리키는 요소는 `tabIndex={-1}` 부여 권장 (포커스 가능 요소가 0개일 때 fallback).
 */
export function useModal({ isOpen, onClose }: UseModalOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const modalIdRef = useRef<number | null>(null);
  const onCloseRef = useRef(onClose);
  const canClose = onClose !== undefined;

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // modalId 할당 + stack 관리는 canClose와 무관하게 isOpen인 모든 모달에 적용.
  // Tab focus trap의 top 가드가 close 불가 모달까지 포함해야 부모 모달의 trap이 자식 포커스를
  // 가로채는 사고를 막을 수 있다.
  useEffect(() => {
    if (!isOpen) return;

    if (modalIdRef.current === null) {
      nextModalId += 1;
      modalIdRef.current = nextModalId;
    }

    const modalId = modalIdRef.current;
    modalStack.push(modalId);
    return () => {
      removeModalFromStack(modalId);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !canClose) return;
    const modalId = modalIdRef.current;
    if (modalId === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (modalStack[modalStack.length - 1] !== modalId) return;

      onCloseRef.current?.();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
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

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    // 컨테이너로 포커스 — 첫 focusable로 직행하면 직전 keydown(Enter 등)의 key-repeat이
    // 포커스 직후 버튼에 흘러들어가 의도치 않은 click이 발생할 수 있음 (예: 영상 스킵 Enter → 다시하기 자동 클릭)
    containerRef.current?.focus();

    return () => {
      previousActiveElementRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const modalId = modalIdRef.current;
      // top 모달만 Tab을 처리. 가드가 없으면 부모 모달(아래 layer)의 핸들러가
      // 자식 모달 내부의 포커스를 자기 컨테이너로 끌어가 사용자가 Tab으로 자식
      // 모달의 버튼에 도달하지 못한다.
      if (modalId === null || modalStack[modalStack.length - 1] !== modalId) return;
      const container = containerRef.current;
      if (!container) return;

      const focusables = getFocusableElements(container);
      if (focusables.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      const isInModal = container.contains(active);

      // 모달 외부 포커스 방어 + 컨테이너 자체 포커스 시(모달 진입 직후) trap 양 끝 처리
      if (!isInModal || active === container) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return { containerRef };
}

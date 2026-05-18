import { useEffect } from 'react';

interface UseHomeEscSettingsParams {
  enabled: boolean;
  onOpenSettings: () => void;
}

/**
 * 홈 화면에서 ESC 키를 누르면 설정 모달을 여는 전역 키보드 핸들러를 등록합니다.
 */
export function useHomeEscSettings({ enabled, onOpenSettings }: UseHomeEscSettingsParams) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      onOpenSettings();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onOpenSettings]);
}

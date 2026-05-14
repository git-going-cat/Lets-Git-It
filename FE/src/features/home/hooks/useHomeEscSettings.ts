import { useEffect } from 'react';

interface UseHomeEscSettingsParams {
  enabled: boolean;
  onOpenSettings: () => void;
}

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

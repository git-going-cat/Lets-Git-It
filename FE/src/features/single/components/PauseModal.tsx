import PixelButton from '@/shared/components/PixelButton';
import PixelModal from '@/shared/components/PixelModal';

import { usePauseModal } from '../hooks/usePauseModal';

export default function PauseModal() {
  const { isVisible, onResume, onRestart, onSettings, onExit } = usePauseModal();

  return (
    <PixelModal isOpen={isVisible} onClose={onResume} title="PAUSED">
      <div className="flex flex-col gap-3 w-full">
        <PixelButton label="▶  이어하기" onClick={onResume} variant="primary" />
        <PixelButton label="↺  다시하기" onClick={onRestart} variant="secondary" />
        <PixelButton label="⚙  설정" onClick={onSettings} variant="secondary" />
        <PixelButton label="✕  나가기" onClick={onExit} variant="danger" />
      </div>
    </PixelModal>
  );
}

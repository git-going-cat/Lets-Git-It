import PauseModal from '@/shared/components/PauseModal';

import { usePauseModal } from '../hooks/usePauseModal';

export default function SinglePauseModal() {
  const { isVisible, onResume, onRestart, onExit } = usePauseModal();

  return (
    <PauseModal isOpen={isVisible} onResume={onResume} onRestart={onRestart} onExit={onExit} />
  );
}

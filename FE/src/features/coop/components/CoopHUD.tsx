import { useAtomValue } from 'jotai';

import { coopCompletedCountAtom, coopRoundAtom } from '../store/coopPhaseAtom';
import { coopElapsedSecondsAtom } from '../store/coopTimerAtom';

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const restSeconds = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${restSeconds}`;
}

export default function CoopHUD() {
  const round = useAtomValue(coopRoundAtom);
  const completedCount = useAtomValue(coopCompletedCountAtom);
  const elapsedSeconds = useAtomValue(coopElapsedSecondsAtom);
  const progressPercent = Math.min(100, Math.max(0, (completedCount / 20) * 100));

  return (
    <div className="pointer-events-none absolute top-0 right-0 left-0 z-20 grid grid-cols-3 items-center px-6 py-3 font-pixel text-white">
      <div className="text-lg drop-shadow">Round {round}/5</div>
      <div className="mx-auto h-3 w-64 border-2 border-dotted border-white/70 bg-gray-700/70">
        <div className="h-full bg-[#76BF41]" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="flex items-center justify-end gap-4">
        <div className="flex items-center gap-2 text-lg text-[#F2CB05] drop-shadow">
          <span aria-hidden="true">⏱</span>
          <span>{formatElapsed(elapsedSeconds)}</span>
        </div>
        <span className="border-2 border-dotted border-white bg-[#76BF41] px-3 py-2 text-sm text-white">
          {completedCount}/4 완료
        </span>
      </div>
    </div>
  );
}

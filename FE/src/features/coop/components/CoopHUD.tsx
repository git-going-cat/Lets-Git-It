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
  const totalCompleted = (round - 1) * 4 + completedCount;
  const progressPercent = Math.min(100, Math.max(0, (totalCompleted / 20) * 100));
  const progressLabel = `${Math.round(progressPercent)}%`;

  return (
    <div className="pointer-events-none flex h-full w-full items-center justify-between gap-6 px-4 py-2 font-pixel text-white">
      <div className="shrink-0 text-2xl drop-shadow">Round {round}/5</div>
      <div className="mx-auto h-4 w-full max-w-3xl border-2 border-dotted border-white/70 bg-gray-700/70">
        <div className="h-full bg-[#76BF41]" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="flex shrink-0 items-center justify-end gap-4">
        <span className="text-2xl text-[#76BF41] drop-shadow">{progressLabel}</span>
        <div className="flex items-center gap-2 text-2xl text-[#F2CB05] drop-shadow">
          <span aria-hidden="true">⏱</span>
          <span>{formatElapsed(elapsedSeconds)}</span>
        </div>
      </div>
    </div>
  );
}

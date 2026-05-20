import { useAtomValue } from 'jotai';
import { Clock3 } from 'lucide-react';

import { COOP_COMMANDS_PER_ROUND, COOP_TOTAL_COMMANDS, COOP_TOTAL_ROUNDS } from '../constants/game';
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
  const totalCompleted = (round - 1) * COOP_COMMANDS_PER_ROUND + completedCount;
  const progressPercent = Math.min(100, Math.max(0, (totalCompleted / COOP_TOTAL_COMMANDS) * 100));
  const progressLabel = `${Math.round(progressPercent)}%`;

  return (
    <div className="pointer-events-none flex h-full w-full items-center justify-between gap-4 px-4 py-2 font-pixel text-white">
      <div className="shrink-0 text-2xl drop-shadow">
        Round {round}/{COOP_TOTAL_ROUNDS}
      </div>
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
        <div className="h-10 w-full border-2 border-dotted border-white/70 bg-gray-700/70">
          <div className="h-full bg-[#76BF41]" style={{ width: `${progressPercent}%` }} />
        </div>
        <span className="shrink-0 text-2xl text-[#76BF41] drop-shadow">{progressLabel}</span>
      </div>
      <div className="flex shrink-0 items-center justify-end gap-1 text-2xl text-[#F2CB05] drop-shadow">
        <Clock3 aria-hidden="true" className="h-6 w-6" />
        <span>{formatElapsed(elapsedSeconds)}</span>
      </div>
    </div>
  );
}

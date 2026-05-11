import { useAtomValue } from 'jotai';

import { currentCommandIndexAtom } from '../store/commandIndexAtom';
import { useSingleStore } from '../store/singleStore';
import { elapsedTimeAtom } from '../store/timerAtom';

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60)
    .toString()
    .padStart(2, '0');
  const s = (totalSec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function GameProgress() {
  const commandIndex = useAtomValue(currentCommandIndexAtom);
  const { commandSet } = useSingleStore();
  const elapsedMs = useAtomValue(elapsedTimeAtom);

  const total = commandSet.length;
  const value = Math.min(commandIndex, total);
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div className="font-pixel flex w-full items-center gap-4 px-4 py-2">
      <span className="shrink-0 text-2xl text-gray-800">
        {value}/{total}
      </span>
      <progress className="nes-progress is-primary w-full" value={value} max={total} />
      <span className="shrink-0 text-2xl text-gray-800">{pct}%</span>
      <span className="shrink-0 text-2xl text-gray-800">⏱ {formatTime(elapsedMs)}</span>
    </div>
  );
}

import { useAtomValue } from 'jotai';

import { currentCommandIndexAtom } from '../store/commandIndexAtom';
import { useSingleStore } from '../store/singleStore';

export default function GameProgress() {
  const commandIndex = useAtomValue(currentCommandIndexAtom);
  const { commandSet } = useSingleStore();

  const total = commandSet.length;
  const value = Math.min(commandIndex, total);
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <div
      className="flex w-4/5 items-center gap-3 px-4 py-2"
      style={{ fontFamily: "'Press Start 2P', monospace" }}
    >
      <span className="shrink-0 text-sm text-gray-400">
        {value}/{total}
      </span>
      <progress className="nes-progress is-primary w-full" value={value} max={total} />
      <span className="shrink-0 text-sm text-gray-400">{pct}%</span>
    </div>
  );
}

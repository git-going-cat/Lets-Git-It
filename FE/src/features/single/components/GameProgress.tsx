import { useAtomValue } from 'jotai';

import SharedGameProgress from '@/shared/components/GameProgress';

import { currentCommandIndexAtom } from '../store/commandIndexAtom';
import { useSingleStore } from '../store/singleStore';
import { elapsedTimeAtom } from '../store/timerAtom';

export default function GameProgress() {
  const commandIndex = useAtomValue(currentCommandIndexAtom);
  const { commandSet } = useSingleStore();
  const elapsedMs = useAtomValue(elapsedTimeAtom);

  return (
    <SharedGameProgress value={commandIndex} total={commandSet.length} elapsedMs={elapsedMs} />
  );
}

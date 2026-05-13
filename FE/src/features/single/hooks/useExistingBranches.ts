import { useMemo } from 'react';
import { useAtomValue } from 'jotai';

import { parseSwitchTarget } from '@/shared/game/branchParser';

import { currentCommandIndexAtom } from '../store/commandIndexAtom';
import { useSingleStore } from '../store/singleStore';

/**
 * 현재 시점에 실제 존재하는 브랜치 집합.
 * commandSet[0..commandIndex)의 CREATE는 add, MERGE는 delete로 재생한다.
 * miss 시에도 SingleScene이 applyBranchEffect를 호출하며 commandIndex가 증가하므로
 * 성공·실패와 무관하게 동일한 기준으로 맞물린다.
 */
export function useExistingBranches(): Set<string> {
  const commandIndex = useAtomValue(currentCommandIndexAtom);
  const commandSet = useSingleStore((s) => s.commandSet);

  return useMemo(() => {
    const set = new Set<string>(['main']);
    for (let i = 0; i < commandIndex; i++) {
      const cmd = commandSet[i];
      if (!cmd) continue;
      const target = parseSwitchTarget(cmd.text);
      if (!target) continue;
      if (cmd.type === 'CREATE') set.add(target);
      else if (cmd.type === 'MERGE') set.delete(target);
    }
    return set;
  }, [commandSet, commandIndex]);
}

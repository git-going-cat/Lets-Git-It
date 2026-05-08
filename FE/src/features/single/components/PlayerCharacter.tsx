import { useEffect, useState } from 'react';

import { EventBus } from '@/core/bridge/EventBus';
import AnimatedCharacter from '@/shared/components/AnimatedCharacter';
import { useCurrentCharacterAsset } from '@/shared/hooks/useCurrentCharacterAsset';

import { useSingleStore } from '../store/singleStore';

export default function PlayerCharacter() {
  const commandSet = useSingleStore((s) => s.commandSet);
  const { data: asset } = useCurrentCharacterAsset();
  const [activeBranch, setActiveBranch] = useState('main');

  useEffect(() => {
    const handler = ({ branch }: { branch: string }) => setActiveBranch(branch);
    EventBus.on('branch:switch', handler);
    return () => {
      EventBus.off('branch:switch', handler);
    };
  }, []);

  if (!asset) return null;

  const branches = [...new Set(commandSet.map((c) => c.branchName))];
  const totalLanes = branches.length || 1;
  const resolvedBranch =
    branches.length > 0 && !branches.includes(activeBranch) ? branches[0] : activeBranch;
  const laneIndex = Math.max(0, branches.indexOf(resolvedBranch));
  const leftPercent = ((laneIndex + 0.5) / totalLanes) * 100;

  return (
    <div className="absolute bottom-2 z-10 -translate-x-1/2" style={{ left: `${leftPercent}%` }}>
      <AnimatedCharacter asset={asset} animation="idle" className="h-24 w-12" />
    </div>
  );
}

import { useAtomValue } from 'jotai';

import {
  coopGraphActiveSequenceAtom,
  coopGraphCompletedSequencesAtom,
} from '../store/coopPhaseAtom';
import { useCoopStore } from '../store/coopStore';

import CoopGraph from './CoopGraph';

export default function CoopGitShapePanel() {
  const graphData = useCoopStore((state) => state.graphData);
  const completedSequences = useAtomValue(coopGraphCompletedSequencesAtom);
  const activeSequence = useAtomValue(coopGraphActiveSequenceAtom);

  return (
    <div className="flex h-96 w-full max-w-3xl flex-col items-center justify-center text-white drop-shadow-lg">
      <h2 className="mb-3 font-pixel text-2xl text-gray-200">Git Branch History</h2>
      <div className="flex w-full flex-1 items-center justify-center">
        {graphData ? (
          <div className="flex h-full w-full items-center justify-center p-4">
            <CoopGraph
              graphData={graphData}
              completedSequences={completedSequences}
              activeSequence={activeSequence}
            />
          </div>
        ) : (
          <p className="font-pixel text-xs text-gray-300">목표 형상 정보를 불러오는 중...</p>
        )}
      </div>
    </div>
  );
}

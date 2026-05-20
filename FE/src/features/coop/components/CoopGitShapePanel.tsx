import { useAtomValue } from 'jotai';

import { coopMyCommandCompletedAtom } from '../store/coopCommandsAtom';
import {
  coopCompletedCountAtom,
  coopGraphActiveSequenceAtom,
  coopGraphCompletedSequencesAtom,
} from '../store/coopPhaseAtom';
import { useCoopStore } from '../store/coopStore';

import CoopGraph from './CoopGraph';

interface CoopGitShapePanelProps {
  myCommand?: string | null;
}

export default function CoopGitShapePanel({ myCommand = null }: CoopGitShapePanelProps) {
  const graphData = useCoopStore((state) => state.graphData);
  const completedSequences = useAtomValue(coopGraphCompletedSequencesAtom);
  const activeSequence = useAtomValue(coopGraphActiveSequenceAtom);
  const completedCount = useAtomValue(coopCompletedCountAtom);
  const isMyCommandCompleted = useAtomValue(coopMyCommandCompletedAtom);
  const roundSteps = [1, 2, 3, 4];

  return (
    <div className="flex h-full w-full flex-col rounded-xl border border-gray-700 bg-[#0A0A14] p-6 text-white drop-shadow-lg">
      <h2 className="mb-3 font-pixel text-2xl text-gray-200">Git Branch History</h2>
      <div className="flex w-full flex-1 items-center justify-center gap-6">
        <div className="flex min-w-0 flex-1 items-center justify-center">
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
        {myCommand && (
          <div className="h-28 w-48 shrink-0 [perspective:900px]">
            <div
              className={`relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                isMyCommandCompleted ? '[transform:rotateY(180deg)]' : ''
              }`}
            >
              <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-[#5C4A2A] bg-[#8B7355] p-3 shadow-[0_0_18px_rgba(118,191,65,0.12)] [backface-visibility:hidden]">
                <code className="whitespace-pre-wrap text-center font-mono text-sm text-white">
                  {myCommand}
                </code>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg border border-[#76BF41] bg-[#102414] p-3 text-[#76BF41] shadow-[0_0_28px_rgba(118,191,65,0.45)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <span className="font-mono text-lg font-bold">DONE</span>
                <span className="font-pixel text-[10px] text-[#B6F27A]">input accepted</span>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-center gap-4">
        {roundSteps.map((step) => (
          <img
            key={step}
            src="/assets/coop/cat_pixel.png"
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`h-20 w-20 object-contain [image-rendering:pixelated] ${
              step <= completedCount ? 'opacity-100 grayscale-0' : 'grayscale opacity-30'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

import { useAtomValue } from 'jotai';

import { coopGraphImageUrlAtom } from '../store/coopPhaseAtom';

import CoopGraph from './CoopGraph';

const MOCK_COMPLETED_SEQUENCES = [1, 2, 3, 4, 5];
const MOCK_ACTIVE_SEQUENCE = 6;
const MOCK_MAP_ID = 1;

export default function CoopGitShapePanel() {
  const graphImageUrl = useAtomValue(coopGraphImageUrlAtom);

  return (
    <div className="flex h-96 w-full max-w-lg flex-col items-center justify-center text-white drop-shadow-lg">
      <h2 className="mb-4 font-pixel text-3xl text-gray-200">Git Branch History</h2>
      <div className="flex w-full flex-1 items-center justify-center">
        {graphImageUrl ? (
          <img
            src={graphImageUrl}
            alt="Git Branch History"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4">
            <CoopGraph
              mapId={MOCK_MAP_ID}
              completedSequences={MOCK_COMPLETED_SEQUENCES}
              activeSequence={MOCK_ACTIVE_SEQUENCE}
            />
          </div>
        )}
      </div>
    </div>
  );
}

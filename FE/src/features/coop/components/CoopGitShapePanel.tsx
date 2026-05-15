import { useAtomValue } from 'jotai';

import { coopGraphImageUrlAtom } from '../store/coopPhaseAtom';

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
          <div className="font-pixel text-xl text-gray-400">형상 데이터를 기다리는 중...</div>
        )}
      </div>
    </div>
  );
}

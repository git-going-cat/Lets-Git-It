import { useAtomValue } from 'jotai';

import { coopMyCommandAtom } from '../store/coopCommandsAtom';
import { coopPhaseAtom } from '../store/coopPhaseAtom';

export default function CoopMyCardPanel() {
  const myCommand = useAtomValue(coopMyCommandAtom);
  const phase = useAtomValue(coopPhaseAtom);

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="relative h-64 w-44">
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center rounded-sm border-4 border-dotted border-[#76BF41] bg-[#101827] p-4 text-center shadow-2xl">
          <div className="mb-4 font-pixel text-sm text-gray-400">내 명령어</div>
          <div className="font-mono text-xl font-bold text-white">
            {phase === 'reveal' ? '???' : (myCommand ?? '???')}
          </div>
        </div>
      </div>
    </div>
  );
}

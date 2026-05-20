import { useAtomValue } from 'jotai';

import {
  coopPhaseAtom,
  coopResetTargetPlayerIdAtom,
  coopWrongPlayerNicknameAtom,
} from '../../store/coopPhaseAtom';
import { coopPlayersAtom } from '../../store/coopPlayersAtom';

export default function SirenOverlay() {
  const phase = useAtomValue(coopPhaseAtom);
  const resetTargetPlayerId = useAtomValue(coopResetTargetPlayerIdAtom);
  const wrongPlayerNickname = useAtomValue(coopWrongPlayerNicknameAtom);
  const players = useAtomValue(coopPlayersAtom);
  const isMe = players.some((player) => player.isMe && player.playerId === resetTargetPlayerId);

  if (phase !== 'wrong' && phase !== 'reset_wait') return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-red-900/40 font-pixel backdrop-blur-sm">
      <div className="relative flex flex-col items-center gap-4">
        <div className="flex h-24 w-24 animate-spin items-center justify-center rounded-full border-y-4 border-red-500 bg-red-600/80 shadow-2xl shadow-red-500/70">
          <span className="animate-pulse text-4xl">!</span>
        </div>

        <div className="animate-pulse border-4 border-dotted border-red-300 bg-red-800 px-8 py-4 text-center text-xl leading-8 text-white shadow-2xl">
          {isMe
            ? '순서가 틀렸습니다! git reset 을 입력하세요'
            : `${wrongPlayerNickname ?? '플레이어'}님이 순서를 틀렸습니다!`}
        </div>
      </div>
    </div>
  );
}

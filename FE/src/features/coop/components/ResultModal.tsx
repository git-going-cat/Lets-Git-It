import { useNavigate } from '@tanstack/react-router';

import PixelButton from '@/shared/components/PixelButton';
import PixelModal from '@/shared/components/PixelModal';

import { useCoopStore } from '../store/coopStore';

interface ResultModalProps {
  onBackToRoom?: () => void;
}

function formatElapsedMs(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  const centiseconds = Math.floor((ms % 1000) / 10)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}.${centiseconds}`;
}

export default function ResultModal({ onBackToRoom }: ResultModalProps) {
  const navigate = useNavigate();
  const result = useCoopStore((state) => state.result);
  const roomId = useCoopStore((state) => state.roomId);
  const clearSession = useCoopStore((state) => state.clearSession);

  const isVisible = result !== null;
  const isSuccess = result?.isSuccess === true;
  const results = result?.isSuccess === true ? result.results : [];
  const elapsedTime = result?.isSuccess === true ? result.elapsedTime : 0;
  const reason = result?.reason ?? null;
  const hasNewRecord = results.some((player) => player.newRecord === true);

  const cleanup = () => {
    clearSession();
  };

  const handleBackToRoom = () => {
    onBackToRoom?.();
    cleanup();
    if (roomId != null) {
      void navigate({ to: '/multi/$roomId', params: { roomId: String(roomId) } });
      return;
    }

    void navigate({ to: '/home' });
  };

  const handleHome = () => {
    cleanup();
    void navigate({ to: '/home' });
  };

  return (
    <PixelModal isOpen={isVisible} title="협력 게임 결과">
      <span
        className={`nes-text text-2xl tracking-widest ${isSuccess ? 'is-success' : 'is-warning'}`}
      >
        {isSuccess ? 'GAME COMPLETED' : 'GAME ENDED'}
      </span>

      {isSuccess ? (
        <p className="m-0 flex items-center justify-center gap-3 text-center font-pixel text-xl text-white">
          소요 시간 <span className="text-[#F2CB05]">{formatElapsedMs(elapsedTime)}</span>
          {hasNewRecord && (
            <span className="animate-pulse rounded-sm bg-[#F2CB05] px-2 py-1 text-sm text-[#1A1D2E]">
              NEW
            </span>
          )}
        </p>
      ) : (
        <p className="m-0 text-center font-pixel text-base text-yellow-300">
          {reason === 'PLAYER_DISCONNECTED'
            ? '플레이어 이탈로 게임이 종료되었습니다.'
            : '게임이 종료되었습니다.'}
        </p>
      )}

      {isSuccess && (
        <div className="flex w-full min-w-96 flex-col gap-2">
          {results.map((player) => {
            const totalWrong = player.wrongTypeCount + player.wrongOrderCount;
            return (
              <div
                key={player.playerId}
                className="flex items-center justify-between gap-4 border-2 border-dotted border-white/40 px-3 py-2 font-pixel text-sm text-white"
              >
                <span className="shrink-0 text-[#F2CB05]">{player.ranking}위</span>
                <span className="min-w-0 flex-1 truncate">{player.nickname}</span>
                <span className="shrink-0 text-gray-300">오타 {player.wrongTypeCount}</span>
                <span className="shrink-0 text-gray-300">순서 {player.wrongOrderCount}</span>
                <span className="shrink-0 text-cyan-300">총 {totalWrong}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 flex w-full flex-col gap-2">
        <PixelButton label="방으로" onClick={handleBackToRoom} variant="primary" />
        <PixelButton label="메인으로" onClick={handleHome} />
      </div>
    </PixelModal>
  );
}

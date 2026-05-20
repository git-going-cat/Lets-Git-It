import { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from '@tanstack/react-router';

import PixelButton from '@/shared/components/PixelButton';
import PixelModal from '@/shared/components/PixelModal';

import { useCoopStore } from '../store/coopStore';

import type { CoopGameEndMessage } from '@/features/multi/schemas/coop.schema';

interface ResultModalProps {
  onBackToRoom?: () => void;
}

type CoopSuccessResult = Extract<CoopGameEndMessage, { isSuccess: true }>['results'][number];

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

function sortServerResults(results: CoopSuccessResult[]) {
  return [...results].sort((a, b) => {
    if (a.ranking !== b.ranking) return a.ranking - b.ranking;
    return a.nickname.localeCompare(b.nickname);
  });
}

function getFailureMessage(result: CoopGameEndMessage | null) {
  if (result?.isSuccess !== false) {
    return '게임이 정상적으로 종료되지 않았습니다.';
  }

  switch (result.reason) {
    case 'RESULT_TIMEOUT':
      return '서버의 게임 결과를 받지 못했습니다. 네트워크 탭에서 COOP_GAME_END 수신 여부를 확인해 주세요.';
    case 'DB_SAVE_FAILED':
      return '서버가 게임 결과 저장에 실패했습니다. 결과 저장 로그를 확인해 주세요.';
    case 'PLAYER_DISCONNECTED':
      return result.nickname
        ? `${result.nickname} 님의 연결이 종료되어 게임이 중단되었습니다.`
        : '플레이어 연결이 종료되어 게임이 중단되었습니다.';
    case 'TOKEN_BLACKLISTED':
    case 'LOGGED_OUT':
    case 'REPLACED_BY_NEW_LOGIN':
      return '로그인 세션이 종료되어 게임 연결이 끊겼습니다. 다시 로그인해 주세요.';
    default:
      return `게임이 종료되었습니다. reason: ${result.reason}`;
  }
}

export default function ResultModal({ onBackToRoom }: ResultModalProps) {
  const navigate = useNavigate();
  const result = useCoopStore((state) => state.result);
  const roomId = useCoopStore((state) => state.roomId);
  const clearSession = useCoopStore((state) => state.clearSession);

  const isVisible = result !== null;
  const isSuccess = result?.isSuccess === true;
  const shouldAutoReturn = isSuccess || result?.reason === 'PLAYER_DISCONNECTED';
  const results = useMemo(
    () => (result?.isSuccess === true ? sortServerResults(result.results) : []),
    [result]
  );
  const elapsedTime = result?.isSuccess === true ? result.elapsedTime : 0;
  const hasNewRecord = results.some((player) => player.isNewRecord === true);
  const duplicatedRankings = useMemo(() => {
    const counts = new Map<number, number>();
    results.forEach((player) => {
      counts.set(player.ranking, (counts.get(player.ranking) ?? 0) + 1);
    });
    return counts;
  }, [results]);

  const cleanup = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const handleBackToRoom = useCallback(() => {
    onBackToRoom?.();
    cleanup();
    if (roomId != null) {
      void navigate({
        to: '/multi/$roomId',
        params: { roomId: String(roomId) },
        search: { fromGameResult: true },
      });
      return;
    }

    void navigate({ to: '/home' });
  }, [cleanup, navigate, onBackToRoom, roomId]);

  const handleHome = useCallback(() => {
    cleanup();
    void navigate({ to: '/home' });
  }, [cleanup, navigate]);

  useEffect(() => {
    if (!isVisible || !shouldAutoReturn) return;
    const timerId = window.setTimeout(handleBackToRoom, 10_000);
    return () => window.clearTimeout(timerId);
  }, [handleBackToRoom, isVisible, shouldAutoReturn]);

  return (
    <PixelModal isOpen={isVisible} title={isSuccess ? '협력 게임 결과' : '게임 종료'}>
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
        <div className="flex max-w-lg flex-col gap-2 text-center font-pixel">
          <p className="m-0 text-base leading-relaxed text-yellow-300">
            {getFailureMessage(result)}
          </p>
          {result?.isSuccess === false && (
            <p className="m-0 text-xs leading-relaxed text-gray-300">
              reason: {result.reason}
              {result.gameSessionId ? ` / session: ${result.gameSessionId}` : ''}
            </p>
          )}
        </div>
      )}

      {isSuccess && (
        <div className="flex w-full min-w-96 flex-col gap-2">
          {results.map((player) => {
            const totalWrong = player.wrongTypeCount + player.wrongOrderCount;
            const rankingLabel =
              (duplicatedRankings.get(player.ranking) ?? 0) > 1
                ? `공동 ${player.ranking}위`
                : `${player.ranking}위`;

            return (
              <div
                key={player.playerId}
                className={`flex items-center justify-between gap-4 border-2 border-dotted px-3 py-2 font-pixel text-sm text-white ${
                  player.ranking === 1 ? 'border-[#F2CB05]/70 bg-[#F2CB05]/10' : 'border-white/40'
                }`}
              >
                <span className="w-20 shrink-0 text-[#F2CB05]">{rankingLabel}</span>
                <span className="min-w-0 flex-1 truncate">{player.nickname}</span>
                <span className="shrink-0 text-gray-300">오타 {player.wrongTypeCount}</span>
                <span className="shrink-0 text-gray-300">리셋 {player.wrongOrderCount}</span>
                <span className="shrink-0 text-cyan-300">총 {totalWrong}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-2 flex w-full flex-col gap-2">
        <PixelButton label="대기실로 돌아가기" onClick={handleBackToRoom} variant="primary" />
        {isSuccess && <PixelButton label="메인으로" onClick={handleHome} />}
      </div>
    </PixelModal>
  );
}

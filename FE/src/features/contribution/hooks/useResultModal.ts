import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import { leaveRoom } from '@/features/multi/api/room.api';
import { gameStatusAtom } from '@/shared/store/gameStatusAtom';

import { useContributionStore } from '../store/contributionStore';
import { gameResultAtom } from '../store/gameResultAtom';

const AUTO_RETURN_MS = 10_000;

/**
 * 기여도 뺏기 게임 결과 모달 표시를 제어하는 훅.
 *
 * - gameStatus === 'ended' && result !== null 일 때 모달을 표시한다.
 * - onBackToRoom: cleanup 후 대기실로 복귀 (roomId 없으면 /home).
 * - onHome: leaveRoom API 호출 후 /home으로 이동.
 * - AUTO_RETURN_MS(10초) 후 자동으로 onBackToRoom 실행.
 * - remainingSeconds: 자동 복귀까지 남은 초 (1초 주기 갱신).
 */
export function useResultModal() {
  const gameStatus = useAtomValue(gameStatusAtom);
  const setGameStatus = useSetAtom(gameStatusAtom);
  const [result, setResult] = useAtom(gameResultAtom);
  const myPlayerId = useContributionStore((s) => s.myPlayerId);
  const roomId = useContributionStore((s) => s.roomId);
  const clearSession = useContributionStore((s) => s.clearSession);
  const navigate = useNavigate();

  const isVisible = gameStatus === 'ended' && result !== null;
  const isSuccess = result?.isSuccess === true;
  const rankings = isSuccess ? result.rankings : [];
  const myRank = rankings.find((r) => r.playerId === myPlayerId)?.rank ?? null;
  const reason = result?.reason ?? null;

  const cleanup = () => {
    setResult(null);
    setGameStatus('idle');
    clearSession();
  };

  const onBackToRoom = () => {
    cleanup();
    if (roomId != null) {
      void navigate({ to: '/multi/$roomId', params: { roomId: String(roomId) } });
    } else {
      // roomId 없는 비정상 케이스 — 로비 모달(기여도 뺏기)이 열리도록 lobby search를 동반한다.
      void navigate({ to: '/home', search: { lobby: 'CONTRIBUTION' } });
    }
  };

  const onHome = () => {
    // cleanup()이 clearSession()을 호출하면 roomId가 null로 바뀌어
    // useRoomExitGuard의 leave 예약이 취소된다. 따라서 cleanup() 전에 roomId를 캡처해 직접 호출.
    if (roomId != null) {
      void leaveRoom(roomId).catch(() => {});
    }
    cleanup();
    // 로비 모달이 다시 열리도록 lobby search를 동반한다.
    void navigate({ to: '/home', search: { lobby: 'CONTRIBUTION' } });
  };

  // 자동 복귀 타이머
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const onBackToRoomRef = useRef(onBackToRoom);
  useEffect(() => {
    onBackToRoomRef.current = onBackToRoom;
  });

  useEffect(() => {
    if (!isVisible) return;
    // endsAt 설정은 effect body 밖(비동기 callback)에서 — react-hooks/set-state-in-effect 회피.
    // targetTime은 effect 실행 시각 기준으로 캡처하여 정확도를 유지한다.
    const targetTime = Date.now() + AUTO_RETURN_MS;
    const initId = window.setTimeout(() => setEndsAt(targetTime), 0);
    const tickId = window.setInterval(() => setNow(Date.now()), 1000);
    const navId = window.setTimeout(() => {
      onBackToRoomRef.current();
    }, AUTO_RETURN_MS);
    return () => {
      window.clearTimeout(initId);
      window.clearInterval(tickId);
      window.clearTimeout(navId);
    };
  }, [isVisible]);

  const remainingSeconds: number | null =
    isVisible && endsAt !== null ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : null;

  return {
    isVisible,
    isSuccess,
    rankings,
    myRank,
    reason,
    myPlayerId,
    onBackToRoom,
    onHome,
    remainingSeconds,
  };
}

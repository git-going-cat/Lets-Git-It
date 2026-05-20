import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import Phaser from 'phaser';

import screenBg from '@/assets/bg/screen.png';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useInGameRoomEvents } from '@/features/multi/hooks/useInGameRoomEvents';
import { createGameConfig } from '@/game/config';
import SharedCommandInput from '@/shared/components/CommandInput';
import SharedGameProgress from '@/shared/components/GameProgress';
import { gameStatusAtom } from '@/shared/store/gameStatusAtom';

import { contributionBus } from '../bridge/contributionBus';
import { useContributionGame } from '../hooks/useContributionGame';
import { useContributionInput } from '../hooks/useContributionInput';
import { ContributionScene } from '../scenes/ContributionScene';
import { useContributionStore } from '../store/contributionStore';
import { progressAtom } from '../store/progressAtom';

import MultiPlayerCharacters from './MultiPlayerCharacters';
import PlayerRankingList from './PlayerRankingList';

export default function ContributionGameContent() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [shaking, setShaking] = useState(false);
  // 250ms마다 갱신되는 wall-clock — 카운트다운을 derived 값으로 계산하기 위한 트리거.
  const [now, setNow] = useState(() => Date.now());
  const [privateError, setPrivateError] = useState<{ code: string; message: string } | null>(null);
  const [roomNotice, setRoomNotice] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const gameDestroyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roomNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = useAtomValue(progressAtom);
  const gameStatus = useAtomValue(gameStatusAtom);

  const clientStartAt = useContributionStore((s) => s.clientStartAt);
  const roomId = useContributionStore((s) => s.roomId);

  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleForceDisconnect = useCallback(() => {
    clearAuth();
    void navigate({ to: '/login' });
  }, [clearAuth, navigate]);

  const handleKicked = useCallback(() => {
    useContributionStore.getState().clearSession();
    void navigate({ to: '/home', search: { lobby: 'CONTRIBUTION' } });
  }, [navigate]);

  const handlePrivateError = useCallback((code: string, message: string) => {
    setPrivateError({ code, message });
  }, []);

  const handlePlayerLeft = useCallback((message: { leftPlayerNickname: string }) => {
    if (roomNoticeTimerRef.current !== null) {
      clearTimeout(roomNoticeTimerRef.current);
    }
    setRoomNotice(`${message.leftPlayerNickname} 님이 게임에서 나갔습니다.`);
    roomNoticeTimerRef.current = window.setTimeout(() => {
      roomNoticeTimerRef.current = null;
      setRoomNotice(null);
    }, 3000);
  }, []);

  useContributionGame({
    onForceDisconnect: handleForceDisconnect,
    onKicked: handleKicked,
    onPrivateError: handlePrivateError,
  });

  useInGameRoomEvents({
    roomId,
    onPlayerLeft: handlePlayerLeft,
  });
  // 입력 실패(오타·없는 브랜치) 피드백 — 연속 발화 시 애니메이션 재시작되도록 false→true 토글.
  const triggerShake = useCallback(() => {
    setShaking(false);
    setTimeout(() => setShaking(true), 0);
  }, []);

  useEffect(() => {
    return contributionBus.subscribe('command:failed', triggerShake);
  }, [triggerShake]);

  useEffect(
    () => () => {
      if (roomNoticeTimerRef.current !== null) {
        clearTimeout(roomNoticeTimerRef.current);
      }
    },
    []
  );

  // 카운트다운 동안만 now를 250ms마다 갱신. gameStatus가 'playing'이 되면 interval 정리.
  // (setState를 effect body에서 직접 호출하지 않기 위해 countdown은 derived 값으로 계산)
  useEffect(() => {
    if (gameStatus === 'playing' || !clientStartAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [gameStatus, clientStartAt]);

  const countdown: number | null = (() => {
    if (gameStatus === 'playing' || !clientStartAt) return null;
    const remaining = Math.ceil((clientStartAt - now) / 1000);
    return remaining > 0 ? remaining : null;
  })();

  // 경과 시간 — gameStatus === 'playing' 동안 100ms마다 증가
  useEffect(() => {
    if (gameStatus !== 'playing') return;
    const id = window.setInterval(() => {
      setElapsedMs((prev) => prev + 100);
    }, 100);
    return () => window.clearInterval(id);
  }, [gameStatus]);

  // Phaser 마운트 — StrictMode fake-unmount 시 destroy를 setTimeout으로 지연해
  // AudioContext가 닫힌 채로 visibility resume이 호출되는 InvalidStateError 방지.
  useEffect(() => {
    if (!containerRef.current) return;

    if (gameDestroyTimerRef.current !== null) {
      clearTimeout(gameDestroyTimerRef.current);
      gameDestroyTimerRef.current = null;
    } else {
      const game = new Phaser.Game({
        ...createGameConfig([ContributionScene]),
        parent: containerRef.current,
      });
      gameRef.current = game;
      // 멀티 모드는 서버가 타이밍을 관리하므로 탭 비활성화 시에도 Phaser 루프를 멈추지 않는다.
      // Phaser 기본 동작(visibilitychange hidden → loop.sleep)을 즉시 되돌려 RAF를 재시작한다.
      game.events.on(Phaser.Core.Events.HIDDEN, () => {
        game.loop.focus();
      });
    }

    return () => {
      gameDestroyTimerRef.current = setTimeout(() => {
        gameDestroyTimerRef.current = null;
        gameRef.current?.destroy(true);
        gameRef.current = null;
      }, 0);
    };
  }, []);

  const {
    inputRef,
    inputValue,
    history,
    isInputDisabled,
    activeBranch,
    handleInputChange,
    handleKeyDown,
  } = useContributionInput();

  return (
    <div className="relative flex h-screen overflow-hidden text-white">
      <img
        src={screenBg}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-60"
        aria-hidden="true"
        draggable={false}
      />

      {/* 중앙 — 좌측 사이드바 없어서 flex-1로 나머지 공간 전체 사용 */}
      <div className="relative grid h-full flex-1 grid-rows-single-game">
        <SharedGameProgress value={progress.current} total={progress.total} elapsedMs={elapsedMs} />
        <div
          ref={containerRef}
          className={`relative overflow-hidden ${shaking ? 'animate-screen-shake' : ''}`}
          onAnimationEnd={() => setShaking(false)}
        >
          <MultiPlayerCharacters />
          {gameStatus !== 'playing' && countdown !== null && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70">
              <p className="text-gray-300 text-lg">게임 시작까지</p>
              <p className="text-white text-8xl font-bold tabular-nums">{countdown}</p>
            </div>
          )}
          {privateError && (
            <div className="absolute top-2 left-1/2 z-30 -translate-x-1/2 flex items-center gap-2 rounded border border-red-500/60 bg-black/80 px-4 py-2 text-sm text-red-400">
              <span>{privateError.message}</span>
              <button
                type="button"
                onClick={() => setPrivateError(null)}
                className="ml-1 text-red-400/70 hover:text-red-300"
                aria-label="에러 닫기"
              >
                ✕
              </button>
            </div>
          )}
          {roomNotice && (
            <div className="absolute top-12 left-1/2 z-30 -translate-x-1/2 rounded border border-yellow-400/60 bg-black/80 px-4 py-2 font-pixel text-sm text-yellow-300">
              {roomNotice}
            </div>
          )}
        </div>
        <SharedCommandInput
          inputRef={inputRef}
          value={inputValue}
          history={history}
          isPlaying={!isInputDisabled}
          activeBranch={activeBranch}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* 우측 — 플레이어 기여도 랭킹 */}
      <div className="relative flex w-game-sidebar flex-col border-l border-gray-700">
        <PlayerRankingList />
      </div>
    </div>
  );
}

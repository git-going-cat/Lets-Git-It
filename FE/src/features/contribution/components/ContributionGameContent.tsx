import { useCallback, useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import Phaser from 'phaser';

import screenBg from '@/assets/bg/screen.png';
import { createGameConfig } from '@/game/config';
import SharedCommandInput from '@/shared/components/CommandInput';
import SharedGameProgress from '@/shared/components/GameProgress';
import { gameStatusAtom } from '@/shared/store/gameStatusAtom';

import { contributionBus } from '../bridge/contributionBus';
import { useMockContributionWs } from '../dev/useMockContributionWs';
import { useContributionGame } from '../hooks/useContributionGame';
import { useContributionInput } from '../hooks/useContributionInput';
import { ContributionScene } from '../scenes/ContributionScene';
import { progressAtom } from '../store/progressAtom';

import MultiPlayerCharacters from './MultiPlayerCharacters';
import PlayerRankingList from './PlayerRankingList';

export default function ContributionGameContent() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [shaking, setShaking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const progress = useAtomValue(progressAtom);
  const gameStatus = useAtomValue(gameStatusAtom);

  useContributionGame();
  useMockContributionWs(); // TODO: WS 연동 완료 시 이 줄 + import 삭제

  // 입력 실패(오타·없는 브랜치) 피드백 — 연속 발화 시 애니메이션 재시작되도록 false→true 토글.
  const triggerShake = useCallback(() => {
    setShaking(false);
    setTimeout(() => setShaking(true), 0);
  }, []);

  useEffect(() => {
    return contributionBus.subscribe('command:failed', triggerShake);
  }, [triggerShake]);

  // 경과 시간 — gameStatus === 'playing' 동안 100ms마다 증가
  useEffect(() => {
    if (gameStatus !== 'playing') return;
    const id = window.setInterval(() => {
      setElapsedMs((prev) => prev + 100);
    }, 100);
    return () => window.clearInterval(id);
  }, [gameStatus]);

  // Phaser 마운트 — containerRef가 연결되면 한 번만 생성
  useEffect(() => {
    if (!containerRef.current) return;
    const game = new Phaser.Game({
      ...createGameConfig([ContributionScene]),
      parent: containerRef.current,
    });
    return () => {
      game.destroy(true);
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

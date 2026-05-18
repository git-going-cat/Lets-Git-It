import { useMemo } from 'react';
import { useAtomValue } from 'jotai';

import { gameStatusAtom } from '@/shared/store/gameStatusAtom';
import { typoCountAtom } from '@/shared/store/typoAtom';

import { churuCountAtom } from '../store/churuAtom';
import { commandTimestampsAtom } from '../store/commandTimestampsAtom';
import { MAX_LIVES } from '../store/livesAtom';
import { livesLostAtom } from '../store/livesLostAtom';
import { maxComboAtom } from '../store/maxComboAtom';
import { useSingleStore } from '../store/singleStore';
import { elapsedTimeAtom } from '../store/timerAtom';
import { calcScore, countScoringCommands } from '../utils/scoreCalculator';

import type { Grade } from '@/shared/types/game.types';

/**
 * 현재 타이핑 페이스 기반으로 게임 종료 시점 등급을 추정합니다.
 *
 * - 명령어 3개 이상 완료 전에는 `null` 반환 (초반 변동성 억제)
 * - **속도(C)**: 최근 `ROLLING_WINDOW`개 명령어 인터벌의 평균을 사용 (변화 반응성↑).
 *   직전 명령어 이후 침묵 시간(`elapsedMs - lastTs`)이 평균보다 크면 그 값을 채택해 손 멈춤을 즉시 반영.
 * - **시간(A)**: 예상 완주 시간 = 경과 시간 + 남은 명령어 수 × rolling 평균
 * - **churu(A)**: "현재 페이스로 완주" 가정 → `churuCount = totalCommands`
 * - **typo/lives 외삽(B)**: `현재값 × totalCommands / churuCount`. 같은 페이스로 끝까지 발생한다 가정.
 *   `livesLost`는 회복(restore) 효과를 무시한 누적 손실 값을 사용하므로 회복으로 인한 낙관 편향 없음.
 *   `MAX_LIVES` 이상이면 GAMEOVER 시나리오 → 'F' 반환
 * - **콤보**: 보수적으로 현재 `maxCombo` 그대로 (콤보는 끊길 수 있어 낙관 가정 위험)
 */
export function useGradePrediction(): Grade | null {
  const elapsedMs = useAtomValue(elapsedTimeAtom);
  const typoCount = useAtomValue(typoCountAtom);
  const livesLost = useAtomValue(livesLostAtom);
  const churuCount = useAtomValue(churuCountAtom);
  const maxCombo = useAtomValue(maxComboAtom);
  const gameStatus = useAtomValue(gameStatusAtom);
  const commandTimestamps = useAtomValue(commandTimestampsAtom);
  const difficulty = useSingleStore((s) => s.difficulty);
  const commandSet = useSingleStore((s) => s.commandSet);

  return useMemo(() => {
    if (gameStatus !== 'playing') return null;
    if (!difficulty || churuCount < 3) return null;

    const totalCommands = countScoringCommands(commandSet, difficulty);
    if (totalCommands === 0) return null;

    if (commandTimestamps.length < 2) return null;

    const lastTs = commandTimestamps[commandTimestamps.length - 1];
    const intervalAvg = (lastTs - commandTimestamps[0]) / (commandTimestamps.length - 1);
    const sinceLast = elapsedMs - lastTs;
    const avgMsPerCmd = Math.max(intervalAvg, sinceLast);
    const remaining = totalCommands - churuCount;
    const predictedMs = elapsedMs + remaining * avgMsPerCmd;

    const scaleToFinish = totalCommands / churuCount;
    const predictedTypo = Math.round(typoCount * scaleToFinish);
    const predictedLivesLost = Math.round(livesLost * scaleToFinish);
    if (predictedLivesLost >= MAX_LIVES) return 'F';

    const { grade } = calcScore({
      playTimeMs: predictedMs,
      typoCount: predictedTypo,
      livesLost: predictedLivesLost,
      difficulty,
      churuCount: totalCommands,
      totalCommands,
      maxCombo,
    });
    return grade;
  }, [
    elapsedMs,
    typoCount,
    livesLost,
    churuCount,
    maxCombo,
    gameStatus,
    difficulty,
    commandSet,
    commandTimestamps,
  ]);
}

import type { Difficulty } from '../types/single.types';
import type { Grade } from '@/shared/types/game.types';

/** 난이도별 감점 파라미터 */
interface ScoreConfig {
  idealTimeSec: number; // 기준 시간 초과 1초당 감점
  timeRate: number;
  typoPenalty: number;
  livesPenalty: number;
}

export const SCORE_CONFIG: Record<Difficulty, ScoreConfig> = {
  EASY: { idealTimeSec: 360, timeRate: 15, typoPenalty: 110, livesPenalty: 500 },
  NORMAL: { idealTimeSec: 240, timeRate: 30, typoPenalty: 200, livesPenalty: 700 },
  HARD: { idealTimeSec: 180, timeRate: 50, typoPenalty: 350, livesPenalty: 1000 },
};

const MAX_SCORE = 10000;

const GRADE_THRESHOLDS: { grade: Grade; min: number }[] = [
  { grade: 'S', min: 9000 },
  { grade: 'A', min: 8000 },
  { grade: 'B', min: 7000 },
  { grade: 'C', min: 5000 },
  { grade: 'D', min: 3000 },
  { grade: 'F', min: 0 },
];

export interface ScoreParams {
  playTimeMs: number; // Phaser time.now 기준 플레이 시간 (ms)
  typoCount: number;
  livesLost: number; // 초기 목숨에서 잃은 목숨 수 (아이템으로 회복했어도 이 수는 변함 없음)
  difficulty: Difficulty;
}

export interface ScoreResult {
  score: number;
  grade: Grade;
}

/**
 * 싱글 게임 최종 점수와 등급을 계산합니다.
 * 기준 시간 안에 오타와 목숨 손실 없이 클리어하면 최고점인 10,000점이 주어집니다.
 *
 * score = max(0, 10000 - 시간감점 - 오타감점 - 목숨감점)
 *
 * 시간감점 = max(0, (실제시간(초) - 기준시간) × 초당감점)
 * 오타감점 = 오타횟수 × 오타당감점
 * 목숨감점 = 잃은목숨 × 목숨당감점
 */
export function calcScore({
  playTimeMs,
  typoCount,
  livesLost,
  difficulty,
}: ScoreParams): ScoreResult {
  const config = SCORE_CONFIG[difficulty];

  const playTimeSec = playTimeMs / 1000;

  // 기준 시간 초과분만 감점 - 기준 시간 이내 클리어 시 0
  const timePenalty = Math.max(0, (playTimeSec - config.idealTimeSec) * config.timeRate);
  const typoPenalty = typoCount * config.typoPenalty;
  const livesPenalty = livesLost * config.livesPenalty;

  const score = Math.max(0, Math.round(MAX_SCORE - timePenalty - typoPenalty - livesPenalty));

  const grade = calcGrade(score);

  return { score, grade };
}

/** 점수에 따른 등급을 반환합니다. */
export function calcGrade(score: number): Grade {
  return GRADE_THRESHOLDS.find(({ min }) => score >= min)?.grade ?? 'F';
}

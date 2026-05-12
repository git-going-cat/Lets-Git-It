import type { Difficulty } from '../types/single.types';
import type { Grade } from '@/shared/types/game.types';

/** 난이도별 감점 파라미터 */
interface ScoreConfig {
  idealTimeSec: number;
  timePenaltyPer100ms: number; // 기준 시간 초과 100ms당 감점 (100ms 단위 floor)
  typoPenalty: number;
  livesPenalty: number;
}

export const SCORE_CONFIG: Record<Difficulty, ScoreConfig> = {
  EASY: { idealTimeSec: 75, timePenaltyPer100ms: 6, typoPenalty: 220, livesPenalty: 800 },
  NORMAL: { idealTimeSec: 110, timePenaltyPer100ms: 6, typoPenalty: 400, livesPenalty: 1200 },
  HARD: { idealTimeSec: 150, timePenaltyPer100ms: 6, typoPenalty: 700, livesPenalty: 1700 },
};

const MAX_SCORE = 10000;

/** 75% 이상 churu 달성 시 탈출 성공. 초과분은 보너스 점수로 전환 */
export const CHURU_THRESHOLD = 0.75;
/** 초과 churu 1개당 보너스 점수 (튜닝 가능) */
const CHURU_BONUS_PER = 200;
/** 최대 연속 콤보 1 당 보너스 점수 (튜닝 가능) */
const COMBO_BONUS_PER = 50;

const GRADE_THRESHOLDS: { grade: Grade; min: number }[] = [
  { grade: 'S', min: 10000 },
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
  churuCount: number; // 게임 중 쌓은 churu 수 (SWITCH 제외 완료 명령어 수)
  totalCommands: number; // SWITCH 제외 전체 명령어 수
  maxCombo: number; // 게임 중 달성한 최대 연속 콤보
}

export interface ScoreResult {
  score: number;
  grade: Grade;
}

/**
 * 싱글 게임 최종 점수와 등급을 계산합니다.
 * 기준 시간 안에 오타·목숨 손실 없이 클리어하면 기준점 10,000점에 도달하며,
 * 초과 churu와 최대 콤보로 10,000점을 넘는 보너스 점수를 획득할 수 있습니다.
 *
 * score = max(0, 10000 - 시간감점 - 오타감점 - 목숨감점)
 *       + (churuCount - threshold) × CHURU_BONUS_PER   // 초과 churu 보너스
 *       + maxCombo × COMBO_BONUS_PER                   // 콤보 보너스
 */
export function calcScore({
  playTimeMs,
  typoCount,
  livesLost,
  difficulty,
  churuCount,
  totalCommands,
  maxCombo,
}: ScoreParams): ScoreResult {
  const config = SCORE_CONFIG[difficulty];

  // 기준 시간 초과분만 감점 - 100ms 단위로 floor 후 곱셈. 기준 시간 이내 클리어 시 0
  const idealTimeMs = config.idealTimeSec * 1000;
  const overMs = Math.max(0, playTimeMs - idealTimeMs);
  const timePenalty = Math.floor(overMs / 100) * config.timePenaltyPer100ms;
  const typoPenalty = typoCount * config.typoPenalty;
  const livesPenalty = livesLost * config.livesPenalty;

  const base = Math.max(0, Math.round(MAX_SCORE - timePenalty - typoPenalty - livesPenalty));

  const threshold = Math.ceil(totalCommands * CHURU_THRESHOLD);
  const churuBonus = Math.max(0, churuCount - threshold) * CHURU_BONUS_PER;
  const comboBonus = maxCombo * COMBO_BONUS_PER;

  const score = base + churuBonus + comboBonus;
  const grade = calcGrade(score);

  return { score, grade };
}

/** 점수에 따른 등급을 반환합니다. */
export function calcGrade(score: number): Grade {
  return GRADE_THRESHOLDS.find(({ min }) => score >= min)?.grade ?? 'F';
}

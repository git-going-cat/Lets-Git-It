import type { Command, Difficulty, Grade } from '@/shared/types/game.types';

/** 난이도별 감점 파라미터 */
interface ScoreConfig {
  idealTimeSec: number;
  timePenaltyPer100ms: number; // 기준 시간 초과 100ms당 감점 (100ms 단위 floor)
  typoPenalty: number;
  livesPenalty: number;
}

export const SCORE_CONFIG: Record<Difficulty, ScoreConfig> = {
  EASY: { idealTimeSec: 35, timePenaltyPer100ms: 6, typoPenalty: 220, livesPenalty: 800 },
  NORMAL: { idealTimeSec: 55, timePenaltyPer100ms: 6, typoPenalty: 400, livesPenalty: 1200 },
  HARD: { idealTimeSec: 80, timePenaltyPer100ms: 6, typoPenalty: 700, livesPenalty: 1700 },
};

/** 보너스 전 기준 점수. 시간/오타/목숨 감점이 모두 0이면 이 값에 도달한다. */
const BASE_SCORE = 10000;

/** 75% 이상 churu 달성 시 탈출 성공. 초과분은 보너스 점수로 전환 */
export const CHURU_THRESHOLD = 0.75;
/** 초과 churu 1개당 보너스 점수 (튜닝 가능) */
const CHURU_BONUS_PER = 500;
/** 콤보 레벨 k 달성 시 k×10점 누적 보너스의 단위값. 최종 보너스 = 5·N·(N+1) */
const COMBO_BONUS_PER = 10;

/**
 * 특정 명령어가 churu/점수 카운트에 들어가는지 판단합니다.
 * EASY는 모든 명령어, NORMAL/HARD는 SWITCH 제외(원래 SWITCH 자체가 없음).
 */
export function isScoringCommand(cmd: Pick<Command, 'type'>, difficulty: Difficulty): boolean {
  return difficulty === 'EASY' || cmd.type !== 'SWITCH';
}

/** commandSet 중 점수에 카운트되는 명령어 수를 반환합니다. */
export function countScoringCommands(
  commandSet: ReadonlyArray<Pick<Command, 'type'>>,
  difficulty: Difficulty
): number {
  return commandSet.filter((c) => isScoringCommand(c, difficulty)).length;
}

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
 * 기준 시간 안에 오타·목숨 손실 없이 클리어하면 기준점(BASE_SCORE=10,000)에 도달하며,
 * 초과 churu와 최대 콤보로 기준점을 넘는 보너스 점수를 획득할 수 있습니다.
 *
 * score = max(0, BASE_SCORE - 시간감점 - 오타감점 - 목숨감점)
 *       + (churuCount - threshold) × CHURU_BONUS_PER   // 초과 churu 보너스
 *       + 5·N·(N+1)                                    // 누진 콤보 보너스 (콤보 k 달성 시 +10k)
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

  const base = Math.max(0, Math.round(BASE_SCORE - timePenalty - typoPenalty - livesPenalty));

  const threshold = Math.ceil(totalCommands * CHURU_THRESHOLD);
  const churuBonus = Math.max(0, churuCount - threshold) * CHURU_BONUS_PER;
  const comboBonus = (COMBO_BONUS_PER * maxCombo * (maxCombo + 1)) / 2;

  const score = base + churuBonus + comboBonus;
  const grade = calcGrade(score);

  return { score, grade };
}

/** 점수에 따른 등급을 반환합니다. */
export function calcGrade(score: number): Grade {
  return GRADE_THRESHOLDS.find(({ min }) => score >= min)?.grade ?? 'F';
}

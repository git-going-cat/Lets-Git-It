import { describe, expect, it } from 'vitest';

import {
  calcGrade,
  calcScore,
  countScoringCommands,
  isScoringCommand,
  SCORE_CONFIG,
} from './scoreCalculator';

// 보너스 없는 테스트에 사용할 기본 보너스 파라미터
const NO_BONUS = { churuCount: 0, totalCommands: 0, maxCombo: 0 };

// ─── calcScore ────────────────────────────────────────────────────────────────

describe('calcScore', () => {
  describe('기준 시간 이내 완료 + 오타 0 + 목숨 손실 0 → 만점', () => {
    it('EASY: 기준 시간 이내(0ms) + 오타 0 + 목숨 손실 0 이면 10000점이다', () => {
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'EASY',
        ...NO_BONUS,
      });
      expect(score).toBe(10000);
    });

    it('NORMAL: 기준 시간 딱 맞게 완료 시 10000점이다', () => {
      const { score } = calcScore({
        playTimeMs: SCORE_CONFIG.NORMAL.idealTimeSec * 1000,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'NORMAL',
        ...NO_BONUS,
      });
      expect(score).toBe(10000);
    });

    it('HARD: 기준 시간 이내 완료 시 10000점이다', () => {
      const { score } = calcScore({
        playTimeMs: (SCORE_CONFIG.HARD.idealTimeSec - 10) * 1000,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'HARD',
        ...NO_BONUS,
      });
      expect(score).toBe(10000);
    });
  });

  describe('시간 감점', () => {
    it('EASY: 기준 시간 초과 10초 시 100ms 단위 감점이 적용된다', () => {
      const excessMs = 10_000;
      const { score } = calcScore({
        playTimeMs: SCORE_CONFIG.EASY.idealTimeSec * 1000 + excessMs,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'EASY',
        ...NO_BONUS,
      });
      expect(score).toBe(10000 - (excessMs / 100) * SCORE_CONFIG.EASY.timePenaltyPer100ms);
    });

    it('NORMAL: 기준 시간 초과 30초 시 100ms 단위 감점이 적용된다', () => {
      const excessMs = 30_000;
      const { score } = calcScore({
        playTimeMs: SCORE_CONFIG.NORMAL.idealTimeSec * 1000 + excessMs,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'NORMAL',
        ...NO_BONUS,
      });
      expect(score).toBe(10000 - (excessMs / 100) * SCORE_CONFIG.NORMAL.timePenaltyPer100ms);
    });

    it('HARD: 기준 시간 초과 20초 시 100ms 단위 감점이 적용된다', () => {
      const excessMs = 20_000;
      const { score } = calcScore({
        playTimeMs: SCORE_CONFIG.HARD.idealTimeSec * 1000 + excessMs,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'HARD',
        ...NO_BONUS,
      });
      expect(score).toBe(10000 - (excessMs / 100) * SCORE_CONFIG.HARD.timePenaltyPer100ms);
    });

    it('100ms 미만의 초과분은 감점되지 않는다 (floor 처리)', () => {
      const { score } = calcScore({
        playTimeMs: SCORE_CONFIG.EASY.idealTimeSec * 1000 + 99,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'EASY',
        ...NO_BONUS,
      });
      expect(score).toBe(10000);
    });

    it('기준 시간보다 빠르게 완료 시 시간 감점은 0이다 (음수 감점 없음)', () => {
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'EASY',
        ...NO_BONUS,
      });
      expect(score).toBe(10000);
    });
  });

  describe('오타 감점', () => {
    it('EASY: 오타 1개 → typoPenalty만큼 감점된다', () => {
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 1,
        livesLost: 0,
        difficulty: 'EASY',
        ...NO_BONUS,
      });
      expect(score).toBe(10000 - SCORE_CONFIG.EASY.typoPenalty * 1);
    });

    it('EASY: 오타 5개 → typoPenalty × 5만큼 감점된다', () => {
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 5,
        livesLost: 0,
        difficulty: 'EASY',
        ...NO_BONUS,
      });
      expect(score).toBe(10000 - SCORE_CONFIG.EASY.typoPenalty * 5);
    });

    it('NORMAL: 오타 1개 → typoPenalty만큼 감점된다', () => {
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 1,
        livesLost: 0,
        difficulty: 'NORMAL',
        ...NO_BONUS,
      });
      expect(score).toBe(10000 - SCORE_CONFIG.NORMAL.typoPenalty * 1);
    });

    it('HARD: 오타 1개 → typoPenalty만큼 감점된다', () => {
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 1,
        livesLost: 0,
        difficulty: 'HARD',
        ...NO_BONUS,
      });
      expect(score).toBe(10000 - SCORE_CONFIG.HARD.typoPenalty * 1);
    });
  });

  describe('목숨 손실 감점', () => {
    it('EASY: 목숨 1개 손실 → livesPenalty만큼 감점된다', () => {
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 0,
        livesLost: 1,
        difficulty: 'EASY',
        ...NO_BONUS,
      });
      expect(score).toBe(10000 - SCORE_CONFIG.EASY.livesPenalty * 1);
    });

    it('EASY: 목숨 2개 손실 → livesPenalty × 2만큼 감점된다', () => {
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 0,
        livesLost: 2,
        difficulty: 'EASY',
        ...NO_BONUS,
      });
      expect(score).toBe(10000 - SCORE_CONFIG.EASY.livesPenalty * 2);
    });

    it('NORMAL: 목숨 1개 손실 → livesPenalty만큼 감점된다', () => {
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 0,
        livesLost: 1,
        difficulty: 'NORMAL',
        ...NO_BONUS,
      });
      expect(score).toBe(10000 - SCORE_CONFIG.NORMAL.livesPenalty * 1);
    });

    it('HARD: 목숨 1개 손실 → livesPenalty만큼 감점된다', () => {
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 0,
        livesLost: 1,
        difficulty: 'HARD',
        ...NO_BONUS,
      });
      expect(score).toBe(10000 - SCORE_CONFIG.HARD.livesPenalty * 1);
    });
  });

  describe('복합 감점', () => {
    it('EASY: 시간 초과 10초 + 오타 3개 + 목숨 1개 손실 시 올바르게 계산된다', () => {
      // timePenalty = (10000ms / 100) × 6 = 100 × 6 = 600
      // typoPenalty = 3 × 220 = 660
      // livesPenalty = 1 × 800 = 800
      // score = 10000 - 600 - 660 - 800 = 7940
      const { score } = calcScore({
        playTimeMs: (SCORE_CONFIG.EASY.idealTimeSec + 10) * 1000,
        typoCount: 3,
        livesLost: 1,
        difficulty: 'EASY',
        ...NO_BONUS,
      });
      expect(score).toBe(7940);
    });

    it('NORMAL: 시간 초과 30초 + 오타 5개 + 목숨 1개 손실 시 올바르게 계산된다', () => {
      // timePenalty = (30000ms / 100) × 6 = 300 × 6 = 1800
      // typoPenalty = 5 × 400 = 2000
      // livesPenalty = 1 × 1200 = 1200
      // score = 10000 - 1800 - 2000 - 1200 = 5000
      const { score } = calcScore({
        playTimeMs: (SCORE_CONFIG.NORMAL.idealTimeSec + 30) * 1000,
        typoCount: 5,
        livesLost: 1,
        difficulty: 'NORMAL',
        ...NO_BONUS,
      });
      expect(score).toBe(5000);
    });
  });

  describe('점수 하한 보장 (0 미만 → 0)', () => {
    it('감점 합산이 10000 초과 시 score는 0이다', () => {
      // HARD: 목숨 100개 손실 → 100000점 감점 → score = 0
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 0,
        livesLost: 100,
        difficulty: 'HARD',
        ...NO_BONUS,
      });
      expect(score).toBe(0);
    });

    it('EASY: 오타 10000개 입력 시 score는 0이다', () => {
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 10000,
        livesLost: 0,
        difficulty: 'EASY',
        ...NO_BONUS,
      });
      expect(score).toBe(0);
    });
  });

  describe('보너스 점수', () => {
    it('초과 churu 1개당 500점 보너스가 붙는다', () => {
      // totalCommands=4 → threshold=ceil(3)=3, churuCount=5 → 초과 2개 → +1000
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'EASY',
        churuCount: 5,
        totalCommands: 4,
        maxCombo: 0,
      });
      expect(score).toBe(10000 + 2 * 500);
    });

    it('maxCombo N에 따라 5·N·(N+1) 누진 보너스가 붙는다', () => {
      // maxCombo=10 → 5·10·11 = 550
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'EASY',
        churuCount: 0,
        totalCommands: 0,
        maxCombo: 10,
      });
      expect(score).toBe(10000 + 5 * 10 * 11);
    });

    it('EASY 퍼펙트 클리어 시 maxCombo=13 → 5·13·14=910 보너스', () => {
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'EASY',
        churuCount: 0,
        totalCommands: 0,
        maxCombo: 13,
      });
      expect(score).toBe(10000 + 5 * 13 * 14);
    });

    it('churu 미달성 시 churu 보너스는 0이다', () => {
      // totalCommands=4 → threshold=3, churuCount=2 → 미달 → 보너스 없음
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'EASY',
        churuCount: 2,
        totalCommands: 4,
        maxCombo: 0,
      });
      expect(score).toBe(10000);
    });
  });
});

// ─── isScoringCommand / countScoringCommands ──────────────────────────────────

describe('isScoringCommand', () => {
  it('EASY + SWITCH → true (EASY는 모든 명령어 포함)', () => {
    expect(isScoringCommand({ type: 'SWITCH' }, 'EASY')).toBe(true);
  });

  it('EASY + 일반 명령어 → true', () => {
    expect(isScoringCommand({ type: 'COMMON' }, 'EASY')).toBe(true);
  });

  it('NORMAL + SWITCH → false', () => {
    expect(isScoringCommand({ type: 'SWITCH' }, 'NORMAL')).toBe(false);
  });

  it('NORMAL + 일반 명령어 → true', () => {
    expect(isScoringCommand({ type: 'COMMON' }, 'NORMAL')).toBe(true);
  });

  it('HARD + SWITCH → false', () => {
    expect(isScoringCommand({ type: 'SWITCH' }, 'HARD')).toBe(false);
  });

  it('HARD + 일반 명령어 → true', () => {
    expect(isScoringCommand({ type: 'COMMON' }, 'HARD')).toBe(true);
  });
});

describe('countScoringCommands', () => {
  const set = [
    { type: 'COMMON' as const },
    { type: 'SWITCH' as const },
    { type: 'COMMON' as const },
  ];

  it('EASY: SWITCH 포함 전체 3개를 카운트한다', () => {
    expect(countScoringCommands(set, 'EASY')).toBe(3);
  });

  it('NORMAL: SWITCH 제외 2개를 카운트한다', () => {
    expect(countScoringCommands(set, 'NORMAL')).toBe(2);
  });

  it('HARD: SWITCH 제외 2개를 카운트한다', () => {
    expect(countScoringCommands(set, 'HARD')).toBe(2);
  });

  it('빈 배열이면 0이다', () => {
    expect(countScoringCommands([], 'EASY')).toBe(0);
    expect(countScoringCommands([], 'NORMAL')).toBe(0);
  });
});

// ─── calcGrade ────────────────────────────────────────────────────────────────

describe('calcGrade', () => {
  it('10000 이상이면 S등급이다', () => {
    expect(calcGrade(10000)).toBe('S');
    expect(calcGrade(10001)).toBe('S');
    expect(calcGrade(12000)).toBe('S');
  });

  it('8000 이상 10000 미만이면 A등급이다', () => {
    expect(calcGrade(8000)).toBe('A');
    expect(calcGrade(9999)).toBe('A');
  });

  it('7000 이상 8000 미만이면 B등급이다', () => {
    expect(calcGrade(7000)).toBe('B');
    expect(calcGrade(7999)).toBe('B');
  });

  it('5000 이상 7000 미만이면 C등급이다', () => {
    expect(calcGrade(5000)).toBe('C');
    expect(calcGrade(6999)).toBe('C');
  });

  it('3000 이상 5000 미만이면 D등급이다', () => {
    expect(calcGrade(3000)).toBe('D');
    expect(calcGrade(4999)).toBe('D');
  });

  it('3000 미만이면 F등급이다', () => {
    expect(calcGrade(0)).toBe('F');
    expect(calcGrade(1)).toBe('F');
    expect(calcGrade(2999)).toBe('F');
  });

  it('등급 경계값: 정확히 10000이면 S이고, 9999이면 A이다', () => {
    expect(calcGrade(10000)).toBe('S');
    expect(calcGrade(9999)).toBe('A');
  });

  it('calcScore 반환값의 grade와 calcGrade(score) 결과가 일치한다', () => {
    const { score, grade } = calcScore({
      playTimeMs: 0,
      typoCount: 0,
      livesLost: 0,
      difficulty: 'EASY',
      ...NO_BONUS,
    });
    expect(grade).toBe(calcGrade(score));
  });
});

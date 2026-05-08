import { describe, expect, it } from 'vitest';

import { calcGrade, calcScore, SCORE_CONFIG } from './scoreCalculator';

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
    it('EASY: 기준 시간 초과 10초 시 timeRate만큼 감점된다', () => {
      const excessSec = 10;
      const { score } = calcScore({
        playTimeMs: (SCORE_CONFIG.EASY.idealTimeSec + excessSec) * 1000,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'EASY',
        ...NO_BONUS,
      });
      expect(score).toBe(10000 - excessSec * SCORE_CONFIG.EASY.timeRate);
    });

    it('NORMAL: 기준 시간 초과 60초 시 timeRate만큼 감점된다', () => {
      const excessSec = 60;
      const { score } = calcScore({
        playTimeMs: (SCORE_CONFIG.NORMAL.idealTimeSec + excessSec) * 1000,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'NORMAL',
        ...NO_BONUS,
      });
      expect(score).toBe(10000 - excessSec * SCORE_CONFIG.NORMAL.timeRate);
    });

    it('HARD: 기준 시간 초과 30초 시 timeRate만큼 감점된다', () => {
      const excessSec = 30;
      const { score } = calcScore({
        playTimeMs: (SCORE_CONFIG.HARD.idealTimeSec + excessSec) * 1000,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'HARD',
        ...NO_BONUS,
      });
      expect(score).toBe(10000 - excessSec * SCORE_CONFIG.HARD.timeRate);
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
      // timePenalty = 10 × 15 = 150
      // typoPenalty = 3 × 110 = 330
      // livesPenalty = 1 × 500 = 500
      // score = 10000 - 150 - 330 - 500 = 9020
      const { score } = calcScore({
        playTimeMs: (SCORE_CONFIG.EASY.idealTimeSec + 10) * 1000,
        typoCount: 3,
        livesLost: 1,
        difficulty: 'EASY',
        ...NO_BONUS,
      });
      expect(score).toBe(9020);
    });

    it('NORMAL: 시간 초과 120초 + 오타 10개 + 목숨 2개 손실 시 올바르게 계산된다', () => {
      // timePenalty = 120 × 30 = 3600
      // typoPenalty = 10 × 200 = 2000
      // livesPenalty = 2 × 700 = 1400
      // score = 10000 - 3600 - 2000 - 1400 = 3000
      const { score } = calcScore({
        playTimeMs: (SCORE_CONFIG.NORMAL.idealTimeSec + 120) * 1000,
        typoCount: 10,
        livesLost: 2,
        difficulty: 'NORMAL',
        ...NO_BONUS,
      });
      expect(score).toBe(3000);
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
    it('초과 churu 1개당 200점 보너스가 붙는다', () => {
      // totalCommands=4 → threshold=ceil(3)=3, churuCount=5 → 초과 2개 → +400
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'EASY',
        churuCount: 5,
        totalCommands: 4,
        maxCombo: 0,
      });
      expect(score).toBe(10000 + 2 * 200);
    });

    it('maxCombo 1당 50점 보너스가 붙는다', () => {
      const { score } = calcScore({
        playTimeMs: 0,
        typoCount: 0,
        livesLost: 0,
        difficulty: 'EASY',
        churuCount: 0,
        totalCommands: 0,
        maxCombo: 10,
      });
      expect(score).toBe(10000 + 10 * 50);
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

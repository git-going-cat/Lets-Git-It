import type { RankGrade, RankingEntry, RankingMode } from '../types/ranking.types';

/**
 * 모드별 점수 값을 포맷팅된 문자열로 변환
 *
 * @description 중복 로직 방지를 위해 모든 모드의 점수 포맷팅을 단일 함수로 처리
 */
export function formatScore(mode: RankingMode, entry: RankingEntry): string {
  if (mode === 'coop') {
    return formatClearTime((entry as { clearTime: number }).clearTime);
  }
  if (mode === 'speed') {
    return `${(entry as { contribution: number }).contribution.toLocaleString()}`;
  }
  if (mode === 'timeattack') {
    return `${(entry as { totalCount: number }).totalCount.toLocaleString()}`;
  }
  return `${(entry as { score: number }).score.toLocaleString()} pt`;
}

/**
 * ms 단위 clearTime을 사람이 읽을 수 있는 형태로 변환
 *
 * @example formatClearTime(61000) → "61.00s"
 * @example formatClearTime(125300) → "2:05.30"
 */
export function formatClearTime(ms: number): string {
  const totalSeconds = ms / 1000;

  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(2)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
}

/**
 * 점수 기반 등급 산출
 *
 * @description 협력 모드는 등급 뱃지 없음 (null 반환)
 */
export function getGrade(mode: RankingMode, entry: RankingEntry): RankGrade | null {
  if (mode === 'coop') return null;

  let value: number;
  if (mode === 'speed') {
    value = (entry as { contribution: number }).contribution;
  } else if (mode === 'timeattack') {
    value = (entry as { totalCount: number }).totalCount;
  } else {
    value = (entry as { score: number }).score;
  }

  if (value >= 9000) return 'S';
  if (value >= 7000) return 'A';
  if (value >= 5000) return 'B';
  return 'C';
}

/** 등급별 배경/텍스트 색상 */
export const GRADE_COLORS: Record<RankGrade, { bg: string; text: string; border: string }> = {
  S: { bg: '#FFE080', text: '#7a5a00', border: '1px solid rgba(200,160,0,0.25)' },
  A: { bg: '#C8DEFF', text: '#2a4a8a', border: '1px solid rgba(100,140,220,0.25)' },
  B: { bg: '#C0EDD8', text: '#1a6a40', border: '1px solid rgba(50,160,100,0.2)' },
  C: { bg: '#FFD8AA', text: '#7a4010', border: '1px solid rgba(200,120,50,0.2)' },
};

/** 모드별 컬럼 헤더 라벨 */
export function getValueLabel(mode: RankingMode): string {
  if (mode === 'coop') return '클리어 타임';
  if (mode === 'speed') return '기여도';
  if (mode === 'timeattack') return '카운트';
  return '점수';
}

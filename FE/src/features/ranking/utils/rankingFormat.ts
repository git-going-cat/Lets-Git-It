import type {
  CoopMyRank,
  MyRank,
  RankGrade,
  RankingEntry,
  RankingMode,
  SingleMyRank,
  SpeedMyRank,
  TimeAttackMyRank,
  WeekParam,
} from '../types/ranking.types';

/**
 * 모드별 점수 값을 포맷팅된 문자열로 변환
 *
 * @description 중복 로직 방지를 위해 모든 모드의 점수 포맷팅을 단일 함수로 처리
 */
export function formatScore(mode: RankingMode, entry: RankingEntry): string {
  if (mode === 'coop') {
    return 'clearTime' in entry ? formatClearTime(entry.clearTime) : '-';
  }
  if (mode === 'speed') {
    return 'contribution' in entry ? `${entry.contribution.toLocaleString()}` : '-';
  }
  if (mode === 'timeattack') {
    return 'totalCount' in entry ? `${entry.totalCount.toLocaleString()}` : '-';
  }
  return 'score' in entry ? `${entry.score.toLocaleString()} pt` : '-';
}

/** 내 순위(MyRank)의 점수 값을 포맷팅된 문자열로 변환 */
export function formatMyRankScore(mode: RankingMode, myRank: Exclude<MyRank, null>): string {
  if (mode === 'coop') return formatClearTime((myRank as CoopMyRank).clearTime);
  if (mode === 'speed') return (myRank as SpeedMyRank).contribution.toLocaleString();
  if (mode === 'timeattack') return (myRank as TimeAttackMyRank).totalCount.toLocaleString();
  return `${(myRank as SingleMyRank).score.toLocaleString()} pt`;
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
  if ('grade' in entry && entry.grade) return entry.grade;
  if (mode.startsWith('single-')) return null;

  let value: number;
  if (mode === 'speed') {
    if (!('contribution' in entry)) return null;
    value = entry.contribution;
  } else if (mode === 'timeattack') {
    if (!('totalCount' in entry)) return null;
    value = entry.totalCount;
  } else {
    if (!('score' in entry)) return null;
    value = entry.score;
  }

  if (value >= 9000) return 'S';
  if (value >= 7000) return 'A';
  if (value >= 5000) return 'B';
  if (value >= 3000) return 'C';
  return 'D';
}

/** 등급별 배경/텍스트 색상 */
export const GRADE_COLORS: Record<RankGrade, { bg: string; text: string; border: string }> = {
  S: { bg: '#FFE080', text: '#7a5a00', border: '1px solid rgba(200,160,0,0.25)' },
  A: { bg: '#C8DEFF', text: '#2a4a8a', border: '1px solid rgba(100,140,220,0.25)' },
  B: { bg: '#C0EDD8', text: '#1a6a40', border: '1px solid rgba(50,160,100,0.2)' },
  C: { bg: '#FFD8AA', text: '#7a4010', border: '1px solid rgba(200,120,50,0.2)' },
  D: { bg: '#E5E7EB', text: '#4B5563', border: '1px solid rgba(107,114,128,0.2)' },
  F: { bg: '#F3F4F6', text: '#6B7280', border: '1px solid rgba(107,114,128,0.2)' },
};

export const GRADE_COLOR_CLASSES: Record<RankGrade, string> = {
  S: 'bg-[#FFE080] text-[#7a5a00] border border-[rgba(200,160,0,0.25)]',
  A: 'bg-[#C8DEFF] text-[#2a4a8a] border border-[rgba(100,140,220,0.25)]',
  B: 'bg-[#C0EDD8] text-[#1a6a40] border border-[rgba(50,160,100,0.2)]',
  C: 'bg-[#FFD8AA] text-[#7a4010] border border-[rgba(200,120,50,0.2)]',
  D: 'bg-gray-200 text-gray-600 border border-gray-300',
  F: 'bg-gray-100 text-gray-500 border border-gray-300',
};

/** 모드별 컬럼 헤더 라벨 */
export function getValueLabel(mode: RankingMode): string {
  if (mode === 'coop') return '클리어 타임';
  if (mode === 'speed') return '기여도';
  if (mode === 'timeattack') return '카운트';
  return '점수';
}

/** 모드 코드를 한글 라벨로 변환 */
export function getModeLabel(mode: RankingMode): string {
  const labels: Record<RankingMode, string> = {
    'single-easy': '싱글 이지',
    'single-normal': '싱글 노말',
    'single-hard': '싱글 하드',
    speed: '기여도 뺏기',
    timeattack: '타임어택',
    coop: '협력',
  };
  return labels[mode];
}

/**
 * 이전 주차 계산 (ISO-8601 기준)
 *
 * @description 현재 달의 최소 주차(0 또는 1)에 도달하면 이전 달 마지막 주로 이동.
 */
export function getPrevWeek(current: WeekParam): WeekParam {
  const minWeek = getMinWeekOfMonth(current.year, current.month);

  if (current.week <= minWeek) {
    const prevMonth = current.month === 1 ? 12 : current.month - 1;
    const prevYear = current.month === 1 ? current.year - 1 : current.year;
    return { year: prevYear, month: prevMonth, week: getLastWeekOfMonth(prevYear, prevMonth) };
  }
  return { ...current, week: current.week - 1 };
}

/**
 * 현재 날짜 기반 주차 파라미터 반환
 *
 * @param date 계산 기준일 (기본값: 현재 시간)
 * @returns {WeekParam} 연, 월, 주차 (ISO-8601 기준)
 */
export function getCurrentWeek(date = new Date()): WeekParam {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const week = getIsoWeekOfMonth(date);

  return normalizeWeekParam({ year, month, week });
}

/**
 * 0주차를 사용자에게 노출하지 않도록 이전 달 마지막 주차로 변환
 *
 * @description ISO-8601 기준 첫 주가 4일 미만이면 0주차가 될 수 있으므로 표시/API 파라미터용으로 정규화
 */
export function normalizeWeekParam(weekParam: WeekParam): WeekParam {
  return weekParam.week === 0 ? getPrevWeek(weekParam) : weekParam;
}

/**
 * ISO-8601 기준 특정 날짜의 월간 주차(Week of Month) 계산
 *
 * @description 월요일 시작, 첫 주에 최소 4일이 포함되어야 1주차로 산정
 * @param date 계산할 날짜 객체
 * @returns {number} 0~5 주차 값 반환 (0은 이전 달 마지막 주차로 취급됨)
 */
function getIsoWeekOfMonth(date: Date): number {
  const dayOfMonth = date.getDate();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDay.getDay() === 0 ? 7 : firstDay.getDay(); // 1=Mon, ..., 7=Sun
  const daysInFirstWeek = 8 - firstDayOfWeek; // 1일부터 첫 일요일까지의 일수

  let week = 0;
  if (daysInFirstWeek >= 4) {
    week = 1;
  }

  if (dayOfMonth <= daysInFirstWeek) {
    return week;
  }

  const remainingDays = dayOfMonth - daysInFirstWeek;
  week += Math.ceil(remainingDays / 7);
  return week;
}

/**
 * 특정 연/월의 최소 주차 번호 반환
 *
 * @description ISO-8601 기준 1일이 속한 주가 4일 미만이면 0주차, 4일 이상이면 1주차 반환
 */
function getMinWeekOfMonth(year: number, month: number): number {
  const firstDay = new Date(year, month - 1, 1);
  const firstDayOfWeek = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
  const daysInFirstWeek = 8 - firstDayOfWeek;
  return daysInFirstWeek >= 4 ? 1 : 0;
}

function getLastWeekOfMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  return getIsoWeekOfMonth(new Date(year, month - 1, daysInMonth));
}

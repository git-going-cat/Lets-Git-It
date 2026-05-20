import type {
  CoopMyRank,
  CoopRankingEntry,
  MyRank,
  RankGrade,
  RankingEntry,
  RankingMode,
  SingleMyRank,
  SpeedMyRank,
  TimeAttackMyRank,
  WeekParam,
} from '../types/ranking.types';

/** 모드별 핵심 랭킹 값을 화면에 표시할 문자열로 변환합니다. */
export function formatScore(mode: RankingMode, entry: RankingEntry): string {
  if (mode === 'coop') {
    return 'elapsedTime' in entry ? formatClearTime(entry.elapsedTime) : '-';
  }
  if (mode === 'speed') {
    return 'contribution' in entry ? entry.contribution.toLocaleString() : '-';
  }
  if (mode === 'timeattack') {
    return 'totalCount' in entry ? entry.totalCount.toLocaleString() : '-';
  }
  return 'score' in entry ? `${entry.score.toLocaleString()} pt` : '-';
}

/** 싱글 랭킹의 플레이 시간을 표시합니다. */
export function formatPlayTime(playTime?: number | null): string {
  if (playTime == null) return '-';
  return formatClearTime(playTime);
}

/** 랭킹 항목에서 싱글 플레이 시간을 추출합니다. */
export function getPlayTime(entry: RankingEntry): number | null {
  if (!('playTime' in entry)) return null;
  return entry.playTime ?? null;
}

/** 내 순위 영역의 기록 값을 표시합니다. */
export function formatMyRankScore(mode: RankingMode, myRank: Exclude<MyRank, null>): string {
  if (mode === 'coop') return formatClearTime((myRank as CoopMyRank).elapsedTime);
  if (mode === 'speed') return (myRank as SpeedMyRank).contribution.toLocaleString();
  if (mode === 'timeattack') return (myRank as TimeAttackMyRank).totalCount.toLocaleString();
  return `${(myRank as SingleMyRank).score.toLocaleString()} pt`;
}

/** ms 단위 시간을 `61.00s` 또는 `2:05.30` 형태로 표시합니다. */
export function formatClearTime(ms: number): string {
  const totalSeconds = ms / 1000;

  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(2)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
}

/** 숫자 기반 랭킹 값에서 등급 배지 값을 계산합니다. */
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

export const GRADE_COLOR_CLASSES: Record<RankGrade, string> = {
  S: 'bg-[#FFE080] text-[#7a5a00] border border-[rgba(200,160,0,0.25)]',
  A: 'bg-[#C8DEFF] text-[#2a4a8a] border border-[rgba(100,140,220,0.25)]',
  B: 'bg-[#C0EDD8] text-[#1a6a40] border border-[rgba(50,160,100,0.2)]',
  C: 'bg-[#FFD8AA] text-[#7a4010] border border-[rgba(200,120,50,0.2)]',
  D: 'bg-gray-200 text-gray-600 border border-gray-300',
  F: 'bg-gray-100 text-gray-500 border border-gray-300',
};

/** 모드별 기록 컬럼 라벨을 반환합니다. */
export function getValueLabel(mode: RankingMode): string {
  if (mode === 'coop') return '소요 시간';
  if (mode === 'speed') return '기여도';
  if (mode === 'timeattack') return '카운트';
  return '점수';
}

/** 모드별 이름 컬럼 라벨을 반환합니다. */
export function getNameLabel(mode: RankingMode): string {
  if (mode === 'coop') return '팀명 / 팀원';
  return '닉네임';
}

/** 모드 코드를 화면 표시 라벨로 변환합니다. */
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

/** 협력 랭킹의 팀원 4명을 가나다순으로 표시합니다. */
export function formatCoopMembers(entry: CoopRankingEntry): string {
  return [...entry.members]
    .sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko'))
    .map((member) => member.nickname)
    .join(', ');
}

/** 협력 랭킹 상세 정보를 명세 필드 기준으로 표시합니다. */
export function formatCoopDetail(entry: CoopRankingEntry): string {
  return `팀원 ${formatCoopMembers(entry)} · 오타 ${entry.totalWrongTypeCount}회 · 리셋 ${entry.totalWrongOrderCount}회`;
}

/** 직전 주차를 계산합니다. */
export function getPrevWeek(current: WeekParam): WeekParam {
  const minWeek = getMinWeekOfMonth(current.year, current.month);

  if (current.week <= minWeek) {
    const prevMonth = current.month === 1 ? 12 : current.month - 1;
    const prevYear = current.month === 1 ? current.year - 1 : current.year;
    return { year: prevYear, month: prevMonth, week: getLastWeekOfMonth(prevYear, prevMonth) };
  }
  return { ...current, week: current.week - 1 };
}

/** 현재 날짜 기준 주차 파라미터를 반환합니다. */
export function getCurrentWeek(date = new Date()): WeekParam {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const week = getIsoWeekOfMonth(date);

  return normalizeWeekParam({ year, month, week });
}

/** 0주차가 노출되지 않도록 이전 달 마지막 주차로 정규화합니다. */
export function normalizeWeekParam(weekParam: WeekParam): WeekParam {
  return weekParam.week === 0 ? getPrevWeek(weekParam) : weekParam;
}

function getIsoWeekOfMonth(date: Date): number {
  const dayOfMonth = date.getDate();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstDayOfWeek = firstDay.getDay() === 0 ? 7 : firstDay.getDay();
  const daysInFirstWeek = 8 - firstDayOfWeek;

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

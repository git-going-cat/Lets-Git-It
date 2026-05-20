import type { ScoreResult } from '../types/incident.types';

export function startsWithGit(cmd: string): boolean {
  return /^git\s/.test(cmd);
}

export function makeForbidden(reason: string): ScoreResult {
  return { total: 0, base: 0, must: 0, bonus: 0, status: 'forbidden', coaching: reason };
}

export function makeWrong(coaching: string): ScoreResult {
  return { total: 0, base: 0, must: 0, bonus: 0, status: 'wrong', coaching };
}

export function makeScore(
  base: number,
  must: number,
  bonus: number
): { total: number; status: ScoreResult['status'] } {
  const total = base + must + bonus;
  let status: ScoreResult['status'];
  if (total >= 100) status = 'perfect';
  else if (base === 40 && must === 40) status = 'accepted';
  else if (base > 0 || must > 0) status = 'partial';
  else status = 'wrong';
  return { total, status };
}

interface ForbiddenRule {
  re: RegExp;
  reason: string;
}

/** FORBIDDEN 배열 중 첫 번째 매치를 찾아 forbidden ScoreResult 반환. 없으면 null. */
export function checkForbidden(cmd: string, rules: ForbiddenRule[]): ScoreResult | null {
  for (const f of rules) {
    if (f.re.test(cmd)) return makeForbidden(f.reason);
  }
  return null;
}

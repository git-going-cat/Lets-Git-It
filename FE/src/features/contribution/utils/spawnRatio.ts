/**
 * 기여도 뺏기 look-ahead 다음 spawn 비율 계산.
 *
 * 다음 명령어가 직전 명령어가 화면을 얼마나 내려왔을 때 등장할지 결정한다.
 * 인원이 많을수록 더 빨리(낮은 비율로) 다음 명령어가 등장 — 동시에 더 많은 명령어가 화면에 있음.
 *
 * - 2명: 0.3 (직전 명령어가 30% 내려왔을 때)
 * - 3명: 0.2
 * - 4명: 0.1
 * - 5명+: 0.1 (최소값 clamp)
 */
export function calculateLookAheadRatio(numPlayers: number): number {
  return Math.max(0.1, 0.5 - 0.1 * numPlayers);
}

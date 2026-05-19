/**
 * 협력 맵 난이도 숫자를 별점 문자열로 변환합니다.
 */
export function formatCoopDifficulty(difficulty: number): string {
  return '★'.repeat(Math.min(5, Math.max(1, difficulty)));
}

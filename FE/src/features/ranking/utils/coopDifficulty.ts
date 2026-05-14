export function formatCoopDifficulty(difficulty: number | string): string {
  if (typeof difficulty === 'number') {
    return '★'.repeat(Math.min(5, Math.max(1, difficulty)));
  }

  const difficultyLabelMap: Record<string, string> = {
    EASY: '★',
    NORMAL: '★★',
    HARD: '★★★',
  };

  return difficultyLabelMap[difficulty.toUpperCase()] ?? difficulty;
}

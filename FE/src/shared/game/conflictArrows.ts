export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

const ARROWS: ArrowKey[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

/**
 * CONFLICT 미니게임용 화살표 시퀀스를 생성합니다.
 * 직전 화살표와 같은 방향은 제외해 한 키 연타로 통과하는 케이스를 차단하고,
 * 시각적으로 시퀀스가 더 잘 읽히도록 합니다.
 */
export function generateArrowSequence(length: number): ArrowKey[] {
  const result: ArrowKey[] = [];
  for (let i = 0; i < length; i++) {
    const prev = result[i - 1];
    const pool = prev ? ARROWS.filter((k) => k !== prev) : ARROWS;
    result.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return result;
}

import { atom } from 'jotai';

/** rolling 평균 속도 계산에 사용할 최근 명령어 타임스탬프 개수 */
export const ROLLING_WINDOW = 5;

/**
 * 최근 `ROLLING_WINDOW`개의 scoring `command:complete` 발생 시점.
 * 값은 `elapsedTimeAtom`의 elapsedMs(게임 시작 기준 ms)를 사용한다.
 * 게임 종료/리셋 시 빈 배열로 초기화된다.
 */
export const commandTimestampsAtom = atom<number[]>([]);

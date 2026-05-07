import { atom } from 'jotai';

/**
 * 튜토리얼 모드에서 오버레이(설명/해설)가 표시 중일 때 입력을 차단하는 atom.
 * true이면 useCommandInput이 Enter를 무시합니다.
 */
export const tutorialInputBlockedAtom = atom<boolean>(false);

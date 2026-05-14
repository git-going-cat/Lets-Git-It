import { atom } from 'jotai';

/** 연속 정답 콤보 카운터. 오답 시 0으로 리셋. */
export const comboAtom = atom<number>(0);

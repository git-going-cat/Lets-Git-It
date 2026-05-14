import { atom } from 'jotai';

/** 누적 오타 횟수. */
export const typoCountAtom = atom<number>(0);

/** 누적 시도 횟수 (정답 + 오답). */
export const totalAttemptsAtom = atom<number>(0);

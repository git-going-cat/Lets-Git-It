import { atom } from 'jotai';

/** 현재 진행 중인 명령어의 commandSequence. SCORE_UPDATE.commandSequence로 갱신. */
export const currentCommandSeqAtom = atom<number>(0);

import { atom } from 'jotai';

/** 내 현재 활성 브랜치. git switch 입력 또는 POSITION_UPDATE 수신 시 갱신. */
export const activeBranchAtom = atom<string>('main');

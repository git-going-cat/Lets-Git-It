import { atom } from 'jotai';

/** 튜토리얼 ITEM_USE 단계에서 사용 가능한 슬롯 번호. null이면 모든 아이템 사용 차단. */
export const tutorialItemAllowedSlotAtom = atom<0 | 1 | 2 | null>(null);

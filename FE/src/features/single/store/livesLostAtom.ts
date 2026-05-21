import { atom } from 'jotai';

/**
 * 게임 중 누적으로 잃은 목숨 수. 아이템(restore)으로 회복해도 감소하지 않는다.
 * 점수 감점 계산과 예측 등급에 사용되는 "총 손실량" 지표.
 */
export const livesLostAtom = atom<number>(0);

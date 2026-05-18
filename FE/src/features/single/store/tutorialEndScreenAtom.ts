import { atom } from 'jotai';

/**
 * 튜토리얼 완료 시 single과 동일한 탈출 애니메이션/영상 시청 완료 여부.
 * true가 되면 SingleGameContent가 GameEndScreen → TutorialCompleteModal로 전환합니다.
 * 영상 종료(또는 사용자 스킵)에서만 true가 되며, 같은 TutorialPage 마운트 동안은 다시 false로 되돌아가지 않습니다.
 */
export const tutorialEndScreenWatchedAtom = atom<boolean>(false);

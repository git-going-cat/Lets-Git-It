import { useAtomValue } from 'jotai';

import { tutorialHighlightAtom } from '../store/tutorialHighlightAtom';

/**
 * 튜토리얼 하이라이트 활성 시 전체 화면을 반투명하게 덮어 강조 영역을 부각시킵니다.
 * 강조 대상 요소는 z-20으로 올려 이 overlay 위에 표시됩니다.
 */
export default function TutorialSpotlight() {
  const highlight = useAtomValue(tutorialHighlightAtom);
  if (!highlight.length) return null;

  return <div className="absolute inset-0 z-10 pointer-events-none bg-black/50" />;
}

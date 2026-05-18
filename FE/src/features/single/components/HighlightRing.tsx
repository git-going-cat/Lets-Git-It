import { useAtomValue } from 'jotai';

import { tutorialHighlightAtom } from '../store/tutorialHighlightAtom';

import type { TutorialHighlightTarget } from '../constants/tutorialData';
import type { ReactNode } from 'react';

interface HighlightRingProps {
  target: TutorialHighlightTarget;
  className?: string;
  children: ReactNode;
}

/**
 * 튜토리얼 하이라이트 ring을 element 외곽에 absolute 오버레이로 그립니다.
 * nes-btn/nes-container 등 시각 보더가 element box보다 큰 컴포넌트에서도
 * ring이 보더 바깥쪽을 감싸도록 -inset-2(8px)로 떨어뜨려 표시하고,
 * pointer-events-none + 자체 layout 영향 없음을 보장합니다.
 *
 * 활성 시 wrapper에 z-20을 부여해 spotlight 딤(z-10) 위로 떠오릅니다.
 */
export default function HighlightRing({ target, className, children }: HighlightRingProps) {
  const highlight = useAtomValue(tutorialHighlightAtom);
  const active = highlight.includes(target);

  return (
    <div className={`relative ${className ?? ''} ${active ? 'z-20' : ''}`}>
      {active && (
        <div className="absolute -inset-2 ring-2 ring-yellow-400 rounded pointer-events-none" />
      )}
      {children}
    </div>
  );
}

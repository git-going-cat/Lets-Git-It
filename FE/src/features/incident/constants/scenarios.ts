import card11 from './card-1-1';
import card12 from './card-1-2';
import card13 from './card-1-3';
import card14 from './card-1-4';
import card15 from './card-1-5';
import card41 from './card-4-1';
import card42 from './card-4-2';
import card43 from './card-4-3';
import card44 from './card-4-4';
import card45 from './card-4-5';

import type { Scenario } from '../types/incident.types';

export const SCENARIOS: Scenario[] = [
  {
    id: 1,
    title: 'API 키 노출 사건',
    difficulty: 2,
    synopsis: '고양이가 .env를 커밋했어요',
    story:
      '고양이가 깜빡하고 API 키가 담긴 .env 파일을 커밋해 버렸어요.\n다행히 아직 원격 저장소에 푸시하지 않았어요! 로컬에서 커밋을 되돌리고 .env를 제외한 뒤 깔끔하게 다시 커밋해서 안전하게 push하면 돼요.',
    cards: [card11, card12, card13, card14, card15],
  },
  {
    id: 4,
    title: '날려버린 작업',
    difficulty: 4,
    synopsis: 'reset --hard로 3시간 작업이 사라졌어요',
    story:
      'git reset --hard를 잘못 실행해서 3시간치 작업 커밋이 감쪽같이 사라졌어요.\n사라진 커밋을 추적하고, 백업 브랜치를 만든 뒤 main을 복구해야 해요.',
    cards: [card41, card42, card43, card44, card45],
  },
];

export function findScenario(id: number): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

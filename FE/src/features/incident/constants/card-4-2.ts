import { checkForbidden, makeWrong } from '../utils/graders';

import { SCENARIO4_BASE_COMMITS } from './card-4-1';

import type { Card, ScoreResult } from '../types/incident.types';

function grade(raw: string): ScoreResult | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  const forbidden = checkForbidden(cmd, [
    { re: /^git\s+reset\b/, reason: '지금은 내용 확인만 해요. reset은 다음 단계에서 해요.' },
    { re: /^git\s+checkout\b/, reason: '확인만 할 거예요. checkout은 실행 흐름이 바뀌어요.' },
  ]);
  if (forbidden) return forbidden;

  if (!/^git\s/.test(cmd)) return makeWrong('`git`으로 시작하는 명령이어야 해요.');

  const isShow = /^git\s+show\b/.test(cmd);
  const base = isShow ? 40 : 0;

  const hasHash = /\b[0-9a-f]{6,40}\b/.test(cmd);
  const hasHeadAt = /HEAD@\{\d+\}/.test(cmd);
  const must = isShow && (hasHash || hasHeadAt) ? 40 : 0;

  const hasRightHash = /\babc1234\b/.test(cmd);
  const bonus = isShow && hasRightHash ? 20 : 0;

  const total = base + must + bonus;

  let status: ScoreResult['status'];
  let coaching = '';
  if (total === 100) {
    status = 'perfect';
  } else if (base === 40 && must === 40) {
    status = 'accepted';
    coaching = '잘 됐어요! reflog에서 찾은 정확한 해시 `abc1234`를 쓰면 +20 보너스.';
  } else if (base > 0 && must === 0) {
    status = 'partial';
    coaching = '`git show`는 맞아요! 어떤 커밋인지 해시를 지정해야 해요. 예: `git show abc1234`';
  } else {
    status = 'wrong';
    coaching =
      '특정 커밋 내용을 보려면 `git show <해시>`를 써보세요. 해시는 reflog에서 확인했어요.';
  }

  return { total, base, must, bonus, status, coaching };
}

const card42: Card = {
  id: '4-2',
  scenarioId: 4,
  stepIdx: 1,
  title: '사라진 커밋 내용 확인',
  narrative: 'reflog에서 `abc1234` 해시를 발견했어요! 그 커밋에 무엇이 있는지 확인해봅시다.',
  canonical: 'git show abc1234',
  canonicalLabel: '해시 직접 지정',
  placeholder: 'git show …',
  hint: 'reflog에서 찾은 해시로 그 커밋이 어떤 내용인지 확인해야 해요.\n커밋 하나의 상세 내용을 보여주는 명령어를 해시와 함께 써봐요.\nHEAD@{번호} 형식도 같은 역할을 해요.',
  explanation:
    'git show <hash>는 해당 커밋의 메시지와 전체 diff를 보여줘요.\n복구 전에 내용을 먼저 확인하는 게 안전한 순서예요.',
  moodIdle: '그 커밋에 뭐가 있었는지 확인해봐요…',
  moodPerfect: '냥! 커밋 내용 확인 완료!',
  grade,
  mockOutput: `commit abc1234
Author: cat <cat@example.com>
Date:   Thu Nov 20 14:00:00 2025

    feat: new feature

diff --git a/src/feature.ts b/src/feature.ts
new file mode 100644
--- /dev/null
+++ b/src/feature.ts
@@ -0,0 +1,3 @@
+export function newFeature() {
+  return 'Hello from new feature';
+}`,
  initialViz: {
    working: [],
    staging: [],
    commits: SCENARIO4_BASE_COMMITS,
    stagingWarn: false,
  },
};

export default card42;

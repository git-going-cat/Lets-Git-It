import { checkForbidden, makeWrong } from '../utils/graders';

import type { Card, ScoreResult } from '../types/incident.types';

export const SCENARIO4_BASE_COMMITS = [
  { hash: 'abc1234', msg: 'feat: new feature (LOST)', branch: '', current: false },
  { hash: 'def5678', msg: 'refactor: cleanup (LOST)', branch: '', current: false },
  { hash: '1a2b3c4', msg: 'chore: update deps', branch: 'HEAD → main', current: true },
  { hash: '9x8y7z6', msg: 'docs: readme', branch: '', current: false },
];

function grade(raw: string): ScoreResult | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  const forbidden = checkForbidden(cmd, [
    {
      re: /^git\s+reset\b/,
      reason: 'reset을 실행하면 흔적이 더 지워질 수 있어요. 명령어를 입력해서 흔적을 찾아봐요.',
    },
  ]);
  if (forbidden) return forbidden;

  if (!/^git\s/.test(cmd)) return makeWrong('`git`으로 시작하는 명령이어야 해요.');

  const isReflog = /^git\s+reflog\b/.test(cmd);
  const base = isReflog ? 40 : 0;

  const isValidForm = /^git\s+reflog(\s+(show|HEAD))?\s*$/.test(cmd);
  const must = isValidForm ? 40 : isReflog ? 20 : 0;

  const hasAll = /--all\b/.test(cmd);
  const bonus = isReflog && hasAll ? 20 : isValidForm ? 20 : 0;

  const total = base + Math.min(must, 40) + Math.min(bonus, 20);

  let status: ScoreResult['status'];
  let coaching = '';
  if (total >= 100) {
    status = 'perfect';
  } else if (base > 0) {
    status = 'accepted';
    coaching = '잘 했어요! `git reflog`만으로 잃어버린 커밋 해시를 찾을 수 있어요.';
  } else {
    status = 'wrong';
    coaching =
      '잃어버린 커밋을 찾으려면 `git reflog`를 써보세요. Git이 모든 HEAD 이동 기록을 남겨요.';
  }

  return {
    total: Math.min(total, 100),
    base,
    must: Math.min(must, 40),
    bonus: Math.min(bonus, 20),
    status,
    coaching,
  };
}

const card41: Card = {
  id: '4-1',
  scenarioId: 4,
  stepIdx: 0,
  title: '잃어버린 커밋 흔적 찾기',
  narrative: '`git reset --hard`를 실수로 했어요! 3시간 치 커밋이 사라졌어요. 흔적을 찾아봅시다.',
  canonical: 'git reflog',
  canonicalLabel: '핵심 명령',
  placeholder: '명령어를 입력하세요…',
  hint: 'Git은 HEAD가 이동할 때마다 그 기록을 숨겨진 로그에 남겨요.\n이 로그의 이름은 "reference log"의 약자예요.\n거기서 잃어버린 커밋의 해시를 찾아봐요.',
  explanation:
    'git reflog는 git이 내부적으로 관리하는 HEAD 이동 기록이에요.\nreset --hard로 사라진 것처럼 보이는 커밋도 여기서 찾을 수 있어요.',
  moodIdle: '큰일났어요! 커밋이 사라졌어요!!',
  moodPerfect: '냥! reflog에서 흔적 발견!',
  grade,
  mockOutput: `1a2b3c4 HEAD@{0}: reset: moving to HEAD~2
abc1234 HEAD@{1}: commit: feat: new feature
def5678 HEAD@{2}: commit: refactor: cleanup
9x8y7z6 HEAD@{3}: commit: docs: readme`,
  initialViz: {
    working: [],
    staging: [],
    commits: SCENARIO4_BASE_COMMITS,
    stagingWarn: false,
  },
};

export default card41;

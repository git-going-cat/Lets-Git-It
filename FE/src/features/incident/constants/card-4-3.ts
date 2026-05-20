import { checkForbidden, makeWrong } from '../utils/graders';

import { SCENARIO4_BASE_COMMITS } from './card-4-1';

import type { Card, ScoreResult, VizState } from '../types/incident.types';

function grade(raw: string): ScoreResult | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  const forbidden = checkForbidden(cmd, [
    { re: /^git\s+reset\b/, reason: 'reset 전에 먼저 안전망 브랜치를 만들어야 해요!' },
  ]);
  if (forbidden) return forbidden;

  if (!/^git\s/.test(cmd)) return makeWrong('`git`으로 시작하는 명령이어야 해요.');

  const isBranchCmd = /^git\s+branch\b/.test(cmd);
  const isCheckoutB = /^git\s+checkout\s+-b\b/.test(cmd);
  const isSwitchC = /^git\s+switch\s+-c\b/.test(cmd);
  const isCreateBranch = isBranchCmd || isCheckoutB || isSwitchC;
  const base = isCreateBranch ? 40 : 0;

  const hasHash = /\b[0-9a-f]{6,40}\b/.test(cmd);
  const hasHeadAt = /HEAD@\{\d+\}/.test(cmd);
  const must = isCreateBranch && (hasHash || hasHeadAt) ? 40 : 0;

  const hasBranchName = /\b(recovery|backup|saved)\b/.test(cmd);
  const bonus = isCreateBranch && hasBranchName ? 20 : 0;

  const total = base + must + bonus;

  let status: ScoreResult['status'];
  let coaching = '';
  if (total === 100) {
    status = isBranchCmd ? 'perfect' : 'accepted';
    if (!isBranchCmd) {
      coaching =
        '생성과 동시에 HEAD까지 이동해요. 지금 단계에선 이동 없이 백업만 만들고 싶으니 `git branch`가 더 적합해요.';
    }
  } else if (base === 40 && must === 40) {
    status = 'accepted';
    coaching = isBranchCmd
      ? '잘 했어요! 브랜치 이름에 `recovery`나 `backup`을 쓰면 목적이 더 명확해져요.'
      : '생성과 동시에 HEAD까지 이동해요. 지금 단계에선 `git branch`가 더 적합해요. 브랜치 이름에 `recovery`를 쓰면 보너스도 받을 수 있어요.';
  } else if (base > 0 && must === 0) {
    status = 'partial';
    coaching = isBranchCmd
      ? '`git branch`는 맞아요! 어느 커밋에서 만들지 해시를 지정해야 해요. 예: `git branch recovery abc1234`'
      : '명령어는 맞아요! 어느 커밋에서 만들지 해시를 지정해야 해요.';
  } else {
    status = 'wrong';
    coaching = '특정 커밋에 브랜치를 만들려면 `git branch <이름> <해시>`를 써보세요.';
  }

  return { total, base, must, bonus, status, coaching };
}

function applyFlyTransition(viz: VizState): VizState {
  return {
    ...viz,
    commits: [
      ...viz.commits
        .slice(0, 2)
        .map((c) => ({ ...c, branch: c.branch || (c.hash === 'abc1234' ? 'recovery' : '') })),
      ...viz.commits.slice(2),
    ],
    flashIn: 'commits',
  };
}

const card43: Card = {
  id: '4-3',
  scenarioId: 4,
  stepIdx: 2,
  title: '안전망 브랜치로 백업',
  narrative:
    '복구할 커밋을 찾았어요! 먼저 그 시점에 안전망 브랜치를 만들어 실수를 방지합시다.\n브랜치 이름은 `recovery`로 해봐요.',
  canonical: 'git branch recovery abc1234',
  canonicalLabel: '해시에서 직접 분기',
  placeholder: 'git branch …',
  hint: '특정 커밋 해시를 가리키는 브랜치를 새로 만들어봐요.\n브랜치 이름은 나중에 봤을 때 목적을 알 수 있게 지어요.\n브랜치 생성 명령어 뒤에 해시를 붙이면 그 커밋을 기준점으로 삼아요.',
  explanation:
    'git branch <이름> <해시>는 해당 해시를 가리키는 새 브랜치를 만들어요.\ngit checkout -b나 git switch -c도 되지만, HEAD가 이동하지 않아야 하므로 branch가 더 적합해요.',
  moodIdle: '안전망부터 만들어야 해요!',
  moodPerfect: '냥! recovery 브랜치 완성!',
  grade,
  initialViz: {
    working: [],
    staging: [],
    commits: SCENARIO4_BASE_COMMITS,
    stagingWarn: false,
  },
  flyTransition: {
    delayMs: 600,
    flyFrom: 'commits',
    flyTo: 'commits',
    flyingFiles: ['all'],
    apply: (viz) => applyFlyTransition(viz),
  },
};

export default card43;

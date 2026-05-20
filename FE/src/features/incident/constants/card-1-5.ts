import { checkForbidden, makeWrong } from '../utils/graders';

import type { Card, ScoreResult, VizState } from '../types/incident.types';

function grade(raw: string): ScoreResult | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  const forbidden = checkForbidden(cmd, [
    {
      re: /(--force\b|-f\b)/,
      reason: 'force push는 팀원의 작업을 덮어쓸 수 있어요. 절대 쓰면 안 돼요!',
    },
    { re: /--force-with-lease\b/, reason: '지금은 안전한 일반 push만 사용해요.' },
  ]);
  if (forbidden) return forbidden;

  if (!/^git\s/.test(cmd)) return makeWrong('`git`으로 시작하는 명령이어야 해요.');

  const isPush = /^git\s+push\b/.test(cmd);
  const base = isPush ? 40 : 0;

  const hasOrigin = /\borigin\b/.test(cmd);
  const must = isPush && hasOrigin ? 40 : 0;

  const hasBranch = /\bmain\b/.test(cmd);
  const bonus = isPush && hasOrigin && hasBranch ? 20 : 0;

  const total = base + must + bonus;

  let status: ScoreResult['status'];
  let coaching = '';
  if (total === 100) {
    status = 'perfect';
  } else if (base === 40 && must === 40) {
    status = 'accepted';
    coaching = '잘했어요! 브랜치명까지 `git push origin main`으로 명시하면 더 명확해요.';
  } else if (isPush) {
    status = 'partial';
    coaching =
      '`git push`도 동작하지만, `git push origin main`으로 원격과 브랜치를 명시하면 더 안전해요.';
  } else {
    status = 'wrong';
    coaching = '원격에 올리려면 `git push origin main`을 써야 해요.';
  }

  return { total, base, must, bonus, status, coaching };
}

const AFTER_COMMIT_COMMITS = [
  {
    hash: 'c3d72f1',
    msg: 'remove .env from tracking',
    branch: 'HEAD → main',
    current: true,
    isNew: false,
  },
  { hash: 'a1f2c0e', msg: 'feat: prep release', branch: '', current: false },
  { hash: '7b3d92a', msg: 'chore: deps bump', branch: '', current: false },
];

function applyFlyTransition(viz: VizState): VizState {
  return {
    ...viz,
    commits: viz.commits.map((c, i) => ({
      ...c,
      branch: i === 0 ? 'HEAD → main' : c.branch,
      remoteBranch: i === 0 ? 'origin/main' : undefined,
      isNew: i === 0 ? true : c.isNew,
    })),
    flashIn: 'commits',
  };
}

const card15: Card = {
  id: '1-5',
  scenarioId: 1,
  stepIdx: 4,
  title: '원격에 안전하게 push',
  narrative: '깨끗한 커밋이 완성됐어요! 이제 원격 저장소에 안전하게 올려봅시다.',
  canonical: 'git push origin main',
  canonicalLabel: '명시적 형식',
  placeholder: 'git push …',
  hint: '원격 저장소에 내 커밋을 올릴 시간이에요.\n어느 원격(remote)으로, 어느 브랜치에 올릴지 명시하면 더 안전해요.\n--force나 -f는 팀원의 커밋을 덮어쓸 수 있어서 절대 금지예요!',
  explanation:
    'git push origin main은 origin 원격의 main 브랜치에 올려요.\n원격·브랜치를 명시하면 실수로 엉뚱한 브랜치에 push하는 사고를 막을 수 있어요.',
  moodIdle: '마지막이에요! push만 하면 돼요!',
  moodPerfect: '냥! 완벽하게 push 완료!',
  mockOutput: `Enumerating objects: 3, done.
Counting objects: 100% (3/3), done.
Writing objects: 100% (3/3), 312 bytes | 312.00 KiB/s, done.
To github.com:team/repo.git
   a1f2c0e..c3d72f1  main -> main`,
  grade,
  initialViz: {
    working: [
      { name: '.gitignore', icon: '◌', status: 'clean' },
      { name: '.env', icon: '?', status: 'untracked', kind: 'untracked' },
    ],
    staging: [],
    commits: AFTER_COMMIT_COMMITS,
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

export default card15;

import { checkForbidden, makeWrong } from '../utils/graders';

import { SCENARIO0_BRANCH_COMMITS } from './card-0-1';

import type { Card, ScoreResult, VizState } from '../types/incident.types';

function grade(raw: string): ScoreResult | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  const forbidden = checkForbidden(cmd, [
    {
      re: /--amend\b/,
      reason: '--amend는 이전 커밋을 수정해요. 여기서는 새 커밋을 만들어야 합니다.',
    },
    { re: /--no-verify\b/, reason: '훅을 건너뛰는 옵션은 피해요. 정상적으로 커밋합시다.' },
  ]);
  if (forbidden) return forbidden;

  if (!/^git\s/.test(cmd)) return makeWrong('`git`으로 시작하는 명령이어야 해요.');

  const isCommit = /^git\s+commit\b/.test(cmd);
  const msgMatch = cmd.match(/-m\s+(["'])(.*?)\1/);
  const hasMessage = !!(msgMatch?.[2] && msgMatch[2].length > 0);
  const hasConventional =
    hasMessage &&
    /(feat|fix|chore|docs|refactor|style|test|ci|build|perf):/.test(msgMatch?.[2] ?? '');

  const base = isCommit ? 40 : 0;
  const must = hasMessage ? 40 : 0;
  const bonus = hasConventional ? 20 : 0;
  const total = base + must + bonus;

  let status: ScoreResult['status'];
  let coaching = '';
  if (total === 100) {
    status = 'perfect';
  } else if (base === 40 && must === 40) {
    status = 'accepted';
    coaching = '잘 됐어요! `feat: 내용` 같은 Conventional Commits 형식으로 쓰면 +20 보너스.';
  } else if (base > 0 && must === 0) {
    status = 'partial';
    coaching = '커밋은 맞는데 메시지가 없어요. `-m "feat: add login form"` 형식으로 붙여줘요.';
  } else {
    status = 'wrong';
    coaching = '변경사항을 저장하려면 `git commit -m "feat: add login form"`을 써보세요.';
  }

  return { total, base, must, bonus, status, coaching };
}

function applyFlyTransition(viz: VizState, ctx: { input: string }): VizState {
  const msgMatch = ctx.input.match(/-m\s+(["'])(.*?)\1/);
  const msg = msgMatch?.[2] ?? 'feat: add login form';
  const updatedCommits = viz.commits.map((c) => ({
    ...c,
    current: false,
    branch: c.branch === 'HEAD → feat/login' ? 'main' : c.branch,
  }));
  return {
    ...viz,
    staging: [],
    commits: [
      { hash: 'f7a8b9c', msg, branch: 'HEAD → feat/login', current: true, isNew: true },
      ...updatedCommits,
    ],
    flashIn: 'commits',
  };
}

const card04: Card = {
  id: '0-4',
  scenarioId: 0,
  stepIdx: 3,
  title: '의미 있는 메시지로 커밋',
  narrative:
    '스테이지에 올린 변경사항을 커밋으로 저장할 시간이에요.\n좋은 커밋 메시지는 나중에 히스토리를 볼 때 큰 도움이 돼요.\n팀에서는 Conventional Commits 형식을 사용해요. `feat:`, `fix:`, `chore:` 같은 접두어로 무엇을 했는지 표현해보세요.',
  canonical: 'git commit -m "feat: add login form"',
  canonicalLabel: 'Conventional Commits',
  placeholder: 'git commit -m "..."',
  hint: '스테이지의 변경사항을 커밋으로 저장해요.\n`-m` 옵션으로 메시지를 바로 작성할 수 있어요.\n`feat: 무엇을 했는지` 형식이 팀에서 쓰는 컨벤션이에요.',
  explanation:
    '`git commit -m "메시지"`로 변경사항을 저장해요.\n`feat:`, `fix:`, `chore:` 같은 Conventional Commits 형식은 *무엇을* 했는지를 한눈에 보여줘요.',
  moodIdle: '이번엔 좋은 메시지를 남겨봐요!',
  moodPerfect: '냥! 멋진 커밋이 생겼어요!',
  mockOutput: `[feat/login f7a8b9c] feat: add login form
 1 file changed, 24 insertions(+)
 create mode 100644 src/login.ts`,
  grade,
  initialViz: {
    working: [],
    staging: [{ name: 'src/login.ts', icon: 'A', status: 'added', kind: 'safe' }],
    commits: SCENARIO0_BRANCH_COMMITS,
    stagingWarn: false,
  },
  flyTransition: {
    delayMs: 800,
    flyFrom: 'staging',
    flyTo: 'commits',
    flyingFiles: ['all'],
    apply: (viz, ctx) => applyFlyTransition(viz, ctx),
  },
};

export default card04;

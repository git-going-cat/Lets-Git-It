import { checkForbidden, makeWrong } from '../utils/graders';

import { AFTER_RESET_COMMITS } from './card-1-1';

import type { Card, ScoreResult, VizState } from '../types/incident.types';

function grade(raw: string): ScoreResult | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  const forbidden = checkForbidden(cmd, [
    { re: /--amend\b/, reason: '--amend는 이전 커밋을 수정해요. 우린 새 커밋을 만들어야 합니다.' },
    { re: /--no-verify\b/, reason: '훅을 건너뛰는 옵션은 피해요. 정상적으로 커밋합시다.' },
  ]);
  if (forbidden) return forbidden;

  if (!/^git\s/.test(cmd)) return makeWrong('`git`으로 시작하는 명령이어야 해요.');

  const isCommit = /^git\s+commit\b/.test(cmd);
  const msgMatch = cmd.match(/-m\s+(["'])(.*?)\1/);
  const hasMessage = !!(msgMatch?.[2] && msgMatch[2].length > 0);
  const isDescriptive = hasMessage && (msgMatch?.[2].trim().length ?? 0) >= 8;

  const base = isCommit ? 40 : 0;
  const must = hasMessage ? 40 : 0;
  const bonus = isDescriptive ? 20 : 0;
  const total = base + must + bonus;

  let status: ScoreResult['status'];
  let coaching = '';
  if (total === 100) {
    status = 'perfect';
  } else if (base === 40 && must === 40) {
    status = 'accepted';
    coaching = '메시지가 너무 짧아요. 무엇을 왜 바꿨는지 한 문장으로 남기면 +20 보너스.';
  } else if (base > 0 && must === 0) {
    status = 'partial';
    coaching = '커밋은 맞는데 메시지가 없어요. `-m "메시지"` 형식으로 붙여야 합니다.';
  } else if (!isCommit) {
    status = 'wrong';
    coaching = '이번엔 `git commit` 명령을 써야 해요.';
  } else {
    status = 'wrong';
    coaching = '`git commit -m "메시지"` 형태로 입력해보세요.';
  }

  return { total, base, must, bonus, status, coaching };
}

function applyFlyTransition(viz: VizState, ctx: { input: string }): VizState {
  const msgMatch = ctx.input.match(/-m\s+(["'])(.*?)\1/);
  const msg = msgMatch?.[2] ?? 'chore: update gitignore';
  const updatedCommits = viz.commits.map((c) => ({ ...c, current: false, branch: '' }));
  return {
    ...viz,
    staging: [],
    commits: [
      { hash: 'c3d72f1', msg, branch: 'HEAD → main', current: true, isNew: true },
      ...updatedCommits,
    ],
    flashIn: 'commits',
  };
}

const card14: Card = {
  id: '1-4',
  scenarioId: 1,
  stepIdx: 3,
  title: '깨끗한 변경사항 다시 커밋',
  narrative:
    ".env가 빠진 깨끗한 상태가 됐어요. 남은 변경사항을 의미 있는 메시지로 다시 커밋합시다.\n메시지는 'chore: update gitignore'로 해봐요.",
  canonical: 'git commit -m "chore: update gitignore"',
  canonicalLabel: '의미 있는 메시지',
  placeholder: 'git commit -m "..."',
  hint: '변경사항을 커밋할 시간이에요.\n커밋 메시지를 명령줄에서 바로 작성할 수 있는 옵션이 있어요.\n메시지는 무엇을 왜 바꿨는지 한 문장으로 담으면 충분해요.',
  explanation:
    '-m 옵션으로 메시지를 인라인 작성해요. 메시지가 8자 이상이면 정보가 충분하다고 봐요.\n--amend는 이미 공유된 커밋을 수정하면 협업에 문제가 생겨서 금지예요.',
  moodIdle: '이번엔 깔끔하게 커밋해요!',
  moodPerfect: '냥! 멋진 커밋 메시지예요!',
  grade,
  initialViz: {
    working: [
      { name: '.gitignore', icon: '◌', status: 'clean' },
      { name: '.env', icon: '?', status: 'untracked', kind: 'untracked' },
    ],
    staging: [
      { name: 'src/api.ts', icon: 'M', status: 'modified', kind: 'safe' },
      { name: 'src/config.ts', icon: 'M', status: 'modified', kind: 'safe' },
      { name: 'README.md', icon: 'M', status: 'modified', kind: 'safe' },
    ],
    commits: AFTER_RESET_COMMITS,
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

export default card14;

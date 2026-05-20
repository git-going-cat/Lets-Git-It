import { checkForbidden, makeWrong } from '../utils/graders';

import { SCENARIO1_BASE_COMMITS } from './card-1-1';

import type { Card, ScoreResult, VizState } from '../types/incident.types';

function grade(raw: string): ScoreResult | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  const forbidden = checkForbidden(cmd, [
    {
      re: /--hard\b/,
      reason: '--hard는 작업 내용까지 모두 지워버려요! 커밋만 취소하려면 --soft를 쓰세요.',
    },
    {
      re: /--mixed\b/,
      reason:
        '--mixed는 스테이징을 취소해요. 작업 내용은 보존하되 스테이지 상태를 유지하려면 --soft가 맞아요.',
    },
  ]);
  if (forbidden) return forbidden;

  if (!/^git\s/.test(cmd)) return makeWrong('`git`으로 시작하는 명령이어야 해요.');

  const isReset = /^git\s+reset\b/.test(cmd);
  const base = isReset ? 40 : 0;

  const hasSoft = /--soft\b/.test(cmd);
  const must = hasSoft ? 40 : 0;

  const hasTarget = /HEAD[~^]/.test(cmd);
  const bonus = hasSoft && hasTarget ? 20 : 0;

  const total = base + must + bonus;

  let status: ScoreResult['status'];
  let coaching = '';
  if (total === 100) {
    status = 'perfect';
  } else if (base === 40 && must === 40) {
    status = 'accepted';
    coaching = '동작해요! 어느 커밋까지 돌아갈지 명시하면 더 명확해요. `HEAD~1`을 붙여보세요.';
  } else if (base > 0 && must === 0) {
    status = 'partial';
    coaching = '`git reset`이 맞아요. `--soft` 옵션을 추가해야 작업 내용이 스테이지에 남아요.';
  } else if (!isReset) {
    status = 'wrong';
    coaching =
      '커밋을 취소하되 변경 내용은 스테이지에 남기려면 `git reset --soft HEAD~1`을 써보세요.';
  } else {
    status = 'wrong';
    coaching = '`git reset --soft HEAD~1`로 마지막 커밋만 취소하고 변경사항은 스테이지에 보존해요.';
  }

  return { total, base, must, bonus, status, coaching };
}

function applyFlyTransition(viz: VizState): VizState {
  const [, ...rest] = viz.commits;
  return {
    ...viz,
    working: [{ name: '.gitignore', icon: '◌', status: 'clean' }],
    staging: [
      { name: 'src/api.ts', icon: 'M', status: 'modified', kind: 'safe' },
      { name: 'src/config.ts', icon: 'M', status: 'modified', kind: 'safe' },
      { name: 'README.md', icon: 'M', status: 'modified', kind: 'safe' },
      { name: '.env', icon: '!', status: 'added', kind: 'danger' },
    ],
    commits: rest.map((c, i) => (i === 0 ? { ...c, branch: 'HEAD → main', current: true } : c)),
    stagingWarn: true,
    flashIn: 'staging',
  };
}

const card12: Card = {
  id: '1-2',
  scenarioId: 1,
  stepIdx: 1,
  title: '마지막 커밋 부드럽게 취소',
  narrative: '.env가 포함된 커밋을 취소해야 해요. 작업 내용은 살리고 커밋만 되돌려봅시다.',
  canonical: 'git reset --soft HEAD~1',
  canonicalLabel: '안전한 취소',
  placeholder: 'git reset …',
  hint: '커밋을 취소하되, 변경사항은 스테이지에 그대로 남기고 싶어요.\nreset 명령어에는 --soft / --mixed / --hard 세 가지 옵션이 있어요.\n변경사항을 보존하는 옵션은 어느 것일까요?',
  explanation:
    '--soft는 커밋만 되돌리고 변경사항은 스테이지에 유지해요.\nHEAD~1은 "직전 커밋"을 뜻하고, HEAD^와 동일해요.',
  moodIdle: '커밋을 되돌려야 해요. 조심조심…',
  moodPerfect: '냥! 커밋만 깔끔하게 취소됐어요!',
  grade,
  initialViz: {
    working: [{ name: '.gitignore', icon: '◌', status: 'clean' }],
    staging: [],
    commits: SCENARIO1_BASE_COMMITS,
    stagingWarn: false,
  },
  flyTransition: {
    delayMs: 700,
    flyFrom: 'commits',
    flyTo: 'staging',
    flyingFiles: ['all'],
    apply: (viz) => applyFlyTransition(viz),
  },
};

export default card12;

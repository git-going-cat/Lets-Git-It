import { checkForbidden, makeWrong } from '../utils/graders';

import type { Card, ScoreResult, VizState } from '../types/incident.types';

function grade(raw: string): ScoreResult | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  const forbidden = checkForbidden(cmd, [
    {
      re: /--soft\b/,
      reason:
        '이번엔 --hard가 정답이에요! 이미 안전망 브랜치를 만들었으니 --hard로 대담하게 이동해요.',
    },
    {
      re: /HEAD[~^]/,
      reason: 'HEAD 상대 참조는 안전하지 않아요. 정확한 커밋 해시를 사용해야 해요.',
    },
  ]);
  if (forbidden) return forbidden;

  if (!/^git\s/.test(cmd)) return makeWrong('`git`으로 시작하는 명령이어야 해요.');

  const isReset = /^git\s+reset\b/.test(cmd);
  const base = isReset ? 40 : 0;

  const hasHard = /--hard\b/.test(cmd);
  const must = isReset && hasHard ? 40 : 0;

  const hasHash = /\b[0-9a-f]{6,40}\b/.test(cmd);
  const hasHeadAt = /HEAD@\{\d+\}/.test(cmd);
  const bonus = isReset && hasHard && (hasHash || hasHeadAt) ? 20 : 0;

  const total = base + must + bonus;

  let status: ScoreResult['status'];
  let coaching = '';
  if (total === 100) {
    status = 'perfect';
  } else if (base === 40 && must === 40) {
    status = 'accepted';
    coaching = '잘 됐어요! 정확한 해시 `abc1234`를 지정하면 +20 보너스.';
  } else if (base > 0 && must === 0) {
    status = 'partial';
    coaching =
      '`git reset`은 맞아요. 이번엔 `--hard` 옵션이 필요해요. 안전망 브랜치가 있으니 괜찮아요!';
  } else {
    status = 'wrong';
    coaching =
      '`git reset --hard abc1234`로 그 커밋 시점으로 돌아가요. 안전망 브랜치 덕분에 안전해요.';
  }

  return { total, base, must, bonus, status, coaching };
}

const COMMITS_WITH_RECOVERY = [
  { hash: 'abc1234', msg: 'feat: new feature (LOST)', branch: 'recovery', current: false },
  { hash: 'def5678', msg: 'refactor: cleanup (LOST)', branch: '', current: false },
  { hash: '1a2b3c4', msg: 'chore: update deps', branch: 'HEAD → main', current: true },
  { hash: '9x8y7z6', msg: 'docs: readme', branch: '', current: false },
];

function applyFlyTransition(viz: VizState): VizState {
  return {
    ...viz,
    commits: viz.commits.map((c) => ({
      ...c,
      branch:
        c.hash === 'abc1234' ? 'HEAD → main · recovery' : c.hash === '1a2b3c4' ? '' : c.branch,
      current: c.hash === 'abc1234',
    })),
    flashIn: 'commits',
  };
}

const card44: Card = {
  id: '4-4',
  scenarioId: 4,
  stepIdx: 3,
  title: '메인을 그 시점으로 되돌리기',
  narrative: '안전망 브랜치가 생겼어요! 이번엔 --hard로 대담하게 그 커밋으로 되돌려봅시다.',
  canonical: 'git reset --hard abc1234',
  canonicalLabel: '해시로 정확히 이동',
  placeholder: 'git reset --hard …',
  hint: '안전망 브랜치를 만들었으니 이제 main을 그 시점으로 완전히 되돌릴 수 있어요.\nreset에는 여러 옵션이 있는데, 워킹 디렉터리까지 모두 되돌리는 강력한 옵션은?\n해시나 HEAD@{번호}로 목표 지점을 지정해요.',
  explanation:
    '--hard는 커밋·스테이지·워킹 디렉터리를 모두 지정한 커밋 상태로 되돌려요.\nrecovery 브랜치가 있으니 실수해도 복구할 수 있어요.',
  moodIdle: '안전망이 있으니까 이번엔 --hard도 괜찮아요!',
  moodPerfect: '냥! 잃어버린 커밋으로 복귀 완료!',
  grade,
  initialViz: {
    working: [],
    staging: [],
    commits: COMMITS_WITH_RECOVERY,
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

export default card44;

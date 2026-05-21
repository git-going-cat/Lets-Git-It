import { makeWrong } from '../utils/graders';

import { SCENARIO0_BRANCH_COMMITS, SCENARIO0_REMOTE_COMMITS } from './card-0-1';

import type { Card, ScoreResult, VizState } from '../types/incident.types';

function grade(raw: string): ScoreResult | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  if (!/^git\s/.test(cmd)) return makeWrong('`git`으로 시작하는 명령이어야 해요.');

  // git checkout -b 는 동작하지만 구식 — 80점 accepted 처리
  const isCheckoutB = /^git\s+checkout\s+-b\b/.test(cmd);
  if (isCheckoutB) {
    const branchAfterCheckout = cmd.match(/^git\s+checkout\s+-b\s+(\S+)/)?.[1] ?? '';
    if (branchAfterCheckout) {
      return {
        total: 80,
        base: 40,
        must: 40,
        bonus: 0,
        status: 'accepted',
        coaching: '동작은 해요! 최신 git에서는 `git switch -c`를 권장해요.',
      };
    }
  }

  const isSwitch = /^git\s+switch\b/.test(cmd);
  const base = isSwitch ? 40 : 0;

  const hasDashC = /-c\b|--create\b/.test(cmd);
  const branchAfterC = cmd.match(/(?:-c|--create)\s+(\S+)/)?.[1] ?? '';
  const must = isSwitch && hasDashC && branchAfterC ? 40 : 0;

  const hasConvention = /(feat|fix|chore|docs|refactor)\//.test(branchAfterC);
  const bonus = must === 40 && hasConvention ? 20 : 0;

  const total = base + must + bonus;

  let status: ScoreResult['status'];
  let coaching = '';
  if (total === 100) {
    status = 'perfect';
  } else if (base === 40 && must === 40) {
    status = 'accepted';
    coaching = '잘 됐어요! 브랜치명에 `feat/`, `fix/` 같은 타입 prefix를 붙이면 +20 보너스.';
  } else if (isSwitch && hasDashC && !branchAfterC) {
    status = 'partial';
    coaching = '`-c` 뒤에 브랜치명을 붙여줘요. 예: `git switch -c feat/login`';
  } else if (isSwitch && !hasDashC) {
    status = 'partial';
    coaching = '`git switch` 맞아요! `-c` 옵션을 추가하면 새 브랜치를 만들면서 이동해요.';
  } else {
    status = 'wrong';
    coaching = '새 브랜치를 만들면서 이동하려면 `git switch -c feat/login`을 써보세요.';
  }

  return { total, base, must, bonus, status, coaching };
}

function applyFlyTransition(viz: VizState): VizState {
  return {
    ...viz,
    commits: SCENARIO0_BRANCH_COMMITS,
    flashIn: 'commits',
  };
}

const card02: Card = {
  id: '0-2',
  scenarioId: 0,
  stepIdx: 1,
  title: '내 작업 공간 만들기',
  narrative:
    '코드를 받아왔어요! 이제 `feat/login` 기능을 개발할 거예요.\nmain에서 직접 작업하면 팀 코드에 영향이 생기니까, 내 브랜치를 따로 만들어서 작업해요.',
  canonical: 'git switch -c feat/login',
  canonicalLabel: '브랜치 생성 + 이동',
  placeholder: 'git switch …',
  hint: '새 브랜치를 *만들면서 동시에 이동*하는 명령이에요.\n`switch`에 특별한 옵션을 붙이면 생성+이동이 한 번에 돼요.\n브랜치명은 `feat/기능명` 형식이 팀 컨벤션이에요.',
  explanation:
    '`git switch -c <브랜치명>`은 브랜치 생성 + 이동을 한 번에 해요.\n`feat/`, `fix/`, `chore/` 같은 prefix는 브랜치 목적을 한눈에 알려줘요.',
  moodIdle: '내 브랜치가 생기면 맘껏 작업할 수 있겠죠?',
  moodPerfect: '냥! 내 작업 공간이 생겼어요!',
  grade,
  initialViz: {
    working: [],
    staging: [],
    commits: SCENARIO0_REMOTE_COMMITS,
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

export default card02;

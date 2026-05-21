import { checkForbidden, makeWrong } from '../utils/graders';

import { SCENARIO0_BRANCH_COMMITS } from './card-0-1';

import type { Card, ScoreResult, VizState } from '../types/incident.types';

function grade(raw: string): ScoreResult | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  const forbidden = checkForbidden(cmd, [
    {
      re: /(\s|^)-A\b|(\s|^)--all\b|\*/,
      reason: '전체 지정은 관계없는 파일까지 올릴 수 있어요. 파일을 직접 지정해줘요.',
    },
    {
      re: /^git\s+rm\b/,
      reason: '`git rm`은 파일을 삭제해요. 스테이지에 올리려면 `git add`를 쓰세요.',
    },
  ]);
  if (forbidden) return forbidden;

  if (!/^git\s/.test(cmd)) return makeWrong('`git`으로 시작하는 명령이어야 해요.');

  const isAdd = /^git\s+add\b/.test(cmd);
  const base = isAdd ? 40 : 0;

  const hasDot = /\s+\.(?:\/)?$/.test(cmd);
  const hasFile = /login\.ts/.test(cmd) || hasDot;
  const must = isAdd && hasFile ? 40 : 0;

  const hasExact = /src\/login\.ts/.test(cmd);
  const bonus = isAdd && hasExact ? 20 : 0;

  const total = base + must + bonus;

  let status: ScoreResult['status'];
  let coaching = '';
  if (total === 100) {
    status = 'perfect';
  } else if (base === 40 && must === 40) {
    status = 'accepted';
    if (hasDot) {
      coaching =
        '동작해요! `src/login.ts`처럼 파일을 명시하면 실수로 다른 파일이 올라가는 걸 막을 수 있어요.';
    } else {
      coaching = '잘 됐어요! 경로까지 `src/login.ts`로 정확히 지정하면 +20 보너스.';
    }
  } else if (isAdd) {
    status = 'partial';
    coaching = '`git add` 맞아요! 어떤 파일을 올릴지 지정해야 해요. `src/login.ts`를 붙여보세요.';
  } else {
    status = 'wrong';
    coaching = '파일을 스테이지에 올리려면 `git add src/login.ts`를 써보세요.';
  }

  return { total, base, must, bonus, status, coaching };
}

function applyFlyTransition(viz: VizState): VizState {
  return {
    ...viz,
    working: viz.working.filter((f) => f.name !== 'src/login.ts'),
    staging: [{ name: 'src/login.ts', icon: 'A', status: 'added', kind: 'safe' }],
    flashIn: 'staging',
  };
}

const card03: Card = {
  id: '0-3',
  scenarioId: 0,
  stepIdx: 2,
  title: '작업 결과 스테이지에',
  narrative:
    '`feat/login` 브랜치에서 로그인 기능 코드를 작성했어요(`src/login.ts`).\n커밋에 넣으려면 먼저 스테이지에 올려야 해요.',
  canonical: 'git add src/login.ts',
  canonicalLabel: '명시적 지정',
  placeholder: '명령어를 입력하세요…',
  hint: '변경된 파일을 *스테이지(index)에 추가*하는 명령이에요.\n파일 경로를 직접 지정하면 실수로 다른 파일이 올라가는 걸 막을 수 있어요.\n파일명은 `src/login.ts`예요.',
  explanation:
    '`git add <파일>`이 그 파일을 스테이지에 올려요.\n`.`은 현재 디렉터리 전체를 올리지만, 파일을 명시적으로 지정하는 습관이 더 안전해요.',
  moodIdle: '코드 완성! 이제 커밋할 준비를 해볼까요?',
  moodPerfect: '냥! 스테이지에 올라갔어요!',
  grade,
  initialViz: {
    working: [{ name: 'src/login.ts', icon: '?', status: 'untracked', kind: 'untracked' }],
    staging: [],
    commits: SCENARIO0_BRANCH_COMMITS,
    stagingWarn: false,
  },
  flyTransition: {
    delayMs: 700,
    flyFrom: 'working',
    flyTo: 'staging',
    flyingFiles: ['src/login.ts'],
    apply: (viz) => applyFlyTransition(viz),
  },
};

export default card03;

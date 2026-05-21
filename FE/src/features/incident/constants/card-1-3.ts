import { checkForbidden, makeWrong } from '../utils/graders';

import { AFTER_RESET_COMMITS } from './card-1-1';

import type { Card, ScoreResult, VizState } from '../types/incident.types';

function grade(raw: string): ScoreResult | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  const forbidden = checkForbidden(cmd, [
    { re: /--hard\b/, reason: '--hard는 작업 내용까지 다 지워버려요. 절대 금지!' },
    { re: /\bgit\s+rm\b/, reason: 'rm은 파일 자체를 삭제해요. .env 자체는 살려둬야 합니다.' },
    {
      re: /(\s|^)-A\b|(\s|^)--all\b|\*/,
      reason: '와일드카드/전체 지정은 다른 변경사항까지 건드려요.',
    },
  ]);
  if (forbidden) return forbidden;

  if (!/^git\s/.test(cmd)) return makeWrong('`git`으로 시작하는 명령이어야 해요.');

  const isRestoreStaged = /^git\s+restore\s+(--staged|-S)\s+/.test(cmd);
  const isResetHead = /^git\s+reset\s+HEAD\s+/.test(cmd);
  const isResetFile = /^git\s+reset\s+(?!--).+\.env/.test(cmd);

  const base = isRestoreStaged || isResetHead || isResetFile ? 40 : 0;
  const must = /\.env\b/.test(cmd) ? 40 : 0;
  const bonus = isRestoreStaged ? 20 : 0;
  const total = base + must + bonus;

  let status: ScoreResult['status'];
  let coaching = '';
  if (total === 100) {
    status = 'perfect';
  } else if (base === 40 && must === 40) {
    status = 'accepted';
    coaching = '동작은 해요. 더 현대적인 형식은 `git restore --staged .env` 입니다.';
  } else if (base > 0 && must === 0) {
    status = 'partial';
    coaching = '명령은 맞는데 어떤 파일을 뺄지 지정해야 해요. 파일명을 붙여보세요.';
  } else if (must > 0 && base === 0) {
    status = 'partial';
    coaching = '`.env`는 정확히 짚었어요. 그런데 명령이 스테이지에서 빼는 게 아니에요.';
  } else {
    status = 'wrong';
    coaching = '스테이지에서 파일을 빼려면 `git restore --staged <file>`을 써보세요.';
  }

  return { total, base, must, bonus, status, coaching };
}

function applyFlyTransition(viz: VizState): VizState {
  return {
    ...viz,
    working: [...viz.working, { name: '.env', icon: '?', status: 'untracked', kind: 'untracked' }],
    staging: viz.staging.filter((f) => f.name !== '.env'),
    stagingWarn: false,
    flashIn: 'working',
  };
}

const card13: Card = {
  id: '1-3',
  scenarioId: 1,
  stepIdx: 2,
  title: '.env만 스테이지에서 빼기',
  narrative: '스테이지에 다 들어와 있어요. .env만 빼고 다른 변경사항은 살려야 합니다.',
  canonical: 'git restore --staged .env',
  canonicalLabel: '최신형',
  placeholder: '명령어를 입력하세요…',
  hint: '스테이지(index)에 올라간 파일을 다시 내리고 싶어요.\n최신 git에는 restore 명령어가 있고, 스테이지에서 내리는 옵션이 따로 있어요.\n파일명을 정확히 지정해야 다른 파일에 영향이 없어요.',
  explanation:
    'git restore --staged .env는 .env만 스테이지에서 내려요. 워킹 디렉터리 내용은 그대로예요.\n구식 방법인 git reset HEAD .env도 동일하게 동작해요.',
  moodIdle: '미안해요… 제가 또 사고를…',
  moodPerfect: '냥! 깔끔하게 빼냈어요!',
  grade,
  initialViz: {
    working: [{ name: '.gitignore', icon: '◌', status: 'clean' }],
    staging: [
      { name: 'src/api.ts', icon: 'M', status: 'modified', kind: 'safe' },
      { name: 'src/config.ts', icon: 'M', status: 'modified', kind: 'safe' },
      { name: 'README.md', icon: 'M', status: 'modified', kind: 'safe' },
      { name: '.env', icon: '!', status: 'added', kind: 'danger' },
    ],
    commits: AFTER_RESET_COMMITS,
    stagingWarn: true,
  },
  flyTransition: {
    delayMs: 700,
    flyFrom: 'staging',
    flyTo: 'working',
    flyingFiles: ['.env'],
    apply: (viz) => applyFlyTransition(viz),
  },
};

export default card13;

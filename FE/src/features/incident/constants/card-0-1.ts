import { makeWrong } from '../utils/graders';

import type { Card, ScoreResult, VizState } from '../types/incident.types';

export const SCENARIO0_REMOTE_COMMITS = [
  { hash: 'e3f4d5c', msg: 'chore: initial setup', branch: 'HEAD → main', current: true },
  { hash: 'b2c1a98', msg: 'docs: add README', branch: '', current: false },
  { hash: '7d6e5f4', msg: 'init: project structure', branch: '', current: false },
];

export const SCENARIO0_BRANCH_COMMITS = [
  { hash: 'e3f4d5c', msg: 'chore: initial setup', branch: 'HEAD → feat/login', current: true },
  { hash: 'b2c1a98', msg: 'docs: add README', branch: '', current: false },
  { hash: '7d6e5f4', msg: 'init: project structure', branch: '', current: false },
];

export const SCENARIO0_AFTER_COMMIT_COMMITS = [
  { hash: 'f7a8b9c', msg: 'feat: add login form', branch: 'HEAD → feat/login', current: true },
  { hash: 'e3f4d5c', msg: 'chore: initial setup', branch: 'main', current: false },
  { hash: 'b2c1a98', msg: 'docs: add README', branch: '', current: false },
  { hash: '7d6e5f4', msg: 'init: project structure', branch: '', current: false },
];

function grade(raw: string): ScoreResult | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  if (!/^git\s/.test(cmd)) return makeWrong('`git`으로 시작하는 명령이어야 해요.');

  const isClone = /^git\s+clone\b/.test(cmd);
  const base = isClone ? 40 : 0;

  const hasStoryUrl = /https?:\/\/\S*story\.git\b/.test(cmd);
  const must = isClone && hasStoryUrl ? 40 : 0;

  const isExact = cmd === 'git clone https://story.git';
  const bonus = isExact ? 20 : 0;

  const total = base + must + bonus;

  let status: ScoreResult['status'];
  let coaching = '';
  if (total === 100) {
    status = 'perfect';
  } else if (base === 40 && must === 40) {
    status = 'accepted';
    coaching = '잘 됐어요! 연습용 저장소 URL은 정확히 `https://story.git`이에요.';
  } else if (isClone) {
    status = 'partial';
    coaching =
      '`git clone` 맞아요! 저장소 주소를 정확히 적어줘요. 예: `git clone https://story.git`';
  } else {
    status = 'wrong';
    coaching = '원격 저장소를 받아오려면 `git clone https://story.git`을 써보세요.';
  }

  return { total, base, must, bonus, status, coaching };
}

function applyFlyTransition(): VizState {
  return {
    working: [],
    staging: [],
    commits: SCENARIO0_REMOTE_COMMITS,
    stagingWarn: false,
    flashIn: 'commits',
  };
}

const card01: Card = {
  id: '0-1',
  scenarioId: 0,
  stepIdx: 0,
  title: '첫 출근, 코드 받아오기',
  narrative:
    '첫 일감이 생겼어요! 로그인 기능 구현을 맡았는데, 먼저 팀 저장소 코드를 내 컴퓨터로 받아와야 해요.\n저장소 주소는 `https://story.git`이에요.',
  canonical: 'git clone https://story.git',
  canonicalLabel: '저장소 복제',
  placeholder: '명령어를 입력하세요…',
  hint: '원격 저장소를 로컬로 통째로 복제하는 명령이에요.\n명령어 뒤에 저장소 URL을 붙여야 해요.\n`https://story.git`이 주소예요.',
  explanation:
    '`git clone <URL>`은 원격 저장소를 통째로 복제해 로컬에 가져와요.\n커밋 히스토리까지 모두 내려받아 바로 작업할 수 있는 상태가 돼요.',
  moodIdle: '두근두근… 첫 출근이에요! 잘할 수 있겠죠?',
  moodPerfect: '냥! 코드 받아오기 완료! 시작이 반이에요!',
  grade,
  mockOutput: `Cloning into 'story'...
remote: Enumerating objects: 12, done.
remote: Counting objects: 100% (12/12), done.
remote: Compressing objects: 100% (8/8), done.
Receiving objects: 100% (12/12), 1.24 KiB | 1.24 MiB/s, done.
Resolving deltas: 100% (3/3), done.`,
  initialViz: {
    working: [],
    staging: [],
    commits: [],
    stagingWarn: false,
  },
  flyTransition: {
    delayMs: 800,
    flyFrom: 'commits',
    flyTo: 'commits',
    flyingFiles: ['all'],
    apply: () => applyFlyTransition(),
  },
};

export default card01;

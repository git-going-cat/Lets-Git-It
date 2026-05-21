import { checkForbidden, makeWrong } from '../utils/graders';

import type { Card, ScoreResult } from '../types/incident.types';

export const SCENARIO1_BASE_COMMITS = [
  { hash: 'b9e84d3', msg: 'add .env accidentally', branch: 'HEAD → main', current: true },
  { hash: 'a1f2c0e', msg: 'feat: prep release', branch: '', current: false },
  { hash: '7b3d92a', msg: 'chore: deps bump', branch: '', current: false },
];

export const AFTER_RESET_COMMITS = [
  { hash: 'a1f2c0e', msg: 'feat: prep release', branch: 'HEAD → main', current: true },
  { hash: '7b3d92a', msg: 'chore: deps bump', branch: '', current: false },
];

function grade(raw: string): ScoreResult | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  const forbidden = checkForbidden(cmd, [
    { re: /^git\s+reset\b/, reason: 'reset은 커밋을 수정해요. 먼저 내용부터 확인해봐요.' },
    { re: /^git\s+revert\b/, reason: 'revert는 확인 전에 실행하기엔 이릅니다.' },
  ]);
  if (forbidden) return forbidden;

  if (!/^git\s/.test(cmd)) return makeWrong('`git`으로 시작하는 명령이어야 해요.');

  const isShow = /^git\s+show\b/.test(cmd);
  const isLog = /^git\s+log\b/.test(cmd);
  const base = isShow || isLog ? 40 : 0;

  const hasPatch = /(-p\b|--patch\b)/.test(cmd);
  const hasHead = /\bHEAD\b(?![~^@])/.test(cmd);
  const hasLimit = /(-1\b|-n\s*1\b)/.test(cmd);
  const must = (isShow && hasHead) || (isLog && hasPatch) ? 40 : 0;

  const isExactShow = cmd === 'git show HEAD';
  const isExactLog = isLog && hasPatch && hasHead && hasLimit;
  const bonus = isExactShow || isExactLog ? 20 : 0;

  const total = base + must + bonus;

  let status: ScoreResult['status'];
  let coaching = '';
  if (total === 100) {
    status = 'perfect';
  } else if (base === 40 && must === 40) {
    status = 'accepted';
    coaching = '잘 됐어요! 더 간결하게는 `git show HEAD` 한 줄로 쓸 수 있어요.';
  } else if (base > 0) {
    status = 'partial';
    coaching = '명령어는 맞아요. HEAD를 지정하거나 -p 옵션으로 마지막 커밋 내용을 보여주세요.';
  } else {
    status = 'wrong';
    coaching = '마지막 커밋 내용을 보려면 `git show HEAD` 또는 `git log -p -1`을 써보세요.';
  }

  return { total, base, must, bonus, status, coaching };
}

const card11: Card = {
  id: '1-1',
  scenarioId: 1,
  stepIdx: 0,
  title: '사건 현장 확인',
  narrative:
    '고양이가 .env 파일을 실수로 커밋했어요. 먼저 마지막 커밋이 무엇을 담고 있는지 확인해봅시다.',
  canonical: 'git show HEAD',
  canonicalLabel: '간결한 형식',
  placeholder: '명령어를 입력하세요…',
  hint: '마지막 커밋에 어떤 변경이 들어갔는지 diff를 보고 싶어요.\n커밋 하나를 자세히 들여다보는 git 명령어는 무엇일까요?\nHEAD는 지금 작업 중인 커밋을 가리켜요.',
  explanation:
    'git show HEAD는 현재 커밋(HEAD)의 메타데이터와 전체 diff를 한눈에 보여줘요.\ngit log -p -1도 동일한 정보를 출력하지만, show가 더 간결해요.',
  moodIdle: '으아, 제가 또 뭔가를 저질렀어요…',
  moodPerfect: '냥! 커밋 내용 확인 완료!',
  grade,
  mockOutput: `commit b9e84d3 (HEAD -> main)
Author: cat <cat@example.com>
Date:   Mon Nov 17 02:30:00 2025

    add .env accidentally

diff --git a/.env b/.env
new file mode 100644
--- /dev/null
+++ b/.env
@@ -0,0 +1,2 @@
+API_KEY=sk-xxxxxxxxxxxxxxxx
+DB_PASSWORD=super_secret_123`,
  initialViz: {
    working: [{ name: '.gitignore', icon: '◌', status: 'clean' }],
    staging: [],
    commits: SCENARIO1_BASE_COMMITS,
    stagingWarn: false,
  },
};

export default card11;

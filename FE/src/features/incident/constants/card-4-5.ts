import { makeWrong } from '../utils/graders';

import type { Card, ScoreResult, VizState } from '../types/incident.types';

function grade(raw: string): ScoreResult | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  if (!/^git\s/.test(cmd)) return makeWrong('`git`으로 시작하는 명령이어야 해요.');

  const isBranch = /^git\s+branch\b/.test(cmd);
  const base = isBranch ? 40 : 0;

  const hasSmallD = /\s-d\b/.test(cmd);
  const hasBigD = /\s-D\b/.test(cmd);
  const hasDeleteFlag = hasSmallD || hasBigD;
  const must = isBranch && hasDeleteFlag ? 40 : 0;

  const hasName = /\b(recovery|backup|saved)\b/.test(cmd);
  const bonus = isBranch && hasSmallD && hasName ? 20 : 0;

  const total = base + must + bonus;

  let status: ScoreResult['status'];
  let coaching = '';
  if (total === 100) {
    status = 'perfect';
  } else if (base === 40 && must === 40 && hasBigD) {
    status = 'accepted';
    coaching =
      '강제 삭제는 머지되지 않은 변경까지 같이 날아가요. 안전한 `-d`로 충분합니다. 브랜치 이름도 명시하면 +20 보너스.';
  } else if (base === 40 && must === 40) {
    status = 'accepted';
    coaching = '잘 됐어요! 브랜치 이름 `recovery`를 명시하면 +20 보너스.';
  } else if (base > 0 && must === 0) {
    status = 'partial';
    coaching = '`git branch`는 맞아요. `-d` 플래그로 안전하게 삭제해요.';
  } else {
    status = 'wrong';
    coaching = '브랜치를 삭제하려면 `git branch -d <브랜치명>`을 써요.';
  }

  return { total, base, must, bonus, status, coaching };
}

const COMMITS_RECOVERED = [
  { hash: 'abc1234', msg: 'feat: new feature', branch: 'HEAD → main · recovery', current: true },
  { hash: 'def5678', msg: 'refactor: cleanup', branch: '', current: false },
  { hash: '1a2b3c4', msg: 'chore: update deps', branch: '', current: false },
  { hash: '9x8y7z6', msg: 'docs: readme', branch: '', current: false },
];

function applyFlyTransition(viz: VizState): VizState {
  return {
    ...viz,
    commits: viz.commits.map((c) => ({
      ...c,
      branch: c.current ? 'HEAD → main' : c.branch === 'recovery' ? '' : c.branch,
    })),
    flashIn: 'commits',
  };
}

const card45: Card = {
  id: '4-5',
  scenarioId: 4,
  stepIdx: 4,
  title: '안전망 브랜치 정리',
  narrative: '복구가 완료됐어요! 임시로 만든 recovery 브랜치를 안전하게 정리합시다.',
  canonical: 'git branch -d recovery',
  canonicalLabel: '안전한 삭제',
  placeholder: 'git branch -d …',
  hint: '임무가 끝난 안전망 브랜치를 정리할 시간이에요.\n브랜치를 삭제하는 명령어와, 이미 머지된 브랜치만 지우는 안전한 옵션을 써봐요.',
  explanation:
    '-d는 이미 머지된 브랜치만 삭제해요. 실수로 중요한 브랜치를 날리는 걸 막아줘요.\n-D는 강제 삭제라 머지 여부를 확인하지 않아요. 꼭 필요한 경우에만 써야 해요.',
  moodIdle: '임시 브랜치를 깔끔하게 정리해요!',
  moodPerfect: '냥! 완벽하게 복구 & 정리 완료!',
  grade,
  initialViz: {
    working: [],
    staging: [],
    commits: COMMITS_RECOVERED,
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

export default card45;

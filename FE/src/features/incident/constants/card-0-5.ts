import { checkForbidden, makeWrong } from '../utils/graders';

import { SCENARIO0_AFTER_COMMIT_COMMITS } from './card-0-1';

import type { Card, ScoreResult, VizState } from '../types/incident.types';

function grade(raw: string): ScoreResult | null {
  const cmd = raw.trim();
  if (!cmd) return null;

  const forbidden = checkForbidden(cmd, [
    {
      re: /(--force\b|-f\b)/,
      reason: 'force push는 팀원의 작업을 덮어쓸 수 있어요. 첫 push엔 필요 없어요!',
    },
    { re: /--force-with-lease\b/, reason: '지금은 안전한 일반 push만 필요해요.' },
  ]);
  if (forbidden) return forbidden;

  if (!/^git\s/.test(cmd)) return makeWrong('`git`으로 시작하는 명령이어야 해요.');

  const isPush = /^git\s+push\b/.test(cmd);
  const base = isPush ? 40 : 0;

  const parts = cmd.trim().split(/\s+/);
  const pushIdx = parts.indexOf('push');
  const nonFlagAfterPush =
    pushIdx >= 0 ? parts.slice(pushIdx + 1).filter((p) => !p.startsWith('-')) : [];
  const hasOrigin = nonFlagAfterPush.includes('origin');
  const hasFeatLogin = /\bfeat\/login\b/.test(cmd);
  const must = isPush && hasOrigin && hasFeatLogin ? 40 : 0;

  const isCanonicalForm = cmd === 'git push origin feat/login';
  const hasUpstream = /-u\b|--set-upstream\b/.test(cmd);
  const bonus = must === 40 && (isCanonicalForm || hasUpstream) ? 20 : 0;

  const total = base + must + bonus;

  let status: ScoreResult['status'];
  let coaching = '';
  if (total === 100) {
    status = 'perfect';
  } else if (base === 40 && must === 40) {
    status = 'accepted';
    coaching = '잘 됐어요! `-u`(`--set-upstream`)를 붙이면 추적 관계까지 설정돼요.';
  } else if (isPush && !hasOrigin) {
    status = 'partial';
    coaching = '원격 이름(`origin`)과 브랜치명을 명시해줘요. `git push origin feat/login`처럼요.';
  } else if (isPush && hasOrigin && !hasFeatLogin) {
    status = 'partial';
    coaching = '올릴 브랜치는 `feat/login`이에요. `git push origin feat/login`처럼 입력해줘요.';
  } else {
    status = 'wrong';
    coaching = '원격에 올리려면 `git push origin feat/login`을 써보세요.';
  }

  return { total, base, must, bonus, status, coaching };
}

function applyFlyTransition(viz: VizState): VizState {
  return {
    ...viz,
    commits: viz.commits.map((c, i) => ({
      ...c,
      remoteBranch: i === 0 ? 'origin/feat/login' : c.remoteBranch,
      isNew: i === 0 ? true : c.isNew,
    })),
    flashIn: 'commits',
  };
}

const card05: Card = {
  id: '0-5',
  scenarioId: 0,
  stepIdx: 4,
  title: '원격에 내 브랜치 올리기',
  narrative:
    '로컬 작업이 끝났어요! 동료들과 공유하려면 내 브랜치를 원격(`origin`)에 올려야 해요.\n처음 올리는 브랜치예요.',
  canonical: 'git push origin feat/login',
  canonicalLabel: '명시적 push',
  placeholder: 'git push …',
  hint: '원격 저장소에 내 브랜치를 올리는 명령이에요.\n어느 원격(`origin`)으로, 어느 브랜치를 올릴지 명시하면 실수가 없어요.\n첫 push 시 `-u` 옵션을 붙이면 추적 관계도 설정돼요.',
  explanation:
    '`git push <원격> <브랜치>`로 원격에 브랜치를 올려요.\n`-u`(`--set-upstream`) 옵션을 붙이면 이후엔 `git push`만 쳐도 자동으로 올라가요.',
  moodIdle: '마지막이에요! push만 하면 첫 일감 완료!',
  moodPerfect: '냥! 원격에 올라갔어요! 첫 일감 완료!',
  mockOutput: `Enumerating objects: 4, done.
Counting objects: 100% (4/4), done.
Writing objects: 100% (4/4), 412 bytes | 412.00 KiB/s, done.
Total 4 (delta 0), reused 0 (delta 0)
remote:
remote: Create a pull request for 'feat/login' on GitHub by visiting:
remote:   https://github.com/team/repo/pull/new/feat/login
To https://story.git
 * [new branch]      feat/login -> feat/login`,
  grade,
  initialViz: {
    working: [],
    staging: [],
    commits: SCENARIO0_AFTER_COMMIT_COMMITS,
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

export default card05;

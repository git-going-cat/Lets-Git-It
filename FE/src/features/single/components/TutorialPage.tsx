import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Provider } from 'jotai';

import { onboardingApi } from '@/features/auth/api/onboardingApi';
import { useAuthStore } from '@/features/auth/store/authStore';

import { useSingleStore } from '../store/singleStore';

import PauseModal from './PauseModal';
import SingleGameContent from './SingleGameContent';
import StartModal from './StartModal';

import type { Command, CommandType } from '../types/single.types';
import type { TutorialStep } from '@/features/auth/schemas/onboarding.schema';

// ── API 응답 → 게임 커맨드셋 추출 ─────────────────────────────────────────────

function deriveCommandType(cmd: string): CommandType {
  if (/^git\s+switch\s+-c\s+/.test(cmd)) return 'CREATE';
  if (/^git\s+switch\s+/.test(cmd)) return 'SWITCH';
  if (/^git\s+merge\s+/.test(cmd)) return 'MERGE';
  return 'COMMON';
}

function extractCommandSet(steps: TutorialStep[]): Command[] {
  const commandSet: Command[] = [];
  let currentBranch = 'main';
  let cmdSeq = 0;

  for (const step of steps) {
    for (const cmd of step.commands) {
      if (/^git\s+clone\s+/.test(cmd.command)) continue;

      const type = deriveCommandType(cmd.command);
      commandSet.push({
        commandSequence: cmdSeq,
        text: cmd.command,
        branchName: currentBranch,
        type,
      });
      cmdSeq++;

      if (type === 'CREATE' || type === 'SWITCH') {
        const parts = cmd.command.trim().split(/\s+/);
        currentBranch = parts[parts.length - 1];
      }
    }
  }

  return commandSet;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────────

/**
 * 튜토리얼 페이지.
 * 마운트 시 API에서 튜토리얼 데이터를 가져와 게임 세션을 구성합니다.
 * 완료 시 completeTutorial API를 호출하고 /home으로 이동합니다.
 */
export default function TutorialPage() {
  const navigate = useNavigate();
  const { replay } = useSearch({ from: '/tutorial' });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const steps = await onboardingApi.getTutorialSteps();
        if (cancelled) return;

        const commandSet = extractCommandSet(steps);
        useSingleStore.getState().setSession({
          sessionId: 'tutorial-session',
          difficulty: 'EASY',
          bestScore: 0,
          commandSet,
          isTutorial: true,
          tutorialSteps: steps,
        });
        setReady(true);
      } catch {
        if (!cancelled) setError('튜토리얼 데이터를 불러오지 못했습니다.');
      }
    };

    void init();
    return () => {
      cancelled = true;
      useSingleStore.getState().clearSession();
    };
  }, []);

  const handleTutorialComplete = useCallback(async () => {
    const user = useAuthStore.getState().user;

    if (replay || user?.onboardingStatus === 'TUTORIAL_DONE') {
      await navigate({ to: '/home', replace: true });
      return;
    }

    try {
      await onboardingApi.completeTutorial();
      if (user) {
        useAuthStore.setState({ user: { ...user, onboardingStatus: 'TUTORIAL_DONE' } });
      }
    } catch {
      // 이미 TUTORIAL_DONE인 경우 무시
    }
    await navigate({ to: '/home', replace: true });
  }, [navigate, replay]);

  if (error) {
    return (
      <div className="font-pixel flex h-screen items-center justify-center bg-black text-white">
        <div className="nes-container is-dark with-title text-center">
          <p className="title text-sm">ERROR</p>
          <p className="text-base text-red-400 mb-4">{error}</p>
          <button
            type="button"
            className="nes-btn is-error"
            onClick={() => window.location.reload()}
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="font-pixel flex h-screen items-center justify-center bg-black text-white">
        <p className="text-xl animate-pulse">Loading tutorial...</p>
      </div>
    );
  }

  return (
    <Provider>
      <div className="font-pixel">
        <SingleGameContent onTutorialComplete={handleTutorialComplete} />
        <StartModal />
        <PauseModal />
      </div>
    </Provider>
  );
}

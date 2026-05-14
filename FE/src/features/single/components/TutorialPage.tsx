import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Provider } from 'jotai';

import { useBgm } from '@/shared/hooks/useBgm';

import { useSingleStore } from '../store/singleStore';

import PauseModal from './PauseModal';
import SingleGameContent from './SingleGameContent';
import StartModal from './StartModal';

import type { SingleCommand } from '../types/single.types';
import type { CommandType } from '@/shared/types/game.types';
import type { TutorialStep } from '@/shared/types/tutorial.types';

// ── API 응답 → 게임 커맨드셋 추출 ─────────────────────────────────────────────

function deriveCommandType(cmd: string): CommandType {
  if (/^git\s+switch\s+-c\s+/.test(cmd)) return 'CREATE';
  if (/^git\s+switch\s+/.test(cmd)) return 'SWITCH';
  if (/^git\s+merge\s+/.test(cmd)) return 'MERGE';
  return 'COMMON';
}

function extractCommandSet(steps: TutorialStep[]): SingleCommand[] {
  const commandSet: SingleCommand[] = [];
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

interface TutorialPageProps {
  onFetchSteps: () => Promise<TutorialStep[]>;
  onComplete: () => Promise<void>;
}

export default function TutorialPage({ onFetchSteps, onComplete }: TutorialPageProps) {
  useBgm();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const steps = await onFetchSteps();
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
  }, [onFetchSteps]);

  const handleTutorialComplete = useCallback(async () => {
    await onComplete();
    await navigate({ to: '/home', replace: true });
  }, [navigate, onComplete]);

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

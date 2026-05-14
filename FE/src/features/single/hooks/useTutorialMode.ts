import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSetAtom } from 'jotai';

import { analytics } from '@/lib/analytics';

import { singleBus } from '../bridge/singleBus';
import { TUTORIAL_FALL_DURATION_MS } from '../constants/tutorialData';
import { useSingleStore } from '../store/singleStore';
import { tutorialInputBlockedAtom } from '../store/tutorialInputBlockedAtom';

export type TutorialOverlayPhase = 'description' | 'explanation';

/**
 * 튜토리얼 오버레이(설명/해설) 상태.
 * metaIndex: 게임 커맨드 인덱스 (1~N)
 */
export interface TutorialOverlayState {
  phase: TutorialOverlayPhase;
  metaIndex: number;
}

/**
 * 전체 튜토리얼 모달 단계.
 * - game: 인게임 상태 (오버레이 또는 입력 대기)
 * - paused: ESC/⏸ 눌렀을 때 스킵 확인 모달
 * - completed: 정상 완료 모달
 * - skipped: 스킵 완료 모달
 */
export type TutorialModalPhase = 'game' | 'paused' | 'completed' | 'skipped';

/**
 * 튜토리얼 진행 상태와 핸들러를 제공합니다.
 *
 * isTutorial=false이면 이벤트 등록을 건너뛰고 noop 반환합니다.
 *
 * 흐름:
 *   game:start → description(1) → [확인] → tutorial:show-command 전송 + 입력 해제
 *   command:complete(N) → explanation(N+1) → [다음] → description(N+2) → ...
 *   last [다음] → 'completed' 모달
 *   ESC/⏸ → 'paused' 모달 → [스킵] → 'skipped' 모달 / [계속] → game 복귀
 */
export function useTutorialMode(isTutorial: boolean) {
  const [overlayState, setOverlayState] = useState<TutorialOverlayState | null>(null);
  const [modalPhase, setModalPhase] = useState<TutorialModalPhase>('game');
  const setInputBlocked = useSetAtom(tutorialInputBlockedAtom);
  const tutorialSteps = useSingleStore((s) => s.tutorialSteps);

  const totalCommands = useMemo(
    () =>
      tutorialSteps.reduce(
        (sum, step) => sum + step.commands.filter((c) => !/^git\s+clone/.test(c.command)).length,
        0
      ),
    [tutorialSteps]
  );

  useEffect(() => {
    if (!isTutorial) return;

    const handleGameStart = () => {
      setInputBlocked(false);
      setOverlayState({ phase: 'description', metaIndex: 1 });
      singleBus.emit('tutorial:show-command');
    };

    const handleCommandComplete = ({ index }: { index: number }) => {
      setInputBlocked(true);
      setOverlayState({ phase: 'explanation', metaIndex: index + 1 });
    };

    const handleTutorialPause = () => {
      setModalPhase('paused');
    };

    const unsubs = [
      singleBus.subscribe('game:start', handleGameStart),
      singleBus.subscribe('command:complete', handleCommandComplete),
      singleBus.subscribe('tutorial:pause', handleTutorialPause),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [isTutorial, setInputBlocked]);

  useEffect(() => {
    return () => {
      setInputBlocked(false);
    };
  }, [setInputBlocked]);

  // description 단계 진입 시: TUTORIAL_FALL_DURATION_MS 후 Phaser에 freeze 요청
  useEffect(() => {
    if (!overlayState || overlayState.phase !== 'description') return;
    const timer = setTimeout(() => {
      singleBus.emit('tutorial:freeze-command');
    }, TUTORIAL_FALL_DURATION_MS);
    return () => clearTimeout(timer);
  }, [overlayState?.phase, overlayState?.metaIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNext = useCallback(
    (currentMetaIndex: number) => {
      analytics.tutorialStepCompleted(currentMetaIndex, totalCommands);
      const nextMeta = currentMetaIndex + 1;
      if (nextMeta > totalCommands) {
        setOverlayState(null);
        setModalPhase('completed');
      } else {
        setInputBlocked(false);
        setOverlayState({ phase: 'description', metaIndex: nextMeta });
        singleBus.emit('tutorial:show-command');
      }
    },
    [setInputBlocked, totalCommands]
  );

  const handleResume = useCallback(() => {
    setModalPhase('game');
  }, []);

  const handleSkip = useCallback(() => {
    analytics.tutorialSkipped(overlayState?.metaIndex ?? 0);
    setInputBlocked(false);
    setOverlayState(null);
    setModalPhase('skipped');
  }, [overlayState?.metaIndex, setInputBlocked]);

  return { overlayState, modalPhase, handleNext, handleResume, handleSkip };
}

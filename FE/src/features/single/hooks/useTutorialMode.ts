import { useCallback, useEffect, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';

import { analytics } from '@/lib/analytics';

import { singleBus } from '../bridge/singleBus';
import {
  TUTORIAL_BLUR_DURATION_MS,
  TUTORIAL_FALL_DURATION_MS,
  TUTORIAL_FORCE_MISS_STEPS,
  TUTORIAL_HIGHLIGHT_TARGETS,
  TUTORIAL_ITEM_USE_SHOW_COMMAND_STEPS,
  TUTORIAL_ITEM_USE_SLOT,
  TUTORIAL_START_STEP,
  TUTORIAL_STEP_BEHAVIOR,
} from '../constants/tutorialData';
import { livesAtom } from '../store/livesAtom';
import { useSingleStore } from '../store/singleStore';
import { tutorialEndScreenWatchedAtom } from '../store/tutorialEndScreenAtom';
import { tutorialHighlightAtom } from '../store/tutorialHighlightAtom';
import { tutorialInputBlockedAtom } from '../store/tutorialInputBlockedAtom';
import { tutorialItemAllowedSlotAtom } from '../store/tutorialItemAllowedSlotAtom';

export type TutorialOverlayPhase = 'info' | 'description' | 'explanation' | 'item-use';

export interface TutorialOverlayState {
  phase: TutorialOverlayPhase;
  stepIndex: number;
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
 *   game:start → enterStep(2) — step 1은 StartModal이 처리
 *   INFO → 'info' 오버레이 → [Enter/다음] → enterStep(next)
 *   PRACTICE → 'description'(input blocked) + show-command → blur 해제 후 input unblock
 *            → command:complete → 'explanation' → [Enter] → enterStep(next)
 *   ITEM_USE → 'item-use' → item:use(일치 슬롯) → enterStep(next)
 *   last step → 'completed' 모달 (단, 완료 직후 single과 동일한 탈출 영상/애니메이션을 먼저 보여줌)
 *
 * end-screen 책임: 'completed' 도달 시 GameEndScreen(영상) → TutorialCompleteModal 순으로 전이된다.
 * `showEndScreen` / `showCompletedModal` derived flag를 노출해 컴포넌트는 분기만 담당한다.
 */
export function useTutorialMode(isTutorial: boolean) {
  const [overlayState, setOverlayState] = useState<TutorialOverlayState | null>(null);
  const [modalPhase, setModalPhase] = useState<TutorialModalPhase>('game');
  const setInputBlocked = useSetAtom(tutorialInputBlockedAtom);
  const setHighlight = useSetAtom(tutorialHighlightAtom);
  const setAllowedItemSlot = useSetAtom(tutorialItemAllowedSlotAtom);
  const setLives = useSetAtom(livesAtom);
  const endScreenWatched = useAtomValue(tutorialEndScreenWatchedAtom);
  const setEndScreenWatched = useSetAtom(tutorialEndScreenWatchedAtom);
  const tutorialSteps = useSingleStore((s) => s.tutorialSteps);
  const totalSteps = tutorialSteps.length;

  // 이벤트 핸들러에서 stale closure 없이 현재 상태를 읽기 위한 ref
  const overlayStateRef = useRef<TutorialOverlayState | null>(null);
  // ITEM_USE + SHOW_COMMAND 단계에서 cherry-pick 등 비동기 명령어 처리가 완료될 때까지
  // 다음 step 진입을 대기시키기 위한 pending stepIndex.
  // 즉시 enterStep하면 cherry-pick 애니메이션 도중 다음 PRACTICE에 도착해, 늦게 도착한 command:complete가
  // 후속 PRACTICE step을 explanation으로 강제 전환시키는 race condition이 발생함.
  const itemUsePendingStepRef = useRef<number | null>(null);

  const enterStep = useCallback(
    (stepIndex: number) => {
      setAllowedItemSlot(null);

      if (stepIndex > totalSteps) {
        setOverlayState(null);
        overlayStateRef.current = null;
        setModalPhase('completed');
        return;
      }

      const behavior = TUTORIAL_STEP_BEHAVIOR[stepIndex];
      const highlight = TUTORIAL_HIGHLIGHT_TARGETS[stepIndex] ?? [];
      setHighlight(highlight);

      // 인위적 miss step 진입 시 lives -1. restore 아이템 효과가 시각적으로 보이도록 사전 차감.
      if (TUTORIAL_FORCE_MISS_STEPS.includes(stepIndex)) {
        setLives((l) => Math.max(0, l - 1));
      }

      let newState: TutorialOverlayState;
      switch (behavior) {
        case 'INFO':
          setInputBlocked(true);
          newState = { phase: 'info', stepIndex };
          break;
        case 'PRACTICE':
          setInputBlocked(true);
          newState = { phase: 'description', stepIndex };
          singleBus.emit('tutorial:show-command');
          break;
        case 'ITEM_USE':
          setInputBlocked(true);
          setAllowedItemSlot(TUTORIAL_ITEM_USE_SLOT[stepIndex] ?? null);
          newState = { phase: 'item-use', stepIndex };
          if (TUTORIAL_ITEM_USE_SHOW_COMMAND_STEPS.includes(stepIndex)) {
            singleBus.emit('tutorial:show-command');
          }
          break;
        default:
          return;
      }
      setOverlayState(newState);
      overlayStateRef.current = newState;
    },
    [totalSteps, setInputBlocked, setHighlight, setAllowedItemSlot, setLives]
  );

  useEffect(() => {
    if (!isTutorial) return;

    const handleGameStart = () => {
      enterStep(TUTORIAL_START_STEP);
    };

    const handleTutorialPause = () => {
      setModalPhase('paused');
    };

    const handleCommandComplete = () => {
      const state = overlayStateRef.current;
      if (!state) return;
      // PRACTICE 완료, 또는 ITEM_USE SHOW_COMMAND의 보류된 비동기 처리(cherry-pick 등) 완료 시
      // 동일하게 explanation phase로 진입. ITEM_USE라도 commands[0].explanation을 사용자가 읽고
      // Enter로 직접 다음 step으로 넘어가도록 한다.
      const isPracticeStep = TUTORIAL_STEP_BEHAVIOR[state.stepIndex] === 'PRACTICE';
      const isItemUsePendingComplete = itemUsePendingStepRef.current === state.stepIndex;
      if (!isPracticeStep && !isItemUsePendingComplete) return;
      itemUsePendingStepRef.current = null;
      setInputBlocked(true);
      // explanation 진입 시 highlight 제거 — ITEM_USE의 item-slot spotlight 딤이 남아 있으면
      // explanation 모달 딤과 중첩되어 다른 step보다 과하게 어두워 보임.
      setHighlight([]);
      const newState: TutorialOverlayState = { phase: 'explanation', stepIndex: state.stepIndex };
      setOverlayState(newState);
      overlayStateRef.current = newState;
    };

    const handleItemUse = ({ slot }: { slot: 0 | 1 | 2 }) => {
      const state = overlayStateRef.current;
      if (!state || TUTORIAL_STEP_BEHAVIOR[state.stepIndex] !== 'ITEM_USE') return;
      if (TUTORIAL_ITEM_USE_SLOT[state.stepIndex] !== slot) return;
      // SHOW_COMMAND 단계(예: step 8 cherry-pick)는 SingleScene에서 비동기 애니메이션 후 command:complete를 emit.
      // 즉시 enterStep하면 늦게 도착한 command:complete가 후속 PRACTICE step을 오염시키므로 pending 처리.
      if (TUTORIAL_ITEM_USE_SHOW_COMMAND_STEPS.includes(state.stepIndex)) {
        itemUsePendingStepRef.current = state.stepIndex;
        return;
      }
      enterStep(state.stepIndex + 1);
    };

    const unsubs = [
      singleBus.subscribe('game:start', handleGameStart),
      singleBus.subscribe('tutorial:pause', handleTutorialPause),
      singleBus.subscribe('command:complete', handleCommandComplete),
      singleBus.subscribe('item:use', handleItemUse),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [isTutorial, setInputBlocked, setHighlight, enterStep]);

  // PRACTICE description 단계 또는 ITEM_USE show-command 단계:
  // 낙하 시작 후 TUTORIAL_FALL_DURATION_MS에 freeze, PRACTICE는 TUTORIAL_BLUR_DURATION_MS 후 input unblock
  useEffect(() => {
    if (!overlayState) return;
    const isDescription = overlayState.phase === 'description';
    const isItemUseShowCommand =
      overlayState.phase === 'item-use' &&
      TUTORIAL_ITEM_USE_SHOW_COMMAND_STEPS.includes(overlayState.stepIndex);
    if (!isDescription && !isItemUseShowCommand) return;

    const freezeTimer = setTimeout(() => {
      singleBus.emit('tutorial:freeze-command');
    }, TUTORIAL_FALL_DURATION_MS);

    if (isDescription) {
      // 블러 해제 시점에 input unblock
      const unblockTimer = setTimeout(() => {
        setInputBlocked(false);
      }, TUTORIAL_BLUR_DURATION_MS);
      return () => {
        clearTimeout(freezeTimer);
        clearTimeout(unblockTimer);
      };
    }

    return () => clearTimeout(freezeTimer);
  }, [overlayState?.phase, overlayState?.stepIndex, setInputBlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      setInputBlocked(false);
      setHighlight([]);
      setAllowedItemSlot(null);
    };
  }, [setInputBlocked, setHighlight, setAllowedItemSlot]);

  const handleNext = useCallback(
    (currentStepIndex: number) => {
      analytics.tutorialStepCompleted(currentStepIndex, totalSteps);
      enterStep(currentStepIndex + 1);
    },
    [enterStep, totalSteps]
  );

  const handleResume = useCallback(() => {
    setModalPhase('game');
  }, []);

  const handleSkip = useCallback(() => {
    analytics.tutorialSkipped(overlayStateRef.current?.stepIndex ?? 0);
    setInputBlocked(false);
    setHighlight([]);
    setAllowedItemSlot(null);
    setOverlayState(null);
    overlayStateRef.current = null;
    itemUsePendingStepRef.current = null;
    setModalPhase('skipped');
  }, [setInputBlocked, setHighlight, setAllowedItemSlot]);

  const handleSkipFall = useCallback(() => {
    singleBus.emit('tutorial:freeze-command');
    setInputBlocked(false);
  }, [setInputBlocked]);

  const handleEndScreenDone = useCallback(() => setEndScreenWatched(true), [setEndScreenWatched]);

  // 'completed' 진입 시 영상(GameEndScreen) → 완료 모달(TutorialCompleteModal) 순으로 전이.
  // 'skipped'는 영상 없이 바로 모달(스킵한 사용자에게 SUCCESS 영상 강요하지 않음).
  const showEndScreen = modalPhase === 'completed' && !endScreenWatched;
  const showCompletedModal = modalPhase === 'completed' && endScreenWatched;
  const showSkippedModal = modalPhase === 'skipped';

  return {
    overlayState,
    modalPhase,
    showEndScreen,
    showCompletedModal,
    showSkippedModal,
    handleNext,
    handleResume,
    handleSkip,
    handleSkipFall,
    handleEndScreenDone,
  };
}

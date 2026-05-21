import { useCallback, useId, useRef } from 'react';

import { useModal } from '@/shared/hooks/useModal';

import { useTutorialDescriptionBlur } from '../hooks/useTutorialDescriptionBlur';
import { useTutorialOverlayKeys } from '../hooks/useTutorialOverlayKeys';
import { useSingleStore } from '../store/singleStore';

import type { TutorialOverlayState } from '../hooks/useTutorialMode';
import type { TutorialStep } from '@/shared/types/tutorial.types';
import type { RefObject } from 'react';

interface TutorialOverlayProps {
  state: TutorialOverlayState;
  onNext: (stepIndex: number) => void;
  onSkipFall?: () => void;
}

/**
 * 튜토리얼 오버레이.
 *
 * info: 딤 배경 + 설명 카드 + 다음 버튼 (Enter 가능)
 * description: 블러 배경 + 상단 카드 (PRACTICE 명령어 입력 유도)
 * explanation: 딤 배경 + 해설 카드 + 다음 버튼 (Enter 가능, useModal a11y 적용)
 * item-use: 상단 카드 (아이템 슬롯 클릭 유도 — TutorialSpotlight가 배경 어두움 처리)
 *
 * phase별 카드/레이어는 동일 파일 내부 컴포넌트로 분리되어 있고,
 * 블러/키 입력은 도메인 hook으로 분리되어 있어 본 컴포넌트는 phase 분기와 wiring만 책임진다.
 */
export default function TutorialOverlay({ state, onNext, onSkipFall }: TutorialOverlayProps) {
  const tutorialSteps = useSingleStore((s) => s.tutorialSteps);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  const { blurActive, markBlurDone } = useTutorialDescriptionBlur(state);

  // description Enter 스킵: 블러를 즉시 해제 + onSkipFall 콜백. onSkipFall이 없으면 noop.
  const handleSkipFall = useCallback(() => {
    markBlurDone();
    onSkipFall?.();
  }, [markBlurDone, onSkipFall]);

  useTutorialOverlayKeys({ state, onSkipFall: handleSkipFall, onNext });

  const step = tutorialSteps[state.stepIndex - 1];
  const totalSteps = tutorialSteps.length;
  const isLast = state.stepIndex >= totalSteps;

  if (!step) return null;

  if (state.phase === 'info') {
    return (
      <TutorialInfoCard
        state={state}
        step={step}
        totalSteps={totalSteps}
        onNext={onNext}
        nextBtnRef={nextBtnRef}
      />
    );
  }
  if (state.phase === 'description') {
    return (
      <TutorialDescriptionLayer
        state={state}
        step={step}
        totalSteps={totalSteps}
        blurActive={blurActive}
      />
    );
  }
  if (state.phase === 'item-use') {
    return <TutorialItemUseCard state={state} step={step} totalSteps={totalSteps} />;
  }
  return (
    <TutorialExplanationModal
      state={state}
      step={step}
      totalSteps={totalSteps}
      isLast={isLast}
      onNext={onNext}
    />
  );
}

// ── 공통 step progress bar ────────────────────────────────────────────────────

interface StepProgressBarProps {
  totalSteps: number;
  stepIndex: number;
  /** 'in-progress': 현재 step 노랑·이전 초록 / 'completed': 현재까지 모두 초록 (explanation 단계) */
  variant: 'in-progress' | 'completed';
}

function StepProgressBar({ totalSteps, stepIndex, variant }: StepProgressBarProps) {
  return (
    <div className={`flex gap-0.5 ${variant === 'in-progress' ? 'mb-2' : 'mb-3'}`}>
      {Array.from({ length: totalSteps }, (_, i) => {
        const oneBased = i + 1;
        const color =
          variant === 'completed'
            ? oneBased <= stepIndex
              ? 'bg-green-500'
              : 'bg-white/10'
            : oneBased < stepIndex
              ? 'bg-green-500'
              : oneBased === stepIndex
                ? 'bg-yellow-400'
                : 'bg-white/10';
        return <div key={i} className={`h-1 flex-1 rounded-full ${color}`} />;
      })}
    </div>
  );
}

// ── phase별 카드/레이어 ───────────────────────────────────────────────────────

interface PhaseCardProps {
  state: TutorialOverlayState;
  step: TutorialStep;
  totalSteps: number;
}

interface NextablePhaseCardProps extends PhaseCardProps {
  onNext: (stepIndex: number) => void;
  nextBtnRef: RefObject<HTMLButtonElement | null>;
}

function TutorialInfoCard({ state, step, totalSteps, onNext, nextBtnRef }: NextablePhaseCardProps) {
  return (
    <div className="font-pixel absolute top-3 left-game-sidebar w-game-center z-40 pointer-events-none">
      <div className="nes-container is-dark with-title px-4 py-3 pointer-events-auto">
        <p className="title text-sm">
          STEP {state.stepIndex} / {totalSteps}
        </p>
        <StepProgressBar
          totalSteps={totalSteps}
          stepIndex={state.stepIndex}
          variant="in-progress"
        />
        <p className="text-lg font-bold text-yellow-400 mb-2">{step.title}</p>
        <p className="text-lg text-white leading-relaxed mb-3">{step.description}</p>
        <button
          ref={nextBtnRef}
          type="button"
          className="nes-btn is-primary w-full text-lg"
          onClick={() => onNext(state.stepIndex)}
        >
          다음 [Enter ↵]
        </button>
      </div>
    </div>
  );
}

interface DescriptionLayerProps extends PhaseCardProps {
  blurActive: boolean;
}

function TutorialDescriptionLayer({ state, step, totalSteps, blurActive }: DescriptionLayerProps) {
  // transition은 fade-out(blurActive=false) 분기에만 적용 — 진입 시 즉시 어둡게, 해제 시 0.5초 부드럽게.
  return (
    <>
      <div
        className={`font-pixel absolute inset-0 z-30 pointer-events-none ${
          blurActive
            ? 'backdrop-blur-sm bg-black/50'
            : 'backdrop-blur-none bg-transparent transition-all duration-500'
        }`}
      />
      <div className="font-pixel absolute top-3 left-game-sidebar w-game-center z-40 pointer-events-none">
        <div className="nes-container is-dark with-title px-3 py-2">
          <p className="title text-sm">
            STEP {state.stepIndex} / {totalSteps}
          </p>
          <StepProgressBar
            totalSteps={totalSteps}
            stepIndex={state.stepIndex}
            variant="in-progress"
          />
          <p className="text-lg font-bold text-yellow-400 mb-1">{step.title}</p>
          <p className="text-lg text-white leading-relaxed">{step.description}</p>
          <p
            className={`text-sm text-center mt-2 animate-pulse ${
              blurActive ? 'text-gray-400' : 'text-green-400'
            }`}
          >
            {blurActive
              ? '명령어가 화면 중앙으로 내려옵니다...  [Enter — 바로 이동]'
              : '↓ 중앙의 명령어를 입력하세요!'}
          </p>
        </div>
      </div>
    </>
  );
}

function TutorialItemUseCard({ state, step, totalSteps }: PhaseCardProps) {
  return (
    <div className="font-pixel absolute top-3 left-game-sidebar w-game-center z-40 pointer-events-none">
      <div className="nes-container is-dark with-title px-4 py-3 pointer-events-auto">
        <p className="title text-sm">
          STEP {state.stepIndex} / {totalSteps}
        </p>
        <StepProgressBar
          totalSteps={totalSteps}
          stepIndex={state.stepIndex}
          variant="in-progress"
        />
        <p className="text-lg font-bold text-yellow-400 mb-2">{step.title}</p>
        <p className="text-lg text-white leading-relaxed mb-1">{step.description}</p>
        <p className="text-sm text-center mt-2 text-cyan-400 animate-pulse">
          아이템 슬롯을 클릭하거나 단축키를 눌러보세요!
        </p>
      </div>
    </div>
  );
}

interface ExplanationModalProps extends PhaseCardProps {
  isLast: boolean;
  onNext: (stepIndex: number) => void;
}

function TutorialExplanationModal({
  state,
  step,
  totalSteps,
  isLast,
  onNext,
}: ExplanationModalProps) {
  // useModal로 컨테이너 자동 포커스 / Tab focus trap / scroll lock 적용 (ESC는 없음 — 진행 전용 모달).
  // 컨테이너 자동 포커스 후 사용자가 Tab 1회 → 다음 버튼. Enter는 useTutorialOverlayKeys가 처리.
  const { containerRef } = useModal({ isOpen: true });
  const titleId = useId();
  const explanation = step.commands[0]?.explanation;

  return (
    <div className="font-pixel absolute inset-0 z-50 flex items-center justify-center bg-black/65 pointer-events-auto">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="nes-container is-dark with-title w-full max-w-lg px-4 py-3"
      >
        <p id={titleId} className="title text-sm">
          STEP {state.stepIndex} / {totalSteps} — 해설
        </p>
        <StepProgressBar totalSteps={totalSteps} stepIndex={state.stepIndex} variant="completed" />
        <p className="text-lg font-bold text-yellow-400 mb-2">{step.title}</p>
        {explanation && (
          <div className="nes-container is-dark px-3 py-2 mb-3">
            <p className="text-lg text-white leading-relaxed whitespace-pre-line">{explanation}</p>
          </div>
        )}
        <button
          type="button"
          className="nes-btn is-success w-full text-lg"
          onClick={() => onNext(state.stepIndex)}
        >
          {isLast ? '튜토리얼 완료! 🎉' : '다음  [Enter ↵]'}
        </button>
      </div>
    </div>
  );
}

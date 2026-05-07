import { useEffect, useMemo, useRef, useState } from 'react';

import { TUTORIAL_BLUR_DURATION_MS } from '../constants/tutorialData';
import { useSingleStore } from '../store/singleStore';

import type { TutorialOverlayState } from '../hooks/useTutorialMode';

interface TutorialOverlayProps {
  state: TutorialOverlayState;
  onNext: (metaIndex: number) => void;
}

/**
 * 튜토리얼 오버레이.
 *
 * description 단계:
 *   - TUTORIAL_BLUR_DURATION_MS 동안 블러 배경 + 상단 설명 카드
 *   - 블러 해제 후: 상단 소형 카드만 남고 사용자가 바로 입력 가능
 *
 * explanation 단계:
 *   - 딤 배경 + 중앙 해설 카드 (Enter 키 또는 버튼으로 다음 이동)
 */
export default function TutorialOverlay({ state, onNext }: TutorialOverlayProps) {
  const tutorialSteps = useSingleStore((s) => s.tutorialSteps);
  const [blurActive, setBlurActive] = useState(true);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  // clone을 제외한 커맨드를 순서대로 flatten — metaIndex 1 → flatCommands[0]
  const flatCommands = useMemo(
    () =>
      tutorialSteps.flatMap((step) =>
        step.commands
          .filter((c) => !/^git\s+clone/.test(c.command))
          .map((c) => ({
            title: step.title,
            description: step.description,
            explanation: c.explanation,
          }))
      ),
    [tutorialSteps]
  );

  const meta = flatCommands[state.metaIndex - 1];
  const stepNumber = state.metaIndex;
  const isLast = state.metaIndex >= flatCommands.length;

  // description: 블러 타이머
  useEffect(() => {
    if (state.phase !== 'description') return;
    const tOn = setTimeout(() => setBlurActive(true), 0);
    const tOff = setTimeout(() => setBlurActive(false), TUTORIAL_BLUR_DURATION_MS);
    return () => {
      clearTimeout(tOn);
      clearTimeout(tOff);
    };
  }, [state.phase, state.metaIndex]);

  // explanation: 버튼 포커스 + Enter 핸들러
  useEffect(() => {
    if (state.phase !== 'explanation') return;
    nextBtnRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onNext(state.metaIndex);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state.phase, state.metaIndex, onNext]);

  if (!meta) return null;

  const totalSteps = flatCommands.length;

  /* ── description 단계 ── */
  if (state.phase === 'description') {
    return (
      <>
        {/* 블러 딤 오버레이 (입력창 접근 허용을 위해 pointer-events-none) */}
        <div
          className={`font-pixel absolute inset-0 z-30 pointer-events-none transition-all duration-500 ${
            blurActive ? 'backdrop-blur-sm bg-black/45' : 'backdrop-blur-none bg-transparent'
          }`}
        />

        {/* 상단 고정 설명 카드 — 항상 표시, pointer-events-none으로 입력 방해 안 함 */}
        <div className="font-pixel absolute top-3 left-[15%] w-[70%] z-40 pointer-events-none tutorial-bubble-wrap">
          <div className="nes-container is-dark with-title px-3 py-2">
            <p className="title text-xs">
              STEP {stepNumber} / {totalSteps}
            </p>

            {/* 진행 바 */}
            <div className="flex gap-0.5 mb-2">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${
                    i + 1 < stepNumber
                      ? 'bg-green-500'
                      : i + 1 === stepNumber
                        ? 'bg-yellow-400'
                        : 'bg-white/10'
                  }`}
                />
              ))}
            </div>

            <p className="text-lg font-bold text-yellow-400 mb-1">{meta.title}</p>
            <p className="text-lg text-white leading-relaxed">{meta.description}</p>

            <p
              className={`text-xs text-center mt-2 animate-pulse ${
                blurActive ? 'text-gray-400' : 'text-green-400'
              }`}
            >
              {blurActive
                ? '명령어가 화면 중앙으로 내려옵니다...'
                : '↓ 중앙의 명령어를 입력하세요!'}
            </p>
          </div>
        </div>
      </>
    );
  }

  /* ── explanation 단계 ── */
  return (
    <div className="font-pixel absolute inset-0 z-50 flex items-center justify-center bg-black/65 pointer-events-auto tutorial-bubble-wrap">
      <div className="nes-container is-dark with-title w-full max-w-lg px-4 py-3">
        <p className="title text-xs">
          STEP {stepNumber} / {totalSteps} — 해설
        </p>

        {/* 진행 바 */}
        <div className="flex gap-0.5 mb-3">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${
                i + 1 <= stepNumber ? 'bg-green-500' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        <p className="text-sm font-bold text-yellow-400 mb-2">{meta.title}</p>
        <div className="nes-container is-dark px-3 py-2 mb-3">
          <p className="text-sm text-cyan-300 leading-relaxed">{meta.explanation}</p>
        </div>

        <button
          ref={nextBtnRef}
          type="button"
          className="nes-btn is-success w-full text-base"
          onClick={() => onNext(state.metaIndex)}
        >
          {isLast ? '튜토리얼 완료! 🎉' : '다음  [Enter ↵]'}
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useAtom, useAtomValue } from 'jotai';

import arrowSheet from '@/assets/game/arrow.png';
import { CONFLICT_SCENARIOS } from '@/shared/game/conflictScenarios';
import { conflictMiniGameAtom } from '@/shared/store/conflictMiniGameAtom';
import { gameStatusAtom } from '@/shared/store/gameStatusAtom';

import type { ArrowKey } from '@/shared/game/conflictArrows';

// 스프라이트: 512×64, 64×64 8프레임.
// 순서: L-before, L-after, R-before, R-after, U-before, U-after, D-before, D-after
const SPRITE_FRAMES = 8;
const SPRITE_DISPLAY_PX = 80;
const ARROW_FRAME: Record<ArrowKey, { before: number; after: number }> = {
  ArrowLeft: { before: 0, after: 1 },
  ArrowRight: { before: 2, after: 3 },
  ArrowUp: { before: 4, after: 5 },
  ArrowDown: { before: 6, after: 7 },
};

const ARROW_KEY_SET: ReadonlySet<string> = new Set<ArrowKey>([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

const FLASH_MS = 180;

interface ConflictMiniGameOverlayProps {
  /** 5개 화살표 모두 정타 시 호출. atom의 commandIndex가 인자로 전달됩니다. */
  onResolve: (commandIndex: number) => void;
  /** 화살표 오답 시 호출. 진행도 리셋은 오버레이가 직접 처리하며, 콜백은 페널티 적용만 담당합니다. */
  onTypo: (commandIndex: number) => void;
}

/**
 * CONFLICT 미니게임 공통 오버레이.
 * `conflictMiniGameAtom`이 non-null이면 좌/우 diff 비교 + 화살표 키캡 시퀀스를 표시하고,
 * 5개 정타 시 `onResolve`, 오답 시 `onTypo`를 호출합니다.
 * 도메인 무관 — 호출자가 atom을 세팅하고 callback에 페널티/완료 로직을 연결해 사용합니다.
 * ESC pause 중에는 화살표 입력만 차단해 PauseModal과 직교 동작합니다.
 */
export default function ConflictMiniGameOverlay({
  onResolve,
  onTypo,
}: ConflictMiniGameOverlayProps) {
  const [state, setState] = useAtom(conflictMiniGameAtom);
  const gameStatus = useAtomValue(gameStatusAtom);
  const [flash, setFlash] = useState<{ index: number; correct: boolean } | null>(null);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    if (state === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (!ARROW_KEY_SET.has(e.key)) return;
      // ESC pause 중에는 PauseModal로 ESC가 가도록 화살표만 차단한다.
      if (gameStatus !== 'playing') return;
      e.preventDefault();

      const expected = state.sequence[state.progress];
      if (e.key === expected) {
        setFlash({ index: state.progress, correct: true });
        const nextProgress = state.progress + 1;
        if (nextProgress >= state.sequence.length) {
          // 마지막 정타 — atom 정리는 호출자(onResolve)가 담당.
          onResolve(state.commandIndex);
        } else {
          setState({ ...state, progress: nextProgress });
        }
      } else {
        setFlash({ index: state.progress, correct: false });
        onTypo(state.commandIndex);
        setState({ ...state, progress: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state, gameStatus, setState, onResolve, onTypo]);

  if (state === null) return null;

  const scenario = CONFLICT_SCENARIOS[state.scenarioIndex] ?? CONFLICT_SCENARIOS[0];

  return (
    <div className="font-pixel fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/80">
      {/* w-[720px]: diff 좌/우 패널이 코드 4~5줄 + 헤더를 무리 없이 표시할 수 있는 최소 폭 */}
      {/* 게임 오버레이라 dialog/aria-modal 시멘틱은 부여하지 않는다.
          키 입력은 window 리스너로 직접 받으며 CommandInput은 isInputDisabled로 차단된다 — FE_CONVENTION §19 면제 케이스(게임 화면). */}
      <div className="flex w-[720px] max-w-[95vw] flex-col gap-5">
        {/* DIFF 영역 — 충돌 파일 좌/우 비교 */}
        <div className="nes-container is-dark with-title">
          <p className="title !text-2xl">MERGE CONFLICT</p>

          <div className="flex flex-col gap-4 p-2">
            <div className="flex items-center justify-between">
              <span className="!text-2xl text-white">{state.filePath}</span>
              <span className="nes-text is-error !text-2xl">! merge conflict</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="border-4 border-red-500 bg-red-950/70 p-3 shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
                <p className="nes-text is-error mb-2 !text-xl">
                  {`<<<<<<< HEAD (${state.headBranch})`}
                </p>
                <pre className="!text-xl leading-relaxed text-white">
                  {scenario.head.join('\n')}
                </pre>
              </div>
              <div className="border-4 border-green-500 bg-green-950/70 p-3 shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
                <p className="nes-text is-success mb-2 !text-xl">
                  {`>>>>>>> ${state.incomingBranch}`}
                </p>
                <pre className="!text-xl leading-relaxed text-white">
                  {scenario.incoming.join('\n')}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* RESOLVE 영역 — 화살표 키 입력 */}
        <div className="nes-container is-dark with-title">
          <p className="title !text-2xl">RESOLVE</p>

          <div className="flex flex-col items-center gap-4 p-2">
            <p className="!text-2xl text-yellow-300">
              화살표 키를 순서대로 입력해 conflict를 해결하세요
            </p>
            <div className="flex gap-3">
              {state.sequence.map((arrow, i) => {
                const done = i < state.progress;
                const current = i === state.progress;
                const isFlash = flash?.index === i;
                // 정타로 진행된 칸은 after(컬러), 아직 안 누른 칸은 before(흑백) 프레임.
                const showAfter = done || (isFlash && flash?.correct);
                const frameIdx = showAfter ? ARROW_FRAME[arrow].after : ARROW_FRAME[arrow].before;

                let ringCls = '';
                if (current && !isFlash) ringCls = 'ring-4 ring-yellow-300';
                if (isFlash && flash && !flash.correct) ringCls = 'ring-4 ring-red-500';

                return (
                  <div
                    key={i}
                    className={`pixel-art h-20 w-20 transition-transform duration-100 ${ringCls} ${
                      isFlash ? 'scale-125' : ''
                    }`}
                    style={{
                      backgroundImage: `url(${arrowSheet})`,
                      backgroundSize: `${SPRITE_FRAMES * SPRITE_DISPLAY_PX}px ${SPRITE_DISPLAY_PX}px`,
                      backgroundPosition: `-${frameIdx * SPRITE_DISPLAY_PX}px 0`,
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import IncidentCatSprite from './IncidentCatSprite';
import MentorCharacter from './MentorCharacter';

import type { CatMood } from '../types/incident.types';

interface CatPanelProps {
  catMood: CatMood;
  moodIdleText?: string;
  moodPerfectText?: string;
  coaching: string | null;
  canonical: { command: string; label?: string } | null;
  hintText: string;
  showHint: boolean;
  showAnswer: boolean;
  explanation?: string;
  onHintToggle: () => void;
  onDictionary: () => void;
  onPause: () => void;
}

export default function CatPanel({
  catMood,
  moodIdleText,
  moodPerfectText,
  coaching,
  canonical,
  hintText,
  showHint,
  showAnswer,
  explanation,
  onHintToggle,
  onDictionary,
  onPause,
}: CatPanelProps) {
  const moodText =
    catMood === 'perfect'
      ? (moodPerfectText ?? '냥! 잘 해냈어요!')
      : catMood === 'partial'
        ? '음… 거의 다 왔어요.'
        : catMood === 'forbidden'
          ? '히익! 그거 누르면 큰일나요!'
          : (moodIdleText ?? '미안해요… 제가 또 사고를…');

  const catBubbleText = showHint ? hintText : moodText;
  const showMentor = !!coaching || showAnswer;
  const mentorMessage =
    coaching ?? (showAnswer ? (explanation ?? '이게 정답이에요! 다음엔 직접 도전해봐요.') : null);

  return (
    <div className="flex w-[25%] shrink-0 flex-col gap-3 border-l border-gray-700 bg-game-bg px-3 pb-3 pt-3">
      {/* 컨트롤 row: 도감 + 일시정지 */}
      <div className="flex shrink-0 justify-end gap-1">
        <button
          type="button"
          className="nes-btn !text-xs !px-2 !py-1"
          onClick={onDictionary}
          aria-label="도감"
        >
          도감
        </button>
        <button
          type="button"
          className="nes-btn !text-xs !px-2 !py-1"
          onClick={onPause}
          aria-label="일시정지"
        >
          <svg width="10" height="10" viewBox="0 0 14 14" fill="currentColor">
            <rect x="2" y="1" width="4" height="12" />
            <rect x="8" y="1" width="4" height="12" />
          </svg>
        </button>
      </div>

      {/* 공백: 캐릭터 영역 전체를 하단으로 밀어냄 */}
      <div className="flex-1" />

      {/* 멘토 섹션 — 오답 코칭 또는 답안보기 시 등장 */}
      {showMentor && (
        <div className="flex shrink-0 flex-col items-center gap-2">
          <div className="nes-balloon from-right !m-0 !block !text-black w-full text-base leading-normal">
            <div className="max-h-64 overflow-y-auto">
              <div className="mb-2 block px-1 text-base tracking-widest bg-nes-blue text-nes-dark w-fit">
                MENTOR
              </div>
              {mentorMessage && <div className="whitespace-pre-line">{mentorMessage}</div>}
              {canonical && (
                <div className="mt-2 pt-2 border-t border-dashed border-gray-400">
                  <div className="mb-1 text-base tracking-widest text-gray-400">정답</div>
                  <div className="break-all font-mono text-base bg-nes-darker text-nes-success py-[3px] px-[5px]">
                    $ {canonical.command}
                  </div>
                </div>
              )}
            </div>
          </div>
          <MentorCharacter className="w-12" />
        </div>
      )}

      {showMentor && <div className="shrink-0 border-t border-gray-700" />}

      {/* 고양이 섹션 — 항상 표시 */}
      <div className="flex shrink-0 flex-col items-center gap-2 pb-8">
        {/* 말풍선: 내용이 길면 스크롤 */}
        <div className="nes-balloon from-right !m-0 !block !text-black w-full text-base leading-normal">
          <div className="max-h-[130px] overflow-y-auto">
            <span className="whitespace-pre-line">{catBubbleText}</span>
          </div>
        </div>
        {/* 고양이 스프라이트: 항상 풀로 표시 */}
        <IncidentCatSprite />
      </div>

      {/* 힌트 토글 */}
      <button
        type="button"
        onClick={onHintToggle}
        className={`nes-btn w-full shrink-0 !text-base ${showHint ? 'is-warning' : ''}`}
      >
        {showHint ? '× 힌트 닫기' : '? 힌트 보기'}
      </button>
    </div>
  );
}

import PixelButton from '@/shared/components/PixelButton';
import PixelModal from '@/shared/components/PixelModal';

import { useResultModal } from '../hooks/useResultModal.ts';

// NES.css가 제공하지 않는 등급별 세분화 색상
const GRADE_COLOR: Record<string, string> = {
  S: '#ffd700',
  A: '#00cfff',
  B: '#00ff88',
  C: '#ffe066',
  D: '#ff8c00',
  F: '#ff4444',
};

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const sec = String(totalSec % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

export default function ResultModal() {
  const { isVisible, result, difficulty, isNewRecord, onRestart, onRanking, onHome } =
    useResultModal();

  if (!result) return null;

  const isSuccess = result.status === 'SUCCESS';

  return (
    <>
      <style>{`@keyframes pixel-pulse { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

      <PixelModal isOpen={isVisible}>
        {/* 성공/실패 배지 */}
        <span
          className={`nes-text ${isSuccess ? 'is-success' : 'is-error'} text-base tracking-widest`}
        >
          {isSuccess ? '✓ SUCCESS' : '✕ GAME OVER'}
        </span>

        {/* 점수 + NEW 뱃지 */}
        <div className="relative flex items-center justify-center mt-2">
          {isNewRecord && (
            <span
              className="nes-badge is-warning absolute -top-4 -left-2"
              // Tailwind에 steps() 타이밍 함수 유틸리티가 없어 inline style로 직접 작성
              style={{ animation: 'pixel-pulse 1s steps(1) infinite' }}
            >
              <span>NEW!</span>
            </span>
          )}
          <span className="nes-text text-white text-3xl tracking-widest">
            {String(result.score).padStart(5, '0')}
          </span>
        </div>

        {/* 스탯 */}
        <div className="flex flex-col gap-2 w-full mt-2">
          {[
            { label: 'GRADE', value: result.grade, color: GRADE_COLOR[result.grade] },
            { label: 'TIME', value: formatTime(result.playTimeMs), color: undefined },
            { label: 'DIFFICULTY', value: difficulty ?? '—', color: undefined },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              // .map() 반환 요소에 className 직접 전달 불가하므로 inline style로 대체
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <p
                className="m-0 min-w-30"
                // NES.css p 태그 기본 색상 오버라이드 (커스텀 색상이라 Tailwind 스케일 없음)
                style={{ color: '#555e7a' }}
              >
                {label}
              </p>
              <p
                className="m-0 text-right"
                // JS 변수(color)를 동적으로 바인딩해야 해 className으로 표현 불가
                style={{ color: color ?? '#9da8bb' }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* 버튼 */}
        <div className="flex flex-col gap-2 w-full mt-2">
          <PixelButton label="↺  다시하기" onClick={onRestart} variant="primary" />
          <PixelButton label="⚑  랭킹 보기" onClick={onRanking} />
          <PixelButton label="⌂  메인으로" onClick={onHome} />
        </div>
      </PixelModal>
    </>
  );
}

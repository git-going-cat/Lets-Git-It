import PixelButton from '@/shared/components/PixelButton';
import PixelModal from '@/shared/components/PixelModal';

import { useResultModal } from '../hooks/useResultModal';

import type { Grade } from '@/shared/types/game.types';

const GRADE_COLOR_CLASS: Record<Grade, string> = {
  S: 'text-yellow-300',
  A: 'text-cyan-300',
  B: 'text-emerald-300',
  C: 'text-yellow-200',
  D: 'text-orange-400',
  F: 'text-red-400',
};

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const sec = String(totalSec % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

export default function ResultModal() {
  const { isVisible, result, difficulty, isNewRecord, isSaving, saveError, onRestart, onHome } =
    useResultModal();

  if (!result) return null;

  const isSuccess = result.status === 'SUCCESS';
  const isEscapeFailed = result.status === 'ESCAPE_FAILED';
  const isSessionExpired = result.status === 'SESSION_EXPIRED';

  const statusLabel = isSuccess
    ? '✓ SUCCESS'
    : isEscapeFailed
      ? '✕ ESCAPE FAILED'
      : isSessionExpired
        ? '✕ SESSION EXPIRED'
        : '✕ GAME OVER';
  const statusNote = isEscapeFailed
    ? '츄르가 부족해서 탈출하지 못했습니다.'
    : isSessionExpired
      ? '세션 유지 시간이 만료되어 게임이 종료되었습니다.'
      : null;

  return (
    <PixelModal isOpen={isVisible}>
      {/* 성공/실패 배지 */}
      <span
        className={`nes-text ${isSuccess ? 'is-success' : 'is-error'} text-2xl tracking-widest`}
      >
        {statusLabel}
      </span>
      {statusNote && <p className="m-0 text-base text-red-300">{statusNote}</p>}

      {/* 점수 + NEW 뱃지 */}
      <div className="relative flex items-center justify-center mt-2">
        {isNewRecord && (
          <span className="pixel-pulse nes-badge is-warning absolute -top-4 -left-2">
            <span>NEW!</span>
          </span>
        )}
        <span className="nes-text text-5xl tracking-widest text-white">
          {String(result.score).padStart(5, '0')}
        </span>
      </div>

      {/* 스탯 */}
      <div className="flex flex-col gap-2 w-full mt-2">
        {[
          { label: 'GRADE', value: result.grade, valueClassName: GRADE_COLOR_CLASS[result.grade] },
          { label: 'MISS', value: String(result.missCount), valueClassName: 'text-red-400' },
          { label: 'TYPO', value: String(result.typoCount), valueClassName: 'text-orange-400' },
          { label: 'TIME', value: formatTime(result.playTimeMs), valueClassName: 'text-white' },
          { label: 'DIFFICULTY', value: difficulty ?? '—', valueClassName: 'text-white' },
        ].map(({ label, value, valueClassName }) => (
          <div key={label} className="flex items-center justify-between">
            <p className="m-0 min-w-60 text-2xl text-white">{label}</p>
            <p className={`m-0 text-right text-2xl ${valueClassName}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* 점수 저장 상태 */}
      {isSaving && <p className="text-sm text-gray-400 mt-1">점수 저장 중...</p>}
      {saveError && <p className="text-sm text-red-400 mt-1">점수 저장에 실패했습니다.</p>}

      {/* 버튼 */}
      <div className="flex flex-col gap-2 w-full mt-2">
        <PixelButton label="↺  다시하기" onClick={onRestart} variant="primary" />
        <PixelButton label="⌂  메인으로" onClick={onHome} />
      </div>
    </PixelModal>
  );
}

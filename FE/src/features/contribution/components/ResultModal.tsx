import PixelButton from '@/shared/components/PixelButton';
import PixelModal from '@/shared/components/PixelModal';

import { useResultModal } from '../hooks/useResultModal';

const REASON_LABEL: Record<string, string> = {
  PLAYER_DISCONNECTED: '플레이어 이탈로 게임이 조기 종료되었습니다.',
};

/**
 * 기여도 뺏기 게임 결과 모달.
 * ESC 닫기는 의도적으로 막음 — 결과 확인 후 명시적 버튼 클릭을 강제.
 */
export default function ResultModal() {
  const { isVisible, isSuccess, rankings, myRank, reason, myPlayerId, onBackToRoom, onHome } =
    useResultModal();

  return (
    <PixelModal isOpen={isVisible} title={isSuccess ? '게임 종료' : '조기 종료'}>
      {/* 상단 배지 */}
      <span
        className={`nes-text text-2xl tracking-widest ${isSuccess ? 'is-success' : 'is-warning'}`}
      >
        {isSuccess ? 'GAME END' : '조기 종료'}
      </span>

      {/* 조기 종료 사유 */}
      {!isSuccess && reason && (
        <p className="m-0 text-center text-base text-yellow-300">
          {REASON_LABEL[reason] ?? '게임이 종료되었습니다.'}
        </p>
      )}

      {/* 내 등수 */}
      {isSuccess && myRank !== null && (
        <p className="m-0 text-center text-2xl text-white">
          내 순위: <span className="nes-text is-primary">{myRank}</span>
          <span className="text-base text-gray-400"> / {rankings.length}</span>
        </p>
      )}

      {/* 전체 랭킹 */}
      {isSuccess && rankings.length > 0 && (
        <div className="flex w-full flex-col gap-1">
          {rankings.map((entry) => {
            const isMe = entry.playerId === myPlayerId;
            return (
              <div
                key={entry.playerId}
                className={`flex items-center justify-between px-2 py-1 ${
                  isMe ? 'nes-container is-rounded !p-1 !bg-cyan-900/40' : ''
                }`}
              >
                <span className={`font-pixel text-sm ${isMe ? 'text-cyan-300' : 'text-gray-300'}`}>
                  {entry.rank}. {entry.nickname}
                  {isMe && <span className="ml-1 text-xs text-cyan-400">(나)</span>}
                </span>
                <span className="font-pixel shrink-0 tabular-nums text-sm text-white">
                  {entry.contribution}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 버튼 */}
      <div className="flex w-full flex-col gap-2 mt-2">
        <PixelButton label="방으로" onClick={onBackToRoom} variant="primary" />
        <PixelButton label="메인으로" onClick={onHome} />
      </div>
    </PixelModal>
  );
}

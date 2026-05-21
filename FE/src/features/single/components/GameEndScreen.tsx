import { useEffect, useState } from 'react';

import EscapeAnimation from './EscapeAnimation';

type GameEndStatus = 'SUCCESS' | 'GAMEOVER' | 'ESCAPE_FAILED';

const VIDEO_SRC: Record<GameEndStatus, string> = {
  SUCCESS: '/video/Game_Success.mp4',
  GAMEOVER: '/video/Game_Over.mp4',
  ESCAPE_FAILED: '/video/Fail_Escape.mp4',
};

const VIDEO_TITLE: Record<GameEndStatus, string> = {
  SUCCESS: '탈출 성공!',
  GAMEOVER: 'GAME OVER',
  ESCAPE_FAILED: '탈출 실패',
};

interface GameEndScreenProps {
  status: GameEndStatus;
  onVideoEnd?: () => void;
  churuRatio?: number;
}

export default function GameEndScreen({ status, onVideoEnd, churuRatio = 0 }: GameEndScreenProps) {
  const [phase, setPhase] = useState<'escape' | 'video'>(
    status === 'GAMEOVER' ? 'video' : 'escape'
  );

  // 영상 단계에서 Enter 키로 건너뛰기
  useEffect(() => {
    if (phase !== 'video') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') onVideoEnd?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, onVideoEnd]);

  return (
    <div className="fixed inset-0 z-100">
      {phase === 'escape' ? (
        // 게임 화면에 반투명 오버레이, 우측 사이드바 패널에 탈출 애니메이션
        <div className="relative h-full w-full bg-black/30">
          <div className="absolute right-0 top-0 h-full w-game-sidebar">
            <EscapeAnimation
              mode={status === 'SUCCESS' ? 'success' : 'escape_failed'}
              churuRatio={churuRatio}
              onComplete={() => setPhase('video')}
            />
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80">
          {/* 80vh/80vw: 영상이 화면을 꽉 채우지 않고 모달처럼 여백을 두기 위한 80% 제한. bg-[rgba(19,19,19,0.97)]: 영상 플레이어 다크 배경(0.97 알파로 미세한 깊이감) */}
          <div className="max-h-[80vh] max-w-[80vw] overflow-hidden rounded-lg border border-white/10 bg-[rgba(19,19,19,0.97)] shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
              <span className="text-yellow-400">⚠</span>
              <span className="text-sm font-medium text-white/70">{VIDEO_TITLE[status]}</span>
            </div>
            <div className="flex flex-col items-center gap-4 p-4">
              {/* calc(80vh-8rem): 컨테이너 max-h(80vh)에서 헤더(py-2.5)·내부 padding(p-4)·건너뛰기 버튼 영역을 뺀 영상 높이 */}
              <video
                src={VIDEO_SRC[status]}
                autoPlay
                muted
                playsInline
                className="max-h-[calc(80vh-8rem)] w-full rounded-md object-contain"
                onEnded={onVideoEnd}
              />
              <button
                type="button"
                onClick={onVideoEnd}
                className="border-none! rounded-full bg-white/10 px-6 py-2 text-sm text-white transition-colors hover:bg-white/20"
              >
                건너뛰기 (Enter)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

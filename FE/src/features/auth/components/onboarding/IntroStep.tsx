import { useRef, useState } from 'react';

interface IntroStepProps {
  onDone: () => void;
}

/**
 * 온보딩 인트로 단계.
 * 인트로 영상을 자동 재생하며, 영상 종료 또는 스킵 버튼으로 다음 단계로 진행합니다.
 * 소리 아이콘 클릭으로 음소거 토글 가능합니다.
 */
export default function IntroStep({ onDone }: IntroStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [volume, setVolume] = useState(0.5);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted((prev) => !prev);
    }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    setMuted(val === 0);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full">
        {/* muted prop은 React에서 controlled 안 됨 — 음소거 제어는 ref로 직접 처리 */}
        <video
          ref={videoRef}
          src="/video/introvideo.mp4"
          autoPlay
          muted
          playsInline
          onEnded={onDone}
          className="w-full rounded-md"
        />
        {/* 볼륨 컨트롤 */}
        <div className="absolute bottom-2 right-2 flex items-center gap-2 bg-black/50 rounded-full px-2 py-1">
          <button
            type="button"
            onClick={toggleMute}
            className="text-white text-sm border-none! bg-transparent p-0 leading-none"
            aria-label={muted ? '소리 켜기' : '소리 끄기'}
          >
            {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={handleVolume}
            className="w-20 accent-green-400 cursor-pointer"
            aria-label="볼륨 조절"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onDone}
        className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors border-none!"
      >
        건너뛰기
      </button>
    </div>
  );
}

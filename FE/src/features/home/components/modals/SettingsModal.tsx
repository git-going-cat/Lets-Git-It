import { useState } from 'react';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  // TODO: BGM/SFX 전역 상태 연동 (Zustand, 팀원 간 협의 후 구현)
  const [useBgm, setUseBgm] = useState(true);
  const [bgmVolume, setBgmVolume] = useState(75);
  const [useSfx, setUseSfx] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="flex w-80 flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-[#f3f3f3] px-4 py-2">
          <span className="text-sm font-semibold text-gray-700">설정</span>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-800" aria-label="닫기">
            ✕
          </button>
        </div>

        {/* 본문 */}
        <div className="flex flex-col gap-6 p-6">
          {/* 배경음악 섹션 */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-gray-800">♪ 배경음악</h3>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input 
                type="checkbox" 
                checked={useBgm} 
                onChange={(e) => setUseBgm(e.target.checked)}
                className="rounded border-gray-300 text-[#0078d4] focus:ring-[#0078d4]"
              />
              배경음악 사용
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">음량</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={bgmVolume} 
                onChange={(e) => setBgmVolume(Number(e.target.value))}
                disabled={!useBgm}
                className="flex-1 accent-[#0078d4]"
              />
              <span className="w-8 text-right text-xs text-gray-500">{bgmVolume}%</span>
            </div>
          </div>

          {/* 효과음 섹션 */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-gray-800">🔊 효과음</h3>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input 
                type="checkbox" 
                checked={useSfx} 
                onChange={(e) => setUseSfx(e.target.checked)}
                className="rounded border-gray-300 text-[#0078d4] focus:ring-[#0078d4]"
              />
              효과음 사용
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">음량</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={sfxVolume} 
                onChange={(e) => setSfxVolume(Number(e.target.value))}
                disabled={!useSfx}
                className="flex-1 accent-[#0078d4]"
              />
              <span className="w-8 text-right text-xs text-gray-500">{sfxVolume}%</span>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="bg-gray-50 px-6 py-4">
          <button 
            type="button" 
            onClick={onClose}
            className="w-full rounded bg-[#f3f3f3] py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 active:bg-gray-300"
          >
            ✓ 저장
          </button>
        </div>
      </div>
    </div>
  );
}

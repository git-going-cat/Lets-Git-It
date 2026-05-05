import { useState } from 'react';

import PixelButton from '@/shared/components/PixelButton';
import PixelModal from '@/shared/components/PixelModal';

import { usePauseModal } from '../hooks/usePauseModal';

// TODO: BGM/SFX 상태를 Zustand settingsStore로 이관 (홈 SettingsModal과 공유)
function SettingsSection() {
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [bgmVolume, setBgmVolume] = useState(75);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [sfxVolume, setSfxVolume] = useState(60);

  return (
    <div className="nes-container is-dark w-full" style={{ padding: '1rem' }}>
      <p className="title">SETTINGS</p>

      <div className="flex flex-col gap-4">
        {/* BGM */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="nes-checkbox is-dark"
              checked={bgmEnabled}
              onChange={(e) => setBgmEnabled(e.target.checked)}
            />
            <span>♪ BGM</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={bgmVolume}
              disabled={!bgmEnabled}
              onChange={(e) => setBgmVolume(Number(e.target.value))}
              className="w-full"
            />
            <span className="w-8 text-right text-xs">{bgmVolume}%</span>
          </div>
        </div>

        {/* SFX */}
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="nes-checkbox is-dark"
              checked={sfxEnabled}
              onChange={(e) => setSfxEnabled(e.target.checked)}
            />
            <span>🔊 SFX</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={100}
              value={sfxVolume}
              disabled={!sfxEnabled}
              onChange={(e) => setSfxVolume(Number(e.target.value))}
              className="w-full"
            />
            <span className="w-8 text-right text-xs">{sfxVolume}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PauseModal() {
  const { isVisible, onResume, onRestart, onExit } = usePauseModal();

  return (
    // onClose 미전달 → useModal의 ESC 핸들러 비활성화 (ESC는 useSingleGame이 단독 처리)
    <PixelModal isOpen={isVisible} title="PAUSED">
      <div className="flex flex-col items-center gap-4 w-full">
        <SettingsSection />
        <div className="flex flex-col gap-3 w-full">
          <PixelButton label="▶  이어하기" onClick={onResume} variant="primary" />
          <PixelButton label="↺  다시하기" onClick={onRestart} variant="secondary" />
          <PixelButton label="✕  나가기" onClick={onExit} variant="danger" />
        </div>
      </div>
    </PixelModal>
  );
}

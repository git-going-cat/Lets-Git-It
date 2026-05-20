import { useAudioStore } from '../store/audioStore';

import PixelButton from './PixelButton';
import PixelModal from './PixelModal';

interface PauseModalProps {
  isOpen: boolean;
  onResume: () => void;
  onExit: () => void;
  onRestart?: () => void;
}

function SettingsSection() {
  const { bgmEnabled, bgmVolume, setBgmEnabled, setBgmVolume } = useAudioStore();

  return (
    <div className="nes-container is-dark w-full p-4">
      <p className="title text-xl">SETTINGS</p>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="nes-checkbox is-dark"
              checked={bgmEnabled}
              onChange={(e) => setBgmEnabled(e.target.checked)}
            />
            <span className="text-xl">♪ BGM</span>
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
            <span className="w-12 text-right text-2xl">{bgmVolume}%</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 opacity-40">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="nes-checkbox is-dark" disabled />
            <span className="text-xl">🔊 SFX (준비 중)</span>
          </label>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={100} defaultValue={60} disabled className="w-full" />
            <span className="w-12 text-right text-2xl">60%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PauseModal({ isOpen, onResume, onExit, onRestart }: PauseModalProps) {
  return (
    <PixelModal isOpen={isOpen} onClose={onResume} title="PAUSED">
      <div className="flex flex-col items-center gap-4 w-full">
        <SettingsSection />
        <div className="flex flex-col gap-3 w-full">
          <PixelButton label="▶  이어하기" onClick={onResume} variant="primary" />
          {onRestart && <PixelButton label="↺  다시하기" onClick={onRestart} variant="secondary" />}
          <PixelButton label="✕  나가기" onClick={onExit} variant="danger" />
        </div>
      </div>
    </PixelModal>
  );
}

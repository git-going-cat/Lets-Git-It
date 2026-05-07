import { useSoundSettingsStore } from '../../store/soundSettingsStore';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const { bgmEnabled, bgmVolume, sfxEnabled, sfxVolume, updateSettings } = useSoundSettingsStore();

  const updateBgmEnabled = (nextBgmEnabled: boolean) => {
    updateSettings({
      bgmEnabled: nextBgmEnabled,
      bgmVolume,
      sfxEnabled,
      sfxVolume,
    });
  };

  const updateBgmVolume = (nextBgmVolume: number) => {
    updateSettings({
      bgmEnabled,
      bgmVolume: nextBgmVolume,
      sfxEnabled,
      sfxVolume,
    });
  };

  const updateSfxEnabled = (nextSfxEnabled: boolean) => {
    updateSettings({
      bgmEnabled,
      bgmVolume,
      sfxEnabled: nextSfxEnabled,
      sfxVolume,
    });
  };

  const updateSfxVolume = (nextSfxVolume: number) => {
    updateSettings({
      bgmEnabled,
      bgmVolume,
      sfxEnabled,
      sfxVolume: nextSfxVolume,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-80 flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 bg-[#f3f3f3] px-4 py-2">
          <span className="text-sm font-semibold text-gray-700">설정</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 transition-colors hover:bg-red-500 hover:text-white"
            aria-label="닫기"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-gray-800">배경음악</h3>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={bgmEnabled}
                onChange={(event) => updateBgmEnabled(event.target.checked)}
                className="rounded border-gray-300 text-[#0078d4] focus:ring-[#0078d4]"
              />
              배경음악 사용
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">볼륨</span>
              <input
                type="range"
                min="0"
                max="100"
                value={bgmVolume}
                onChange={(event) => updateBgmVolume(Number(event.target.value))}
                disabled={!bgmEnabled}
                className="flex-1 accent-[#0078d4]"
              />
              <span className="w-8 text-right text-xs text-gray-500">{bgmVolume}%</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-gray-800">효과음</h3>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={sfxEnabled}
                onChange={(event) => updateSfxEnabled(event.target.checked)}
                className="rounded border-gray-300 text-[#0078d4] focus:ring-[#0078d4]"
              />
              효과음 사용
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">볼륨</span>
              <input
                type="range"
                min="0"
                max="100"
                value={sfxVolume}
                onChange={(event) => updateSfxVolume(Number(event.target.value))}
                disabled={!sfxEnabled}
                className="flex-1 accent-[#0078d4]"
              />
              <span className="w-8 text-right text-xs text-gray-500">{sfxVolume}%</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-[#3a5a8a] py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2f4c78] active:bg-[#253d61]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

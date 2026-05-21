import settingsImg from '@/assets/home/settings.png';

interface SettingsButtonProps {
  onClick: () => void;
}

/** 우상단 설정 버튼 */
export default function SettingsButton({ onClick }: SettingsButtonProps) {
  return (
    <button
      id="btn-settings"
      type="button"
      onClick={onClick}
      className="transition-transform duration-200 hover:rotate-45 hover:scale-110 active:scale-90"
      aria-label="설정"
    >
      <img
        src={settingsImg}
        alt="설정"
        className="pixel-art h-13 w-13 object-contain drop-shadow-lg"
        draggable={false}
      />
    </button>
  );
}

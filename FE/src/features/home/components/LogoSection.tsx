import logoImg from '@/assets/logo.png';

/**
 * 홈 화면 중앙 상단 "Let's Git it" 픽셀 로고 컴포넌트
 */
export default function LogoSection() {
  return (
    <div className="absolute top-[8vh] left-1/2 -translate-x-1/2 select-none">
      <img
        src={logoImg}
        alt="Let's Git it"
        className="pixel-art w-[900px] max-w-[70vw] drop-shadow-2xl"
        draggable={false}
      />
    </div>
  );
}

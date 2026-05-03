import logoImg from '@/assets/logo.png';

/**
 * 홈 화면 중앙 상단 "Let's Git it" 픽셀 로고 컴포넌트
 */
export default function LogoSection() {
  return (
    <div
      className="absolute top-14 left-1/2 -translate-x-1/2 select-none"
    >
      <img
        src={logoImg}
        alt="Let's Git it"
        // max-w-[70vw]: 로고가 뷰포트 너비 기준 최대 70%를 넘지 않도록 제한 — vw 단위 불가피
        className="pixel-art w-modal-lg max-w-[70vw] drop-shadow-2xl"
        draggable={false}
      />
    </div>
  );
}

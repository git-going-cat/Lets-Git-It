import screen from '@/assets/bg/screen.png';
import logo from '@/assets/landinglogo.png';

import helpImg from '../assets/Web (mobile + desktop)/help.png';

import LoginForm from './LoginForm';

export default function LandingPage() {
  return (
    <div
      className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${screen})` }}
    >
      <div className="absolute inset-0 bg-[#020F33] opacity-[0.67]" />

      {/* 로고 */}
      <div className="relative z-10 mb-12">
        <img src={logo} alt="Let's Git It" className="w-100" />
      </div>

      {/* 로그인 폼 */}
      <div className="relative z-10">
        <LoginForm />
      </div>

      {/* 하단 캐릭터 */}
      <div className="absolute bottom-0 left-50 z-10 flex flex-col items-center gap-1">
        <img src={helpImg} alt="도와줘" className="w-20 h-22 object-contain" />
      </div>
    </div>
  );
}

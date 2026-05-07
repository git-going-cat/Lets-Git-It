import { useState } from 'react';

import screen from '@/assets/bg/screen.png';
import logo from '@/assets/landinglogo.png';

import helpImg from '../assets/Web (mobile + desktop)/help.png';

import ForgotPasswordModal from './ForgotPasswordModal';
import LoginForm from './LoginForm';
import SignUpModal from './SignUpModal';

type ActiveModal = 'signup' | 'forgot' | null;

export default function LandingPage() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden">
      <img
        src={screen}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
        draggable={false}
      />
      <div className="absolute inset-0 bg-[#020F33] opacity-[0.67]" />

      {/* 로고 */}
      <div className="relative z-10 mb-12">
        <img src={logo} alt="Let's Git It" className="w-100" />
      </div>

      {/* 로그인 폼 */}
      <div className="relative z-10">
        <LoginForm
          onOpenSignUp={() => setActiveModal('signup')}
          onOpenForgotPassword={() => setActiveModal('forgot')}
        />
      </div>

      {/* 하단 캐릭터 */}
      <div className="absolute bottom-0 left-50 z-10 flex flex-col items-center gap-1">
        <img src={helpImg} alt="도와줘" className="w-20 h-22 object-contain" />
      </div>

      {activeModal === 'signup' && <SignUpModal onClose={() => setActiveModal(null)} />}

      {activeModal === 'forgot' && <ForgotPasswordModal onClose={() => setActiveModal(null)} />}
    </div>
  );
}

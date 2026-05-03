import { useState } from 'react';

import bgImage from '@/assets/bg/screen.png';
import MyPageModal from '@/features/mypage/components/MyPageModal';

import LogoSection from './LogoSection';
import LogoutModal from './modals/LogoutModal';
import SettingsModal from './modals/SettingsModal';
import Win11ExplorerModal from './modals/Win11ExplorerModal';
import ModeSelectSection from './ModeSelectSection';
import MyPageButton from './MyPageButton';
import SettingsButton from './SettingsButton';
import SideMenuButtons from './SideMenuButtons';
import TutorialNpc from './TutorialNpc';

import type { HomeModalType } from '../types/home.types';

export function HomePage() {
  const [activeModal, setActiveModal] = useState<HomeModalType | null>(null);
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);

  const handleOpenModal = (modal: HomeModalType) => {
    setActiveModal(modal);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  const handleToggleMyPage = () => {
    setIsMyPageOpen((prev) => !prev);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* 배경 이미지 */}
      <img
        src={bgImage}
        alt="배경"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      {/* 내부 컴포넌트들은 각각 absolute 클래스를 가지고 있으므로 그대로 렌더링 */}
      <LogoSection />

      <SettingsButton onClick={() => handleOpenModal('settings')} />

      <SideMenuButtons onOpen={handleOpenModal} />

      <div
        className="absolute bottom-20 left-1/2 -translate-x-1/2"
      >
        <ModeSelectSection onOpen={handleOpenModal} />
      </div>

      <TutorialNpc />

      {/* 좌측 마이페이지 바 */}
      <MyPageModal isOpen={isMyPageOpen} onOpenLogout={() => handleOpenModal('logout')} />

      {/* 하단 작업표시줄 */}
      <div className="absolute bottom-0 left-0 right-0 z-50 flex h-12 items-center bg-white/30 px-4 backdrop-blur-md">
        <MyPageButton onClick={handleToggleMyPage} />
      </div>

      {/* 모달 렌더링 영역 */}
      {activeModal === 'settings' && <SettingsModal onClose={handleCloseModal} />}
      {activeModal === 'logout' && <LogoutModal onClose={handleCloseModal} />}
      {activeModal === 'explorer-single' && (
        <Win11ExplorerModal initialTab="single" onClose={handleCloseModal} />
      )}
      {activeModal === 'explorer-multi' && (
        <Win11ExplorerModal initialTab="multi" onClose={handleCloseModal} />
      )}

      {/* TODO: 랭킹, 도감 모달 구현 */}
      {activeModal === 'ranking' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="rounded-xl bg-white p-8 font-bold shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            랭킹 모달 (구현 예정)
          </div>
        </div>
      )}
      {activeModal === 'dictionary' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="rounded-xl bg-white p-8 font-bold shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            도감 모달 (구현 예정)
          </div>
        </div>
      )}
    </div>
  );
}

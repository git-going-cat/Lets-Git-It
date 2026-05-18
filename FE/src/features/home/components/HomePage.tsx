import { useCallback, useEffect, useState } from 'react';

import bgImage from '@/assets/bg/screen.png';
import DictionaryModal from '@/features/dictionary/components/DictionaryModal';
import LobbyPage from '@/features/multi/components/LobbyPage';
import MyPageModal from '@/features/mypage/components/MyPageModal';
import RankingModal from '@/features/ranking/components/RankingModal';
import { useBgm } from '@/shared/hooks/useBgm';

import { useHomeEscSettings } from '../hooks/useHomeEscSettings';

import BoardButton from './BoardButton';
import HomeWalkingCharacter from './HomeWalkingCharacter';
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
import type { GameMode } from '@/features/multi/types/room.types';
import type { Difficulty } from '@/shared/types/game.types';

interface HomePageProps {
  // 다른 페이지에서 ?modal=... 로 복귀한 경우 첫 렌더에 열어둘 모달. routes 레이어가 주입.
  initialModal: HomeModalType | null;
  // 대기실에서 나왔을 때 자동으로 열 로비 모드. routes 레이어가 주입.
  initialLobbyMode: GameMode | null;
  // initialModal 처리 후 URL에서 search param을 제거해 재오픈을 방지. routes 레이어가 주입.
  onUrlCleanup: () => void;
  // 싱글 모드 '게임 시작' 시 routes 레이어가 startSession + setSession을 수행. 실패 시 throw.
  onStartSingle: (difficulty: Difficulty) => Promise<void>;
}

/**
 * 홈 화면의 배경, 모드 진입, 랭킹/도감/마이페이지 모달 상태를 관리합니다.
 * cross-feature wiring(URL 파라미터, single API 호출)은 routes/-HomeRoute에서 주입받습니다.
 */
export function HomePage({
  initialModal,
  initialLobbyMode,
  onUrlCleanup,
  onStartSingle,
}: HomePageProps) {
  useBgm();
  // setState in effect를 피하기 위해 useState initializer로 처리.
  const [activeModal, setActiveModal] = useState<HomeModalType | null>(() => initialModal);
  const [isMyPageOpen, setIsMyPageOpen] = useState(false);
  const [lobbyMode, setLobbyMode] = useState<GameMode | null>(() => initialLobbyMode);

  useEffect(() => {
    void import('@/features/single/components/SinglePage');
  }, []);

  // 모달/로비가 열린 뒤 URL은 깔끔하게 정리한다. (재진입 시 자동 재오픈 방지)
  useEffect(() => {
    if (!initialModal && !initialLobbyMode) return;
    onUrlCleanup();
  }, [initialModal, initialLobbyMode, onUrlCleanup]);

  const hasOpenModal = activeModal !== null || isMyPageOpen || lobbyMode !== null;

  const handleOpenModal = useCallback((modal: HomeModalType) => {
    setActiveModal(modal);
  }, []);

  const handleCloseModal = () => {
    setActiveModal(null);
  };

  const handleToggleMyPage = () => {
    setIsMyPageOpen((prev) => !prev);
  };

  useHomeEscSettings({
    enabled: !hasOpenModal,
    onOpenSettings: () => handleOpenModal('settings'),
  });

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
      <HomeWalkingCharacter />

      <LogoSection />

      <div className="absolute left-16 top-34 z-20">
        <BoardButton />
      </div>

      <div className="absolute right-4 top-4 z-20">
        <SettingsButton onClick={() => handleOpenModal('settings')} />
      </div>

      <SideMenuButtons onOpen={handleOpenModal} />

      <div className="absolute bottom-20 left-1/2 z-20 -translate-x-1/2">
        <ModeSelectSection onOpen={handleOpenModal} />
      </div>

      <TutorialNpc />

      {isMyPageOpen && (
        <div
          className="absolute inset-0 z-30"
          onClick={() => setIsMyPageOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 좌측 마이페이지 바 */}
      <MyPageModal
        isOpen={isMyPageOpen}
        onClose={() => setIsMyPageOpen(false)}
        onOpenLogout={() => handleOpenModal('logout')}
      />

      {/* 하단 작업표시줄 */}
      <div className="absolute bottom-0 left-0 right-0 z-50 flex h-12 items-center bg-white/30 px-4 backdrop-blur-md">
        <MyPageButton onClick={handleToggleMyPage} />
      </div>

      {/* 모달 렌더링 영역 */}
      {activeModal === 'settings' && <SettingsModal onClose={handleCloseModal} />}
      {activeModal === 'logout' && <LogoutModal onClose={handleCloseModal} />}
      {activeModal === 'explorer-single' && (
        <Win11ExplorerModal
          initialTab="single"
          onClose={handleCloseModal}
          onStartSingle={onStartSingle}
        />
      )}
      {activeModal === 'explorer-multi' && (
        <Win11ExplorerModal
          initialTab="multi"
          onClose={handleCloseModal}
          onLobbyOpen={(m) => setLobbyMode(m)}
          onStartSingle={onStartSingle}
        />
      )}

      {lobbyMode !== null && <LobbyPage mode={lobbyMode} onClose={() => setLobbyMode(null)} />}

      {activeModal === 'ranking' && <RankingModal onClose={handleCloseModal} />}
      {activeModal === 'dictionary' && <DictionaryModal onClose={handleCloseModal} />}
    </div>
  );
}

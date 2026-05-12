import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Power, X } from 'lucide-react';

import CharacterPreview from '@/features/auth/components/CharacterPreview';
import { useAuthStore } from '@/features/auth/store/authStore';
import { DEFAULT_CHARACTER_VALUES } from '@/features/auth/utils/characterAssets';
import { useModal } from '@/shared/hooks/useModal';

import { fetchMyRecord } from '../api/mypageApi';
import { MYPAGE_QUERY_KEYS } from '../constants/queryKeys';

import EditCharacterModal from './EditCharacterModal';
import { EditProfileModal } from './EditProfileModal';

interface MyPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogout: () => void;
}

export default function MyPageModal({ isOpen, onClose, onOpenLogout }: MyPageModalProps) {
  const { containerRef } = useModal({ isOpen, onClose });

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditCharacterOpen, setIsEditCharacterOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

  const { data: record, isLoading } = useQuery({
    queryKey: MYPAGE_QUERY_KEYS.myRecord,
    queryFn: fetchMyRecord,
    enabled: isOpen,
  });

  const nickname = record?.nickname ?? user?.nickname ?? '';
  const characterSource = record ?? user;
  const characterValues = useMemo(
    () =>
      characterSource
        ? {
            characterHair: characterSource.characterHair,
            characterHairColor: characterSource.characterHairColor,
            characterBody: characterSource.characterBody,
            characterEye: characterSource.characterEye,
            characterOutfit: characterSource.characterOutfit,
            characterOutfitColor: characterSource.characterOutfitColor,
          }
        : DEFAULT_CHARACTER_VALUES,
    [characterSource]
  );

  return (
    <div
      ref={containerRef}
      role={isOpen ? 'dialog' : undefined}
      aria-modal={isOpen ? 'true' : undefined}
      aria-label={isOpen ? '마이페이지' : undefined}
      aria-hidden={!isOpen}
      tabIndex={-1}
      // translate-y-[120%]: 닫힘 상태에서 패널을 아래쪽으로 완전히 숨깁니다.
      className={`absolute bottom-12 left-0 z-40 flex h-auto w-modal-md flex-col rounded-t-xl rounded-br-xl bg-[#f3f3f3]/95 p-6 shadow-2xl backdrop-blur transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-[120%] opacity-0'
      }`}
    >
      <div className="mb-4 flex shrink-0 items-center justify-between px-2">
        <button
          type="button"
          className="nes-rounded-button px-2 py-1 text-[#0078d4] transition-colors hover:bg-white/70"
          onClick={() => setIsEditProfileOpen(true)}
        >
          {nickname || '닉네임 없음'}
        </button>
        <button
          type="button"
          className="nes-rounded-button px-2 py-1 text-sm text-gray-500 transition-colors hover:bg-white/70 hover:text-gray-800"
          onClick={() => setIsEditProfileOpen(true)}
        >
          내 정보 수정
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-6">
        <div className="flex w-1/3 flex-col items-center gap-4">
          <div className="flex h-48 w-full items-center justify-center overflow-hidden rounded-lg bg-[#e8e4d9] shadow-inner">
            <CharacterPreview values={characterValues} className="h-40 w-20" />
          </div>
          <button
            type="button"
            onClick={() => setIsEditCharacterOpen(true)}
            className="nes-rounded-button flex w-full items-center justify-center border border-gray-300 bg-white py-2 shadow-sm transition-colors hover:bg-[#f0f0f0]"
          >
            <span className="text-xs font-bold text-gray-600">캐릭터 수정</span>
          </button>
        </div>

        <div className="flex flex-1 flex-col rounded-lg bg-white p-4 shadow-inner">
          <h3 className="mb-3 text-xs font-bold text-gray-500">전적 및 기록</h3>
          <div className="flex flex-col gap-3 pr-2">
            {isLoading ? (
              <>
                <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
              </>
            ) : (
              <>
                <RecordItem
                  color="bg-sky-500"
                  title="총 플레이 시간"
                  subtitle="All Modes"
                  value={record?.totalPlayTime ?? '00:00:00'}
                />
                <RecordItem
                  color="bg-green-500"
                  title="이지 Best"
                  subtitle="Single Mode - Easy"
                  value={`${record?.singleEasyBest?.toLocaleString() ?? 0} pt`}
                />
                <RecordItem
                  color="bg-yellow-500"
                  title="노말 Best"
                  subtitle="Single Mode - Normal"
                  value={`${record?.singleNormalBest?.toLocaleString() ?? 0} pt`}
                />
                <RecordItem
                  color="bg-red-500"
                  title="하드 Best"
                  subtitle="Single Mode - Hard"
                  value={`${record?.singleHardBest?.toLocaleString() ?? 0} pt`}
                />
                <RecordItem
                  color="bg-purple-500"
                  title="기여도 합계"
                  subtitle="누적 기여도"
                  value={`${record?.contributionTotal?.toLocaleString() ?? 0}`}
                />
                <RecordItem
                  color="bg-orange-500"
                  title="타임어택"
                  subtitle="누적 카운트"
                  value={`${record?.timeattackCount?.toLocaleString() ?? 0} 회`}
                />
                <RecordItem
                  color="bg-blue-500"
                  title="협력 Best"
                  subtitle="최단 클리어 시간"
                  value={record?.coopBestTime ?? '00:00.00'}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex shrink-0 justify-between border-t border-gray-300 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="nes-rounded-button flex h-10 w-10 items-center justify-center border border-gray-300 bg-white text-gray-500 shadow-sm transition-colors hover:border-gray-500 hover:bg-gray-50 hover:text-gray-700 active:bg-gray-100"
          aria-label="창닫기"
          title="창닫기"
        >
          <X size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onOpenLogout}
          className="nes-rounded-button flex h-10 w-10 items-center justify-center border border-red-300 bg-white text-red-500 shadow-sm transition-colors hover:border-red-500 hover:bg-red-50 active:bg-red-100"
          aria-label="로그아웃"
          title="로그아웃"
        >
          <Power size={18} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>

      {isEditProfileOpen && (
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          authType={record?.authType ?? 'LOCAL'}
          currentNickname={nickname}
        />
      )}
      {isEditCharacterOpen && (
        <EditCharacterModal
          isOpen={isEditCharacterOpen}
          onClose={() => setIsEditCharacterOpen(false)}
          currentAsset={characterValues}
        />
      )}
    </div>
  );
}

interface RecordItemProps {
  color: string;
  title: string;
  subtitle: string;
  value: string;
}

function RecordItem({ color, title, subtitle, value }: RecordItemProps) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
      <div className="flex items-center gap-3">
        <div className={`h-4 w-4 rounded-sm ${color}`} />
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-800">{title}</span>
          <span className="text-xs text-gray-500">{subtitle}</span>
        </div>
      </div>
      <span className="text-sm font-bold text-gray-800">{value}</span>
    </div>
  );
}

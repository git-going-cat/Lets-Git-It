import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import CharacterPreview from '@/features/auth/components/CharacterPreview';
import { useAuthStore } from '@/features/auth/store/authStore';
import { DEFAULT_CHARACTER_VALUES } from '@/features/auth/utils/characterAssets';

import { fetchMyRecord } from '../api/mypageApi';

import EditCharacterModal from './EditCharacterModal';
import { EditProfileModal } from './EditProfileModal';

interface MyPageModalProps {
  isOpen: boolean;
  onOpenLogout: () => void;
}

export default function MyPageModal({ isOpen, onOpenLogout }: MyPageModalProps) {
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isEditCharacterOpen, setIsEditCharacterOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

  const { data: record, isLoading } = useQuery({
    queryKey: ['myRecord'],
    queryFn: fetchMyRecord,
    enabled: isOpen,
  });

  const nickname = record?.nickname ?? user?.nickname ?? '';
  const characterSource = record ?? user;
  const characterValues = characterSource
    ? {
        characterHair: characterSource.characterHair,
        characterHairColor: characterSource.characterHairColor,
        characterBody: characterSource.characterBody,
        characterEye: characterSource.characterEye,
        characterOutfit: characterSource.characterOutfit,
        characterOutfitColor: characterSource.characterOutfitColor,
      }
    : DEFAULT_CHARACTER_VALUES;

  return (
    <div
      // -translate-x-[120%]: 슬라이드 아웃 시 요소 너비 기준 120% 이동해 화면에서 완전히 숨깁니다.
      className={`absolute bottom-12 left-0 z-40 flex h-auto w-modal-md flex-col rounded-t-xl rounded-br-xl bg-[#f3f3f3]/95 p-6 shadow-2xl backdrop-blur transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-[120%] opacity-0'
      }`}
    >
      <div className="mb-4 flex shrink-0 items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-[#0078d4]">{nickname || '닉네임 없음'}</span>
        </div>
        <button
          type="button"
          className="rounded-lg px-2 py-1 text-sm text-gray-500 transition-colors hover:bg-white/70 hover:text-gray-800"
          onClick={() => setIsEditProfileOpen(true)}
        >
          내 정보 수정 &gt;
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
            className="flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white py-2 shadow-sm transition-colors hover:bg-[#f0f0f0]"
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
              </>
            ) : (
              <>
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

      <div className="mt-4 flex shrink-0 justify-start border-t border-gray-300 pt-4">
        <button
          type="button"
          onClick={onOpenLogout}
          className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-600 active:bg-red-700"
        >
          로그아웃
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

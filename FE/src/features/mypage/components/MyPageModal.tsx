import { useQuery } from '@tanstack/react-query';

import { fetchMyRecord } from '../api/mypageApi';

interface MyPageModalProps {
  isOpen: boolean;
  onOpenLogout: () => void;
}

export default function MyPageModal({ isOpen, onOpenLogout }: MyPageModalProps) {
  const nickname = ''; // TODO: authStore nickname 연동 (auth 팀원 구현 완료 후)

  const { data: record, isLoading } = useQuery({
    queryKey: ['myRecord'],
    queryFn: fetchMyRecord,
    enabled: false,
  });

  return (
    <div
      // -translate-x-[120%]: 슬라이드 아웃 시 요소 너비 기준 120% 오프셋 — 그림자 잔상 제거 목적, translate-x-full(100%) 초과값이라 임의값 불가피
      className={`absolute bottom-12 left-0 z-40 flex h-auto w-modal-md flex-col rounded-t-xl rounded-br-xl bg-[#f3f3f3]/95 p-6 shadow-2xl backdrop-blur transition-all duration-300 ease-in-out ${
        isOpen ? 'translate-x-0 opacity-100' : '-translate-x-[120%] opacity-0 pointer-events-none'
      }`}
    >
      {/* 윈도우 11 시작메뉴 스타일 헤더 */}
      <div className="mb-4 flex shrink-0 items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-[#0078d4]">Git 지존 완성 킹왕짱</span>
        </div>
        <button type="button" className="text-sm text-gray-500 hover:text-gray-800">
          내 정보 수정 &gt;
        </button>
      </div>

      <div className="flex min-h-0 flex-1 gap-6">
        {/* 좌측 캐릭터 영역 */}
        <div className="flex w-1/3 flex-col items-center gap-4">
          <div className="flex h-48 w-full items-center justify-center rounded-lg bg-[#e8e4d9] shadow-inner">
            {/* TODO: 캐릭터 에셋 조합 (팀원 간 협의 후 구현) */}
            <div className="text-4xl">🧑‍💻</div>
          </div>
          <div className="flex w-full flex-col items-center justify-center rounded border border-gray-300 bg-white py-2 shadow-sm">
            <span className="text-xs font-bold text-gray-600">캐릭터 수정</span>
            <span className="text-xs font-bold text-[#0078d4]">{nickname || '#0078D4'}</span>
          </div>
        </div>

        {/* 우측 전적 영역 */}
        <div className="flex flex-1 flex-col rounded-lg bg-white p-4 shadow-inner">
          <h3 className="mb-3 text-xs font-bold text-gray-500">전적 및 랭킹</h3>
          <div className="flex flex-col gap-3 pr-2">
            {isLoading ? (
              // 스켈레톤 UI
              <>
                <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
              </>
            ) : (
              // 실제 데이터
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
                  title="기여도 뺏기"
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
                  subtitle="최단 클리어 타임"
                  value={record?.coopBestTime ?? '00:00.00'}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* 하단 로그아웃 버튼 */}
      <div className="mt-4 flex shrink-0 justify-start border-t border-gray-300 pt-4">
        <button
          type="button"
          onClick={onOpenLogout}
          className="flex items-center gap-2 rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 active:bg-red-100"
        >
          로그아웃
        </button>
      </div>
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

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

import multiContributionImg from '@/assets/home/multi-contribution.png';
import multiCoopImg from '@/assets/home/multi-coop.png';
import multiTimeattackImg from '@/assets/home/multi-timeattack.png';
import singleEasyImg from '@/assets/home/single-easy.png';
import singleHardImg from '@/assets/home/single-hard.png';
import singleNormalImg from '@/assets/home/single-normal.png';

// ── 타입 ──────────────────────────────────────────────────

type ExplorerTab = 'single' | 'multi';
type SingleDifficulty = 'EASY' | 'NORMAL' | 'HARD';
type MultiMode = 'contribution' | 'timeattack' | 'coop';
type SelectedItem = SingleDifficulty | MultiMode | null;

interface ExplorerItem {
  id: SingleDifficulty | MultiMode;
  label: string;
  img: string;
  description: string;
  detail: string;
}

interface Win11ExplorerModalProps {
  initialTab: ExplorerTab;
  onClose: () => void;
}

// ── 데이터 ────────────────────────────────────────────────

const SINGLE_ITEMS: ExplorerItem[] = [
  {
    id: 'EASY',
    label: 'Easy',
    img: singleEasyImg,
    description: '브랜치 최대 3개로 진행되는 기본 모드',
    detail: 'add / commit / push / merge / switch / pull\n기본 명령어 제공\n\n초보자에게 추천하는 난이도',
  },
  {
    id: 'NORMAL',
    label: 'Normal',
    img: singleNormalImg,
    description: '브랜치 최대 4개로 진행되는 중급 모드',
    detail: 'Easy 명령어 + fetch\n\n어느 정도 Git에 익숙한 분께 추천',
  },
  {
    id: 'HARD',
    label: 'Hard',
    img: singleHardImg,
    description: '브랜치 최대 5개로 진행되는 고급 모드',
    detail: 'Normal 명령어 + rebase / force push / diff\nConflict 미니게임 포함\n\nGit 전문가를 위한 난이도',
  },
];

const MULTI_ITEMS: ExplorerItem[] = [
  {
    id: 'contribution',
    label: '기여도 뺏기',
    img: multiContributionImg,
    description: '2~4명이 함께하는 기여도 뺏기 대결',
    detail: '먼저 명령어를 입력한 사람의 기여도 증가\n최고 기여도를 달성한 플레이어가 승리',
  },
  {
    id: 'timeattack',
    label: '타임어택',
    img: multiTimeattackImg,
    description: '제한 시간 내 최대 명령어 입력 대결',
    detail: '시간 내에 최대한 많은 명령어 입력\n가장 많이 입력한 플레이어가 승리',
  },
  {
    id: 'coop',
    label: '협동',
    img: multiCoopImg,
    description: '팀원과 협력하여 미션 클리어',
    detail: '팀원과 함께 주어진 Git 미션 수행\n최단 시간 클리어가 목표',
  },
];

// ── 사이드바 아이템 ────────────────────────────────────────

const SIDEBAR_TREE = [
  { label: '바탕화면', isFolder: true, depth: 0 },
  { label: '싱글모드', isFolder: true, depth: 1, tab: 'single' as ExplorerTab },
  { label: '멀티모드', isFolder: true, depth: 1, tab: 'multi' as ExplorerTab },
  { label: '싱글 랭킹', isFolder: false, depth: 1 },
  { label: '멀티 랭킹', isFolder: false, depth: 1 },
  { label: '도감', isFolder: false, depth: 1 },
];

// ── 메인 컴포넌트 ─────────────────────────────────────────

/**
 * Windows 11 파일탐색기 스타일 모드 선택 모달
 *
 * @description 싱글/멀티 탭 전환 + 세부 모드 선택 + 게임 시작 라우팅
 */
export default function Win11ExplorerModal({ initialTab, onClose }: Win11ExplorerModalProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ExplorerTab>(initialTab);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);

  const items = activeTab === 'single' ? SINGLE_ITEMS : MULTI_ITEMS;
  const selectedData = items.find((item) => item.id === selectedItem) ?? null;

  const handleTabChange = (tab: ExplorerTab) => {
    setActiveTab(tab);
    setSelectedItem(null);
  };

  const handleGameStart = () => {
    if (!selectedItem) return;
    if (activeTab === 'single') {
      void navigate({ to: '/single', search: { difficulty: selectedItem } });
    } else {
      void navigate({ to: '/multi', search: { mode: selectedItem } });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="모드 선택"
    >
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 모달 본체 — Win11 탐색기 스타일 */}
      <div className="relative z-10 flex w-modal-lg h-modal-lg flex-col overflow-hidden rounded-lg bg-[#f3f3f3] shadow-2xl ring-1 ring-black/10">
        {/* ── 탭 바 ── */}
        <div className="flex items-center bg-[#f9f9f9] pl-2 pr-3 pt-1 select-none">
          {/* 탭 목록 */}
          <div className="flex flex-1 gap-0.5">
            {(['single', 'multi'] as ExplorerTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleTabChange(tab)}
                className={`flex items-center gap-2 rounded-t-md px-4 py-2 text-sm transition-colors ${
                  activeTab === tab
                    ? 'bg-[#f3f3f3] text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:bg-white/60'
                }`}
              >
                <span className="text-base">📁</span>
                {tab === 'single' ? '싱글모드' : '멀티모드'}
                {activeTab === tab && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-xs text-gray-400 hover:bg-gray-200"
                    aria-label="닫기"
                  >
                    ✕
                  </button>
                )}
              </button>
            ))}
            <button type="button" className="px-3 py-2 text-gray-400 hover:text-gray-600 text-sm">
              +
            </button>
          </div>
          {/* 창 컨트롤 버튼 */}
          <div className="flex gap-1">
            {['─', '□', '✕'].map((icon, i) => (
              <button
                key={icon}
                type="button"
                onClick={i === 2 ? onClose : undefined}
                className={`flex h-7 w-8 items-center justify-center rounded text-xs text-gray-600 transition-colors ${
                  i === 2 ? 'hover:bg-red-500 hover:text-white' : 'hover:bg-gray-200'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* ── 주소 표시줄 ── */}
        <div className="flex items-center gap-2 border-b border-gray-200 bg-[#f3f3f3] px-3 py-1.5">
          {['←', '→', '↑'].map((icon) => (
            <button
              key={icon}
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded text-xs text-gray-500 hover:bg-gray-200"
            >
              {icon}
            </button>
          ))}
          <div className="flex flex-1 items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs text-gray-700">
            <span>📁</span>
            <span>바탕화면 &gt;</span>
            <span className="font-medium">
              {activeTab === 'single' ? '싱글모드' : '멀티모드'} &gt;
            </span>
          </div>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-200"
          >
            세부 정보
          </button>
        </div>

        {/* ── 콘텐츠 영역 ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* 사이드바 */}
          <div className="w-44 overflow-y-auto border-r border-gray-200 bg-[#f9f9f9] py-2 select-none">
            {SIDEBAR_TREE.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => item.tab && handleTabChange(item.tab)}
                className={`flex w-full items-center gap-1.5 px-3 py-1 text-left text-xs transition-colors ${
                  item.tab === activeTab
                    ? 'bg-[#cce4f7] text-gray-900 font-medium'
                    : 'text-gray-700 hover:bg-gray-200/70'
                }`}
                // depth별 동적 들여쓰기: Tailwind 정적 클래스로 표현 불가
                style={{ paddingLeft: `${(item.depth + 1) * 12}px` }}
              >
                <span>
                  {item.isFolder
                    ? '📁'
                    : item.label === '싱글 랭킹' || item.label === '멀티 랭킹'
                      ? '📊'
                      : item.label === '도감'
                        ? '📖'
                        : '🖥'}
                </span>
                {item.label}
              </button>
            ))}
          </div>

          {/* 메인 그리드 */}
          <div className="flex flex-1 flex-wrap content-start gap-6 overflow-y-auto bg-white p-6">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item.id)}
                onDoubleClick={handleGameStart}
                className={`flex flex-col items-center gap-2 rounded-lg p-3 transition-colors ${
                  selectedItem === item.id
                    ? 'bg-[#cce4f7] ring-2 ring-[#0078d4]/40'
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className="relative">
                  <img
                    src={item.img}
                    alt={item.label}
                    className="pixel-art h-20 w-20 object-contain"
                    draggable={false}
                  />
                  {/* Windows 바로가기 화살표 오버레이 */}
                  <div className="absolute bottom-0 left-0 flex h-4 w-4 items-center justify-center rounded-sm bg-white shadow-sm ring-1 ring-gray-300">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      className="h-3 w-3 text-gray-600"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 17L17 7M17 7H7M17 7V17"
                      />
                    </svg>
                  </div>
                </div>
                <span className="text-xs text-gray-800">{item.label}</span>
              </button>
            ))}
          </div>

          {/* 세부 정보 패널 */}
          <div className="flex w-52 flex-col border-l border-gray-200 bg-[#f9f9f9]">
            {selectedData ? (
              <div className="flex flex-col gap-3 p-4">
                <img
                  src={selectedData.img}
                  alt={selectedData.label}
                  className="pixel-art mx-auto h-20 w-20 object-contain"
                  draggable={false}
                />
                <p className="text-sm font-bold text-gray-800">{selectedData.label}</p>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    세부 정보
                  </p>
                  <p className="text-xs leading-relaxed whitespace-pre-line text-gray-600">
                    {selectedData.description}
                    {'\n\n'}
                    {selectedData.detail}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGameStart}
                  className="mt-auto w-full rounded bg-[#0078d4] py-2 text-sm font-semibold text-white transition-colors hover:bg-[#106ebe] active:bg-[#005a9e]"
                >
                  게임 시작
                </button>
              </div>
            ) : (
              <p className="mt-10 px-4 text-center text-xs text-gray-400">항목을 선택하세요</p>
            )}
          </div>
        </div>

        {/* ── 상태 표시줄 ── */}
        <div className="flex items-center border-t border-gray-200 bg-[#f3f3f3] px-4 py-1 text-xs text-gray-500">
          <span>{items.length}개 항목</span>
          {selectedItem && <span className="ml-2">· 1개 항목 선택함</span>}
        </div>
      </div>
    </div>
  );
}

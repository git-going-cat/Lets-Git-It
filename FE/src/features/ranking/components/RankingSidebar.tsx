import { useState } from 'react';

import multiContributionImg from '@/assets/home/multi-contribution.png';
import multiCoopImg from '@/assets/home/multi-coop.png';
import multiFolderImg from '@/assets/home/multi-folder.png';
import multiTimeattackImg from '@/assets/home/multi-timeattack.png';
import singleEasyImg from '@/assets/home/single-easy.png';
import singleFolderImg from '@/assets/home/single-folder.png';
import singleHardImg from '@/assets/home/single-hard.png';
import singleNormalImg from '@/assets/home/single-normal.png';

import type { RankingMode } from '../types/ranking.types';

// ── 사이드바 데이터 ───────────────────────────────────────

interface SidebarFolder {
  label: string;
  icon: string;
  children: SidebarItem[];
}

interface SidebarItem {
  label: string;
  icon: string;
  mode: RankingMode;
}

const SIDEBAR_DATA: SidebarFolder[] = [
  {
    label: '싱글모드',
    icon: singleFolderImg,
    children: [
      { label: '이지', icon: singleEasyImg, mode: 'single-easy' },
      { label: '노말', icon: singleNormalImg, mode: 'single-normal' },
      { label: '하드', icon: singleHardImg, mode: 'single-hard' },
    ],
  },
  {
    label: '멀티모드',
    icon: multiFolderImg,
    children: [
      { label: '기여도 뺏기', icon: multiContributionImg, mode: 'speed' },
      { label: '타임어택', icon: multiTimeattackImg, mode: 'timeattack' },
      { label: '협력', icon: multiCoopImg, mode: 'coop' },
    ],
  },
];

// ── 컴포넌트 ──────────────────────────────────────────────

interface RankingSidebarProps {
  activeMode: RankingMode;
  onSelectMode: (mode: RankingMode) => void;
}

/**
 * 랭킹 모달 좌측 폴더트리 사이드바
 *
 * @description 싱글/멀티 폴더 토글 + 모드 선택 하이라이트
 */
export default function RankingSidebar({ activeMode, onSelectMode }: RankingSidebarProps) {
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({
    싱글모드: true,
    멀티모드: true,
  });

  const handleToggle = (label: string) => {
    setOpenFolders((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <>
      {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
      <div
        className="flex w-44 shrink-0 flex-col gap-1 overflow-y-auto py-4 pr-2 pl-3 backdrop-blur-md"
        style={{
          background: 'rgba(255,255,255,0.45)',
          borderRight: '1px solid rgba(255,255,255,0.6)',
        }}
      >
        {SIDEBAR_DATA.map((folder) => (
          <div key={folder.label}>
            {/* 폴더 헤더 */}
            {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
            <button
              type="button"
              onClick={() => handleToggle(folder.label)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold transition-colors hover:bg-white/50"
              style={{ color: '#5a6a8a' }}
            >
              <img
                src={folder.icon}
                alt={folder.label}
                className="pixel-art h-8 w-8 object-contain"
                draggable={false}
              />
              <span className="flex-1 text-left">{folder.label}</span>
              {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
              <span className="text-xs" style={{ color: 'rgba(90, 106, 138, 0.5)' }}>
                {openFolders[folder.label] ? '▾' : '▸'}
              </span>
            </button>

            {/* 하위 항목 */}
            {openFolders[folder.label] && (
              <div className="mt-0.5 flex flex-col gap-0.5 pl-3">
                {folder.children.map((item) => (
                  <div key={item.mode}>
                    {/* Tailwind 기본 스케일로 표현 불가한 정밀 색상값/그라디언트 */}
                    <button
                      type="button"
                      onClick={() => onSelectMode(item.mode)}
                      className={`flex items-center gap-2 rounded-md px-2 py-2 text-xs transition-colors ${
                        activeMode !== item.mode ? 'hover:bg-white/50' : ''
                      }`}
                      style={
                        activeMode === item.mode
                          ? {
                              background: 'rgba(255,255,255,0.65)',
                              color: '#3a5a9a',
                              borderLeft: '3px solid #F2CB05',
                              fontWeight: 600,
                            }
                          : { color: '#4a5a7a' }
                      }
                    >
                      <img
                        src={item.icon}
                        alt={item.label}
                        className="pixel-art h-7 w-7 object-contain"
                        draggable={false}
                      />
                      {item.label}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

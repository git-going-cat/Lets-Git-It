import { useDictionaryModal } from '../hooks/useDictionaryModal';

import CommandDetail from './CommandDetail';

interface DictionaryModalProps {
  onClose: () => void;
}

export default function DictionaryModal({ onClose }: DictionaryModalProps) {
  const {
    searchQuery,
    setSearchQuery,
    selectedCommand,
    setSelectedCommand,
    filteredCommands,
    isLoading,
  } = useDictionaryModal();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="도감"
    >
      <div
        className="flex h-modal-lg w-modal-lg max-w-full overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 좌측 패널: 명령어 목록 */}
        <div className="flex w-1/2 flex-col border-r border-gray-200 bg-gray-50">
          {/* 헤더 / 검색 */}
          <div className="flex flex-col gap-3 border-b border-gray-200 bg-[#f3f3f3] px-4 py-3">
            <h2 className="text-sm font-semibold text-gray-700">명령어 도감</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="명령어 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]"
              />
            </div>
          </div>

          {/* 리스트 */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-[#0078d4]" />
              </div>
            ) : filteredCommands.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {filteredCommands.map((cmd) => {
                  const isSelected = selectedCommand?.commandId === cmd.commandId;
                  return (
                    <button
                      key={cmd.commandId}
                      type="button"
                      onClick={() => setSelectedCommand(cmd)}
                      className={`flex flex-col items-center justify-center gap-1 rounded border p-2 text-center transition-colors ${
                        isSelected
                          ? 'border-[#0078d4] bg-[#0078d4]/10'
                          : 'border-gray-200 bg-white hover:border-[#0078d4]/50'
                      }`}
                    >
                      <span
                        className={`w-full truncate text-xs font-semibold ${
                          isSelected ? 'text-[#0078d4]' : 'text-gray-800'
                        }`}
                      >
                        {cmd.name}
                      </span>
                      {cmd.isInGame ? (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-600">
                          게임 내 사용
                        </span>
                      ) : (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-bold text-gray-500">
                          게임 외
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-400">
                검색 결과가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 우측 패널: 상세 정보 */}
        <div className="relative flex w-1/2 flex-col bg-white">
          <div className="absolute right-3 top-3 z-10">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          <CommandDetail command={selectedCommand} />
        </div>
      </div>
    </div>
  );
}

import type { Command } from '../types/dictionary.types';

interface CommandDetailProps {
  command: Command | null;
}

export default function CommandDetail({ command }: CommandDetailProps) {
  if (!command) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-lg text-gray-400">
        <p>명령어를 선택해주세요</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6 pt-10">
      {/* 뱃지 */}
      <div className="mb-4">
        <span
          className={`inline-block rounded-full px-2 py-1 text-sm font-semibold ${
            command.isInGame ? 'bg-[#0078d4]/10 text-[#0078d4]' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {command.isInGame ? '게임 내 사용 명령어' : '게임 외 명령어'}
        </span>
      </div>

      <h2 className="mb-2 text-3xl font-bold text-gray-800">{command.name}</h2>
      <p className="mb-6 text-base text-gray-600">{command.description}</p>

      {command.tip && (
        <div className="mb-4 rounded border border-blue-100 bg-blue-50 p-3 text-base text-blue-900">
          <h3 className="mb-1 text-sm font-bold text-blue-700">팁</h3>
          <p>{command.tip}</p>
        </div>
      )}

      {command.example && (
        <div className="mb-4 rounded border border-gray-200 bg-gray-50 p-3 text-base">
          <h3 className="mb-1 text-sm font-bold text-gray-700">예시</h3>
          <code className="break-all text-blue-700">{command.example}</code>
        </div>
      )}

      {command.imageUrl && (
        <div className="mb-6 shrink-0 overflow-hidden rounded border border-gray-200">
          <img src={command.imageUrl} alt={command.name} className="w-full object-cover" />
        </div>
      )}

      {command.options && command.options.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="mb-1 text-base font-bold text-gray-800">옵션</h3>
          {command.options.map((opt, idx) => (
            <div key={idx} className="flex flex-col gap-1 rounded bg-[#f3f3f3] p-3 text-base">
              <span className="font-semibold text-[#0078d4]">{opt.option}</span>
              <span className="text-gray-600">{opt.description}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

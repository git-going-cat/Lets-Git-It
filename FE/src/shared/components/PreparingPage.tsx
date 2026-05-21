import { useNavigate } from '@tanstack/react-router';

import bgImage from '@/assets/bg/screen.png';
import { Win11Window } from '@/shared/components/Win11Window';

interface PreparingPageProps {
  title: string;
  description?: string;
}

export default function PreparingPage({
  title,
  description = '현재 준비 중인 기능입니다.\n홈에서 다른 모드를 선택해주세요.',
}: PreparingPageProps) {
  const navigate = useNavigate();

  return (
    <main className="relative h-screen w-full overflow-hidden">
      <img
        src={bgImage}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden="true"
        draggable={false}
      />
      <Win11Window
        title="구현 준비 중"
        onClose={() => void navigate({ to: '/home', replace: true })}
        className="w-[min(420px,calc(100vw-2rem))]"
      >
        <section className="flex w-full flex-col items-center gap-6 px-5 py-6 text-center">
          <div className="flex w-full flex-col items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            <p className="max-w-[320px] whitespace-pre-line text-sm leading-relaxed text-gray-600">
              {description}
            </p>
          </div>
        </section>
      </Win11Window>
    </main>
  );
}

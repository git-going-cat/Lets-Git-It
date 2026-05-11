import { useNavigate } from '@tanstack/react-router';

import bgImage from '@/assets/bg/screen.png';
import errorImage from '@/assets/error.png';
import { Win11Window } from '@/shared/components/Win11Window';

export function RouteErrorFallback() {
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
        title="오류가 발생했습니다"
        onClose={() => void navigate({ to: '/home', replace: true })}
        className="w-[min(760px,calc(100vw-2rem))]"
      >
        <section className="flex w-full flex-col items-center gap-4 px-4 py-5 text-center">
          <img
            src={errorImage}
            alt="오류 안내"
            className="w-full max-w-[560px] rounded-lg object-contain"
            draggable={false}
          />
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-gray-900">화면을 불러오지 못했습니다.</h1>
            <p className="text-sm text-gray-600">
              잠시 후 다시 시도하거나 홈에서 다시 시작해주세요.
            </p>
          </div>
        </section>
      </Win11Window>
    </main>
  );
}

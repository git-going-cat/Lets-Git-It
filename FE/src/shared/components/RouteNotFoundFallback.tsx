import { useNavigate } from '@tanstack/react-router';

import bgImage from '@/assets/bg/screen.png';
import errorImage from '@/assets/error.png';
import { Win11Window } from '@/shared/components/Win11Window';

/**
 * 라우터에 등록되지 않은 주소로 접근했을 때 보여주는 내부 404 화면입니다.
 */
export function RouteNotFoundFallback() {
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
        title="페이지를 찾을 수 없습니다"
        onClose={() => void navigate({ to: '/home', replace: true })}
        className="w-[min(760px,calc(100vw-2rem))]"
      >
        <section className="flex w-full flex-col items-center gap-4 px-4 py-5 text-center">
          <img
            src={errorImage}
            alt="페이지 없음 안내"
            className="w-full max-w-[560px] rounded-lg object-contain"
            draggable={false}
          />
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold text-gray-900">존재하지 않는 주소입니다.</h1>
            <p className="text-sm text-gray-600">
              입력한 주소를 확인하거나 홈 화면에서 다시 시작해 주세요.
            </p>
          </div>
          <button
            type="button"
            className="rounded border border-[#175c35] bg-[#217346] px-4 py-2 text-sm font-medium text-white hover:bg-[#175c35]"
            onClick={() => void navigate({ to: '/home', replace: true })}
          >
            홈으로 이동
          </button>
        </section>
      </Win11Window>
    </main>
  );
}

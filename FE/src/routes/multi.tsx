import { createFileRoute, Outlet } from '@tanstack/react-router';

import bgImage from '@/assets/bg/screen.png';

/** /multi 레이아웃 — 홈 배경 위에 자식 라우트(/multi/, /multi/$roomId)를 Outlet으로 렌더한다. */
export const Route = createFileRoute('/multi')({
  component: () => (
    <div className="relative h-screen w-full overflow-hidden">
      <img
        src={bgImage}
        alt="배경"
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <Outlet />
    </div>
  ),
});

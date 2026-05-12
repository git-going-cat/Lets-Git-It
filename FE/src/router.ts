import { createRouter } from '@tanstack/react-router';

import { registerRouter } from './routerRegistry';
import { routeTree } from './routeTree.gen';

/**
 * 앱 전역 라우터 인스턴스.
 *
 * React 컴포넌트 외부(인터셉터 등)에서 router.navigate()를 사용하기 위해
 * App.tsx와 별도 모듈로 분리합니다.
 *
 * routerRegistry에 등록해 core/http.ts와의 순환 의존성을 방지합니다.
 * (routeTree.gen → __root → http → router → routeTree.gen 순환 차단)
 */
export const router = createRouter({ routeTree });
registerRouter(router);

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

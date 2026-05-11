import type { Router } from '@tanstack/react-router';

/**
 * 라우터 레지스트리 — core/http.ts ↔ router.ts 순환 의존성 방지용 중간 모듈.
 *
 * 순환 체인:
 *   routeTree.gen.ts → __root.tsx → core/http.ts → router.ts → routeTree.gen.ts
 *
 * 해결 방식:
 *   - core/http.ts가 router.ts를 직접 import하는 대신 이 레지스트리를 import
 *   - router.ts에서 라우터 생성 후 registerRouter()로 등록
 *   - http.ts 인터셉터에서 getRouter()로 지연 참조 → 런타임에는 항상 등록된 상태
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _router: Router<any> | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerRouter(r: Router<any>): void {
  _router = r;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRouter(): Router<any> | undefined {
  return _router;
}

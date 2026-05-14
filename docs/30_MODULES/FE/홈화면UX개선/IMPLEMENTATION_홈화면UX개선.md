# 홈화면 UX 개선 구현

## Background / Context

홈 화면에서 로그인 사용자의 캐릭터를 보여주는 UX가 필요했다. 기존 캐릭터 렌더링은 싱글 모드의 `PlayerCharacter`에서 사용 중이지만, 이 컴포넌트는 `singleStore`, `singleBus`, 브랜치 레인 계산에 의존해 홈 화면에 직접 재사용하기 어렵다.

반면 `shared/components/AnimatedCharacter.tsx`는 캐릭터 레이어 이미지를 canvas에 합성하고 `idle`, `walk` 애니메이션을 지원하는 공용 렌더러다. `shared/hooks/useCurrentCharacterAsset.ts`도 `authStore`의 캐시된 사용자 캐릭터 데이터를 읽기 때문에 홈 화면에서 별도 API 호출 없이 현재 캐릭터를 가져올 수 있다.

## Decision

홈 화면 전용 컴포넌트 `features/home/components/HomeWalkingCharacter.tsx`를 추가했다. 이 컴포넌트는 `useCurrentCharacterAsset()`으로 캐릭터 asset을 가져오고, asset이 없으면 `null`을 반환한다.

이동은 Phaser 없이 `setTimeout`과 CSS `transform` transition으로 구현했다. 홈 바탕화면 전체를 덮는 absolute 영역 안에서 다음 `{ x, y }` 목적지를 매번 랜덤으로 정한다. 직전 위치와 너무 가까운 목적지는 재추첨해 최소 이동 거리를 보장하고, 2D 거리와 고정 픽셀당 시간을 곱해 transition duration을 계산한다.

이동 중에는 `AnimatedCharacter`에 `animation="walk"`를 전달한다. 2D 목적지로 이동하더라도 걷는 모션은 좌우 프레임을 사용해 미끄러지는 느낌을 줄인다. 목적지 x가 현재 x보다 크면 `direction="right"`, 작으면 `direction="left"`를 사용한다. 목적지에 도착해 idle 대기를 시작할 때는 `direction="front"`로 바꿔 사용자를 바라보는 정지 상태가 되도록 했다. idle 대기는 1~2초 랜덤 시간 이후 다음 목적지를 다시 선택한다.

캐릭터 클릭 시에는 `sleep`, `sit1`, `sit2`, `phone`, `bookStand`, `bookRead`, `pushCart`, `pickUp`, `gift`, `lift`, `throw`, `hit`, `punch`, `stab`, `grabGun`, `gunIdle`, `shoot`, `hurt` 중 하나를 랜덤으로 재생한다. 짧은 액션 모션은 화면에서 인지할 수 있도록 최소 1.2초 이상 유지한다. 특수 애니메이션이 이미 재생 중이면 추가 클릭은 무시한다. 이동 중 클릭하면 현재 화면상 `{ x, y }` 좌표로 transition을 멈춘 뒤 특수 애니메이션을 재생하고, 끝난 뒤 기존 목적지까지 다시 걷는다. idle 중 클릭하면 특수 애니메이션 종료 후 다시 front idle 상태로 돌아가고 기존 이동 루프를 재개한다.

캐릭터 스프라이트 파서는 `shared/components/AnimatedCharacter.tsx`에서 animation별 프레임 레이아웃을 정의한다. 일반 방향형 모션은 `right -> back -> left -> front` 순서의 방향 프레임을 사용하고, `sleep`, `phone`, `bookStand`, `bookRead`는 front-only 레이아웃을 사용한다. `sit1`, `sit2`는 right/left-only 레이아웃이라 front/back 요청 시 right 방향으로 fallback한다.

`HomePage.tsx`에는 배경 이미지 위, 주요 홈 UI 아래 레이어로 배치했다. 모드 선택 폴더 영역은 `z-20`, 걷는 캐릭터는 `z-10`으로 두어 폴더 아이콘보다 위에 그려지지 않도록 했다.

메인 화면 이미지 크기는 Tailwind 기본 스케일을 우선 사용하도록 정리했다. `MultiModeButton`의 잘못된 `h30 w-30` 클래스는 실제 사용 중인 폴더 버튼 크기와 맞춰 `h-40 w-40`으로 교정했고, 설정 아이콘은 비표준 `h-15 w-15` 대신 기본 스케일 `h-16 w-16`을 사용한다. `AnimatedCharacter`는 canvas 합성 기반이므로 크기 규칙 정리 대상에서 제외했다.

홈 화면에서 열린 모달이 없을 때 ESC 키를 누르면 설정 모달이 열리도록 `features/home/hooks/useHomeEscSettings.ts`를 추가했다. 이미 설정/랭킹/도감/탐색기/마이페이지/로비 모달이 열린 경우에는 이 훅을 비활성화해 각 모달의 기존 `useModal` ESC 닫기 동작을 유지한다. 이벤트 리스너는 훅 cleanup에서 제거한다.

## Caution

캐릭터 데이터는 `authStore` 기반 캐시만 사용한다. 홈 화면 진입 시 `/members/me` 같은 추가 API 호출을 만들지 않는다.

위치는 viewport 크기에 따라 계산되므로 resize 시 현재 화면상 `{ x, y }` 좌표를 새 범위 안으로 보정한다. resize가 발생하면 진행 중 이동은 중단하고 front idle 상태로 돌아간 뒤 이동 루프를 다시 시작한다. 상단 로고 영역과 하단 작업 표시줄을 완전히 침범하지 않도록 위/아래 안전 여백을 둔다.

ESC 설정 모달 연동은 홈 화면 전용 키보드 진입로다. 다른 모달이 열려 있을 때는 중복 ESC 핸들러가 동작하지 않도록 `enabled` 조건으로 분기한다.

## Test Plan

- `npx tsc -p tsconfig.app.json --noEmit`
- `npm run lint`

# 싱글 탭 게임 타입 구분 UI 개편 — 고양이 사고처리반 추가

## Background / Context

`Win11ExplorerModal`의 싱글 탭은 Easy / Normal / Hard 3개 아이콘이 평면 그리드로 나열되어 있었다. "고양이 사고처리반"이라는 새 게임 타입을 추가하면서, 기존 난이도 선택 UI와 섞이지 않도록 섹션 구분이 필요해졌다.

고양이 사고처리반은 시나리오 기반 스토리 모드로, Easy/Normal/Hard처럼 난이도를 고르는 게 아니라 사건 시나리오를 선택하는 구조다. 시나리오마다 별도 아이콘을 뽑는 방식은 콘텐츠 확장 시 에셋 비용이 크기 때문에, 게임 타입 아이콘 1개 + 클릭 시 시나리오 선택 서브모달로 진입하는 구조를 선택했다.

BE API가 아직 확정되지 않아 FE 선작업으로 시나리오 데이터를 하드코딩하고, 게임 시작 버튼은 "준비 중" 비활성화로 처리했다.

## Decision

### `Win11ExplorerModal.tsx` — 섹션 그룹핑

`ExplorerItem`에 `section?: SingleGameType` 필드를 추가하고, flat 배열(`SINGLE_ITEMS`)을 그대로 유지하면서 렌더링 시에만 섹션별로 그룹핑했다. `items.find()` 기반의 detail 패널 데이터 조회 패턴을 깨지 않기 위한 선택이다.

`id: 'INCIDENT_RESPONSE'`는 인접한 `SingleDifficulty` 값(`'EASY' | 'NORMAL' | 'HARD'`)이 모두 UPPERCASE BE enum 형식을 따르기 때문에 동일하게 UPPERCASE로 통일했다. `section === id`가 성립하는 부수 효과도 있다.

`handleGameStart`에 `selectedItem === 'INCIDENT_RESPONSE'` 조기 반환 가드를 추가해, 더블클릭 경로 포함 잘못된 `difficulty`가 BE로 전송되는 경우를 차단했다.

### `ScenarioSelectModal.tsx` — 서브모달

`useModal` 훅을 사용해 `Win11ExplorerModal`(`z-50`) 위에 `z-60`으로 안전하게 스택된다. `modalStack` 기반 top 가드 덕분에 ESC와 Tab focus trap 모두 최상단 모달에서만 동작한다.

하드코딩된 `SCENARIOS` 배열은 사건 #1만 해금, 나머지는 `isLocked: true`로 잠금 처리했다. `onStartScenario` prop이 없으면 모든 버튼이 "준비 중" 비활성화된다.

## Why

- flat 배열 유지: `items.find()` 패턴 보존. 그룹핑은 렌더링 로직에서만.
- UPPERCASE id: `SingleDifficulty` 인접 union과 케이스 일관성.
- `handleGameStart` 가드: 더블클릭 경로에서 `selectedItem as SingleDifficulty` 캐스팅이 잘못된 값을 보내는 사고 방지.
- `z-60`: `Win11ExplorerModal`이 `z-50`, `useModal` `modalStack`이 중첩 모달 포커스 트랩을 처리.

## Caution

- `onStartScenario`는 아직 미연동. `ScenarioSelectModal` 버튼이 `navigate({ to: '/incident', search: { scenarioId } })`를 직접 호출하도록 구현되어 있으며, BE API 준비 시 prop으로 교체.
- 잠금 정책(`isLocked`)은 현재 `useIncidentProgressStore`의 클라이언트 클리어 기록 기반. BE가 서버 기록을 내려주면 그쪽으로 전환 필요.
- `INCIDENT_RESPONSE` id는 향후 BE enum 값과 맞춰야 한다. 달라질 경우 `handleGameStart` 가드와 `SelectedItem` 타입을 함께 수정한다.
- `single-incident.png` 에셋 교체 시 import 경로만 변경하면 된다.
- 게임 구현 상세는 `IMPLEMENTATION_고양이사고처리반_게임구현.md` 참조.

## Test Plan

```bash
./node_modules/.bin/tsc -p tsconfig.app.json --noEmit
./node_modules/.bin/eslint src/features/home/components/modals/
```

브라우저 수동 확인:
1. 홈 → 싱글모드 폴더 클릭 → 탐색기 모달 오픈
2. 싱글 탭: "빠른 타이핑" 헤더 + Easy/Normal/Hard 아이콘 표시
3. "고양이 사고처리반" 헤더 + 단일 아이콘 표시
4. Easy/Normal/Hard 클릭 → detail 패널 + "게임 시작" 버튼 정상 동작
5. 고양이 사고처리반 아이콘 클릭 → detail 패널에 "시나리오 선택" 버튼
6. "시나리오 선택" 클릭 → ScenarioSelectModal 오픈
7. 사건 #1 선택 가능 / 나머지 잠금 표시 + 비활성화
8. ESC / 닫기 버튼으로 서브모달 닫힘, Win11ExplorerModal 유지
9. 고양이 사고처리반 아이콘 더블클릭 → ScenarioSelectModal 오픈 (게임 시작 API 미호출)

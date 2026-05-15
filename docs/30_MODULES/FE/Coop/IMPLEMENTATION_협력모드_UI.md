# 협력 모드 UI 구현

## Background / Context

협력 모드는 Phaser Scene과 React overlay가 함께 동작하는 게임 화면이다. 기존 `/coop` 화면은 준비중 페이지이거나 placeholder 중심 구조였고, 최근 UI 초안은 하단 입력 영역이 메인 화면과 분리되어 보여 싱글 모드와 시각적 일관성이 부족했다.

이번 작업의 목표는 싱글 모드와 같은 픽셀 아트 톤을 유지하면서 협력 모드 전용 화면 골격을 구성하는 것이다. Phaser는 배경, 카드, 고양이 손 애니메이션을 담당하고 React는 HUD, 사이드바, 터미널 패널, 오버레이를 담당한다.

시각 리뷰 이후에는 목표 형상 썸네일을 제거하고 플레이어 4명을 사이드바 높이에 맞춰 독립 섹션으로 보여주는 방식으로 수정했다. REVEAL 오버레이는 배경 구름이 살짝 비치도록 투명도를 낮추고, 카운트다운 숫자를 안내 문구와 카드 목록 사이에 배치했다.

추가 리뷰에서는 게임 phase별 중심 화면을 분리했다. `assign` 단계에서는 터미널 패널을 숨기고 카드 4장을 중앙에 가로 배치한다. `input`, `wrong`, `reset_wait` 단계에서는 터미널 패널을 표시한다. 실제 입력창은 터미널 내부가 아니라 화면 하단의 `SimpleInputBar` 하나로 통합했다.

## Decision

- `/coop` route는 `CoopPage`를 렌더링한다.
- `CoopScene`은 싱글 모드와 같은 하늘색 그라데이션과 파스텔 구름 레이어를 렌더링한다.
- 상단 HUD는 별도 배경 패널 없이 Phaser canvas 위에 투명하게 떠 있는 구조로 배치한다.
- 기존 하단 입력 strip 대신 `CoopTerminalPanel`을 중앙 메인 패널로 두고, 명령어 표시와 `(coop) $` 입력을 한 곳에 묶는다.
- `CoopTerminalPanel`은 명령어 표시 전용 패널로 유지하고, 실제 입력 UI는 하단 고정 `SimpleInputBar`에서 담당한다.
- `assign` 단계 전용 `CoopCardArea`를 추가해 카드 4장을 중앙 가로 배열로 표시한다.
- 카드 뒷면은 `/assets/coop/coop_card_back.png`를 우선 사용하고, 이미지가 없으면 dotted border fallback 사각형을 렌더링한다.
- `COOP_ROUND_ASSIGN` 이후 `coopMyCommandOrderAtom`과 `coopMyCommandAtom` 값이 있으면 내 카드만 앞면으로 전환한다.
- 사이드바는 목표 형상 영역 없이 플레이어 목록만 표시한다.
- 사이드바 플레이어 섹션은 전체 높이를 4등분하고, 텍스트 이니셜 대신 `buildCharacterPaths()` 기반 canvas 캐릭터 렌더링을 사용한다.
- 현재 입력 차례 플레이어는 파란색 `#05AFF2` 좌측 세로 바와 배경 tint로 표시한다.
- HUD 중앙에는 전체 20개 명령어 기준 진행률을 나타내는 progress bar를 표시한다.
- REVEAL 오버레이 카드는 `2px dotted #05AFF2` 스타일로 통일한다.
- 협력 화면에는 싱글 화면의 우측 고양이 장식 sprite를 배치하지 않는다.
- Phaser와 React 간 통신은 `coopBus`만 사용한다.
- WebSocket payload schema는 `features/multi/schemas/coop.schema.ts`를 재사용하고, coop feature에서는 re-export만 제공한다.

## Why

싱글 모드의 Scene, 입력 hook, timer atom을 직접 재사용하면 singleBus, branch 상태, 싱글 전용 검증 로직이 협력 모드로 새어 들어온다. 협력 모드는 입력 순서, reset 대기, 플레이어별 명령어 배정이 핵심 흐름이므로 coop 전용 hook과 atom을 두는 편이 안전하다.

반면 WebSocket schema와 room/member character 데이터는 이미 multi feature에 존재한다. 같은 정의를 coop feature에 복사하면 BE 명세 변경 시 두 곳을 동시에 고쳐야 하므로 기존 schema와 roomStore 데이터를 재사용한다.

## Caution

- `CoopScene.ts`는 React, Zustand, Jotai를 import하지 않는다.
- `useCoopInput.ts`는 싱글 모드 `useCommandInput`을 사용하지 않는다.
- `coopElapsedSecondsAtom`은 협력 전용 timer atom이며 싱글 timer atom을 참조하지 않는다.
- `COOP_STARTED` payload에는 캐릭터 정보가 없으므로 lobby 단계의 `roomStore.members` 또는 `coopStore.playerSnapshots`를 기준으로 playerId 병합이 필요하다.
- `RoomMember`에는 `characterBodyColor`가 없어 현재는 기본값 `Body-color_01`을 사용한다. BE/공통 타입에 필드가 추가되면 매핑을 교체해야 한다.
- 실제 coop game WebSocket destination은 아직 TODO 상태다. 현재 `useCoopGame`, `useCoopInput`의 destination 상수는 BE 명세 확정 후 교체해야 한다.
- 고양이 손 asset이 없을 때는 Phaser Graphics placeholder로 카드 덮개를 렌더링한다.

## Test Plan

- `/coop` 진입 시 CoopPage가 렌더링되는지 확인한다.
- 배경에 하늘색 그라데이션과 파스텔 구름 레이어가 보이는지 확인한다.
- HUD가 별도 배경 패널 없이 상단에 떠 있고 `Round`, elapsed time, 완료 수가 표시되는지 확인한다.
- REVEAL 화면에서 구름 배경이 살짝 비치고, `순서를 암기하세요!` 문구와 카운트다운 위치가 올바른지 확인한다.
- 목표 형상 섹션이 제거되었는지 확인한다.
- 사이드바 플레이어 4명이 독립 섹션으로 표시되고 현재 차례가 노란색 좌측 바로 강조되는지 확인한다.
- 우측 고양이 장식 sprite가 표시되지 않는지 확인한다.
- `assign` 단계에서 카드 4장이 중앙에 가로 배열되는지 확인한다.
- `COOP_ROUND_ASSIGN` 이후 내 카드만 앞면으로 전환되는지 확인한다.
- `input`, `wrong`, `reset_wait` 단계에서 중앙 터미널 패널이 표시되는지 확인한다.
- 하단 `SimpleInputBar`에 `(coop) $` 입력창이 고정 표시되는지 확인한다.
- phase에 따라 입력 placeholder와 disabled 상태가 바뀌는지 확인한다.
- `npx tsc -p tsconfig.app.json --noEmit` 통과를 확인한다.
- `npm run lint` 통과를 확인한다.

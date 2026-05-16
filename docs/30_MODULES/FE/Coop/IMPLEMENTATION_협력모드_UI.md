# 협력 모드 UI 구현

## Background / Context

협력 모드 화면은 Phaser Scene과 React overlay를 함께 사용한다. Phaser는 배경, 카드 이미지, 손 placeholder, tween 연출을 담당하고 React는 HUD, 플레이어 사이드바, REVEAL 카드 공개 UI, 하단 입력창, 경고 오버레이를 담당한다.

이번 정리에서는 확정된 게임 흐름에 맞춰 `REVEAL -> ASSIGN -> INPUT` 단계별 렌더링 책임을 분리했다. REVEAL 단계에서는 React가 카드 앞면과 명령어 텍스트를 보여주고, ASSIGN 단계에서는 Phaser가 카드 뒷면 이미지와 섞기 tween을 처리한다. INPUT 단계에서는 카드가 사라지고 Git 형상 패널과 `(coop) $` 입력창만 남는다.

## Decision

- 카드 이미지는 public asset으로 관리한다.
  - `/assets/coop/coop_card_front.png`
  - `/assets/coop/coop_card_back_01.png` ~ `/assets/coop/coop_card_back_04.png`
- `coopCardImages.ts`는 Vite import 대신 public path 문자열만 export한다.
- REVEAL 단계 카드 앞면은 `CoopCardArea`가 React로 렌더링한다.
- REVEAL countdown은 `COOP_ROUND_REVEAL`의 `revealStartsAt - serverTime` 기반 duration을 사용한다.
- REVEAL countdown 종료 시 `phase='assign'`으로 전환하고 `coopBus.emit('coop:reveal-ended')`를 호출한다.
- ASSIGN 단계 카드는 React가 렌더링하지 않는다. Phaser `CoopScene`이 카드 뒷면 4장을 image object로 표시한다.
- `CoopScene.preload()`는 public 카드 이미지를 `this.load.image()`로 로드한다.
- `coop:reveal-ended` 수신 후 손 placeholder가 내려오고, 카드 2장을 랜덤 선택해 10회 위치 swap tween을 실행한다.
- `COOP_ROUND_ASSIGN` 수신 시 `myCommandText`를 `coopCommandsAtom`과 비교해 `myCommandOrder`를 계산하고 `coop:assign-reveal`을 emit한다.
- `CoopScene`은 섞기 완료 후 내 카드에 해당하는 물리 위치만 카드 앞면으로 전환하고 손을 올린다.
- `coop:shuffle-complete` 이후 3초가 지나면 `phase='input'`으로 전환하고 `coop:cards-hide`로 Phaser 카드들을 숨긴다.
- INPUT, WRONG, RESET_WAIT 단계에서는 카드 컴포넌트가 렌더링되지 않는다.
- `coopBus`, atom, schema, `useCoopInput`, `socketManager` 사용 규칙은 유지한다.

## Why

REVEAL과 ASSIGN을 모두 React 카드로 처리하면 Phaser 손 연출과 카드 위치가 쉽게 어긋난다. 반대로 REVEAL까지 Phaser로 옮기면 명령어 텍스트와 countdown UI 관리가 복잡해진다. 따라서 공개 단계는 React, 섞기 단계는 Phaser로 역할을 나누었다.

서버가 실제 카드 배정을 결정하므로 클라이언트의 shuffle은 시각 연출만 담당한다. 내 카드 공개는 `COOP_ROUND_ASSIGN`으로 받은 `myCommandText`를 기준으로 계산한 `myCommandOrder`에만 반응한다.

## Caution

- `CoopScene.ts`는 React, Zustand, Jotai를 import하지 않는다.
- React와 Phaser 간 통신은 `coopBus`만 사용한다.
- WebSocket은 `socketManager`만 사용한다.
- 카드 public path를 사용하므로 파일이 반드시 `FE/public/assets/coop` 아래에 있어야 한다.
- `CoopTerminalPanel.tsx`, `CoopMyCardPanel.tsx` 파일은 남아 있지만 현재 `CoopPage`에서 렌더링하지 않는다.
- 실제 coop game WebSocket destination은 아직 TODO 상태다. BE destination 확정 후 `useCoopGame`, `useCoopInput` 상수를 교체해야 한다.

## Test Plan

- `/coop` 진입 시 CoopPage가 렌더링되는지 확인한다.
- REVEAL 단계에서 카드 앞면 4장, command order, command text, countdown이 보이는지 확인한다.
- REVEAL 카드 텍스트가 정방향으로 보이는지 확인한다.
- REVEAL countdown 종료 후 ASSIGN 단계에서 React 카드가 사라지는지 확인한다.
- ASSIGN 단계에서 Phaser 카드 뒷면 4장이 보이는지 확인한다.
- 손 placeholder가 내려오고 카드 이미지가 랜덤 swap 되는지 확인한다.
- `COOP_ROUND_ASSIGN` 수신 후 내 카드만 앞면으로 바뀌는지 확인한다.
- 내 카드 공개 3초 뒤 카드가 사라지고 INPUT 단계로 전환되는지 확인한다.
- INPUT 단계에서 Git 형상 패널과 하단 `(coop) $` 입력창만 보이는지 확인한다.
- `npx tsc -p tsconfig.app.json --noEmit` 통과를 확인한다.
- `npm run lint` 통과를 확인한다.

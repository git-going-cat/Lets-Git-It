# 협력 모드 UI 구현

## Background / Context

협력 모드 화면은 Phaser Scene과 React overlay를 함께 사용한다.

- React: HUD, 플레이어 사이드바, REVEAL 카운트다운, REVEAL 카드 앞면, Git 형상 패널, 하단 입력창
- Phaser: ASSIGN 단계의 카드 뒷면 이미지, 손 placeholder, 카드 섞기 tween

이번 정리의 핵심은 `REVEAL -> ASSIGN -> INPUT` 흐름에서 카드 앞면과 뒷면이 동시에 보이지 않도록 렌더링 책임과 이벤트 시점을 분리하는 것이다.

## Decision

- `RevealOverlay`는 카운트다운만 담당한다.
- 카운트다운이 끝나면 `CoopPage`가 카드 앞면 표시 상태로 전환한다.
- 카드 앞면은 `CoopCardArea`에서 React로 1.5초 동안만 보여준다.
- `coop:reveal-ended` 이벤트는 카드 앞면 표시가 끝나고 `assign` 단계로 넘어갈 때 emit한다.
- ASSIGN 단계에서는 React `CoopCardArea`를 렌더링하지 않는다.
- ASSIGN 단계에서는 `CoopGitShapePanel`도 숨긴다.
- Phaser `CoopScene`은 `coop:reveal-ended` 수신 후 카드 뒷면 4장을 표시하고 섞기 tween을 시작한다.
- React 카드 앞면과 Phaser 카드 뒷면 크기는 모두 `160x256px` 기준으로 맞춘다.
- 카드 간격은 Tailwind `gap-6`과 같은 24px 기준으로 맞춘다.
- `coop:cards-hide` 수신 시 Phaser 카드와 손 placeholder를 모두 숨긴다.
- `CoopGraph` active node pulse는 SVG 내부 keyframes와 명시적인 transform origin을 사용한다.

## Why

기존 구조에서는 카운트다운 종료 시점에 `coop:reveal-ended`가 바로 emit되어 Phaser 카드 뒷면이 먼저 나타났다. 동시에 React는 카드 앞면을 1.5초 동안 보여주고 있어서 앞면과 뒷면이 겹쳐 보였다.

이 문제를 해결하기 위해 `coop:reveal-ended` emit 시점을 `assign` 진입 시점으로 늦췄다. 이제 흐름은 아래처럼 분리된다.

1. `reveal`: 카운트다운 표시
2. `reveal`: 카드 앞면 4장 표시
3. `assign`: Phaser 카드 뒷면 4장 표시 및 섞기
4. `input`: Git 형상과 입력창 표시

카드 크기도 React와 Phaser에서 다르면 단계 전환 시 화면이 튀어 보이므로 양쪽 모두 같은 크기와 간격을 사용한다.

## Caution

- `CoopScene.ts`에는 React, Zustand, Jotai를 import하지 않는다.
- React와 Phaser 간 통신은 `coopBus`만 사용한다.
- WebSocket은 `socketManager` 규칙을 유지한다.
- 카드 이미지는 public path를 사용한다.
  - `/assets/coop/coop_card_front.png`
  - `/assets/coop/coop_card_back_01.png` ~ `/assets/coop/coop_card_back_04.png`
- `CoopTerminalPanel.tsx`, `CoopMyCardPanel.tsx`는 현재 `CoopPage`에서 렌더링하지 않는다.

## Test Plan

- `/coop` 진입 시 CoopPage가 렌더링되는지 확인한다.
- REVEAL 카운트다운 중에는 카드가 보이지 않는지 확인한다.
- 카운트다운 종료 후 카드 앞면 4장만 보이는지 확인한다.
- 카드 앞면 표시 중 Phaser 카드 뒷면이 보이지 않는지 확인한다.
- 카드 앞면 1.5초 표시 후 ASSIGN 단계로 전환되는지 확인한다.
- ASSIGN 단계에서는 Git 형상 패널이 숨겨지고 Phaser 카드 뒷면만 보이는지 확인한다.
- ASSIGN 카드 크기와 REVEAL 카드 크기가 일치하는지 확인한다.
- `coop:cards-hide` 이후 input 화면에 카드와 손 placeholder가 남지 않는지 확인한다.
- INPUT 단계에서 Git 형상 패널과 하단 `(coop) $` 입력창이 보이는지 확인한다.
- `npx tsc -p tsconfig.app.json --noEmit` 통과를 확인한다.
- `npm run lint` 통과를 확인한다.

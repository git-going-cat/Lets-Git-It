# 웹소켓 타입 모델링 구현

## Background / Context

- `SocketManager` 구현 후 수신 패킷을 검증할 Zod 스키마가 없었음
- 스키마 없이 WebSocket 패킷을 사용하면 런타임에 잘못된 데이터가 UI 상태에 반영될 위험이 있음
- `FE_CONVENTION.md`에 WebSocket 패킷은 `.safeParse()` 필수로 명시되어 있으나 실제 스키마 파일이 존재하지 않았음

## Decision

- 도메인별로 스키마 파일 3개 생성
  - `features/multi/schemas/room.schema.ts`: 대기실 공통 패킷
  - `features/multi/schemas/contribution.schema.ts`: 기여도 뺏기 패킷
  - `features/multi/schemas/coop.schema.ts`: 협력 모드 패킷
- 타임어택은 제외 (해당 게임 모드 삭제 결정)
- 공통 분기용 `BaseMessageSchema`를 `room.schema.ts`에 정의하고 모든 수신 처리의 시작점으로 사용
- 정상/조기 종료처럼 같은 `type`이지만 구조가 다른 케이스는 contribution은 `z.union`, coop은 `z.discriminatedUnion('isSuccess')` 사용
- `ContributionRoomInfoUpdatedSchema`, `CoopRoomInfoUpdatedSchema`는 type 필드만 정의하고 상세 필드는 대기실 UI 담당 팀원이 추가 예정

## Why

- 스키마를 `features/{domain}/schemas/`에 배치
  - `FE_CONVENTION.md` 및 `FE_GUIDE_CLI.md` 프로젝트 구조 규칙 준수
  - 최상위 `schemas/` 폴더 사용 금지
- `z.discriminatedUnion` vs `z.union`
  - `isSuccess`처럼 판별 가능한 Boolean 필드가 있으면 `discriminatedUnion`이 더 명확하고 타입 추론도 정확함
  - contribution 종료는 판별 필드가 없어 `z.union` 사용

## Caution

- `ContributionRoomInfoUpdatedSchema`, `CoopRoomInfoUpdatedSchema`는 현재 type 필드만 있음
  - 대기실 UI 구현 시 해당 팀원이 필드 추가 필요
- `isMe` 필드는 브로드캐스트 패킷에서 서버가 내려주는 경우와 아닌 경우가 혼재하므로 `.optional()`로 처리
- UUID 필드는 `z.string().uuid()` 사용, 타임스탬프는 `z.number()` 사용
- `PlayerJoinedSchema.roomState`는 전체 `RoomStateSchema`가 아니라 `'WAITING' | 'IN_GAME'` 문자열 상태로 검증
- 협력 게임 성공 종료의 `results`는 플레이어별 `wrongTypeCount`, `wrongOrderCount`, `ranking`, `isMe`를 포함하는 객체 배열로 검증

## Test Plan

- `npm run build`
- `npm run lint`
- 스키마 파일 단독 Prettier check
- 신규 스키마 파일에서 `.parse()`, `any`, 타임어택 문자열 미사용 확인

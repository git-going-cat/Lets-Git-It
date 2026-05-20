# 협력 모드 requestId 기반 입력 판정 및 진행도 UI

## Background / Context

협력 모드의 `COOP_INPUT_CORRECT` 이벤트는 전체 브로드캐스트로 내려온다. 따라서 프론트는 성공 이벤트만으로는 "내가 보낸 입력의 성공"인지, 다른 플레이어가 보낸 입력의 성공인지 구분해야 한다.

백엔드는 `COOP_INPUT.requestId`를 입력 처리 흐름에 그대로 전달하고, `COOP_INPUT_CORRECT.requestId`에 같은 값을 내려준다. 프론트는 이 값을 pending request set과 비교해 내 입력 성공 여부를 판단한다.

또한 난이도 2 이상 graph data는 난이도 1과 다르게 `activateOnRound`, `activateOnStep` 기반으로 특정 라운드/스텝에서 노드를 점등해야 한다. 기존 로직은 클라이언트가 수신한 이벤트를 로컬에 누적하는 방식이라, 특정 유저가 websocket 메시지를 놓치면 그래프 진행도와 고양이 진행도가 유저별로 달라질 수 있었다.

게임 화면 진입 전후에는 `COOP_ROUND_ASSIGN`, `COOP_INPUT_CORRECT`, `COOP_ORDER_WRONG`, `COOP_INPUT_WRONG`, `COOP_RESET_WRONG` 같은 런타임 메시지가 대기실 구독에서 먼저 들어올 수 있다. 이 메시지를 pending queue에 넣고 게임 화면에서 동일한 handler로 처리하지 않으면 명령어 배정 화면이 멈추거나 reset 안내가 표시되지 않는 문제가 발생한다.

게임 종료 후 결과 모달에서 대기실로 돌아갈 때도 서버 room state가 잠깐 `IN_GAME`으로 복원되면 기존 대기실 보호 로직이 로비로 이동시킬 수 있었다.

## Decision

- `COOP_INPUT` 전송 시 클라이언트가 생성한 `requestId`를 `coopPendingInputRequestIdsAtom`에 저장한다.
- `COOP_INPUT_CORRECT` 수신 시 응답의 `requestId`가 pending set에 있으면 내 입력 성공으로 판단하고 `coopMyCommandCompletedAtom`을 `true`로 변경한다.
- pending set에 없는 `requestId`는 다른 플레이어의 성공 입력으로 판단하고 내 개인 카드 flip은 유지하지 않는다.
- 개인 할당 카드와 Git shape panel의 개인 명령어 카드는 `coopMyCommandCompletedAtom`을 구독해 `DONE` 뒷면으로 flip한다.
- 그래프 진행도는 로컬 누적이 아니라 `COOP_INPUT_CORRECT.round`, `stepInRound`, `sequence`에서 매번 재계산한다.
- `graphData.nodes[].activateOnRound`와 `activateOnStep`가 있으면 해당 metadata를 우선 사용한다.
- activation metadata가 없는 graph data는 `sequence / 20` 전체 진행률 기준으로 node sequence를 점등하는 fallback을 사용한다.
- `COOP_STARTED.graphData.nodes[].branch`, `activateOnRound`, `activateOnStep`는 optional로 검증한다.
- `graphData.edges[].type`은 누락 또는 미지원 값이면 `solid`로 fallback한다.
- 대기실 private queue와 coop topic에서 들어온 coop runtime 메시지는 `useCoopStore.pendingMessages`에 보관하고, 게임 화면에서 실시간 구독과 같은 handler로 처리한다.
- websocket 구독 callback은 `players`, `playerStats`, `elapsedSeconds`, `sessionId`, `graphData`, pending request set을 직접 dependency로 잡지 않고 ref에서 최신 값을 읽는다. 구독이 불필요하게 재생성되어 브로드캐스트를 놓치는 문제를 방지하기 위함이다.
- `COOP_ORDER_WRONG`, `COOP_INPUT_WRONG`, `COOP_RESET_WRONG`, `COOP_GAME_END`의 `playerId` 계열 필드는 UUID 형식 강제를 제거하고 `string().min(1)`로 검증한다.
- 대기실에서 협력 플레이어의 `isMe` 판정은 `memberId != null`, `nickname != null` 기준으로 처리한다.
- 결과 모달의 "대기실로 돌아가기"는 `/multi/$roomId?fromGameResult=true`로 이동한다. 대기실 복원 중 `IN_GAME` 상태가 내려와도 이 flag가 있으면 로비로 보내지 않는다.

## Why

`requestId` 매칭은 전체 브로드캐스트 환경에서 내 입력 성공 여부를 판정할 수 있는 가장 작은 식별 단위다. 같은 명령어를 여러 플레이어가 입력할 수 있고, 입력 순서가 겹칠 수 있으므로 command text만으로는 본인 입력 성공을 안정적으로 판단하기 어렵다.

그래프 진행도는 모든 클라이언트가 같은 서버 진행 상태에서 같은 결과를 계산해야 한다. 로컬 누적 방식은 한 클라이언트가 이벤트를 하나만 놓쳐도 화면 진행도가 갈라진다. 서버가 내려준 `round`, `stepInRound`, `sequence`를 authoritative source로 사용하면 다음 성공 이벤트 수신 시 모든 클라이언트가 같은 상태로 수렴한다.

게임 화면으로 route 전환되는 경계에서는 대기실 구독과 게임 구독이 동시에 영향을 받는다. private queue로 먼저 들어온 개인 메시지나 topic으로 들어온 런타임 메시지를 버리지 않고 pending queue에 저장해야 명령어 배정과 reset 경고가 안정적으로 동작한다.

결과 모달에서 대기실 복귀는 "방을 나가는" 흐름이 아니다. 같은 방에서 다시 ready 후 재시작할 수 있어야 하므로 `useRoomExitGuard`의 leave 호출을 막고, 대기실 복원 guard도 결과 화면에서 온 경우에는 로비로 이동시키지 않도록 구분했다.

## Caution

- `requestId`는 백엔드가 `COOP_INPUT` 요청 값을 `COOP_INPUT_CORRECT`에 그대로 보존한다는 전제에 의존한다. 백엔드가 requestId를 재생성하거나 누락하면 프론트는 내 입력 성공 여부를 확정할 수 없으므로 `playerId` 또는 `commandText`가 추가로 필요하다.
- graph node의 `sequence`가 중복된 데이터에서는 같은 sequence를 가진 node가 함께 점등될 수 있다. 최신 graph data에서는 `sequence`가 unique해야 한다.
- activation metadata가 없는 graph data fallback은 전체 진행률 기반이라, 기획 의도와 정확히 같은 위치가 아닌 순차 점등으로 보일 수 있다.
- `playerId` 검증을 UUID에서 non-empty string으로 완화했으므로, 형식 검증은 백엔드 contract 또는 상위 room schema에서 책임져야 한다.
- `fromGameResult=true`는 결과 모달 복귀 전용 flag다. 일반 새로고침이나 직접 URL 진입에서 `IN_GAME` 상태를 만난 경우에는 기존처럼 로비로 이동하는 보호 로직을 유지한다.
- `git status`에 mtime만 바뀐 파일이 많이 보일 수 있다. 커밋 시 `git diff --name-only` 또는 실제 diff를 기준으로 파일을 선별해야 한다.
- `docs/10_ARCHITECTURE/REST_API.md`, `docs/10_ARCHITECTURE/WEBSOCKET_API_V4.md` 변경은 API 명세 업데이트 성격이므로 기능 수정 커밋과 분리하는 것이 좋다.

## Test Plan

- `npm run build`
- `npm run lint`
- 난이도 1에서 기존처럼 순서 오류 시 reset 대상 유저에게 `git reset` 안내가 표시되는지 확인한다.
- 난이도 2, 3, 4, 5에서 순서 오류 시 reset 대상 유저에게 `git reset` 안내가 표시되는지 확인한다.
- A 유저가 정답을 입력했을 때 B 유저 화면의 고양이 진행도와 Git graph 점등 상태가 함께 갱신되는지 확인한다.
- `COOP_INPUT_CORRECT.requestId`가 내 pending request set에 있을 때만 개인 할당 카드가 `DONE`으로 flip되는지 확인한다.
- 다른 플레이어의 성공 입력에서는 내 개인 할당 카드가 flip되지 않는지 확인한다.
- 명령어 배정 중 카드 shuffle 이후 `myCommand`가 늦게 도착해도 화면이 빈 상태로 멈추지 않는지 확인한다.
- 게임 종료 후 결과 모달에서 "대기실로 돌아가기"를 누르면 방 목록이 아니라 기존 `/multi/$roomId` 대기실로 복귀하는지 확인한다.

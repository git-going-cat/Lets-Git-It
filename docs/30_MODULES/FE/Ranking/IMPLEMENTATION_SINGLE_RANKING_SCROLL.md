# IMPLEMENTATION_SINGLE_RANKING_SCROLL

## Background / Context

싱글 랭킹 모달은 초기 응답의 `around` 목록을 기준으로 내 순위 주변 랭킹을 보여주도록 구현되어 있었다.

이번 변경에서 해결해야 한 문제는 두 가지였다.

- 이번 주 또는 해당 주차에 플레이 기록이 없는 유저는 `myRank: null`, `around: []` 응답을 받기 때문에 리스트 영역이 비어 보일 수 있다.
- 백엔드 랭킹 스크롤 명세가 단일 `cursor`에서 `afterRank` / `beforeRank` 기반 양방향 스크롤로 확장되었다.

또한 멀티 랭킹은 아직 준비 중이지만, 모달 상단 주차 표시는 싱글 랭킹 API 응답 여부와 무관하게 보여줄 필요가 있었다.

## Decision

랭킹 조회 hook은 싱글 랭킹 모드에서 React Query의 `pageParam`을 `{ cursor, direction }` 형태로 관리한다.

- 아래 방향 스크롤: `afterRank`
- 위 방향 스크롤: `beforeRank`
- 초기 조회: 커서 파라미터 생략

랭킹 리스트는 초기 응답에서 `myRank` 또는 `around`가 있으면 기존처럼 내 주변 랭킹을 기준으로 렌더링한다. 반대로 `myRank === null`이고 `around`가 비어 있으면 `top3`를 리스트 시작 구간으로 사용한다. 이때 자동 포커스는 적용하지 않아 1등부터 자연스럽게 보이도록 했다.

스크롤 이벤트, IntersectionObserver, 상단 페이지 로딩 후 스크롤 위치 보정은 `useRankingListScroll` hook으로 분리했다. `FE_CONVENTION.md`의 컴포넌트 내부 `useEffect` 개수 제한을 지키기 위한 분리다.

멀티 준비중 상태의 주차 표시는 다음 우선순위로 결정한다.

1. 선택된 과거 주차
2. 캐시된 싱글 랭킹 주차
3. 브라우저 현재 날짜로 계산한 주차

## Caution

- 전적 없는 유저의 초기 응답에서 백엔드는 `top3`, `myRank: null`, `around: []`, `nextCursor`, `hasNext`를 내려준다는 계약을 따른다.
- `top3`는 포디움과 리스트에 함께 쓰일 수 있으므로 리스트 병합 시 rank 기준 중복 제거를 유지한다.
- `beforeRank` 스크롤은 싱글 랭킹에서만 사용한다. 멀티 랭킹은 아직 준비중 안내만 표시한다.

## Test Plan

- 전적 있는 유저로 싱글 랭킹 진입 시 내 순위 주변으로 포커스되는지 확인한다.
- 전적 없는 유저로 싱글 랭킹 진입 시 1등부터 리스트가 보이는지 확인한다.
- 아래 스크롤 시 `afterRank` 기반으로 다음 페이지가 붙는지 확인한다.
- 위 스크롤 시 `beforeRank` 기반으로 이전 페이지가 붙고 스크롤 위치가 튀지 않는지 확인한다.
- 멀티 모드 선택 시 준비중 안내와 주차 텍스트가 함께 보이는지 확인한다.

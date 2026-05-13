# TROUBLESHOOTING_랭킹_로딩중_멈춤

### Background / Context
- 위 방향 스크롤 시 TanStack Query가 previous page를 pages 배열 앞에 삽입하면서 oldPageParams[0]이 { cursor, direction: 'previous' }로 교체됨.
- 탭 복귀 시 refetchOnWindowFocus가 발화되면 TanStack Query가 oldPageParams[0]부터 순차 refetch하여 초기 응답(year/month/week 포함) page가 pages 배열에서 사라짐.
- data.pages.find((p) => 'year' in p)가 실패하여 currentWeekInfo = null, displayWeek = null이 되고 "로딩 중..."이 영구 표시됨.
- Network 요청은 모두 200으로 성공하므로 네트워크 문제로 오인하기 쉬운 버그임.

### Decision
- 랭킹은 모달 진입 시점의 스냅샷 기반으로 설계됨. (4.23 프백회의 결정사항)
- 탭 복귀 시 자동 갱신은 설계 의도에 맞지 않으므로 refetchOnWindowFocus: false를 useRanking.ts에 추가.
- 모달을 닫았다 열면 새 스냅샷으로 초기화됨.

### Caution
- rankingWeekCache.ts의 pages.find(isWeekPage) 수정은 이 버그와 무관함. 해당 수정은 별도로 롤백 여부를 검토할 것.
- refetchOnWindowFocus: false 적용으로 탭 복귀 시 랭킹 데이터가 갱신되지 않음. 설계 의도에 부합하나 추후 실시간 반영이 필요해지면 별도 설계 변경 필요.
- 모드 전환(노말 → 이지 → 노말) 시에도 동일한 증상이 발생할 수 있음. handleModeChange에서 대상 mode의 query 캐시를 removeQueries로 제거하여 항상 초기 요청부터 시작하도록 수정함.
- handleModeChange에 mode === activeMode 가드를 추가함.
  동일 모드 재클릭 시 removeQueries가 현재 캐시를 삭제하여
  의도치 않은 화면 초기화가 발생하는 문제를 방지.

# IMPLEMENTATION_COOP_WEEKLY_RANKING

## Background / Context

협력 모드 이번 주 랭킹 조회 API는 기존 싱글/기여도 랭킹과 다른 제약을 가진다.

- 랭킹 단위가 개인이 아니라 팀이다.
- 한 사용자가 같은 주에 여러 팀 기록을 가질 수 있다.
- 랭킹 정렬은 다중 조건이다.
- 결과 저장 직후 실시간 조회가 가능해야 한다.
- 주차 종료 시 Redis 데이터를 RDB로 정산해야 한다.

이번 구현은 위 요구사항을 만족하는 "이번 주차 협력 모드 랭킹 시스템"을 설계하고, 조회 API, 랭킹 등록, 주간 정산, dev 수동 정산 API까지 연결하는 작업이었다.

문서 목적은 두 가지다.

1. 협력 모드 랭킹 설계와 구현 경험을 설명하는 근거 자료
2. 이후 유지보수 시 설계 이유와 운영 제약을 빠르게 복원할 수 있는 기술 문서

---

# 1. 문제 상황

## 협력 랭킹 요구사항

협력 모드 이번 주 랭킹은 게임 한 판이 끝날 때마다 즉시 조회 가능해야 한다.  
협력 게임 하나가 끝나면 랭킹에는 한 건이 등록되며, 등록 기준은 room이 아니라 session이다.

즉, 같은 방에서 여러 판을 하더라도 각 session 결과는 독립적인 랭킹 기록이다.

또한 한 사용자는 같은 주에 여러 팀으로 랭킹에 등장할 수 있다.  
랭킹 전체는 팀 단위로 보여주되, `myRank`는 해당 사용자가 이번 주에 참여한 여러 팀 기록 중 대표 기록 하나를 선택해서 보여줘야 했다.

## 정렬 기준

전체 랭킹 정렬 기준은 다음과 같다.

1. `elapsedTime` 오름차순
2. `totalWrongOrderCount` 오름차순
3. `totalWrongTypeCount` 오름차순
4. 동일 기록이면 먼저 등록된 순

이 조건은 "빠르게 끝낸 팀", "오답이 적은 팀", "먼저 만든 기록"을 우선하는 구조다.

## myRank 정책

`myRank`는 전체 랭킹 정렬과 다른 정책을 가진다.

한 사용자가 여러 팀으로 참여할 수 있기 때문에, "내가 이번 주에 만든 최고 기록 하나"를 선택해야 했다.

`myRank` 선택 기준은 다음과 같다.

1. 누적 플레이 중 최고 기록
2. 동점 시 맵 난이도가 더 높은 것
3. 난이도도 같으면 가장 최근 기록

전체 랭킹 정렬 기준과 `myRank` 선택 기준이 다르기 때문에, 조회 로직에서 두 comparator를 분리해야 했다.

## ms 단위 정확도가 왜 필요했는지

협력 랭킹의 1차 정렬 기준은 `elapsedTime`이다.  
게임 종료 시간 차이가 수 초가 아니라 수백 ms 단위로 갈리는 경우가 있기 때문에, 시간을 초 단위로 반올림하면 실제 순위가 뒤바뀔 수 있다.

예를 들어 61,001ms와 61,900ms는 모두 61초로 보이지만 랭킹에서는 다른 기록이다.  
랭킹이 "클리어 시간" 자체를 핵심 기준으로 삼는 이상, 저장과 정렬 모두 ms 단위를 보존해야 했다.

## 왜 실시간 조회가 필요했는지

이번 주 랭킹은 게임 종료 직후 바로 변한다.  
RDB에서 매번 정렬과 순위 계산을 수행하는 방식은 다음 두 가지 비용이 컸다.

- 조회가 몰릴 때 집계 부하가 커진다.
- top3, 내 순위, 주변 순위를 반복 계산해야 한다.

따라서 이번 주 랭킹은 Redis에서 실시간 조회하고, 주차 종료 후에만 RDB로 정산하는 구조가 필요했다.

---

# 2. 처음 시도한 방식

## composite score 방식 설명

처음에는 싱글 랭킹에서 사용했던 방식처럼 여러 정렬 조건을 하나의 숫자 score로 압축해 Redis ZSet score 기반으로 처리하는 방식을 먼저 검토했다.

예를 들어 아래처럼 자릿수를 배정해 하나의 정수 score를 만드는 방식이다.

```text
score = elapsedTime component
      + wrongOrder component
      + wrongType component
      + registeredAt component
```

Redis ZSet은 score 기준 정렬이 빠르기 때문에, score 하나만 잘 만들면 `ZRANK`, `ZRANGE`로 전체 랭킹과 주변 랭킹을 쉽게 가져올 수 있다.

## Redis ZSet score 기반 설계

이 방식에서는 다음 구조를 상정했다.

- ZSet member: `coopResultId` 또는 팀 식별자
- ZSet score: 다중 조건을 압축한 composite number

이 구조는 겉보기에는 단순하다.

- Redis가 score로 정렬한다.
- 애플리케이션은 member를 읽고 상세 데이터를 조회한다.
- rank 계산과 pagination도 ZSet 기본 명령으로 해결된다.

## 왜 overflow / double precision 문제가 생겼는지

문제는 협력 랭킹 정렬 기준이 모두 "오름차순"이고, 각 조건의 범위가 작지 않다는 점이었다.

- `elapsedTime`: 최대 30분 = 1,800,000ms
- `wrongOrder`: 팀 합산 오입력
- `wrongType`: 팀 합산 오타
- `registeredAt`: 주차 내 등록 순서

이 값을 다중 우선순위로 score 하나에 넣으려면 자릿수 보존이 필요하다.  
그런데 Redis ZSet score는 내부적으로 `double`을 사용한다.

`double`은 약 `2^53` 범위까지만 정수 정밀도를 안정적으로 보존한다.  
정렬 우선순위를 보장하기 위해 큰 단위 multiplier를 계속 곱하면 score 크기가 빠르게 커지고, 결국 하위 자릿수 정밀도가 손실된다.

정밀도가 깨지면 아래 문제가 바로 발생한다.

- ms 차이가 score에서 사라진다.
- 동일한 score로 뭉쳐 의도와 다른 순서가 만들어진다.
- 등록 순서 tie-breaker가 깨진다.

## 왜 ms 정확도와 충돌했는지

ms를 보존하려면 `elapsedTime` 자체가 하위 자릿수까지 정확히 살아 있어야 한다.  
그러나 composite score는 상위 정렬 조건을 위해 큰 multiplier를 쓰는 순간, 등록 시간이나 ms 단위 차이를 표현하는 하위 값이 가장 먼저 손실된다.

즉, score 하나로 모든 우선순위를 담으려는 방식은 "정렬은 쉬워지지만, ms 정확도는 희생된다"는 문제가 있었다.

이 방식은 협력 랭킹 요구사항과 맞지 않았다.

---

# 3. 두 번째 검토안

## app sorting 방식 설명

두 번째로 검토한 방식은 Redis에는 정렬되지 않은 원본 데이터를 저장하고, 애플리케이션에서 조회 시 정렬하는 구조였다.

예를 들어 다음처럼 구성할 수 있다.

- Redis Hash/List/Set에 원본 기록 저장
- 조회 시 전체 또는 필요한 범위를 읽음
- 애플리케이션에서 comparator로 정렬
- top3, myRank, around를 계산

이 방식의 장점은 정렬 조건이 바뀌어도 Redis 구조를 크게 바꾸지 않아도 된다는 점이다.

## Redis와 애플리케이션 역할 분리

이 구조에서 Redis는 저장소 역할만 맡고, 애플리케이션이 아래 작업을 전부 담당한다.

- 전체 정렬
- rank 계산
- top3 추출
- 내 기록 선택
- around 범위 계산
- 스크롤 페이지 계산

구현 자유도는 높지만, 조회 시 계산량이 커진다.

## 왜 pagination / rank 계산이 복잡해졌는지

협력 랭킹 API는 단순히 top N 하나만 반환하는 구조가 아니다.

- 초기 응답: `top3 + myRank + around`
- 스크롤 응답: `afterRank`, `beforeRank` 기반 양방향 페이지네이션

애플리케이션 정렬 방식으로 가면 아래 문제를 직접 해결해야 한다.

- 현재 내 대표 기록이 전체 정렬에서 몇 등인지 계산
- 그 순위를 기준으로 around ±2 범위 계산
- 페이지 커서가 가리키는 rank 이후/이전 레코드 계산
- 실시간으로 데이터가 늘어날 때 중복/누락 없이 스크롤 유지

Redis가 이미 제공하는 `ZRANK`, `ZRANGE`의 이점을 버리고 같은 기능을 애플리케이션에서 다시 구현해야 했다.

## 왜 버렸는지

이 방식은 저장 구조는 단순했지만 조회 복잡도가 너무 높았다.

- 초기 응답이 무거워진다.
- rank 계산이 비싸진다.
- 스크롤 커서 처리 코드가 복잡해진다.
- 데이터 건수가 늘수록 조회 비용이 직접 증가한다.

이번 요구사항은 "실시간 조회"가 핵심이므로, 저장 시점에 정렬 구조를 만들어 조회를 가볍게 하는 쪽이 맞았다.

---

# 4. 최종 설계

## Lexicographical Ordering 설명

최종적으로 선택한 방식은 Redis ZSet의 "score가 같을 때 member 문자열 사전순으로 정렬된다"는 특성을 사용하는 구조다.

핵심은 다음이다.

- ZSet score는 항상 `0`
- 실제 정렬 기준은 member 문자열(`lexString`)
- 원본 데이터는 별도 Hash JSON에서 조회

즉, score 기반 정렬을 버리고 lexicographical ordering 기반 정렬로 전환했다.

## score=0 전략

ZSet score를 모두 `0`으로 고정하면 Redis는 member 문자열 사전순으로 정렬한다.

이 방식의 장점은 명확하다.

- `double` 정밀도 문제를 피할 수 있다.
- 문자열 자릿수만 맞추면 ms 단위까지 정확하게 정렬된다.
- `ZRANGE`, `ZRANK`를 그대로 사용할 수 있다.

정렬 기준이 숫자 하나가 아니라 "고정 폭 문자열"이 되는 셈이다.

## lexString 구조

협력 랭킹용 ZSet member는 아래 형식을 사용한다.

```text
{elapsedTime}:{wrongOrder}:{wrongType}:{registeredAt}:{coopResultId}
```

예시:

```text
000061000:0001:0002:0123456:550e8400-e29b-41d4-a716-446655440000
```

각 필드는 정렬 우선순위 순서대로 배치한다.

1. `elapsedTime`
2. `wrongOrder`
3. `wrongType`
4. `registeredAt`
5. `coopResultId`

마지막 `coopResultId`는 중복 방지와 deterministic order를 위한 값이다.

## zero-padding 이유

문자열 사전순 정렬은 숫자 정렬과 다르다.

예를 들어 문자열 `"100"`은 `"20"`보다 앞에 온다.  
따라서 문자열로 숫자를 비교하려면 자릿수를 고정해야 한다.

그래서 각 필드는 아래처럼 zero-padding을 적용했다.

```java
String.format("%09d:%04d:%04d:%07d:%s",
    elapsedTime, wrongOrder, wrongType, registeredAt, coopResultId)
```

이 설계로 Redis의 문자열 비교 결과가 곧 정렬 결과가 된다.

## lookup Hash가 필요한 이유

`myRank`를 계산할 때는 "내가 선택한 대표 기록"의 `coopResultId`를 전체 랭킹에서 몇 등인지 알아야 한다.

그런데 ZSet은 member 전체 문자열(`lexString`)을 기준으로 rank를 찾는다.  
즉, `coopResultId`만으로는 `ZRANK`를 바로 할 수 없다.

이를 해결하기 위해 별도 lookup Hash를 둔다.

- key: `coopResultId`
- value: `lexString`

이렇게 하면:

1. `myRank` 대표 기록 선택
2. `coopResultId`로 lookup Hash 조회
3. `lexString` 획득
4. `ZRANK`로 전체 순위 계산

흐름이 단순해진다.

## ZSet / Hash 역할 분리

최종 설계는 "정렬용 구조"와 "데이터 조회용 구조"를 분리했다.

- ZSet: 정렬과 rank 계산
- Hash JSON: 실제 랭킹 응답 데이터

하나의 구조에 정렬과 원본 데이터를 모두 넣으려고 하면 구조가 비대해지고 갱신/조회 로직이 서로 얽힌다.  
이번 설계는 역할을 분리해 각 자료구조가 가장 잘하는 일만 맡도록 했다.

## JSON source of truth 구조

실제 랭킹 데이터는 Hash JSON을 source of truth로 사용한다.

예시:

```json
{
  "coopResultId": "550e8400-e29b-41d4-a716-446655440000",
  "teamName": "git masters",
  "mapName": "기초 브랜치",
  "difficulty": 3,
  "elapsedTime": 61000,
  "totalWrongOrderCount": 1,
  "totalWrongTypeCount": 2,
  "registeredAt": 123456,
  "memberIds": ["uuid1", "uuid2", "uuid3", "uuid4"]
}
```

이 구조를 source of truth로 둔 이유는 다음과 같다.

- lexString은 정렬용 포맷일 뿐 응답용 데이터가 아니다.
- 조회 응답은 팀명, 맵명, 난이도, 멤버 목록이 필요하다.
- 정산 시에도 원본 데이터를 그대로 복원해야 한다.

즉, lexString은 "색인", JSON Hash는 "원본 레코드" 역할이다.

## myRank comparator 분리 이유

전체 랭킹은 팀 전체 기록을 비교하는 기준이고, `myRank`는 사용자가 참여한 여러 팀 기록 중 어떤 하나를 대표로 보여줄지 고르는 기준이다.

두 기준은 의도가 다르다.

전체 랭킹 comparator:

```java
Comparator.comparing(CoopRankingData::elapsedTime)
    .thenComparing(CoopRankingData::totalWrongOrderCount)
    .thenComparing(CoopRankingData::totalWrongTypeCount)
    .thenComparing(CoopRankingData::registeredAt);
```

`myRank` comparator:

```java
Comparator.comparing(CoopRankingData::elapsedTime)
    .thenComparing(CoopRankingData::difficulty, reverseOrder())
    .thenComparing(CoopRankingData::registeredAt, reverseOrder());
```

이 둘을 하나로 합치면 `myRank` 정책을 구현할 수 없다.  
따라서 `myRank`는 Hash JSON 기반 comparator로 별도 선택하고, 선택된 결과의 "전체 랭킹 위치"만 다시 ZSet에서 찾는 구조로 나눴다.

---

# 5. Redis 구조

## `ranking:COOP:{week}`

- 자료구조: `ZSet`
- 역할: 전체 랭킹 정렬과 rank 계산
- 저장값: `score = 0`, `member = lexString`

이 키는 top3, around, scroll, rank 계산의 중심이 된다.

사용 이유:

- `ZRANGE`로 순위 범위 조회
- `ZRANK`로 특정 기록의 순위 조회
- 실시간 정렬을 Redis에서 처리

## `ranking:COOP:{week}:data`

- 자료구조: `Hash`
- 역할: 실제 랭킹 데이터 저장
- key: `coopResultId`
- value: JSON

사용 이유:

- 응답 DTO 구성에 필요한 원본 필드를 저장
- 정산 시 Redis에서 RDB로 옮길 원본 데이터 확보
- lexString 파싱 외에 별도 역연산 없이 즉시 사용 가능

## `ranking:COOP:{week}:lookup`

- 자료구조: `Hash`
- 역할: `coopResultId -> lexString` 매핑

사용 이유:

- `myRank` 대표 기록을 선택한 뒤 `ZRANK`를 수행하려면 lexString이 필요함
- ZSet member 문자열을 다시 재조합하지 않고 바로 조회 가능

## `ranking:COOP:{week}:members:{memberId}`

- 자료구조: `Set`
- 역할: 특정 회원이 참여한 모든 `coopResultId` 목록 저장

사용 이유:

- `myRank` 계산 시 "내가 이번 주에 참여한 기록들"만 빠르게 모아야 함
- 전체 랭킹을 훑지 않고도 사용자 참여 기록 집합을 즉시 조회 가능

## `ranking:COOP:{week}:memberKeys`

- 자료구조: `Set`
- 역할: 이번 주 협력 랭킹에 등장한 모든 memberId 목록 저장

사용 이유:

- 정산 후 `members:{memberId}` 키들을 전부 삭제해야 함
- Redis는 prefix delete를 안전하게 지원하지 않으므로, 삭제 대상 목록을 따로 유지하는 편이 단순하고 안전함

## 왜 이렇게 나눴는지

이번 구조는 "한 번 저장할 때는 키가 여러 개 생기지만, 조회와 정산은 필요한 경로만 빠르게 따라갈 수 있게" 설계한 구조다.

- ZSet: 정렬
- Hash data: 원본 데이터
- Hash lookup: 역참조
- Set members: 사용자별 진입점
- Set memberKeys: 정리 작업용 인덱스

조회 복잡도를 저장 구조로 해결한 대표적인 사례다.

---

# 6. 조회 흐름

## top3 조회

초기 응답에서는 먼저 `top3`를 가져온다.

1. `ZRANGE ranking:COOP:{week} 0 2`
2. lexString 목록 획득
3. lexString에서 `coopResultId` 파싱
4. `HMGET ranking:COOP:{week}:data ...`
5. JSON을 `CoopRankingData`로 역직렬화
6. `MemberService.getNicknamesByIds()`로 현재 닉네임 조회
7. 멤버 닉네임을 가나다순 정렬해 응답 생성

닉네임을 Redis에 저장하지 않고 조회 시점 기준으로 DB에서 가져오는 이유는 "이번 주 랭킹"과 "과거 랭킹" 모두 현재 닉네임을 보여주기 위해서다.

## myRank 조회

`myRank`는 다음 순서로 동작한다.

1. `SMEMBERS ranking:COOP:{week}:members:{memberId}`
2. 내가 참여한 `coopResultId` 목록 획득
3. `data` Hash에서 해당 기록들의 JSON 조회
4. `myRank comparator`로 대표 기록 선택
5. `HGET ranking:COOP:{week}:lookup {coopResultId}`
6. `ZRANK ranking:COOP:{week} {lexString}`
7. 0-based rank를 1-based 순위로 변환

`myRank`가 없는 경우:

- 이번 주에 참여 기록이 없으면 `myRank = null`
- `around = []`

## around 조회

`myRank`를 기준으로 주변 순위를 조회한다.

1. `aroundStart = max(0, myRank - 2)`
2. `aroundEnd = min(total - 1, myRank + 2)`
3. `ZRANGE ranking:COOP:{week} aroundStart aroundEnd`
4. top3와 같은 방식으로 lexString -> coopResultId -> JSON 변환

설계 문서 기준대로 `top3`와 `around`는 중복 제거하지 않는다.  
`myRank`가 top3에 들어 있어도 `around`에서 그대로 다시 보여준다.

## afterRank / beforeRank cursor pagination

협력 랭킹 스크롤은 offset이 아니라 rank cursor 기반이다.

- `afterRank`: 아래 방향 스크롤
- `beforeRank`: 위 방향 스크롤

### afterRank

```java
long start = afterRank;
long end = afterRank + size - 1;
ZRANGE ranking:COOP:{week} start end
```

현재 페이지 마지막 rank 다음부터 조회한다.

### beforeRank

```java
long end = beforeRank - 2;
long start = Math.max(0, end - size);
ZRANGE ranking:COOP:{week} start end
```

위 방향 스크롤에서는 경계 판별을 위해 sentinel 포함 조회를 사용한다.  
조회 후 `size`를 초과하면 맨 앞 하나를 제거하고 `hasPrev = true`로 판단한다.

## ZRANGE / ZRANK 흐름

이번 설계에서 Redis 명령 역할은 명확하다.

- `ZRANGE`: topN / around / scroll 범위 조회
- `ZRANK`: 특정 기록의 전체 순위 조회
- `ZCARD`: 전체 개수 조회

정렬 자체는 Redis가 수행하고, 애플리케이션은 JSON을 응답 DTO로 변환하는 역할에 집중한다.

## lexString → coopResultId → JSON 조회 흐름

모든 조회 흐름의 공통 패턴은 다음과 같다.

1. ZSet에서 lexString 조회
2. lexString 파싱으로 `coopResultId` 획득
3. `data` Hash에서 JSON 조회
4. JSON을 응답 DTO로 변환

이 구조 덕분에 ZSet member에 팀명, 맵명, 멤버 정보 같은 가변 데이터를 억지로 넣지 않아도 된다.

---

# 7. 랭킹 등록 흐름

## 협력 게임 종료

협력 게임이 끝나면 다음 정보를 모은다.

- `elapsedTime`
- `teamName`
- `mapName`
- `difficulty`
- 팀 전체 `wrongType`, `wrongOrder`
- 참여 memberIds

이 데이터는 session 단위 결과다.

## CoopResult 저장

게임 종료 시 먼저 DB에 아래를 저장한다.

1. `CoopResult`
2. `CoopResultMember`

이 시점에서 `coopResultId`가 생성된다.

## Redis 랭킹 등록

DB 저장이 완료되면 협력 랭킹 Redis 구조에 아래를 등록한다.

- `ZADD ranking:COOP:{week} 0 {lexString}`
- `HSET ranking:COOP:{week}:data {coopResultId} {JSON}`
- `HSET ranking:COOP:{week}:lookup {coopResultId} {lexString}`
- `SADD ranking:COOP:{week}:members:{memberId} {coopResultId}`
- `SADD ranking:COOP:{week}:memberKeys {memberId}`

## AFTER_COMMIT 처리 이유

협력 랭킹 등록은 DB 결과 저장 이후에만 의미가 있다.

만약 DB 저장이 실패했는데 Redis에 먼저 랭킹이 등록되면 다음 문제가 생긴다.

- 조회 API에서는 랭킹이 보인다.
- 하지만 실제 게임 결과 원본(`CoopResult`)은 없다.
- 정산 시 RDB 이력과의 정합성이 깨진다.

그래서 "DB commit 이후 Redis 등록"을 강제했다.  
현재 구현은 게임 종료 후 DB 저장을 먼저 끝내고 랭킹 등록을 수행하는 구조를 따른다.

## session 기반 등록 이유

협력 랭킹은 room 기반이 아니라 session 기반으로 등록한다.

이유는 다음과 같다.

- 같은 방에서 여러 번 플레이해도 각 게임 결과는 별도 기록이다.
- 주간 랭킹은 "팀이 어떤 방에서 플레이했는가"보다 "어떤 게임 결과를 만들었는가"가 중요하다.
- 정산 시점에도 결과 단위를 `coopResultId`로 유지하는 편이 자연스럽다.

---

# 8. 주간 정산 구조

## 월요일 00:00 스케줄러

협력 랭킹은 주간 실시간 조회는 Redis에서 처리하고, 주차 종료 시점에는 RDB에 정산한다.

정산 스케줄러는 매주 월요일 00:00 KST에 실행된다.

- 실행 시점은 월요일 00:00
- 정산 대상은 "방금 끝난 주", 즉 `LocalDate.now(Asia/Seoul).minusDays(1)` 기준 주차

## Redis → RDB 저장 흐름

정산 흐름은 다음과 같다.

1. 대상 주차의 ZSet 전체 개수 조회
2. 이미 정산된 주차인지 확인
3. ZSet을 chunk 단위로 조회
4. lexString 파싱
5. `data` Hash에서 JSON 조회
6. `coop_ranking` 엔티티 생성
7. DB 저장
8. 트랜잭션 commit 이후 Redis 키 삭제

## chunk 조회

전체 랭킹을 한 번에 메모리로 가져오지 않고 chunk 단위로 조회한다.

```java
long end = Math.min(offset + CHUNK_SIZE - 1, total - 1);
ZRANGE ranking:COOP:{week} offset end
```

이 방식을 택한 이유:

- 주차별 데이터가 커져도 한 번에 큰 메모리를 잡지 않음
- 저장 중간 로그를 남기기 쉬움
- 장애 분석 시 어느 구간에서 실패했는지 추적 가능

## coop_ranking 저장

정산 시 저장되는 값은 Redis Hash JSON을 source of truth로 사용한다.

즉, 정산 로직은 ZSet 점수나 lexString을 역산해 의미를 복원하지 않는다.

- 정렬 순서는 ZSet에서 가져온 순서 사용
- 원본 필드는 JSON Hash 값 사용
- 저장 rank는 `offset + index + 1`

이 구조 덕분에 정산 로직은 "정렬 결과"와 "원본 데이터"를 분리해 안전하게 사용할 수 있다.

## countByModeAndWeek 기반 중복 정산 방어

협력 정산도 중복 실행 가능성을 고려해야 한다.

기존 경쟁 모드 정산과 같은 운영 제약을 따라, 해당 주차에 이미 정산 데이터가 있으면 중복 저장은 하지 않는다.

협력 랭킹에서는 `countByWeek(week)`로 같은 역할을 수행한다.

의도는 다음과 같다.

- DB 저장은 한 번만 수행
- 과거 장애로 Redis 키만 남은 경우에는 정산 중복 없이 키 정리 가능

문구는 `countByModeAndWeek`와 같은 방어 전략을 협력 랭킹에도 동일하게 적용한 것이다.

## afterCommit 이후 Redis 삭제

정산에서 가장 중요한 운영 규칙은 이것이다.

> DB에 저장되지 않으면 Redis 키는 삭제하지 않는다.

이를 보장하기 위해 Redis 삭제는 `afterCommit`에서만 수행한다.

즉:

- DB 저장 성공
- 트랜잭션 commit 완료
- 그 이후 Redis 삭제

순서를 지켜야 한다.

## Redis 삭제 실패/DB 저장 실패 시나리오 대응

### DB 저장 실패

DB 저장이 실패하면 트랜잭션은 롤백된다.  
이 경우 `afterCommit`은 실행되지 않으므로 Redis 키는 그대로 남는다.

이 설계 덕분에 정산을 다시 시도할 수 있다.

### Redis 삭제 실패

DB commit은 끝났는데 Redis 삭제만 실패할 수 있다.

이 경우 데이터 유실은 발생하지 않는다.

- DB에는 이미 정산 데이터가 있다.
- Redis 키가 남아 있을 뿐이다.
- 다음 수동 정산/재실행 시 `already settled` 경로로 키만 정리할 수 있다.

이 trade-off는 "중복 정리 가능성"을 허용하고 "데이터 유실"을 막는 선택이다.

## dev 수동 정산 API 구현

운영 전 검증과 장애 대응을 위해 dev 환경에는 수동 정산 API도 추가했다.

- `POST /api/dev/ranking/coop/settle?week=YYYY-MM-W`

이 API는 스케줄러와 동일한 정산 흐름을 수동으로 실행한다.

---

# 9. 테스트 및 검증

## comparator 테스트

협력 랭킹 구현에서는 comparator가 두 개다.

- 전체 랭킹 comparator
- `myRank` 선택 comparator

테스트에서는 다음을 검증했다.

- 전체 랭킹 정렬이 `elapsedTime -> wrongOrder -> wrongType -> registeredAt` 순서인지
- `myRank` 선택이 `elapsedTime -> difficulty desc -> registeredAt desc` 순서인지

## lex ordering 검증

lexString 설계에서 중요한 것은 zero-padding과 필드 순서다.

테스트에서는 다음을 검증했다.

- 같은 형식의 lexString이 의도한 정렬 순서를 만드는지
- `coopResultId` 파싱이 안정적으로 되는지
- ZSet에서 가져온 순서가 rank 계산과 일치하는지

## pagination 검증

조회 테스트에서는 다음을 확인했다.

- 초기 응답에서 `top3`, `myRank`, `around`가 올바르게 조합되는지
- `afterRank` 스크롤이 다음 범위를 정확히 가져오는지
- `beforeRank` 스크롤이 sentinel 포함 조회 후 `hasPrev`를 올바르게 계산하는지
- `prevCursor`, `nextCursor`, `hasPrev`, `hasNext`가 경계에서 맞는지

## afterCommit 검증

정산 테스트에서는 Redis 삭제가 트랜잭션 commit 전에 실행되지 않는지 검증했다.

검증 포인트:

- `saveAll()` 이후에도 즉시 삭제되지 않음
- `TransactionSynchronization.afterCommit()` 호출 후에만 삭제 실행
- 데이터 누락으로 예외 발생 시 synchronization 자체가 등록되지 않음

이 테스트는 "DB 저장 실패 시 Redis 키 보존"이라는 운영 규칙을 코드 수준에서 확인하는 역할을 한다.

## 이미 정산된 주차 처리 검증

정산 테스트에서는 이미 DB 정산 데이터가 있는 경우도 검증했다.

- DB 재저장은 하지 않음
- commit 이후 Redis 키만 삭제

이 케이스는 "과거 정산 성공 + Redis 삭제 실패" 상황을 복구하는 경로다.

---

# 10. 설계하면서 얻은 인사이트

## 저장 시 정렬 구조를 설계하는 방식

이번 작업에서 가장 큰 전환점은 "조회 때 정렬할 것인가, 저장 때 정렬 구조를 만들 것인가"를 명확히 나눈 점이다.

협력 랭킹은 조회 패턴이 분명했다.

- top3
- 내 대표 기록
- 내 주변 순위
- 양방향 스크롤

이 요구사항은 저장 구조를 잘 설계하면 조회 비용을 크게 줄일 수 있었다.

## 조회 복잡도를 저장 구조로 해결한 경험

`members:{memberId}`와 `lookup` Hash는 조회 시 불편함을 저장 시점에 해소하기 위해 추가한 구조다.

- `members:{memberId}`가 없으면 `myRank` 계산을 위해 전체 랭킹을 뒤져야 한다.
- `lookup`이 없으면 `coopResultId`에서 rank를 찾기 위해 lexString을 재구성하거나 ZSet 전체를 순회해야 한다.

즉, 조회 복잡도를 저장 구조 설계로 줄였다.

## Redis 자료구조 특성을 실제 설계에 활용한 경험

이번 설계는 Redis를 캐시처럼 두는 수준이 아니라, 자료구조의 성질을 직접 활용한 작업이었다.

- ZSet: 정렬과 순위 계산
- Hash: 원본 데이터 저장
- Set: 역방향 조회와 삭제 대상 관리

특히 `score=0 + lexicographical ordering` 전략은 Redis ZSet을 "정수 score 정렬"이 아니라 "고정 폭 문자열 정렬 인덱스"로 활용한 사례다.

## 정합성과 운영 안정성을 설계 단계에서 고려한 경험

이 설계에서 가장 중요한 운영 규칙은 다음이다.

- DB commit 이후 Redis 등록
- 정산 시 DB commit 이후 Redis 삭제
- 정산 실패 시 Redis 데이터 보존
- Redis 삭제 실패는 재시도로 복구 가능하게 설계

즉, 이번 작업은 조회 기능 구현에 그치지 않고 "실패했을 때 어떤 데이터가 남아야 하는가"까지 설계 단계에서 결정한 경험이었다.

---

## 구현 요약

- 협력 모드 이번 주 랭킹 조회 API 구현
- Redis Sorted Set 기반 실시간 조회
- 팀 단위 랭킹 구조 적용
- `top3 / myRank / around` 조회 구현
- 커서 기반 스크롤 조회 구현
- 협력 게임 종료 후 랭킹 등록 연결
- 주간 정산 스케줄러 구현
- Redis → RDB 정산 구현
- `afterCommit` 이후 Redis 삭제 적용
- dev 수동 정산 API 구현
- JSON Hash를 source of truth로 사용
- nickname은 조회 시점 기준으로 조회
- 전체 랭킹 comparator와 `myRank` comparator 분리

## Conclusion

협력 모드 이번 주 랭킹은 "다중 정렬 조건을 가진 팀 단위 실시간 랭킹"이라는 요구사항 때문에, 저장 구조 자체를 조회 패턴에 맞게 설계해야 했다.

최종적으로 선택한 `score=0 + lexString + Hash source of truth` 구조는 다음 문제를 동시에 해결했다.

- ms 단위 정확도 보존
- Redis `double` 정밀도 문제 회피
- rank 계산과 pagination 단순화
- `myRank` 대표 기록 선택 지원
- 정산 시 데이터 유실 방지

이 설계는 Redis를 임시 저장소로 두는 수준이 아니라, 정렬 인덱스와 원본 데이터를 분리한 운영 가능한 랭킹 시스템으로 구현한 사례다.

# 닉네임 중복 경쟁 상황 처리

## 배경

회원 닉네임 저장/수정은 아래 순서로 동작한다.

1. 닉네임 중복 조회
2. 엔티티 닉네임 변경
3. 트랜잭션 커밋

평상시 단일 요청에서는 문제가 없지만, 동시에 같은 닉네임으로 여러 요청이 들어오면
사전 중복 검사만으로는 경쟁 상황을 막을 수 없다.

---

## 문제 상황

예를 들어 두 요청이 동시에 `dobby`로 닉네임을 저장하거나 수정하는 경우:

1. A 요청: `existsByNickname("dobby")` → `false`
2. B 요청: `existsByNickname("dobby")` → `false`
3. A 요청: 닉네임 변경 후 저장 성공
4. B 요청: 저장 시점에 DB unique 제약 `uq_member_nickname` 위반

즉, 사전 조회는 사용자 경험 개선용 검증일 뿐이고,
최종 중복 방지는 DB unique 제약이 담당한다.

---

## 기존 위험

기존 구현은 중복 여부를 먼저 확인한 뒤 엔티티 값만 변경했다.

```java
validateNicknameDuplicate(nickname);
member.updateNickname(nickname);
```

이 구조에서는 경쟁 상황에서 발생하는 `DataIntegrityViolationException`이
`BusinessException(NICKNAME_DUPLICATE)`로 변환되지 않으면
정상적인 비즈니스 충돌이 500 서버 에러로 내려갈 수 있다.

중복 닉네임은 서버 장애가 아니라 클라이언트가 처리 가능한 비즈니스 예외이므로,
409 응답으로 변환되어야 한다.

---

## 해결 방안 후보

### 1. 사전 중복 조회만 유지

- 장점: 구현이 단순하다.
- 단점: 동시 요청 경쟁 상황을 처리하지 못한다.

### 2. 전역 예외 핸들러에서 unique 제약 이름 매핑

- 예: `uq_member_nickname`이면 `NICKNAME_DUPLICATE`로 변환
- 장점: 여러 저장 경로에서 재사용 가능하다.
- 단점: 예외 원인을 제약 이름 문자열에 의존하게 되고, DB/드라이버별 메시지 차이를 신경 써야 한다.

### 3. 서비스 단에서 flush 후 예외 변환

- 닉네임 변경 직후 `flush()`를 호출해 unique 위반을 현재 유스케이스 안에서 즉시 발생시킨다.
- `DataIntegrityViolationException`을 `BusinessException(NICKNAME_DUPLICATE)`로 변환한다.

---

## 선택한 방식

현재는 **서비스 단에서 `flush()` 후 예외를 변환하는 방식**을 선택했다.

예시:

```java
try {
    member.updateNickname(nickname);
    memberRepository.flush();
} catch (DataIntegrityViolationException e) {
    throw new BusinessException(NICKNAME_DUPLICATE);
}
```

닉네임 저장 시에는 온보딩 상태 변경도 함께 처리한 뒤 동일하게 `flush()`를 수행한다.

---

## 이 방식을 선택한 이유

### 1. 원인과 대응이 같은 유스케이스 안에 있다

닉네임 저장/수정에서만 필요한 정책을 그 서비스 안에서 바로 처리할 수 있다.
코드를 읽을 때도 “이 유스케이스는 DB unique 충돌을 비즈니스 예외로 변환한다”는 의도가 명확하다.

### 2. 전역 핸들러보다 의존성이 적다

전역 핸들러에서 제약 이름을 해석하는 방식은 확장성은 있지만,
제약 이름 문자열과 DB 예외 메시지 포맷에 대한 의존이 생긴다.
현재 요구사항은 닉네임 충돌 한 건이므로 서비스 단 처리로 충분하다.

### 3. 사전 조회와 최종 방어선을 모두 유지할 수 있다

- 사전 조회: 일반적인 중복 케이스를 빠르게 차단
- DB unique 제약 + flush: 동시 요청 경쟁 상황까지 최종 방어

두 단계를 함께 사용하면 UX와 정합성을 모두 확보할 수 있다.

---

## 정리

- `existsByNickname()`는 사용자 친화적인 사전 검증이다.
- 동시 요청 경쟁 상황은 사전 검증만으로 막을 수 없다.
- 최종 중복 방지는 DB unique 제약이 담당한다.
- DB 제약 위반은 `NICKNAME_DUPLICATE` 비즈니스 예외로 변환해야 한다.
- 현재 Member 도메인에서는 서비스 단 `flush()` + 예외 변환 방식을 사용한다.

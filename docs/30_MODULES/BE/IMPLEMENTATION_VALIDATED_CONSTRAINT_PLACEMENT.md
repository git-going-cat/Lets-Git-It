# IMPLEMENTATION_VALIDATED_CONSTRAINT_PLACEMENT

## Background / Context

`@Validated`가 선언된 Controller가 ControllerDocs 인터페이스를 구현하는 구조에서, 파라미터 제약 어노테이션(`@Min`, `@Max`, `@NotBlank`, `@Size`, `@Pattern` 등)을 구현체(Controller)에 선언하면 Bean Validation 스펙 위반이 발생한다.

`RankingController`에서 `@Min`/`@Max`를 구현체에만 선언한 상태로 빌드가 간헐적으로 깨지는 문제가 발견됐다. 조사 과정에서 `MemberController`도 동일 구조임이 확인됐고, 두 케이스의 동작 차이도 분석했다.

---

## Decision

파라미터 제약 어노테이션은 **ControllerDocs 인터페이스에만 선언**한다. 구현체(Controller)에는 선언하지 않는다.

### 적용 범위

| 파일 | 변경 내용 |
|------|----------|
| `RankingControllerDocs.java` | `getSingleRanking`, `getSingleRankingHistory` 파라미터에 `@Min`/`@Max` 추가 |
| `RankingController.java` | 동일 메서드에서 `@Min`/`@Max` 및 관련 import 제거 |
| `MemberControllerDocs.java` | `checkNickname` 파라미터에 `@NotBlank`/`@Size`/`@Pattern` 유지 (기존 선언) |
| `MemberController.java` | `checkNickname`에서 `@NotBlank`/`@Size`/`@Pattern` 및 관련 import 제거 |

---

## Why

### Bean Validation 스펙 규칙

Bean Validation 스펙은 구현체 메서드에서 파라미터 제약을 추가하거나 재정의하는 것을 금지한다. Hibernate Validator는 검증 시점에 타입 계층 전체를 탐색해 제약을 수집하며, 인터페이스와 구현체의 제약 집합이 충돌하면 `ConstraintDeclarationException`을 던진다.

### AOP와 인터페이스 단독 선언

`MethodValidationInterceptor`가 `ExecutableValidator.validateParameters(target, method, args)`를 호출할 때, Hibernate Validator는 `target`의 실제 클래스를 기준으로 계층을 올라가며 인터페이스의 제약 어노테이션까지 수집한다. 따라서 인터페이스에만 제약이 있어도 AOP가 정상적으로 동작한다.

### 인터페이스 단독 vs 중복 선언

| | 인터페이스 단독 | 중복 선언 |
|--|----------------|----------|
| 제약 변경 시 | 한 곳만 수정 | 두 곳 동기화 필요 |
| 동기화 실패 시 | 해당 없음 | `ConstraintDeclarationException` |
| 스펙 준수 | 준수 | 위반 |

---

## Caution

### 케이스별 Hibernate Validator 동작 차이

두 케이스의 증상이 달랐던 이유는 다음과 같다.

**RankingController — 빌드 깨짐**

`RankingControllerDocs`에 `@Min`/`@Max`가 없는 상태에서 `RankingController`에만 선언했다. Hibernate Validator는 이를 "subtype이 supertype에 없는 사전조건을 추가했다"로 판단해 `ConstraintDeclarationException`을 던진다.

**MemberController — 빌드 정상**

`MemberControllerDocs`와 `MemberController` 양쪽에 동일한 `@NotBlank`/`@Size`/`@Pattern`이 선언되어 있었다. Hibernate Validator는 인터페이스 제약 집합과 구현체 제약 집합을 비교해 **충돌**이 있을 때 예외를 던지는 방식으로 구현되어 있다. 두 집합이 동일하면 충돌이 없으므로 예외가 발생하지 않는다.

스펙상으로는 양쪽 모두 위반이지만, Hibernate Validator의 충돌 감지 방식으로 인해 동일 재선언은 예외가 발생하지 않는다. 그러나 이후 어느 한쪽만 제약이 변경되면 즉시 예외가 발생하므로, 중복 선언은 잠재적 시한폭탄이다.

### `@Validated` 위치

`@Validated`는 Spring의 메서드 레벨 검증을 활성화하는 트리거 어노테이션으로, 파라미터 제약 어노테이션과 다르다. Spring AOP가 concrete class에서 읽으므로 구현체(Controller) 클래스 레벨에 유지한다. 인터페이스로 옮기지 않는다.

---

## Test Plan

- `afterRank=0` 요청 시 400 응답 확인 (`@Min(1)` 동작)
- `size=0` 요청 시 400 응답 확인 (`@Min(1)` 동작)
- `size=101` 요청 시 400 응답 확인 (`@Max(100)` 동작)
- `nickname=""` 요청 시 400 응답 확인 (`@NotBlank` 동작)
- `nickname="a"` 요청 시 400 응답 확인 (`@Size(min=2)` 동작)
- `nickname="닉네임!"` 요청 시 400 응답 확인 (`@Pattern` 동작)
- 정상 파라미터 요청 시 검증 통과 확인

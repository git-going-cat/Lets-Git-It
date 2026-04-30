# Let's Git it 프로젝트 구조 가이드 (Project Structure Guide)

<role_definition>
이 문서는 Let's Git it 백엔드의 아키텍처와 패키지 구조를 정의합니다. 모든 백엔드 개발자는 이 구조를 준수하여 일관된 코드베이스를 유지해야 합니다.

**적용 대상:**
- Spring Boot 백엔드 개발자
- 신규 도메인 설계 및 구현
- 코드 리뷰 시 구조 준수 검증
</role_definition>

---

## 목차
1. [아키텍처 철학](#1-아키텍처-철학)
2. [최상위 구조](#2-최상위-구조)
3. [전역 모듈 (Global)](#3-전역-모듈-global)
4. [도메인 모듈 (Domain)](#4-도메인-모듈-domain)
5. [의존성 규칙](#5-의존성-규칙)
6. [구현 현황](#6-구현-현황)

---

<critical_rules priority="highest">
## Critical Rules - 프로젝트 구조 필수 규칙

<rule id="1" category="architecture" severity="critical">
## 1. 아키텍처 철학

**RULE**: Let's Git it은 **도메인 단위 구조 + Service 인터페이스/구현체 분리 + Repository DIP 패턴**을 기본으로 합니다.

**WHY**:
- **관심사 분리(SoC)**: 도메인 로직과 데이터 접근을 분리하여 변경 영향 최소화
- **기술 독립성**: Service가 JPA/QueryDSL 등 특정 기술에 종속되지 않음
- **확장성**: 도메인별 독립성이 높아 병렬 개발과 유지보수 용이
- **가독성**: 패키지 구조가 단순해 코드 탐색 비용 감소
</rule>

---

<rule id="2" category="structure" severity="high">
## 2. 최상위 구조

**RULE**: 기본 패키지 경로는 `com.gitcat.letsgitit`이며, 전역 공통 모듈(`global`)과 도메인별 모듈(`domain`)로 분리합니다.

```text
com.gitcat.letsgitit
├── LetsgititApplication.java
├── global/                 # 전역 공통 모듈
└── domain/                 # 도메인별 비즈니스 모듈
```

**프로젝트 루트 구조**:
```text
project-root/
├── .gitlab/
│   └── merge_request_templates/
├── BE/
│   └── src/main/java/com/gitcat/letsgitit/
├── FE/
├── docker/
├── .gitignore
└── README.md
```
</rule>

---

<rule id="3" category="global" severity="medium">
## 3. 전역 모듈 (Global)

**RULE**: 모든 도메인에서 공유하는 공통 요소는 `global` 패키지에 위치합니다.

```text
com.gitcat.letsgitit.global
├── config/                         # 전역 설정
│   ├── SwaggerConfig.java
│   ├── RedisConfig.java
│   ├── WebSocketConfig.java
│   ├── SecurityConfig.java
│   └── ActuatorConfig.java
├── entity/
│   └── BaseEntity.java             # createdAt, updatedAt 자동 관리
├── exception/                      # 예외 처리
│   ├── CustomException.java
│   ├── ErrorCode.java
│   ├── ErrorResponse.java
│   └── GlobalExceptionHandler.java
├── response/                       # 응답 래퍼
│   └── ApiResponse.java            # ApiResponse<T> (ok, create 메서드)
├── security/                       # JWT 인증/인가
│   ├── JwtAuthenticationFilter.java
│   ├── JwtProvider.java
│   ├── CustomUserDetails.java
│   └── CustomUserDetailsService.java
├── websocket/
│   └── WebSocketSessionManager.java
└── enums/                          # 전역 Enum
    ├── Provider.java               # LOCAL / GOOGLE
    ├── Difficulty.java             # EASY / NORMAL / HARD
    ├── GameMode.java               # SINGLE / TIME_ATTACK / SPEED_RUN / COOP
    ├── CommandType.java            # CREATE / MERGE / COMMON
    ├── MapDifficulty.java          # MAP_1 ~ MAP_5
    ├── GitProficiency.java         # NEVER_HEARD / HEARD_ONLY / LEARNED / PERSONAL / TEAM
    └── OnboardingStatus.java       # NONE / NICKNAME_SET_DONE / TUTORIAL_DONE
```

### 구현된 클래스 상세

| 클래스 | 위치 | 설명 |
|--------|------|------|
| `BaseEntity` | `global.entity` | `createdAt`, `updatedAt` 자동 관리 |
| `ApiResponse<T>` | `global.response` | API 응답 래퍼 (ok, create 메서드) |
| `CustomException` | `global.exception` | 비즈니스 예외 처리 클래스 |
| `ErrorResponse` | `global.exception` | 에러 응답 record |
| `ErrorCode` | `global.exception` | 에러 코드 enum |
| `GlobalExceptionHandler` | `global.exception` | 전역 예외 핸들러 (`@RestControllerAdvice`) |
</rule>

---

<rule id="4" category="domain" severity="critical">
## 4. 도메인 모듈 (Domain)

**RULE**: 각 도메인은 독립적인 패키지로 구성하며, 내부는 `controller`, `service`, `dto`, `entity`, `repository`, `exception`을 기본으로 합니다. 필요에 따라 `constants`, `message` 디렉토리를 추가합니다.

**구조 패턴**: `com.gitcat.letsgitit.domain.{domainName}`

```text
{domainName}/
├── controller/
│   ├── {Domain}Controller.java         # @RestController (REST API)
│   ├── {Domain}ControllerDocs.java     # Swagger 어노테이션 분리
│   └── {Domain}Handler.java            # @Controller (WebSocket, 해당 도메인만)
├── service/
│   ├── {Domain}Service.java            # Interface
│   └── {Domain}ServiceImpl.java        # Implementation
├── dto/
│   ├── request/
│   │   └── {Action}Request.java        # record
│   └── response/
│       └── {Domain}Response.java       # record
├── entity/                             # (선택, DB 연동 도메인만)
│   └── {Domain}.java                   # Entity (정적 팩토리 메서드)
├── repository/                         # (선택, DB/Redis 연동 도메인만)
│   ├── {Domain}Repository.java         # Interface (Service가 의존)
│   ├── {Domain}RepositoryImpl.java     # Class (포트 구현체)
│   ├── {Domain}JpaRepository.java      # Interface (Spring Data JPA)
│   └── {Domain}DslRepository.java      # Class (QueryDSL, 필요 시)
├── constants/                          # (선택, Redis 키 관리)
│   └── {Domain}RedisKeys.java
├── message/                            # (선택, WebSocket 메시지 DTO)
│   └── {Message}.java
└── exception/                          # 도메인별 커스텀 예외
    └── {Domain}Exception.java
```

<example type="correct">
```text
# ✅ Member 도메인 예시
src/main/java/com/gitcat/letsgitit/domain/member/
├── controller/
│   ├── MemberController.java
│   └── MemberControllerDocs.java
├── service/
│   ├── MemberService.java
│   └── MemberServiceImpl.java
├── dto/
│   ├── request/
│   │   ├── NicknameSaveRequest.java
│   │   └── NicknameUpdateRequest.java
│   └── response/
│       └── MemberInfoResponse.java
├── entity/
│   └── Member.java
├── repository/
│   ├── MemberRepository.java
│   ├── MemberRepositoryImpl.java
│   ├── MemberJpaRepository.java
│   └── MemberDslRepository.java
└── exception/
    └── MemberNotFoundException.java
```

```text
# ✅ Room 도메인 예시 (WebSocket + Redis + 메시지 포함)
src/main/java/com/gitcat/letsgitit/domain/room/
├── controller/
│   ├── RoomController.java         # @RestController, REST API
│   └── RoomHandler.java            # @Controller, WebSocket
├── service/
│   ├── RoomService.java
│   ├── RoomServiceImpl.java
│   ├── RoomLobbyService.java
│   └── RoomLobbyServiceImpl.java
├── dto/
│   ├── request/
│   │   └── CreateRoomRequest.java
│   └── response/
│       └── RoomListResponse.java
├── repository/
│   └── RoomRedisRepository.java
├── message/
│   ├── ReadyMessage.java
│   └── GameStartMessage.java
├── constants/
│   └── RoomRedisKeys.java
└── exception/
    ├── RoomNotFoundException.java
    └── RoomFullException.java
```
</example>
</rule>

---

<rule id="5" category="dependency" severity="critical">
## 5. 의존성 규칙

**RULE**: 패키지 간 의존성은 단방향이며, 도메인 계층은 인프라 계층에 직접 의존하지 않습니다.

**의존성 방향**:
```
controller → service(interface) → repository(interface)
controller → dto
service    → entity
repository → entity
global      (no dependency on domain)
domain.exception extends global.exception.CustomException
```

**규칙 상세**:
1. `controller`는 `service` 인터페이스에만 의존
2. `service` 구현체는 `entity`와 `repository` 인터페이스를 참조 가능
3. `entity`는 비즈니스 로직 중심으로 구성하고, repository에 의존하지 않음
4. `repository` 구현체는 `JpaRepository` 및 `DslRepository`를 조합
5. `global`은 `domain`에 의존하지 않음
6. 도메인별 예외는 `global.exception.CustomException`을 상속
</rule>

</critical_rules>

---

## 6. 구현 현황

현재 `com.gitcat.letsgitit.domain` 하위에 존재하는 도메인 모듈입니다.

### 6.1. 도메인 현황

| 도메인 | entity | repository | service | controller | exception |
|--------|--------|------------|---------|------------|-----------|
| `auth` | - | ✅ (Redis) | ✅ | ✅ | ✅ |
| `member` | ✅ Member | ✅ | ✅ | ✅ | ✅ |
| `room` | - | ✅ (Redis) | ✅ | ✅ (REST+WS) | ✅ |
| `single` | ✅ SingleResult | ✅ (JPA+Redis) | ✅ | ✅ | ✅ |
| `competitive` | ✅ 4개 | ✅ (JPA+Redis) | ✅ | ✅ (REST+WS) | ✅ |
| `coop` | ✅ 5개 | ✅ (JPA+Redis) | ✅ | ✅ (REST+WS) | ✅ |
| `ranking` | ✅ 3개 | ✅ | ✅ | ✅ | - |
| `record` | ✅ 2개 | ✅ | ✅ | - | - |
| `command` | ✅ 4개 | ✅ | ✅ | - | - |
| `dictionary` | ✅ 2개 | ✅ | ✅ | ✅ | - |
| `tutorial` | ✅ 2개 | ✅ | ✅ | ✅ | - |

### 6.2. 신규 도메인 작성 가이드

신규 도메인을 작성할 때는 아래 순서를 따릅니다:

1. `entity/` → Entity 클래스 작성 (정적 팩토리 메서드 패턴)
2. `repository/` → Repository 인터페이스 + 구현체 작성 (4-file DIP)
3. `dto/` → Request/Response record 작성
4. `service/` → Service 인터페이스 + 구현체 작성
5. `controller/` → ControllerDocs 인터페이스 → Controller 구현
6. `exception/` → 도메인별 커스텀 예외 작성 (CustomException 상속)

---

**문서 버전**: 2.0
**최종 업데이트**: 2026-04-30

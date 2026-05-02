# Let's Git it 백엔드 코딩 표준 (Backend Coding Standard)

<role_definition>
이 문서는 Let's Git it 백엔드 개발자를 위한 필수 코딩 표준입니다. 모든 백엔드 개발자는 이 규칙을 준수해야 하며, 코드 리뷰 시 이 표준을 기준으로 평가됩니다.

**적용 대상:**
- Let's Git it 백엔드 코드 전반 (Controller/Service/Repository/Entity/Test 등)
- 기준 기술 스택: Spring Boot 3.5.13, Java 17, MySQL 8.0, Redis 7.x (Redisson), Spring Data JPA / Hibernate, QueryDSL, WebSocket (STOMP), Swagger (SpringDoc)
  </role_definition>

---

## 목차
1. [엔티티 설계 규칙](#1-엔티티-설계-규칙)
2. [DB 스키마 설계 규칙](#2-db-스키마-설계-규칙)
3. [Repository 계층 규칙](#3-repository-계층-규칙)
4. [Service 계층 규칙](#4-service-계층-규칙)
5. [DTO 규칙](#5-dto-규칙)
6. [Response 및 예외 처리](#6-response-및-예외-처리)
7. [테스트 코드 컨벤션](#7-테스트-코드-컨벤션)
8. [코드 포맷터 및 스타일](#8-코드-포맷터-및-스타일)
9. [로깅 규칙](#9-로깅-규칙)
10. [API 문서화](#10-api-문서화-swagger)
11. [WebSocket 규칙](#11-websocket-stomp-규칙)
12. [Redis 키 네이밍 규칙](#12-redis-키-네이밍-규칙)
13. [프로젝트 특화 규칙](#프로젝트-특화-규칙)

---

## Critical Rules - 반드시 준수해야 하는 핵심 규칙

### 1. 엔티티 설계 규칙

**RULE**: 엔티티는 정적 팩토리 메서드 패턴을 사용하며, JPA 기본 생성자는 `protected`로 제한합니다.

**구현 패턴**

    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @Entity
    @Table(
        name = "competitive_command_set",
        uniqueConstraints = {
            @UniqueConstraint(name = "uq_competitive_command_set",
                columnNames = {"set_number", "mode"})
        }
    )
    public class CompetitiveCommandSet {
        @Id
        @GeneratedValue(strategy = GenerationType.UUID)
        @Column(name = "competitive_command_set_id", nullable = false, columnDefinition = "BINARY(16)")
        private UUID id;
        
        @Column(name = "set_number", nullable = false)
        private int setNumber;
        
        @Enumerated(EnumType.STRING)
        @Column(name = "mode", nullable = false, length = 50)
        private CompetitiveMode mode;
        
        public static CompetitiveCommandSet of(int setNumber, CompetitiveMode mode) {
            CompetitiveCommandSet set = new CompetitiveCommandSet();
            set.setNumber = setNumber;
            set.mode = mode;
            return set;
        }
    }

**핵심 규칙**
- PK는 `UUID`를 사용하고 `GenerationType.UUID`로 생성
- 컬럼명은 명시적으로 `@Column(name = "...")`로 지정
- `created_at`/`updated_at`이 필요한 엔티티는 `BaseEntity`를 상속 (`global.entity.BaseEntity`)
- 소프트 삭제가 필요하면 `deletedAt` 필드와 `@SQLRestriction("deleted_at IS NULL")` 적용
- 정적 팩토리 메서드는 `of` 네이밍 사용 (단일 파라미터) 또는 `from` (변환 용도)
- `@Builder` 대신 정적 팩토리 메서드(`of`, `from`)로 생성 의도를 명확히 표현

**BaseEntity 상속 예시**

    @Getter
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    @Entity
    @Table(name = "members")
    public class Member extends BaseEntity {
        @Id
        @GeneratedValue(strategy = GenerationType.UUID)
        @Column(name = "member_id", nullable = false, columnDefinition = "BINARY(16)")
        private UUID id;
        
        @Column(name = "email", nullable = false, unique = true)
        private String email;
        
        @Column(name = "nickname", nullable = false)
        private String nickname;
        
        @Column(name = "deleted_at")
        private LocalDateTime deletedAt;
        
        public static Member of(String email, String nickname) {
            Member member = new Member();
            member.email = email;
            member.nickname = nickname;
            return member;
        }
    }

---

### 2. DB 스키마 설계 규칙

**RULE**: UUID는 `BINARY(16)`으로 저장하며, 테이블/컬럼 네이밍은 snake_case를 사용합니다.

**DDL 예시**

    CREATE TABLE competitive_command_set (
        competitive_command_set_id BINARY(16) PRIMARY KEY,
        set_number INT NOT NULL,
        mode VARCHAR(50) NOT NULL,
        CONSTRAINT uq_competitive_command_set UNIQUE (set_number, mode)
    );
    
    CREATE TABLE members (
        member_id BINARY(16) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        nickname VARCHAR(100) NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        deleted_at DATETIME NULL
    );

**네이밍 규칙**
- 테이블: 복수형 (`members`, `game_sessions`, `game_rooms`, `competitive_command_set`)
- 컬럼: snake_case (`created_at`, `room_code`, `player_id`, `set_number`)
- PK: `{테이블명_단수}_id` (`member_id`, `competitive_command_set_id`)
- FK: `{참조테이블_단수}_id` (`member_id`, `room_id`)
- Unique 제약조건: `uq_{테이블명}_{컬럼명들}` (`uq_competitive_command_set`)

---

### 3. Repository 계층 규칙

**RULE**: Repository는 인터페이스와 구현을 분리하는 DIP 패턴을 적용하여, Service 계층이 특정 기술(JPA/QueryDSL)에 종속되지 않도록 합니다.

**구조 (4-File Pattern)**

1. **`{Entity}Repository.java`** (Interface): Service가 의존하는 유일한 인터페이스
2. **`{Entity}RepositoryImpl.java`** (Class): 위 인터페이스의 구현체
3. **`{Entity}JpaRepository.java`** (Interface): Spring Data JPA 인터페이스 (내부용)
4. **`{Entity}DslRepository.java`** (Class): QueryDSL 전용 리포지토리 (내부용)

**Spring Data JPA 사용 케이스**
- 기본 CRUD: `save()`, `findById()`, `delete()`
- 단순 조회: 조건 1~2개로 간단하고 고정적인 경우
- 예시: `findByEmail()`, `existsByNickname()`, `findByRoomCode()`

**QueryDSL 사용 케이스**
- 동적 쿼리: 방 목록 필터링 (`mode`, `status` 등 선택적 조건)
- 복잡한 조인: 랭킹 조회 시 주차별 집계, 플레이어 정보 조인
- DTO 직접 조회: 랭킹 응답, 방 목록 응답 등 성능 최적화
- 타입 안정성: 컴파일 시점 오류 검증

**구현 예시**

**1. Interface (Service가 의존)**

    public interface MemberRepository {
        Member save(Member member);
        Optional<Member> findById(UUID id);
        Optional<Member> findByEmail(String email);
        boolean existsByNickname(String nickname);
    }

**2. Implementation (구현체)**

    @Repository
    @RequiredArgsConstructor
    public class MemberRepositoryImpl implements MemberRepository {
        private final MemberJpaRepository jpaRepository;
        private final MemberDslRepository dslRepository;
        
        @Override
        public Member save(Member member) {
            return jpaRepository.save(member);
        }
        
        @Override
        public Optional<Member> findByEmail(String email) {
            return jpaRepository.findByEmail(email);
        }
        
        @Override
        public boolean existsByNickname(String nickname) {
            return jpaRepository.existsByNicknameAndDeletedAtIsNull(nickname);
        }
    }

**3. JpaRepository (Spring Data JPA)**

    public interface MemberJpaRepository extends JpaRepository<Member, UUID> {
        Optional<Member> findByEmail(String email);
        boolean existsByNicknameAndDeletedAtIsNull(String nickname);
    }

**4. DslRepository (QueryDSL)**

    @Repository
    @RequiredArgsConstructor
    public class MemberDslRepository {
        private final JPAQueryFactory queryFactory;
        
        public List<MemberRankingDto> findTopRankings(int limit) {
            QMember member = QMember.member;
            
            return queryFactory
                .select(Projections.constructor(
                    MemberRankingDto.class,
                    member.id,
                    member.nickname,
                    member.totalScore
                ))
                .from(member)
                .where(member.deletedAt.isNull())
                .orderBy(member.totalScore.desc())
                .limit(limit)
                .fetch();
        }
    }

---

### 4. Service 계층 규칙

**RULE**: Service는 인터페이스 + 구현체로 분리합니다. 같은 도메인 내부 데이터 접근은 Repository 인터페이스를 주입받아 처리하고, 타 도메인 데이터 접근은 해당 도메인의 Service 인터페이스를 통해 처리합니다.

**구조**

    // AuthService.java (interface)
    public interface AuthService {
        LoginResponse login(LoginRequest request);
        void sendEmailVerificationCode(String email, EmailPurpose purpose);
    }
    
    // AuthServiceImpl.java (implementation)
    import static com.gitcat.global.exception.value.ErrorCode.*;
    
    @Service
    @RequiredArgsConstructor
    public class AuthServiceImpl implements AuthService {
        
        // ❌ MemberJpaRepository, MemberDslRepository 직접 사용 금지
        // ✅ 추상화된 인터페이스 사용
        private final MemberRepository memberRepository;
        private final RedisTemplate<String, String> redisTemplate;
        
        @Transactional(readOnly = true)
        public MemberDto findById(UUID memberId) {
            Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new BusinessException(MEMBER_NOT_FOUND));
            return MemberDto.from(member);
        }
        
        @Transactional
        public void sendEmailVerificationCode(String email, EmailPurpose purpose) {
            String key = String.format("email:code:%s:%s", purpose, email);
            String code = generateRandomCode();
            redisTemplate.opsForValue().set(key, code, 5, TimeUnit.MINUTES);
            emailService.send(email, code);
        }
    }

**핵심 규칙**
- `@Transactional(readOnly = true)`는 클래스 레벨에 선언하지 않고 조회 메서드에만 명시
- 변경 작업 메서드에는 `@Transactional` 명시
- 타 도메인 데이터가 필요하면 해당 도메인의 `Service` 인터페이스를 참조하고, 타 도메인 `Repository`를 직접 주입하지 않음
- 같은 도메인 내부의 여러 Repository 조합은 같은 Service에서 처리
- Redis 키 패턴은 명확하게 정의 (아래 Redis 키 네이밍 규칙 참고)
- ErrorCode는 반드시 `static import`로 사용

---

### 5. DTO 규칙

**RULE**: DTO는 `domain/{domainName}/dto/` 하위에 `request/`, `response/` 폴더로 분리하며, Java record 형식으로 작성합니다.

**디렉토리 구조**

    domain/member/
    ├── entity/
    │   └── Member.java
    ├── dto/
    │   ├── request/
    │   │   ├── LoginRequest.java
    │   │   └── RegisterRequest.java
    │   └── response/
    │       └── MemberDto.java
    ├── service/
    │   ├── MemberService.java
    │   └── MemberServiceImpl.java
    ├── controller/
    │   ├── MemberController.java
    │   └── MemberControllerDocs.java
    └── repository/
        ├── MemberRepository.java
        ├── MemberRepositoryImpl.java
        ├── MemberJpaRepository.java
        └── MemberDslRepository.java

**Request DTO**

    public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank String password
    ) {}

**Response DTO**

    public record MemberDto(
        UUID id,
        String nickname,
        String email,
        AuthType authType,
        CharacterAsset characterAsset
    ) {
        public static MemberDto from(Member member) {
            return new MemberDto(
                member.getId(),
                member.getNickname(),
                member.getEmail(),
                member.getAuthType(),
                member.getCharacterAsset()
            );
        }
    }

**핵심 규칙**
- 형식: Java 17+ record 필수
- Request DTO: 검증 어노테이션 포함, 변환 로직 없음
- Response DTO: `from()` 정적 팩토리로 Entity → DTO 변환
- 위치: `domain/{domainName}/dto/request` 또는 `response`
- 네이밍: Request는 `*Request`, Response는 `*Response` 또는 `*Dto`

---

### 6. Response 및 예외 처리

#### 6.1. Response Wrapper

**RULE**: 모든 API 응답은 `global.response.Response`를 사용합니다.

**예외 케이스**
- 파일 다운로드/스트리밍 등 바이너리 응답
- `text/plain` 등 비 JSON 응답 (문서에 사유 명시 필수)

**정상 응답 JSON**

    {
        "status": 200,
        "message": "내 정보를 조회했습니다.",
        "data": {
            "nickname": "string"
        }
    }

**Controller 예시**

    @GetMapping("/me")
    public ResponseEntity<Response<MemberDto>> getMyProfile(@Login UUID memberId) {
        MemberDto memberDto = memberService.findById(memberId);
        return Response.ok("내 정보를 조회했습니다.", memberDto);
    }

**Response 메서드**

    // 조회 성공 (200)
    return Response.ok("내 정보를 조회했습니다.", memberDto);
    
    // 데이터 없는 성공 (200)
    return Response.ok("사용 가능한 이메일입니다.");
    
    // 생성 성공 (201)
    return Response.create("세션 생성 성공", sessionDto);

#### 6.2. 예외 처리

**RULE**: 비즈니스 예외는 `BusinessException` + `ErrorCode` enum으로 처리하며, static import로 간결하게 사용합니다.

**참조**: `global.exception.BusinessException`, `global.exception.ErrorResponse`, `global.exception.value.ErrorCode`

**에러 응답 JSON**

    {
        "status": 400,
        "code": "INVALID_INPUT_VALUE",
        "message": "잘못된 값의 파라미터입니다.",
        "errors": [
            {
                "field": "password",
                "value": "",
                "reason": "비밀번호를 입력해주세요."
            }
        ]
    }

**예외 발생 예시**

    import static com.gitcat.global.exception.value.ErrorCode.*;
    
    throw new BusinessException(MEMBER_NOT_FOUND);
    throw new BusinessException(EMAIL_ALREADY_EXISTS);
    throw new BusinessException(ROOM_NOT_FOUND);
    throw new BusinessException(INVALID_PASSWORD);

**ErrorCode 네이밍 규칙**
- enum 이름: `MEMBER_NOT_FOUND`, `TOKEN_EXPIRED`, `ROOM_FULL`
- code 필드: Enum 이름과 동일
- 400대: 클라이언트 오류, 500대: 서버 오류
- 반드시 static import로 사용

---

### 7. 테스트 코드 컨벤션

**RULE**: JUnit5 기준으로 테스트를 작성하고, Given/When/Then 구조를 사용합니다.

**테스트 예시**

    import static com.gitcat.global.exception.value.ErrorCode.*;
    
    @Test
    void 회원_조회_시_존재하지_않으면_예외가_발생한다() {
        // given
        UUID nonExistentId = UUID.randomUUID();
        
        // when & then
        assertThatThrownBy(() -> memberService.findById(nonExistentId))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("errorCode", MEMBER_NOT_FOUND);
    }
    
    @Test
    void 방_입장_시_인원이_초과하면_예외가_발생한다() {
        // given
        UUID roomId = createFullRoom();
        
        // when & then
        assertThatThrownBy(() -> roomService.joinRoom(roomId, memberId))
            .isInstanceOf(BusinessException.class)
            .hasFieldOrPropertyWithValue("errorCode", ROOM_FULL);
    }

**테스트 네이밍**
- 메서드명: 한글로 명확하게 (`회원_조회_시_존재하지_않으면_예외가_발생한다`)
- Given/When/Then 주석으로 구조 명확화

---

### 8. 코드 포맷터 및 스타일

**RULE**: Spotless(Naver Eclipse Formatter)가 코드 스타일을 담당하므로, 개발자는 핵심 로직 구현에 집중합니다.

**명령어**

    # 포맷 검사 (CI에서 활용)
    ./gradlew spotlessCheck
    
    # 포맷 자동 적용
    ./gradlew spotlessApply

---

### 9. 로깅 규칙

**RULE**: `System.out.println` 사용 금지. `@Slf4j` 어노테이션을 사용합니다.

**로그 레벨**
- `DEBUG`: 개발용 상세 로그
- `INFO`: 상태/흐름 (정상 동작 기록)
- `WARN`: 비정상 징후 (예외 처리됐지만 주의 필요)
- `ERROR`: 치명적 오류

**로깅 예시**

    // ❌ NEVER
    System.out.println("user: " + user);
    
    // ✅ ALWAYS
    @Slf4j
    public class MemberService {
        log.info("회원 조회 - memberId: {}", memberId);
        log.warn("존재하지 않는 회원 조회 시도 - memberId: {}", memberId);
        log.error("예상치 못한 오류 발생", e);
    }

**보안 규칙**: 비밀번호, 토큰 등 민감 정보는 로그에 출력하지 않습니다.

---

### 10. API 문서화 (Swagger)

**RULE**: Controller 클래스의 가독성을 위해 Swagger 어노테이션을 별도 인터페이스로 분리합니다.

**구조**
- `{Domain}ControllerDocs.java`: Swagger 어노테이션 정의
- `{Domain}Controller.java`: 비즈니스 로직에만 집중

**중요**: `@Login`으로 주입받는 인증 사용자 식별자는 클라이언트 요청 파라미터가 아니므로, 반드시 `@Parameter(hidden = true)`를 함께 선언합니다.

**구현 예시**

**1. Docs Interface**

    @Tag(name = "회원 API", description = "회원 관련 기능입니다.")
    public interface MemberControllerDocs {
        
        @Operation(summary = "회원 정보 조회", description = "현재 로그인한 회원의 정보를 조회합니다.")
        @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "회원 정보 조회 성공"),
            @ApiResponse(responseCode = "401", description = "인증 실패")
        })
        ResponseEntity<Response<MemberDto>> getMyProfile(
            @Parameter(hidden = true) @Login UUID memberId
        );
    }

**2. Controller Implementation**

    @RestController
    @RequestMapping("/api/members")
    @RequiredArgsConstructor
    public class MemberController implements MemberControllerDocs {
        
        private final MemberService memberService;
        
        @Override
        @GetMapping("/me")
        public ResponseEntity<Response<MemberDto>> getMyProfile(@Login UUID memberId) {
            MemberDto memberDto = memberService.findById(memberId);
            return Response.ok("내 정보를 조회했습니다.", memberDto);
        }
    }

---

### 11. WebSocket (STOMP) 규칙

**RULE**: WebSocket 메시지 처리는 도메인별로 분리하며, Redis Pub/Sub를 활용한 메시지 브로드캐스팅을 적용합니다.

#### 11.1. 메시지 처리 구조

    @Controller
    @RequiredArgsConstructor
    public class GameWebSocketController {
        
        private final SimpMessagingTemplate messagingTemplate;
        private final RedisTemplate<String, Object> redisTemplate;
        
        // 클라이언트 → 서버
        @MessageMapping("/room/{roomId}/ready")
        public void handleReady(@DestinationVariable UUID roomId, ReadyMessage message) {
            gameService.updateReadyStatus(roomId, message);
            
            // 전체 브로드캐스트
            messagingTemplate.convertAndSend(
                "/topic/room/" + roomId,
                ReadyResponse.from(message)
            );
        }
        
        // 서버 → 특정 유저
        public void sendToUser(UUID userId, Object message) {
            messagingTemplate.convertAndSendToUser(
                userId.toString(),
                "/queue/private",
                message
            );
        }
    }

#### 11.2. 메시지 타입 설계

    // Request DTO (클라이언트 → 서버)
    public record ReadyMessage(
        String type,  // "READY" 고정
        UUID playerId,
        String nickname,
        boolean isReady
    ) {}
    
    // Response DTO (서버 → 클라이언트)
    public record ReadyResponse(
        String type,  // "READY_CHANGED" 고정
        UUID playerId,
        String nickname,
        boolean isReady,
        boolean allReady
    ) {
        public static ReadyResponse from(ReadyMessage message) {
            // Entity → DTO 변환 로직
        }
    }

#### 11.3. 경로 네이밍 규칙

**발행 경로 (클라이언트 → 서버)**
- `/app/room/{roomId}/ready` - 준비 상태 변경
- `/app/room/{roomId}/start` - 게임 시작
- `/app/room/{roomId}/contribution/input` - 기여도 뺏기 입력

**구독 경로 (서버 → 클라이언트)**
- `/topic/room/{roomId}` - 방 전체 브로드캐스트
- `/topic/room/{roomId}/contribution` - 기여도 뺏기 게임 이벤트
- `/queue/private` - 개인 메시지 (강퇴, 에러 등)

#### 11.4. Redis 활용 규칙

    // 게임 상태 저장 (Hash)
    redisTemplate.opsForHash().put(
        "room:" + roomId,
        "status",
        GameStatus.WAITING.name()
    );
    
    // 랭킹 저장 (Sorted Set)
    redisTemplate.opsForZSet().add(
        "ranking:SINGLE_NORMAL:2025-W18",
        playerId.toString(),
        score
    );
    
    // 임시 데이터 저장 (TTL)
    redisTemplate.opsForValue().set(
        "session:" + sessionId,
        sessionData,
        30,
        TimeUnit.MINUTES
    );

---

### 12. Redis 키 네이밍 규칙

**RULE**: Redis 키는 명확한 계층 구조를 따르며, 도메인과 목적이 드러나도록 작성합니다.

**키 패턴**

    {도메인}:{식별자}:{세부정보}

**실제 사용 예시**

    # 이메일 인증 코드
    email:code:SIGN_UP:user@example.com
    
    # Refresh Token
    auth:refresh:{memberId}
    
    # 게임 방 정보
    room:{roomId}:status
    room:{roomId}:members
    
    # 랭킹 (Sorted Set)
    ranking:SINGLE_EASY:2025-W18
    ranking:CONTRIBUTION_RUN:2025-W18
    ranking:COOP:{mapId}:2025-W18
    
    # 게임 세션
    session:SINGLE:{sessionId}
    
    # 기여도 뺏기 게임 상태
    contribution:{roomId}:{playerId}:currentBranch
    contribution:{roomId}:branch:{branchName}:commands

**규칙**
- 콜론(`:`)으로 계층 구분
- 대문자는 enum 값에만 사용
- UUID는 축약하지 않고 전체 사용
- 날짜는 ISO 주차 형식 (`yyyy-Www`)

---

## 프로젝트 특화 규칙

### WebSocket 연결 관리
- 방 입장 확정 시 WebSocket 연결
- 방 완전 이탈 / 홈 이동 시 연결 해제
- 비정상 종료는 `SessionDisconnectEvent`로 감지

### 게임 모드별 처리
- **싱글 모드**: REST API만 사용 (WebSocket 미사용)
- **멀티 모드**: WebSocket + Redis Pub/Sub 조합

### 랭킹 시스템
- 이번 주 랭킹: Redis Sorted Set (실시간)
- 과거 주 랭킹: RDB 조회
- 주간 정산: 매주 월요일 00:00 스케줄러

### 동시성 제어
- 명령어 선점: Redisson 분산 락
- 방 인원 제한: Redis `INCR`/`DECR`
- 랭킹 업데이트: Redis `ZADD` (원자적 연산)

---

**이 문서를 통해 모든 백엔드 개발자가 일관된 코드 품질을 유지하고, 프로젝트의 기술적 복잡도를 효과적으로 관리할 수 있습니다.**

# 싱글 게임 / 랭킹 / 인증 모니터링 구현 (Metrics + Loki)

## Background / Context

싱글 게임, 랭킹, 인증 영역에 대해 성능 병목 파악과 유저 행동 분석을 위한 커스텀 메트릭이 필요했다.
기존에는 Actuator + Prometheus 인프라만 갖춰져 있었고, 비즈니스 레벨 메트릭은 전혀 없었다.
Micrometer 메트릭만으로는 "무슨 일이 일어났는지"를 숫자로만 파악하므로, 컨텍스트 있는 로그를 Loki에 저장해 장애 원인 추적과 보안 감사 용도로 활용한다.

## Decision

Micrometer `Timer`와 `Counter`를 사용해 도메인별 Metrics 컴포넌트를 만들고, 각 서비스에 주입했다.
Loki 연동은 `loki-logback-appender`를 통해 `logback-spring.xml`에서 설정하며, `MdcLoggingFilter`가 requestId를 MDC에 주입한다.

**생성 파일**

```
global/metrics/
  SingleMetrics.java           # 싱글 게임 메트릭
  RankingMetrics.java          # 랭킹 메트릭
  AuthMetrics.java             # 인증 메트릭

global/filter/
  MdcLoggingFilter.java        # requestId → MDC 주입

resources/
  logback-spring.xml           # Loki 어펜더 (prod 프로파일)

INFRA/
  docker-compose.monitoring.yml  # Loki + Prometheus + Grafana
  monitoring/loki-config.yml
  monitoring/prometheus.yml
```

**수정 파일**

- `SingleServiceImpl.java` — @Slf4j 추가, startSession/saveResult 주요 지점 log.info/warn
- `SingleRankingServiceImpl.java` — @Slf4j + RankingMetrics 주입; 모든 메서드에 `try/finally`로 apiSample 예외 포함 항상 기록; Redis 서브타이머(top3 / my_rank / around)는 Redis 호출 직후 stop(닉네임 DB 조회 제외); DB 서브타이머(top3 / count / around); incrementRankingViewed·Scrolled 유저 행동 카운터; updateSingleScore log.info
- `AuthServiceImpl.java` — 보안 이벤트(login/logout/register 등) debug → info, 이메일 주소 제거; resetPassword·verifyPassword에 `auth.operation` Timer + `auth.error` Counter 추가; verifyPassword log.info 추가
- `EmailServiceImpl.java` — 이메일 발송 실패 ERROR 로그에서 수신자 이메일 주소 제거 (개인정보 보호)

---

## 수집 메트릭 목록

### Single (SingleMetrics)

| 메트릭 이름 | 종류 | 태그 | 설명 |
|---|---|---|---|
| `single.start_session` | Timer | difficulty | startSession 전체 응답 시간 |
| `single.start_session.db` | Timer | difficulty | DB 조회 구간 (커맨드셋 + 아이템 + 최고점수) |
| `single.start_session.redis` | Timer | difficulty | Redis 세션 저장 시간 |
| `single.save_result` | Timer | difficulty, status(success/error) | saveResult 전체 응답 시간 |
| `single.save_result.redis_lookup` | Timer | - | Redis 세션 조회 시간 |
| `single.save_result.db_save` | Timer | - | DB 결과 저장 시간 |
| `single.save_result.ranking_update` | Timer | - | 랭킹 업데이트 시간 (주간 + 역대) |
| `single.save_result.error` | Counter | error_code | 예외 발생 횟수 (ErrorCode 단위) |

### Ranking (RankingMetrics)

| 메트릭 이름 | 종류 | 태그 | 설명 |
|---|---|---|---|
| `ranking.single.get` | Timer | difficulty, type(initial/scroll/history/history_scroll) | API 전체 응답 시간 |
| `ranking.single.viewed` | Counter | difficulty, type(realtime/history) | 랭킹 조회 수 |
| `ranking.single.scrolled` | Counter | difficulty, type(realtime/history) | 스크롤 조회 수 |
| `ranking.single.redis` | Timer | difficulty, operation(top3/my_rank/around) | Redis 조회 지연 구간별 |
| `ranking.single.db` | Timer | difficulty, operation(top3/around/count) | DB 조회 지연 구간별 (히스토리) |

### Auth (AuthMetrics)

| 메트릭 이름 | 종류 | 태그 | 설명 |
|---|---|---|---|
| `auth.operation` | Timer | operation, status(success/error) | API 전체 응답 시간 |
| `auth.error` | Counter | operation, error_code | 예외 발생 횟수 (원인 분석용) |
| `auth.email_code.sent` | Counter | purpose | 인증 코드 발송 수 (퍼널) |
| `auth.email_code.verified` | Counter | purpose | 인증 코드 검증 성공 수 (퍼널) |
| `auth.register.completed` | Counter | result(new/reactivated) | 회원가입 완료 수 (퍼널) |
| `auth.login.success` | Counter | type(local/oauth) | 로그인 성공 수 |
| `auth.login.failed` | Counter | error_code | 로그인 실패 수 원인별 |
| `auth.token.reissued` | Counter | - | 토큰 재발급 빈도 |
| `auth.logout` | Counter | - | 로그아웃 수 |

---

## Why

**Timer.Sample 방식 선택**

Micrometer의 `Timer.start(registry)` → `sample.stop(timer)` 패턴은 JVM clock을 내부적으로 사용해 nanosecond 정밀도를 보장한다. `System.nanoTime()` 직접 사용보다 Micrometer 표준 방식이고, Prometheus에서 `_count` / `_sum` / `_bucket` 히스토그램이 자동 생성된다.

**도메인별 Metrics 컴포넌트 분리**

AOP 방식 대신 명시적 주입을 선택했다. 어느 구간을 측정하는지 코드에서 바로 보이고, 서브 오퍼레이션(Redis vs DB 분리 등) 측정이 자유롭다.

**saveResult 예외 처리**

`BusinessException`을 catch해서 error counter를 증가시키고 다시 throw한다. `finally`에서 total timer를 항상 기록하므로 성공/실패 모두 latency가 수집된다.

**로그인 실패 이중 카운팅 방지**

`AuthenticationException`은 `login()` 내부에서 직접 `incrementLoginFailed()`를 호출한 뒤 `BusinessException`으로 변환된다. 바깥 catch에서는 `INVALID_CREDENTIALS`는 건너뛰어 중복 집계를 방지했다.

---

## Caution

- `saveResult`의 Redis 세션 조회 타이머는 실패 여부와 무관하게 항상 기록된다 (`SESSION_NOT_FOUND` 포함). 이는 의도된 설계 — Redis가 느린 경우를 포착하기 위해서다.
- `single.save_result` Timer의 `difficulty` 태그는 Redis 세션 조회 실패(step 2 이전)시 `"unknown"`이 된다.
- `application-prod.yml`에서 현재 prometheus 엔드포인트가 비활성화 되어 있어 (`include: health`), Prometheus가 메트릭을 수집하려면 prod 설정에 `prometheus` 추가가 필요하다.
- Loki 어펜더는 **prod 프로파일에서만** 활성화된다. dev/local에서 Loki가 없어도 앱 구동에 영향 없다.
- 인증 로그에서 이메일 주소를 제거했다. 개인정보(이메일)는 Loki에 저장하지 않도록 의도된 설계다.
- `LOKI_HOST` 환경변수 미설정 시 `loki`(docker-compose 서비스명)를 기본값으로 사용한다. 로컬 단독 실행 시 `localhost`로 지정해야 한다.
- `docker-compose.monitoring.yml`은 `letsgit-dev` 네트워크를 외부 참조한다. `docker-compose.infra.yml`을 먼저 실행해 네트워크를 생성해야 한다.
- Grafana 초기 접속: http://localhost:3000 (admin / admin), Data Sources에서 Loki(`http://loki:3100`)와 Prometheus(`http://prometheus:9090`)를 수동 추가해야 한다.

---

## Loki 로그 구조

### requestId (MDC)

모든 HTTP 요청은 `MdcLoggingFilter`를 거쳐 `requestId`가 MDC에 주입된다.
클라이언트가 `X-Request-ID` 헤더를 보내면 그 값을 사용하고, 없으면 8자리 랜덤 UUID를 생성한다.
응답 헤더에도 동일한 `X-Request-ID`가 반환되므로 프론트 측에서 요청 추적이 가능하다.

로그 패턴: `{날짜} {레벨} [{requestId}] [{thread}] {logger} - {메시지}`

### 도메인별 로그 메시지

| 도메인 | 이벤트 | 레벨 | 예시 메시지 |
|---|---|---|---|
| single | 세션 시작 | INFO | `[single][startSession] difficulty=NORMAL, sessionId=abc123` |
| single | 결과 저장 성공 | INFO | `[single][saveResult] sessionId=abc123, difficulty=NORMAL, score=1500, isNewRecord=true` |
| single | 결과 저장 실패 | WARN | `[single][saveResult] error. sessionId=abc123, errorCode=SESSION_NOT_FOUND` |
| ranking | 점수 갱신 | INFO | `[ranking][updateScore] difficulty=HARD, score=2000, rank=3` |
| auth | 이메일 코드 발송 | INFO | `[auth][sendEmailCode] purpose=sign_up` |
| auth | 이메일 인증 | INFO | `[auth][verifyEmailCode] purpose=sign_up` |
| auth | 회원가입 완료 | INFO | `[auth][register] reactivated=false` |
| auth | 로컬 로그인 | INFO | `[auth][login] type=local` |
| auth | OAuth 로그인 | INFO | `[auth][login] type=oauth` |
| auth | 토큰 재발급 | INFO | `[auth][reissue]` |
| auth | 로그아웃 | INFO | `[auth][logout]` |
| auth | 비밀번호 변경 | INFO | `[auth][resetPassword]` |
| auth | 비밀번호 검증 | INFO | `[auth][verifyPassword]` |

### Loki LogQL 예시

```logql
# 특정 requestId로 요청 전체 추적 (로그 패턴: [requestId] 형태)
{app="letsgitit"} |= "[abc12345]"

# 싱글 게임 오류만 조회
{app="letsgitit", level="WARN"} |= "[single][saveResult] error"

# HARD 난이도 세션 시작 수 (5분 집계)
count_over_time({app="letsgitit"} |= "[single][startSession]" |= "difficulty=HARD" [5m])

# 인증 이벤트 타임라인
{app="letsgitit"} |~ "\\[auth\\]\\[(login|logout|register)\\]"

# 에러 레벨 로그 전체
{app="letsgitit", level="ERROR"}
```

---

## Grafana 대시보드 활용 예시

```promql
# saveResult 병목 비교 (Redis vs DB vs 랭킹)
histogram_quantile(0.95, rate(single_save_result_redis_lookup_seconds_bucket[5m]))
histogram_quantile(0.95, rate(single_save_result_db_save_seconds_bucket[5m]))
histogram_quantile(0.95, rate(single_save_result_ranking_update_seconds_bucket[5m]))

# 랭킹 조회 대비 스크롤 비율 (첫 페이지 이탈 지표)
rate(ranking_single_scrolled_total[5m]) / rate(ranking_single_viewed_total{type="realtime"}[5m])

# 인증 퍼널 전환율 (코드 발송 → 검증 → 회원가입 완료)
rate(auth_email_code_verified_total{purpose="sign_up"}[1h]) / rate(auth_email_code_sent_total{purpose="sign_up"}[1h])
rate(auth_register_completed_total[1h]) / rate(auth_email_code_verified_total{purpose="sign_up"}[1h])

# 로그인 실패 유형별 분포
sum by (error_code) (rate(auth_login_failed_total[5m]))
```

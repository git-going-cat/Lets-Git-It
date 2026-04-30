# Response & Exception 처리 가이드

이 문서는 Let's Git it 백엔드의 공통 응답 및 예외 처리 구조를 설명합니다.

---

## 1. 공통 응답 구조

### 1.1. Response Wrapper (`global.response.ApiResponse<T>`)

모든 API 응답은 `ApiResponse<T>` 래퍼를 사용합니다.

```java
// 조회 성공 (200 OK)
return ApiResponse.ok("성공 메시지", data);

// 데이터 없는 성공 (200 OK)
return ApiResponse.ok("성공 메시지");

// 생성 성공 (201 Created)
return ApiResponse.create("생성 성공 메시지", data);
```

**JSON 응답 예시**:
```json
{
  "status": 200,
  "message": "성공 메시지",
  "data": { }
}
```

---

## 2. 에러 응답 구조

### 2.1. ErrorResponse (`global.exception.ErrorResponse`)

```json
{
  "status": 400,
  "code": "MEMBER_NOT_FOUND",
  "message": "존재하지 않는 회원입니다.",
  "errors": []
}
```

유효성 검증 실패(400)의 경우 `errors` 배열에 필드 상세 정보 포함:
```json
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
```

---

## 3. 예외 처리

### 3.1. CustomException (`global.exception.CustomException`)

비즈니스 로직에서 발생하는 예외는 `CustomException`을 사용합니다.

```java
import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

// ✅ static import 필수
throw new CustomException(MEMBER_NOT_FOUND);
throw new CustomException(ROOM_FULL);
```

도메인별 커스텀 예외는 `CustomException`을 상속하여 작성합니다:

```java
// domain/member/exception/MemberNotFoundException.java
public class MemberNotFoundException extends CustomException {
    public MemberNotFoundException() {
        super(ErrorCode.MEMBER_NOT_FOUND);
    }
}
```

### 3.2. ErrorCode enum (`global.exception.ErrorCode`)

현재 정의된 ErrorCode 목록:

**인증 관련**:
| 코드 | HTTP | 설명 |
|------|------|------|
| `INVALID_CREDENTIALS` | 401 | 이메일 또는 비밀번호 불일치 |
| `INVALID_AUTH_CODE` | 400 | 유효하지 않은 인증 코드 |
| `EXPIRED_AUTH_CODE` | 400 | 만료된 인증 코드 |
| `TOKEN_EXPIRED` | 401 | 액세스 토큰 만료 |
| `REFRESH_TOKEN_EXPIRED` | 401 | 리프레시 토큰 만료 |
| `INVALID_TOKEN` | 401 | 유효하지 않은 토큰 |

**회원 관련**:
| 코드 | HTTP | 설명 |
|------|------|------|
| `MEMBER_NOT_FOUND` | 404 | 존재하지 않는 회원 |
| `EMAIL_DUPLICATE` | 409 | 이미 사용 중인 이메일 |
| `INVALID_PASSWORD` | 400 | 유효하지 않은 비밀번호 |

**방(Room) 관련**:
| 코드 | HTTP | 설명 |
|------|------|------|
| `ROOM_NOT_FOUND` | 404 | 존재하지 않는 방 |
| `ROOM_FULL` | 409 | 방 인원 초과 |

**게임 세션 관련**:
| 코드 | HTTP | 설명 |
|------|------|------|
| `SESSION_NOT_FOUND` | 404 | 존재하지 않는 세션 |
| `SESSION_EXPIRED` | 410 | 만료된 세션 |
| `GAME_NOT_STARTED` | 409 | 아직 시작되지 않은 게임 |
| `COOP_MAP_NOT_FOUND` | 404 | 존재하지 않는 협동 맵 |

**시스템 관련**:
| 코드 | HTTP | 설명 |
|------|------|------|
| `INVALID_INPUT_VALUE` | 400 | 잘못된 값의 파라미터 |
| `INVALID_TYPE_VALUE` | 400 | 잘못된 타입의 파라미터 |
| `MISSING_PARAMETER` | 400 | 요청 파라미터 누락 |
| `MISSING_COOKIE` | 400 | 필수 쿠키 누락 |
| `ACCESS_DENIED` | 403 | 접근 권한 없음 |
| `API_NOT_FOUND` | 404 | API를 찾을 수 없음 |
| `METHOD_NOT_ALLOWED` | 405 | 지원하지 않는 HTTP 메서드 |
| `INTERNAL_SERVER_ERROR` | 500 | 서버 내부 오류 |

> 기능 구현 시 필요한 도메인별 에러코드를 추가합니다.

### 3.3. GlobalExceptionHandler (`global.exception.GlobalExceptionHandler`)

`@RestControllerAdvice`로 전역 예외를 처리합니다. 처리하는 예외 목록:

| 예외 | 설명 |
|------|------|
| `CustomException` | 비즈니스 예외 |
| `MethodArgumentNotValidException` | `@Valid` 검증 실패 |
| `MethodArgumentTypeMismatchException` | 파라미터 타입 불일치 |
| `ConstraintViolationException` | `@Validated` 검증 실패 |
| `MissingServletRequestParameterException` | 파라미터 누락 |
| `MissingRequestCookieException` | 쿠키 누락 |
| `HttpRequestMethodNotSupportedException` | 잘못된 HTTP 메서드 |
| `NoHandlerFoundException` | 존재하지 않는 API |
| `NoResourceFoundException` | 존재하지 않는 리소스 |
| `AuthenticationException` | 인증 예외 |
| `Exception` | 예상치 못한 서버 오류 |

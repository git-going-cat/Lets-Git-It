# Git 타이핑 게임 API 명세

## 개요

Git 명령어 학습 기반 실시간 멀티플레이어 타이핑 게임 백엔드 API

| 항목 | 내용 |
| --- | --- |
| 인증 | JWT (Access Token + Refresh Token) |
| 실시간 | WebSocket |
| 랭킹 | Redis Sorted Set |
| 주간 정산 | 매주 월요일 00:00 (Redis → RDB 이관) |

---

## 목차

- [1. 인증 (Auth)](#1-인증-auth)
- [2. 회원 (Member)](#2-회원-member)
- [3. 도감 (Dictionary)](#3-도감-dictionary)
- [4. 랭킹 (Ranking)](#4-랭킹-ranking)
- [5. 싱글 게임 (Single)](#5-싱글-게임-single)
- [6. 방 관리 (Room)](#6-방-관리-room)
- [7. 튜토리얼 (Tutorial)](#7-튜토리얼-tutorial)

---

## 1. 인증 (Auth)

### 1-1. 이메일 인증 코드 발송

```
POST /api/v1/auth/email/send?purpose=SIGN_UP
```

> 회원가입 전 이메일 인증용. 인증 코드는 5분간 유효합니다.

#### Query

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `purpose` | String | Y | 인증 목적<br>• `SIGN_UP` : 로컬 회원가입용<br>• `PASSWORD_RESET` : 비밀번호 찾기용<br>• `WITHDRAW` : 탈퇴용 |

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `email` | String | Y | 인증할 이메일 |

```json
{
  "email": "user@example.com"
}
```

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `expiredAt` | DateTime | 인증 코드 만료 시각 |

```json
{
  "status": 200,
  "message": "인증 메일 발송 성공",
  "data": {
    "expiredAt": "2026-04-28T09:12:34.123"
  }
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `EMAIL_DUPLICATE` | 이미 가입된 이메일 |
| `INVALID_EMAIL_FORMAT` | 이메일 형식 불일치 |
| `EMAIL_SEND_FAILED` | 메일 발송 실패 |
| `TOO_MANY_REQUESTS` | 재발송 제한 초과 (60초 이내 재요청) |
| `TOO_MANY_EMAIL_REQUESTS` | 이메일 발송 횟수 초과 (목적별 최대 3회) |

---

### 1-2. 이메일 인증 코드 검증

```
POST /api/v1/auth/email/verify
```

> 검증 성공 시 서버에서 인증 완료 상태를 Redis에 저장합니다.
> 이후 회원가입 API 호출 시 인증 완료 여부를 확인합니다.

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `email` | String | Y | 인증한 이메일 |
| `code` | String | Y | 메일로 받은 인증 코드 |

```json
{
  "email": "user@example.com",
  "code": "A1B2C3"
}
```

#### Response

```json
{
  "status": 200,
  "message": "이메일 인증 성공",
  "data": {}
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `INVALID_AUTH_CODE` | 인증 코드 불일치 |
| `EXPIRED_AUTH_CODE` | 인증 코드 만료 (5분 초과) |

---

### 1-3. 회원가입

```
POST /api/v1/auth/register
```

> 회원가입 전 이메일 인증이 완료되어야 합니다.
>
> 동일 이메일로 탈퇴 후 30일 이내 재가입하는 경우 신규 회원을 생성하지 않고 기존 계정을 재활성화합니다.
> 30일이 지난 탈퇴 계정은 삭제 또는 마스킹 정책에 따라 처리됩니다.

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `email` | String | Y | 이메일 (인증 완료된 이메일) |
| `password` | String | Y | 비밀번호 |

```json
{
  "email": "user@example.com",
  "password": "password123!"
}
```

#### Response

```json
{
  "status": 201,
  "message": "회원가입 성공",
  "data": {}
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `EMAIL_DUPLICATE` | 이미 사용 중인 이메일 |
| `INVALID_EMAIL_FORMAT` | 이메일 형식 불일치 |
| `INVALID_PASSWORD_FORMAT` | 비밀번호 형식 불일치 |
| `EMAIL_NOT_VERIFIED` | 이메일 인증 미완료 |
| `INVALID_GIT_PROFICIENCY` | 유효하지 않은 Git 익숙도 값 |

---

### 1-4. 로컬 로그인

```
POST /api/v1/auth/login
```

> 응답 시 `refreshToken`이 HttpOnly Cookie로 자동 세팅됩니다.

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `email` | String | Y | 이메일 |
| `password` | String | Y | 비밀번호 |

```json
{
  "email": "user@example.com",
  "password": "password123!"
}
```

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `accessToken` | String | Access Token |
| `isFirstLogin` | Boolean | 최초 로그인 여부 (온보딩 진행 여부 판단) |
| `nickname` | String | 닉네임 |
| `onboardingStatus` | String | 첫 로그인 수행 단계 (`NONE` / `NICKNAME_SET_DONE` / `TUTORIAL_DONE`) |
| `characterHair` | String | 캐릭터 머리 에셋 ID |
| `characterHairColor` | String | 캐릭터 머리색 에셋 ID |
| `characterBody` | String | 캐릭터 스킨 에셋 ID |
| `characterEye` | String | 캐릭터 눈 ID |
| `characterOutfit` | String | 캐릭터 옷 ID |
| `characterOutfitColor` | String | 캐릭터 옷색 ID |

```json
{
  "status": 200,
  "message": "로그인 성공",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "isFirstLogin": false,
    "nickname": "dobby",
    "onboardingStatus": "NONE",
    "characterHair": "hair_01",
    "characterHairColor": "color_black",
    "characterBody": "body_default",
    "characterEye": "eye_01",
    "characterOutfit": "outfit_01",
    "characterOutfitColor": "color_white"
  }
}
```

#### Response Headers

| 헤더 | 설명 |
| --- | --- |
| `Set-Cookie: refreshToken=...; HttpOnly` | Refresh Token 쿠키 자동 세팅. JS에서 직접 접근 불가 |

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `INVALID_CREDENTIALS` | 이메일 또는 비밀번호 불일치 |

---

### 1-5. 구글 소셜 로그인

#### Step 1 — 로그인 진입

```
GET /api/v1/oauth2/authorization/google
```

> Request Body 없음.
> 프론트엔드가 이 URL로 사용자를 이동시키면 끝.
> 이후 구글 로그인 → 백엔드 처리 → 프론트엔드로 리다이렉트까지 백엔드가 자동 처리.

#### Step 2 — 로그인 완료 후 프론트 수신

백엔드가 1회용 임시코드 발급 후 아래 주소로 리다이렉트합니다.

```
GET http://localhost:5173/auth/callback/google?code={임시코드}
```

| 항목 | 전달 방식 | 설명 |
| --- | --- | --- |
| `code` | Query String | 30초짜리 1회용 임시코드 (UUID). 실제 토큰 발급에 사용 |

> 프론트엔드는 code를 받은 즉시 1-6 (토큰 교환 API)를 호출해야 합니다. 30초 초과 시 만료됩니다.

#### 에러 코드

| HTTP Status | 코드 | 설명 |
| --- | --- | --- |
| 401 | `INVALID_PROVIDER_TOKEN` | 구글 인증 실패 |

---

### 1-6. 토큰 교환 (OAuth 임시코드 → Access Token)

```
POST /api/v1/auth/token
```

> 응답 시 `refreshToken`이 HttpOnly Cookie로 자동 세팅됩니다.

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `code` | String | Y | 로그인 콜백에서 받은 1회용 임시코드 |

```json
{
  "code": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `accessToken` | String | Access Token |
| `isFirstLogin` | Boolean | 최초 로그인 여부 (온보딩 진행 여부 판단) |
| `nickname` | String | 닉네임 (최초 로그인 시 null) |
| `onboardingStatus` | String | 첫 로그인 수행 단계 (`NONE` / `NICKNAME_SET_DONE` / `TUTORIAL_DONE`) |
| `characterHair` | String | 캐릭터 머리 에셋 ID |
| `characterHairColor` | String | 캐릭터 머리색 에셋 ID |
| `characterBody` | String | 캐릭터 스킨 에셋 ID |
| `characterEye` | String | 캐릭터 눈 ID |
| `characterOutfit` | String | 캐릭터 옷 ID |
| `characterOutfitColor` | String | 캐릭터 옷색 ID |

```json
{
  "status": 200,
  "message": "로그인 성공",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "isFirstLogin": false,
    "nickname": "dobby",
    "onboardingStatus": "NONE",
    "characterHair": "hair_01",
    "characterHairColor": "color_black",
    "characterBody": "body_default",
    "characterEye": "eye_01",
    "characterOutfit": "outfit_01",
    "characterOutfitColor": "color_white"
  }
}
```

#### Response Headers

| 헤더 | 설명 |
| --- | --- |
| `Set-Cookie: refreshToken=...; HttpOnly` | Refresh Token 쿠키 자동 세팅. JS에서 직접 접근 불가 |

#### 에러 코드

| HTTP Status | 코드 | 설명 |
| --- | --- | --- |
| 401 | `INVALID_AUTH_CODE` | 코드가 존재하지 않거나 만료됨 (30초 초과) |

---

### 1-7. 토큰 재발급

```
POST /api/v1/auth/reissue
```

> Request Body 없음. Refresh Token은 HttpOnly Cookie로 자동 전송됩니다.

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `accessToken` | String | 새 Access Token |

```json
{
  "status": 200,
  "message": "토큰 재발급 성공",
  "data": {
    "accessToken": "eyJhbGciOi..."
  }
}
```

#### 에러 코드

| HTTP Status | 코드 | 설명 |
| --- | --- | --- |
| 401 | `INVALID_TOKEN` | Refresh Token 서명이 유효하지 않음 |
| 401 | `TOKEN_EXPIRED` | Refresh Token JWT 만료 |
| 401 | `REFRESH_TOKEN_EXPIRED` | Redis에 저장된 Refresh Token 없음. 재로그인 필요 |
| 401 | `TOKEN_MISMATCH` | 쿠키의 Refresh Token이 Redis 저장값과 불일치 |
| 400 | `MISSING_COOKIE` | `refreshToken` 쿠키 누락 |

---

### 1-8. 로그아웃

```
POST /api/v1/auth/logout
```

> Request Body 없음. Authorization 헤더에 Access Token 필요.
> 서버에서 Redis의 Refresh Token 즉시 삭제 + HttpOnly Cookie 만료 처리.

#### Response

```json
{
  "status": 200,
  "message": "로그아웃 성공",
  "data": {}
}
```

#### 에러 코드

| HTTP Status | 코드 | 설명 |
| --- | --- | --- |
| 401 | `INVALID_TOKEN` | 유효하지 않은 토큰 |

---

### 1-9. 비밀번호 변경 (비밀번호 찾기용 · 인증 불필요)

```
PATCH /api/v1/auth/password
```

> 인증 불필요. 이메일 인증 완료 후 호출. 서버에서 `email:verified:PASSWORD_RESET:{email}` 확인.

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `email` | String | Y | 인증 완료한 이메일 |
| `newPassword` | String | Y | 새 비밀번호 |

```json
{
  "email": "user@example.com",
  "newPassword": "newPassword123!"
}
```

#### Response

```json
{
  "status": 200,
  "message": "비밀번호 변경 성공",
  "data": {}
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `EMAIL_NOT_VERIFIED` | 이메일 인증 미완료 |
| `MEMBER_NOT_FOUND` | 가입되지 않은 이메일 |
| `INVALID_PASSWORD_FORMAT` | 비밀번호 형식 불일치 |
| `OAUTH_ACCOUNT` | 소셜 로그인 계정 (비밀번호 없음) |
| `SAME_AS_CURRENT_PASSWORD` | 현재 비밀번호와 동일 |

---

### 1-10. 비밀번호 검증

비밀번호를 수정하기 전, 기존 비밀번호를 입력받아 검증합니다.

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `password` | String | Y | 현재 비밀번호 |

```json
{
  "password": "currentPassword123!"
}
```

#### Response

```json
{
  "status": 200,
  "message": "비밀번호 검증 성공",
  "data": {}
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `PASSWORD_MISMATCH` | 비밀번호 불일치 |
| `OAUTH_ACCOUNT` | 소셜 로그인 계정 (비밀번호 없음) |

---

## 2. 회원 (Member)

### 2-1. 닉네임 저장 (온보딩)

```
POST /api/v1/members/me/nickname
```

> 최초 온보딩 시 1회만 가능. 이미 설정된 경우 `NICKNAME_ALREADY_SET` 오류.

#### 닉네임 정책

| 조건 | 내용 |
| --- | --- |
| 길이 | 2자 이상 6자 이하 |
| 허용 문자 | 한글(완성형), 영문, 숫자 |
| 금지 | 초성·자음 단독 사용 (`ㄱ`, `ㅎ` 등), 모음 단독 사용 (`ㅏ`, `ㅣ` 등), 특수문자, 공백 |

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `nickname` | String | Y | 설정할 닉네임 (2~6자, 한글·영문·숫자) |

```json
{
  "nickname": "dobby"
}
```

#### Response

```json
{
  "status": 200,
  "message": "닉네임 저장 성공",
  "data": {}
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `NICKNAME_DUPLICATE` | 중복된 닉네임 (탈퇴 회원 닉네임 포함) |
| `NICKNAME_ALREADY_SET` | 이미 닉네임이 설정된 회원 |
| `INVALID_INPUT_VALUE` | 닉네임 형식 불일치 (길이, 허용 문자 위반) |

---

### 2-2. 튜토리얼 완료

```
POST /api/v1/members/me/tutorial
```

백엔드에서 해당 유저의 onboarding step 값을 `TUTORIAL_DONE`으로 변경합니다.

#### Response

```json
{
  "status": 200,
  "message": "튜토리얼 완료",
  "data": {}
}
```

---

### 2-3. 내 정보 조회 (마이페이지)

```
GET /api/v1/members/me
```

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `nickname` | String | 닉네임 |
| `authType` | String | `OAUTH` / `LOCAL` |
| `provider` | String | `GOOGLE` |
| `email` | String | 이메일 |
| `totalPlayTime` | Integer | 총 플레이 시간 (sec) |
| `characterHair` | String | 캐릭터 머리 에셋 ID |
| `characterHairColor` | String | 캐릭터 머리색 에셋 ID |
| `characterBody` | String | 캐릭터 스킨 에셋 ID |
| `characterEye` | String | 캐릭터 눈 ID |
| `characterOutfit` | String | 캐릭터 옷 ID |
| `characterOutfitColor` | String | 캐릭터 옷색 ID |
| `records` | Array | 모드별 기록 목록 |
| `records[].mode` | String | 게임 모드 |

**records 모드별 추가 필드**

| 모드 | 필드명 | 타입 | 설명 |
| --- | --- | --- | --- |
| `SINGLE_EASY` / `SINGLE_NORMAL` / `SINGLE_HARD` | `bestScore` | Integer | 모든 기간 중 최고 점수 |
| `CONTRIBUTION_RUN` | `totalContribution` | Integer | 모든 기간 누적 기여도 |
| `TIME_ATTACK` | `totalCount` | Integer | 모든 기간 누적 카운트 |
| `COOP` | `bestClearTime` | Integer | 모든 기간 중 최단 클리어 시간 (ms) |

```json
{
  "status": 200,
  "message": "내 정보 조회 성공",
  "data": {
    "nickname": "dobby",
    "authType": "LOCAL",
    "provider": null,
    "email": "user@example.com",
    "totalPlayTime": 37200,
    "characterHair": "Hairstyle_01",
    "characterHairColor": "Hairstyle-color_01",
    "characterBody": "Body_01",
    "characterEye": "Eyes_01",
    "characterOutfit": "Outfit_01",
    "characterOutfitColor": "Outfit-color_01",
    "records": [
      { "mode": "SINGLE_EASY",      "bestScore": 9500 },
      { "mode": "SINGLE_NORMAL",    "bestScore": 7200 },
      { "mode": "SINGLE_HARD",      "bestScore": 5100 },
      { "mode": "CONTRIBUTION_RUN", "totalContribution": 88000 },
      { "mode": "TIME_ATTACK",      "totalCount": 10500},
      { "mode": "COOP",             "bestClearTime": 61000 }
    ]
  }
}
```

---

### 2-4. 캐릭터 에셋 저장

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `characterHair` | String | Y | 캐릭터 머리 에셋 ID |
| `characterHairColor` | String | Y | 캐릭터 머리색 에셋 ID |
| `characterBody` | String | Y | 캐릭터 스킨 에셋 ID |
| `characterEye` | String | Y | 캐릭터 눈 ID |
| `characterOutfit` | String | Y | 캐릭터 옷 ID |
| `characterOutfitColor` | String | Y | 캐릭터 옷색 ID |

```json
{
  "characterHair": "Hairstyle_01",
  "characterHairColor": "Hairstyle-color_01",
  "characterBody": "Body_01",
  "characterEye": "Eyes_01",
  "characterOutfit": "Outfit_01",
  "characterOutfitColor": "Outfit-color_01"
}
```

#### Response

```json
{
  "status": 200,
  "message": "캐릭터 에셋 저장 성공",
  "data": {}
}
```

---

### 2-5. 닉네임 수정

```
PATCH /api/v1/members/me/nickname
```

> 현재와 동일한 닉네임 입력 시 중복 검사 없이 그대로 유지.

#### 닉네임 정책

| 조건 | 내용 |
| --- | --- |
| 길이 | 2자 이상 6자 이하 |
| 허용 문자 | 한글(완성형), 영문, 숫자 |
| 금지 | 초성·자음 단독 사용 (`ㄱ`, `ㅎ` 등), 모음 단독 사용 (`ㅏ`, `ㅣ` 등), 특수문자, 공백 |

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `nickname` | String | Y | 새 닉네임 (2~6자, 한글·영문·숫자) |

```json
{
  "nickname": "newdobby"
}
```

#### Response

```json
{
  "status": 200,
  "message": "닉네임 변경 성공",
  "data": {}
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `NICKNAME_DUPLICATE` | 이미 사용 중인 닉네임 (탈퇴 회원 닉네임 포함) |
| `INVALID_INPUT_VALUE` | 닉네임 형식 불일치 (길이, 허용 문자 위반) |

---

### 2-6. 닉네임 중복 확인

```
GET /api/v1/members/nickname/check?nickname={nickname}
```

> 탈퇴 회원의 닉네임도 재사용 불가. 형식 검증 후 중복 검사 순으로 처리.

#### Query Parameters

| 파라미터 | 필수 | 설명 |
| --- | --- | --- |
| `nickname` | ✅ | 확인할 닉네임 (2~6자, 한글·영문·숫자) |

#### Response

```json
{
  "status": 200,
  "message": "사용할 수 있는 닉네임",
  "data": {}
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `NICKNAME_DUPLICATE` | 이미 사용 중인 닉네임 (탈퇴 회원 닉네임 포함) |
| `INVALID_INPUT_VALUE` | 닉네임 형식 불일치 (길이, 허용 문자 위반) |

---

### 2-7. 회원탈퇴

```
DELETE /api/v1/members/me
```

> - 탈퇴 즉시 물리 삭제하지 않음
> - `deletedAt` 기준 soft delete 처리
> - email, nickname은 유지
> - 닉네임 재사용 불가
> - 탈퇴 후 30일 이내 같은 이메일로 재가입 시 기존 계정 재활성화
> - 30일 초과 시 삭제 또는 마스킹 대상

#### Response

```json
{
  "status": 200,
  "message": "회원탈퇴 성공",
  "data": {}
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `INVALID_CREDENTIALS` | 이메일 또는 비밀번호 불일치 |

---

### 2-8. 비밀번호 변경 (인증 필요)

```
PATCH /api/v1/members/me/password
```

> Authorization 헤더에 Access Token 필요. 비밀번호 검증 API(1-10) 호출 후 사용.

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `newPassword` | String | Y | 새 비밀번호 |

```json
{
  "newPassword": "newPassword123!"
}
```

#### Response

```json
{
  "status": 200,
  "message": "비밀번호 변경 성공",
  "data": {}
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `INVALID_PASSWORD_FORMAT` | 비밀번호 형식 불일치 |
| `OAUTH_ACCOUNT` | 소셜 로그인 계정 (비밀번호 없음) |
| `SAME_AS_CURRENT_PASSWORD` | 현재 비밀번호와 동일 |

---

## 3. 도감 (Dictionary)

### 3-1. 도감 조회

```
GET /api/v1/dictionary/commands
```

> 인증 불필요

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `commands` | Array | 명령어 목록 |
| `commands[].commandId` | UUID | 명령어 ID |
| `commands[].name` | String | 명령어 이름 |
| `commands[].description` | String | 명령어 설명 |
| `commands[].imageUrl` | String | 명령어 이미지 URL |
| `commands[].isInGame` | Boolean | 게임 내 사용 여부 |
| `commands[].options` | Array | 명령어 옵션 목록 |
| `commands[].options[].option` | String | 옵션 |
| `commands[].options[].description` | String | 옵션 설명 |

```json
{
  "status": 200,
  "message": "도감 조회 성공",
  "data": {
    "commands": [
      {
        "commandId": "UUID",
        "name": "git commit",
        "description": "변경사항을 로컬 저장소에 저장합니다",
        "imageUrl": "https://cdn.example.com/commands/commit.png",
        "isInGame": true,
        "options": [
          { "option": "-m",      "description": "커밋 메시지를 인라인으로 작성" },
          { "option": "--amend", "description": "직전 커밋 수정" }
        ]
      }
    ]
  }
}
```

---

## 4. 랭킹 (Ranking)

> 모든 랭킹 API는 **인증 필요**
> - 로그인 유저: `myRank` 필드 반환
> - 초기 진입 시 `cursor`, `size` 파라미터 생략 → `top3` + `myRank` + `around` 포함 응답
> - 무한 스크롤 시 `cursor`, `size` 포함 → `rankings` + `nextCursor` + `hasNext` 응답

### 4-1. 싱글 난이도별 랭킹 조회 (이번 주)

- 이번 주 랭킹은 **Redis Sorted Set** 기반으로 실시간 조회
- 주간 정산 시점: **매주 월요일 00:00**

```
GET /api/v1/rankings/single?difficulty={difficulty}&cursor={cursor}&size={size}
```

#### Query Parameters

| 파라미터 | 필수 | 설명 |
| --- | --- | --- |
| `difficulty` | ✅ | `EASY` / `NORMAL` / `HARD` |
| `cursor` | ❌ | 무한 스크롤 커서, 생략 시 초기 응답 |
| `size` | ❌ | 페이지 크기, 기본값 20 |

#### 초기 진입 Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `difficulty` | String | 난이도 |
| `year` | Integer | 현재 연도 |
| `month` | Integer | 현재 월 |
| `week` | Integer | 현재 주차 |
| `top3` | Array | 상위 3명 고정 노출 |
| `top3[].rank` | Integer | 순위 |
| `top3[].nickname` | String | 닉네임 |
| `top3[].score` | Integer | 점수 |
| `myRank` | Object | 내 랭킹 정보 |
| `myRank.rank` | Integer | 내 순위 |
| `myRank.score` | Integer | 내 점수 |
| `around` | Array | 내 랭킹 근처 유저 |
| `around[].rank` | Integer | 순위 |
| `around[].nickname` | String | 닉네임 |
| `around[].score` | Integer | 점수 |
| `nextCursor` | Integer | 다음 스크롤 시작 커서, null이면 마지막 |
| `hasNext` | Boolean | 다음 페이지 존재 여부 |

```json
{
  "status": 200,
  "message": "싱글 랭킹 조회 성공",
  "data": {
    "difficulty": "NORMAL",
    "year": 2025,
    "month": 4,
    "week": 3,
    "top3": [
      { "rank": 1, "nickname": "gitmas",  "score": 9800 },
      { "rank": 2, "nickname": "branch", "score": 9200 },
      { "rank": 3, "nickname": "mergel",  "score": 8700 }
    ],
    "myRank": { "rank": 42, "score": 7200 },
    "around": [
      { "rank": 40, "nickname": "user1",  "score": 7400 },
      { "rank": 41, "nickname": "user2",  "score": 7300 },
      { "rank": 42, "nickname": "dobby",  "score": 7200 },
      { "rank": 43, "nickname": "user3",  "score": 7100 },
      { "rank": 44, "nickname": "user4",  "score": 7000 }
    ],
    "nextCursor": 44,
    "hasNext": true
  }
}
```

#### 무한 스크롤 Request

```
GET /api/v1/rankings/single?difficulty=NORMAL&cursor=44&size=20
```

#### 무한 스크롤 Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `rankings` | Array | 랭킹 목록 |
| `rankings[].rank` | Integer | 순위 |
| `rankings[].nickname` | String | 닉네임 |
| `rankings[].score` | Integer | 점수 |
| `nextCursor` | Integer | 다음 커서, null이면 마지막 |
| `hasNext` | Boolean | 다음 페이지 존재 여부 |

```json
{
  "status": 200,
  "message": "싱글 랭킹 조회 성공",
  "data": {
    "rankings": [
      { "rank": 45, "nickname": "user5", "score": 6900 }
    ],
    "nextCursor": 64,
    "hasNext": true
  }
}
```

---

### 4-2. 기여도 뺏기 랭킹 조회 (이번 주)

- 응답 구조는 싱글 랭킹과 동일하지만 `difficulty` 필드 없음

```
GET /api/v1/rankings/speed?cursor={cursor}&size={size}
```

#### Query Parameters

| 파라미터 | 필수 | 설명 |
| --- | --- | --- |
| `cursor` | ❌ | 무한 스크롤 커서, 생략 시 초기 응답 |
| `size` | ❌ | 페이지 크기, 기본값 20 |

#### 초기 진입 Response 예시

```json
{
  "status": 200,
  "message": "스피드런 랭킹 조회 성공",
  "data": {
    "year": 2025,
    "month": 4,
    "week": 3,
    "top3": [
      { "rank": 1, "nickname": "speed", "contribution": 12000 },
      { "rank": 2, "nickname": "fast",  "contribution": 11500 },
      { "rank": 3, "nickname": "quick", "contribution": 10900 }
    ],
    "myRank": { "rank": 15, "contribution": 8800 },
    "around": [
      { "rank": 13, "nickname": "user1",  "contribution": 9100 },
      { "rank": 14, "nickname": "user2",  "contribution": 8900 },
      { "rank": 15, "nickname": "dobby",  "contribution": 8800 },
      { "rank": 16, "nickname": "user3",  "contribution": 8600 },
      { "rank": 17, "nickname": "user4",  "contribution": 8400 }
    ],
    "nextCursor": 17,
    "hasNext": true
  }
}
```

---

### 4-3. 타임어택 랭킹 조회 (이번 주)

- 응답 구조는 스피드런 랭킹과 동일

```
GET /api/v1/rankings/timeattack?cursor={cursor}&size={size}
```

#### Query Parameters

| 파라미터 | 필수 | 설명 |
| --- | --- | --- |
| `cursor` | ❌ | 무한 스크롤 커서, 생략 시 초기 응답 |
| `size` | ❌ | 페이지 크기, 기본값 20 |

#### 초기 진입 Response 예시

```json
{
  "status": 200,
  "message": "타임어택 랭킹 조회 성공",
  "data": {
    "year": 2025,
    "month": 4,
    "week": 3,
    "top3": [
      { "rank": 1, "nickname": "timema", "totalCount": 15000 },
      { "rank": 2, "nickname": "clock",  "totalCount": 14200 },
      { "rank": 3, "nickname": "tick",   "totalCount": 13800 }
    ],
    "myRank": { "rank": 7, "totalCount": 10500 },
    "around": [
      { "rank": 5, "nickname": "user1",  "totalCount": 11000 },
      { "rank": 6, "nickname": "user2",  "totalCount": 10700 },
      { "rank": 7, "nickname": "dobby",  "totalCount": 10500 },
      { "rank": 8, "nickname": "user3",  "totalCount": 10200 },
      { "rank": 9, "nickname": "user4",  "totalCount": 10000 }
    ],
    "nextCursor": 9,
    "hasNext": true
  }
}
```

---

### 4-4. 협력 랭킹 조회 (이번 주)

- `clearTime`은 **낮을수록 높은 순위**
- Redis 키는 맵마다 분리: `ranking:COOP:{mapId}:{week}`

```
GET /api/v1/rankings/coop?mapName={맵이름}&difficulty={맵난이도}&cursor={cursor}&size={size}
```

#### Query Parameters

| 파라미터 | 필수 | 설명 |
| --- | --- | --- |
| `mapName` | ✅ | 맵 이름 |
| `difficulty` | ✅ | 맵 난이도 |
| `cursor` | ❌ | 무한 스크롤 커서, 생략 시 초기 응답 |
| `size` | ❌ | 페이지 크기, 기본값 20 |

#### 초기 진입 Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `mapId` | Integer | 맵 ID |
| `mapName` | String | 맵 이름 |
| `year` | Integer | 현재 연도 |
| `month` | Integer | 현재 월 |
| `week` | Integer | 현재 주차 |
| `top3` | Array | 상위 3명 고정 노출 |
| `top3[].rank` | Integer | 순위 |
| `top3[].nickname` | String | 닉네임 |
| `top3[].clearTime` | Integer | 클리어 시간 (ms) |
| `myRank` | Object | 내 랭킹 정보 |
| `myRank.rank` | Integer | 내 순위 |
| `myRank.clearTime` | Integer | 내 클리어 시간 (ms) |
| `around` | Array | 내 랭킹 근처 유저 |
| `around[].rank` | Integer | 순위 |
| `around[].nickname` | String | 닉네임 |
| `around[].clearTime` | Integer | 클리어 시간 (ms) |
| `nextCursor` | Integer | 다음 커서, null이면 마지막 |
| `hasNext` | Boolean | 다음 페이지 존재 여부 |

```json
{
  "status": 200,
  "message": "협력 랭킹 조회 성공",
  "data": {
    "mapId": 1,
    "mapName": "기초 브랜치",
    "year": 2025,
    "month": 4,
    "week": 3,
    "top3": [
      { "rank": 1, "nickname": "coopma", "clearTime": 61000 },
      { "rank": 2, "nickname": "teamwo",   "clearTime": 65000 },
      { "rank": 3, "nickname": "syncpr",    "clearTime": 70000 }
    ],
    "myRank": { "rank": 5, "clearTime": 83000 },
    "around": [
      { "rank": 3, "nickname": "user1",  "clearTime": 79000 },
      { "rank": 4, "nickname": "user2",  "clearTime": 81000 },
      { "rank": 5, "nickname": "dobby",  "clearTime": 83000 },
      { "rank": 6, "nickname": "user3",  "clearTime": 85000 },
      { "rank": 7, "nickname": "user4",  "clearTime": 87000 }
    ],
    "nextCursor": 7,
    "hasNext": true
  }
}
```

---

### 4-5. 싱글 난이도별 랭킹 조회 (과거 주)

- 과거의 랭킹은 **RDB에서 조회**
- 이번 주 랭킹은 Redis Sorted Set 기반으로 실시간 조회하지만, 과거의 랭킹은 완료 후 저장된 RDB 데이터를 사용
- RDB 저장 시점: **매주 월요일 00:00**

```
GET /api/v1/rankings/single/history?difficulty={difficulty}&year={year}&month={month}&week={week}&cursor={cursor}&size={size}
```

#### Query Parameters

| 파라미터 | 필수 | 설명 |
| --- | --- | --- |
| `difficulty` | ✅ | `EASY` / `NORMAL` / `HARD` |
| `year` | ✅ | 조회할 연도, 예: `2025` |
| `month` | ✅ | 조회할 월, 예: `4` |
| `week` | ✅ | 조회할 주차, 예: `3` |
| `cursor` | ❌ | 무한 스크롤 커서, 생략 시 초기 응답 |
| `size` | ❌ | 페이지 크기, 기본값 20 |

#### 초기 진입 Response Fields

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `difficulty` | String | 난이도 |
| `year` | Integer | 조회 연도 |
| `month` | Integer | 조회 월 |
| `week` | Integer | 조회 주차 |
| `top3` | Array | 상위 3명 고정 노출 |
| `top3[].rank` | Integer | 순위 |
| `top3[].nickname` | String | 닉네임 |
| `top3[].score` | Integer | 점수 |
| `myRank` | Object | 내 랭킹 정보|
| `myRank.rank` | Integer | 내 순위 |
| `myRank.score` | Integer | 내 점수 |
| `around` | Array | 내 랭킹 근처 유저 |
| `around[].rank` | Integer | 순위 |
| `around[].nickname` | String | 닉네임 |
| `around[].score` | Integer | 점수 |
| `nextCursor` | Integer | 다음 스크롤 시작 커서, null이면 마지막 |
| `hasNext` | Boolean | 다음 페이지 존재 여부 |

#### 초기 진입 Response 예시

```json
{
  "status": 200,
  "message": "싱글 랭킹 조회 성공",
  "data": {
    "difficulty": "NORMAL",
    "year": 2025,
    "month": 4,
    "week": 3,
    "top3": [
      { "rank": 1, "nickname": "gitmas",  "score": 9800 },
      { "rank": 2, "nickname": "branc", "score": 9200 },
      { "rank": 3, "nickname": "merge",  "score": 8700 }
    ],
    "myRank": { "rank": 42, "score": 7200 },
    "around": [
      { "rank": 40, "nickname": "user1",  "score": 7400 },
      { "rank": 41, "nickname": "user2",  "score": 7300 },
      { "rank": 42, "nickname": "dobby",  "score": 7200 },
      { "rank": 43, "nickname": "user3",  "score": 7100 },
      { "rank": 44, "nickname": "user4",  "score": 7000 }
    ],
    "nextCursor": 44,
    "hasNext": true
  }
}
```

#### 무한 스크롤 Request

```
GET /api/v1/rankings/single/history?difficulty=NORMAL&year=2025&month=4&week=17&cursor=44&size=20
```

#### 무한 스크롤 Response Fields

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `rankings` | Array | 랭킹 목록 |
| `rankings[].rank` | Integer | 순위 |
| `rankings[].nickname` | String | 닉네임 |
| `rankings[].score` | Integer | 점수 |
| `nextCursor` | Integer | 다음 커서, null이면 마지막 |
| `hasNext` | Boolean | 다음 페이지 존재 여부 |

#### 무한 스크롤 Response 예시

```json
{
  "status": 200,
  "message": "싱글 랭킹 조회 성공",
  "data": {
    "rankings": [
      { "rank": 45, "nickname": "user5", "score": 6900 }
    ],
    "nextCursor": 64,
    "hasNext": true
  }
}
```

#### 무한 스크롤 Request

```
GET /api/v1/rankings/single/history?difficulty=NORMAL&year=2025&month=4&week=17&cursor=44&size=20
```

#### 무한 스크롤 Response 예시

```json
{
  "status": 200,
  "message": "싱글 랭킹 조회 성공",
  "data": {
    "rankings": [
      { "rank": 45, "nickname": "user5", "score": 6900 }
    ],
    "nextCursor": 64,
    "hasNext": true
  }
}
```

---

### 4-6. 기여도 뺏기 랭킹 조회 (과거 주)

```
GET /api/v1/rankings/speed/history?year={year}&month={month}&week={week}&cursor={cursor}&size={size}
```

#### Query Parameters

| 파라미터 | 필수 | 설명 |
| --- | --- | --- |
| `year` | ✅ | 조회할 연도, 예: `2025` |
| `month` | ✅ | 조회할 월, 예: `4` |
| `week` | ✅ | 조회할 주차, 예: `3` |
| `cursor` | ❌ | 무한 스크롤 커서, 생략 시 초기 응답 |
| `size` | ❌ | 페이지 크기, 기본값 20 |

#### 초기 진입 Response 예시

```json
{
  "status": 200,
  "message": "스피드런 랭킹 조회 성공",
  "data": {
    "year": 2025,
    "month": 4,
    "week": 3,
    "top3": [
      { "rank": 1, "nickname": "speed", "contribution": 12000 },
      { "rank": 2, "nickname": "fast",  "contribution": 11500 },
      { "rank": 3, "nickname": "quick", "contribution": 10900 }
    ],
    "myRank": { "rank": 15, "contribution": 8800 },
    "around": [
      { "rank": 13, "nickname": "user1",  "contribution": 9100 },
      { "rank": 14, "nickname": "user2",  "contribution": 8900 },
      { "rank": 15, "nickname": "dobby",  "contribution": 8800 },
      { "rank": 16, "nickname": "user3",  "contribution": 8600 },
      { "rank": 17, "nickname": "user4",  "contribution": 8400 }
    ],
    "nextCursor": 17,
    "hasNext": true
  }
}
```

#### 무한 스크롤 Request

```
GET /api/v1/rankings/speed/history?year=2025&month=4&week=17&cursor=17&size=20
```

#### 무한 스크롤 Response 예시

```json
{
  "status": 200,
  "message": "스피드런 랭킹 조회 성공",
  "data": {
    "rankings": [
      { "rank": 18, "nickname": "user5", "contribution": 8200 }
    ],
    "nextCursor": 37,
    "hasNext": true
  }
}
```

---

### 4-7. 타임어택 랭킹 조회 (과거 주)

```
GET /api/v1/rankings/timeattack/history?year={year}&month={month}&week={week}&cursor={cursor}&size={size}
```

#### Query Parameters

| 파라미터 | 필수 | 설명 |
| --- | --- | --- |
| `year` | ✅ | 조회할 연도, 예: `2025` |
| `month` | ✅ | 조회할 월, 예: `4` |
| `week` | ✅ | 조회할 주차, 예: `3` |
| `cursor` | ❌ | 무한 스크롤 커서, 생략 시 초기 응답 |
| `size` | ❌ | 페이지 크기, 기본값 20 |

#### 초기 진입 Response 예시

```json
{
  "status": 200,
  "message": "타임어택 랭킹 조회 성공",
  "data": {
    "year": 2025,
    "month": 4,
    "week": 3,
    "top3": [
      { "rank": 1, "nickname": "time", "totalCount": 15000 },
      { "rank": 2, "nickname": "cloc",  "totalCount": 14200 },
      { "rank": 3, "nickname": "tick",   "totalCount": 13800 }
    ],
    "myRank": { "rank": 7, "totalCount": 10500 },
    "around": [
      { "rank": 5, "nickname": "user1",  "totalCount": 11000 },
      { "rank": 6, "nickname": "user2",  "totalCount": 10700 },
      { "rank": 7, "nickname": "dobby",  "totalCount": 10500 },
      { "rank": 8, "nickname": "user3",  "totalCount": 10200 },
      { "rank": 9, "nickname": "user4",  "totalCount": 10000 }
    ],
    "nextCursor": 9,
    "hasNext": true
  }
}
```

#### 무한 스크롤 Request

```
GET /api/v1/rankings/timeattack/history?year=2025&month=4&week=17&cursor=9&size=20
```

#### 무한 스크롤 Response 예시

```json
{
  "status": 200,
  "message": "타임어택 랭킹 조회 성공",
  "data": {
    "rankings": [
      { "rank": 10, "nickname": "user5", "totalCount": 9800 }
    ],
    "nextCursor": 29,
    "hasNext": true
  }
}
```

---

### 4-8. 협력 랭킹 조회 (과거 주)

```
GET /api/v1/rankings/coop/history?mapId={mapId}&year={year}&month={month}&week={week}&cursor={cursor}&size={size}
```

#### Query Parameters

| 파라미터 | 필수 | 설명 |
| --- | --- | --- |
| `mapId` | ✅ | 맵 ID |
| `year` | ✅ | 조회할 연도, 예: `2025` |
| `month` | ✅ | 조회할 월, 예: `4` |
| `week` | ✅ | 조회할 주차, 예: `3` |
| `cursor` | ❌ | 무한 스크롤 커서, 생략 시 초기 응답 |
| `size` | ❌ | 페이지 크기, 기본값 20 |

#### 초기 진입 Response 예시

```json
{
  "status": 200,
  "message": "협력 랭킹 조회 성공",
  "data": {
    "mapId": 1,
    "mapName": "기초 브랜치",
    "year": 2025,
    "month": 4,
    "week": 3,
    "top3": [
      { "rank": 1, "nickname": "coopm", "clearTime": 61000 },
      { "rank": 2, "nickname": "team",   "clearTime": 65000 },
      { "rank": 3, "nickname": "sync",    "clearTime": 70000 }
    ],
    "myRank": { "rank": 5, "clearTime": 83000 },
    "around": [
      { "rank": 3, "nickname": "user1",  "clearTime": 79000 },
      { "rank": 4, "nickname": "user2",  "clearTime": 81000 },
      { "rank": 5, "nickname": "dobby",  "clearTime": 83000 },
      { "rank": 6, "nickname": "user3",  "clearTime": 85000 },
      { "rank": 7, "nickname": "user4",  "clearTime": 87000 }
    ],
    "nextCursor": 7,
    "hasNext": true
  }
}
```

#### 무한 스크롤 Request

```
GET /api/v1/rankings/coop/history?mapId=1&year=2025&month=4&week=17&cursor=7&size=20
```

#### 무한 스크롤 Response 예시

```json
{
  "status": 200,
  "message": "협력 랭킹 조회 성공",
  "data": {
    "rankings": [
      { "rank": 8, "nickname": "user5", "clearTime": 89000 }
    ],
    "nextCursor": 27,
    "hasNext": true
  }
}
```

---

### Redis 키 설계

| 모드 | Redis 키 패턴 |
| --- | --- |
| 싱글 Easy / Normal / Hard | `ranking:SINGLE_{difficulty}:{yyyy-Www}` |
| 기여도 뺏기 | `ranking:SPEED_RUN:{yyyy-Www}` |
| 타임어택 | `ranking:TIME_ATTACK:{yyyy-Www}` |
| 협력 | `ranking:COOP:{mapId}:{yyyy-Www}` |

### 주간 정산 스케줄러

**실행 시점**: 매주 월요일 00:00

**처리 순서**

1. Redis 랭킹 데이터 전체 조회
2. RDB `weekly_ranking` 테이블 저장
3. Redis 랭킹 키 삭제

---

## 5. 싱글 게임 (Single)

### 5-1. 싱글 게임 세션 시작

```
POST /api/v1/single/sessions
```

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `difficulty` | String | Y | `EASY` / `NORMAL` / `HARD` |

```json
{
  "difficulty": "NORMAL"
}
```

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `sessionId` | String | 세션 ID |
| `difficulty` | String | 난이도 |
| `bestScore` | Integer | 해당 난이도 내 최고 점수 |
| `commandSet` | Array | 암호화된 명령어 목록 |
| `commandSet[].commandSequence` | Integer | 명령어 식별자 |
| `commandSet[].text` | String | 명령어 전체 텍스트 |
| `commandSet[].branchName` | String | 브랜치 이름 |
| `commandSet[].type` | String | 명령어 타입 (`CREATE` / `MERGE` / `COMMON`) |

**type 분류 기준**
- `CREATE` : `git switch -c`, `git checkout -b` 등 브랜치 생성 명령어
- `MERGE` : `git merge` 명령어
- `COMMON` : 그 외 모든 명령어

```json
{
  "status": 200,
  "message": "싱글 게임 세션 생성 성공",
  "data": {
    "sessionId": "session-uuid-abc123",
    "difficulty": "NORMAL",
    "bestScore": 7200,
    "commandSet": [
      {
        "commandSequence": 0,
        "text": "git commit -m 'fix login bug'",
        "branchName": "main",
        "type": "COMMON"
      },
      {
        "commandSequence": 1,
        "text": "git switch -c feature/login",
        "branchName": "feature/login",
        "type": "CREATE"
      },
      {
        "commandSequence": 2,
        "text": "git merge feature/login",
        "branchName": "main",
        "type": "MERGE"
      }
    ]
  }
}
```

---

### 5-2. 싱글 게임 결과 저장

```
POST /api/v1/single/sessions/{sessionId}/result
```

> 점수 및 등급 계산은 프론트에서 처리 후 전송. 서버는 저장 및 랭킹 업데이트만 처리.
> 서버는 받은 점수가 해당 유저의 최고 점수보다 높으면 `isNewRecord: true`를 반환합니다.

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `status` | String | Y | `SUCCESS` / `GAMEOVER` |
| `score` | Integer | Y | 최종 점수 (프론트 계산값) |
| `playTime` | Integer | Y | 플레이 시간 (ms) |
| `grade` | String | Y | 등급 `S` / `A` / `B` / `C` / `D` |
| `sessionId` | UUID | Y | 세션 ID |

```json
{
  "status": "SUCCESS",
  "score": 8500,
  "playTime": 143000,
  "grade": "A",
  "sessionId": "session-uuid-abc123"
}
```

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `isNewRecord` | Boolean | 최고 기록 갱신 여부 |

```json
{
  "status": 200,
  "message": "게임 결과 저장 성공",
  "data": {
    "isNewRecord": true
  }
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `SESSION_NOT_FOUND` | 세션 없음 |
| `SESSION_EXPIRED` | 세션 만료 |
| `ALREADY_FINISHED` | 이미 종료된 세션 |

---

## 6. 방 관리 (Room)

### 6-1. 방 생성

```
POST /api/v1/rooms
```

> 협력 모드는 `maxPlayers` 고정 4명 (요청 필드 불필요)

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `title` | String | Y | 방 제목 |
| `mode` | String | Y | `CONTRIBUTION_RUN` / `TIME_ATTACK` / `COOP` |
| `maxPlayers` | Integer | N | 최대 인원 수 (경쟁 모드만. 기본값 4) |
| `hasPassword` | Boolean | Y | 비밀번호 설정 여부 |
| `password` | String | N | 비밀번호 (`hasPassword: true`일 때 필수) |

```json
// 스피드런 / 타임어택
{
  "title": "같이 스피드런 해요!",
  "mode": "CONTRIBUTION_RUN",
  "maxPlayers": 4,
  "hasPassword": true,
  "password": "1234"
}

// 협력 모드 (maxPlayers 불필요)
{
  "title": "협력 모드 같이해요!",
  "mode": "COOP",
  "hasPassword": false
}
```

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `roomId` | Integer | 방 ID |
| `roomCode` | String | 랜덤 방 코드 |
| `title` | String | 방 제목 |
| `mode` | String | 게임 모드 |
| `maxPlayers` | Integer | 최대 인원 수 |
| `hasPassword` | Boolean | 비밀번호 설정 여부 |

```json
{
  "status": 201,
  "message": "방 생성 성공",
  "data": {
    "roomId": 42,
    "roomCode": "A3F9KX",
    "title": "같이 스피드런 해요!",
    "mode": "CONTRIBUTION_RUN",
    "maxPlayers": 4,
    "hasPassword": true
  }
}
```

---

### 6-2. 방 목록 조회

```
GET /api/v1/rooms?mode={mode}
```

> `mode`: `ALL` / `CONTRIBUTION_RUN` / `TIME_ATTACK` / `COOP` (기본값 `ALL`). 인증 불필요.

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `rooms` | Array | 방 목록 |
| `rooms[].roomId` | Integer | 방 ID |
| `rooms[].title` | String | 방 제목 |
| `rooms[].mode` | String | 게임 모드 |
| `rooms[].currentPlayers` | Integer | 현재 인원 수 |
| `rooms[].maxPlayers` | Integer | 최대 인원 수 |
| `rooms[].hasPassword` | Boolean | 비밀방 여부 |
| `rooms[].status` | String | `WAITING` / `IN_GAME` |

```json
{
  "status": 200,
  "message": "방 목록 조회 성공",
  "data": {
    "rooms": [
      {
        "roomId": 42,
        "title": "같이 스피드런 해요!",
        "mode": "CONTRIBUTION_RUN",
        "currentPlayers": 2,
        "maxPlayers": 4,
        "hasPassword": false,
        "status": "WAITING"
      }
    ]
  }
}
```

---

### 6-3. 방 코드로 검색

```
GET /api/v1/rooms?code={code}
```

#### Query Parameters

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `code` | String | 방 코드 (6자리 영문+숫자) |

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `roomId` | Integer | 방 ID |
| `title` | String | 방 제목 |
| `mode` | String | 게임 모드 |
| `currentPlayers` | Integer | 현재 인원 수 |
| `maxPlayers` | Integer | 최대 인원 수 |
| `hasPassword` | Boolean | 비밀방 여부 |
| `status` | String | `WAITING` / `IN_GAME` |

```json
{
  "status": 200,
  "message": "방 코드로 검색 성공",
  "data": {
    "roomId": 42,
    "title": "같이 스피드런 해요!",
    "mode": "CONTRIBUTION_RUN",
    "currentPlayers": 2,
    "maxPlayers": 4,
    "hasPassword": true,
    "status": "WAITING"
  }
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `ROOM_NOT_FOUND` | 존재하지 않는 방 코드 |
| `ROOM_IN_GAME` | 이미 게임 중인 방 |

---

### 6-4. 비밀번호 검증

```
POST /api/v1/rooms/{roomId}/password/verify
```

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `password` | String | Y | 비밀번호 |

```json
{
  "password": "1234"
}
```

#### Response

```json
{
  "status": 200,
  "message": "비밀번호 확인 성공",
  "data": {
    "verified": true
  }
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `INVALID_PASSWORD` | 비밀번호 불일치 |
| `ROOM_NOT_FOUND` | 존재하지 않는 방 |

---

### 6-5. 방 입장

```
POST /api/v1/rooms/{roomId}/join
```

#### Response

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `roomId` | Integer | 방 ID |
| `roomCode` | String | 방 코드 |
| `title` | String | 방 제목 |
| `mode` | String | 게임 모드 |
| `currentPlayers` | Integer | 현재 인원 수 |
| `maxPlayers` | Integer | 최대 인원 수 |
| `members` | Array | 현재 참여 인원 목록 |
| `members[].playerId` | UUID | 플레이어 ID |
| `members[].nickname` | String | 닉네임 |
| `members[].characterHair` | String | 캐릭터 머리 에셋 ID |
| `members[].characterHairColor` | String | 캐릭터 머리색 에셋 ID |
| `members[].characterBody` | String | 캐릭터 스킨 에셋 ID |
| `members[].characterEye` | String | 캐릭터 눈 ID |
| `members[].characterOutfit` | String | 캐릭터 옷 ID |
| `members[].characterOutfitColor` | String | 캐릭터 옷색 ID |
| `members[].isHost` | Boolean | 방장 여부 |
| `members[].isMe` | Boolean | 나 여부 |
| `mapList` | Array | 맵 목록 (협력 모드만, 그 외 `[]`) |
| `mapList[].mapName` | String | 맵 이름 |
| `mapList[].difficulty` | String | 맵 난이도 |

```json
{
  "status": 200,
  "message": "방 입장 성공",
  "data": {
    "roomId": 42,
    "roomCode": "A3F9KX",
    "title": "같이 스피드런 해요!",
    "mode": "CONTRIBUTION_RUN",
    "currentPlayers": 3,
    "maxPlayers": 4,
    "members": [
      {
        "playerId": "550e8400-...-0000",
        "nickname": "dobby",
        "characterHair": "hair_01",
        "characterHairColor": "color_black",
        "characterBody": "body_default",
        "characterEye": "eye_01",
        "characterOutfit": "outfit_01",
        "characterOutfitColor": "color_white",
        "isHost": true,
        "isMe": false
      },
      {
        "playerId": "550e8400-...-0001",
        "nickname": "alice",
        "characterHair": "hair_01",
        "characterHairColor": "color_black",
        "characterBody": "body_default",
        "characterEye": "eye_01",
        "characterOutfit": "outfit_01",
        "characterOutfitColor": "color_white",
        "isHost": false,
        "isMe": true
      }
    ],
    "mapList": []
  }
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `ROOM_NOT_FOUND` | 존재하지 않는 방 |
| `ROOM_FULL` | 방 인원 초과 |
| `ROOM_IN_GAME` | 이미 게임 중인 방 |

---

### 6-6. 방 나가기

```
DELETE /api/v1/rooms/{roomId}/leave
```

#### Response

```json
{
  "status": 200,
  "message": "방 나가기 성공",
  "data": {}
}
```

---

### 6-7. 방 정보 수정 (방장만)

```
PATCH /api/v1/rooms/{roomId}
```

> 협력 모드에서 `maxPlayers` 수정 불가

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `title` | String | Y | 방 제목 |
| `hasPassword` | Boolean | Y | 비밀번호 설정 여부 |
| `password` | String | N | 비밀번호 |
| `maxPlayers` | Integer | N | 최대 인원 수 (경쟁 모드만) |

```json
{
  "title": "변경된 방 제목",
  "hasPassword": false,
  "maxPlayers": 2
}
```

#### Response

```json
{
  "status": 200,
  "message": "방 정보 수정 성공",
  "data": {}
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `NOT_HOST` | 방장이 아님 |

---

### 6-8. 추방 (방장만)

```
DELETE /api/v1/rooms/{roomId}/members/{playerId}
```

#### Response

```json
{
  "status": 200,
  "message": "추방 성공",
  "data": {}
}
```

#### 에러 코드

| 코드 | 설명 |
| --- | --- |
| `NOT_HOST` | 방장이 아님 |
| `PLAYER_NOT_FOUND` | 해당 플레이어 없음 |

---

## 7. 튜토리얼 (Tutorial)

### 7-1. 튜토리얼 명령어 셋 조회

```
GET /api/v1/tutorial
```

> 인증 불필요. Request Body 없음.

#### Response Fields

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `steps` | `Array` | 튜토리얼 단계 목록 (총 13단계) |
| `steps[].order` | `Integer` | 단계 순서 (1~13) |
| `steps[].title` | `String` | 단계 제목 |
| `steps[].description` | `String` | 단계 설명 (화면 표시용 안내 문구) |
| `steps[].commands` | `Array` | 해당 단계에서 입력할 명령어 목록 |
| `commands[].sequence` | `Integer` | 전체 명령어 입력 순서 (1~14, 전역 시퀀스) |
| `commands[].command` | `String` | 사용자가 실제로 입력해야 하는 명령어 (정답) |
| `commands[].explanation` | `String` | 명령어 의미 설명 (툴팁 또는 하단 표시용) |

#### 튜토리얼 명령어 셋 (전체 13단계 · 14개 명령어)

| 단계 | 제목 | 명령어 | 핵심 포인트 |
| --- | --- | --- | --- |
| 1 | 게임 시작 | `git clone https://github.com/gitcat/project.git` | 모든 모드의 게임 진입점 |
| 2 | 새 브랜치 만들기 (checkout) | `git checkout -b feature/login` | 브랜치 생성 + 이동 동시에 |
| 3 | 변경 사항 스테이징 | `git add .` | 전체 파일 스테이징 |
| 4 | 커밋하기 | `git commit -m "feat: add login page"` | 변경 기록 저장 |
| 5 | 원격 저장소에 올리기 | `git push origin feature/login` | 브랜치 푸시 |
| 6 | 브랜치 이동하기 (checkout) | `git checkout main` | `-b` 없이 기존 브랜치 이동 |
| 7 | 새 브랜치 만들기 (switch) | `git switch -c feature/signup` | `checkout -b`와 동일 기능, 최신 문법 |
| 8 | 변경 사항 스테이징 | `git add .` | 전체 파일 스테이징 |
| 9 | 커밋하기 | `git commit -m "feat: add signup page"` | 변경 기록 저장 |
| 10 | 원격 저장소에 올리기 | `git push origin feature/signup` | 브랜치 푸시 |
| 11 | 브랜치 이동하기 (switch) | `git switch main` | `checkout`과 동일 기능, 최신 문법 |
| 12 | 브랜치 합치기 | `git merge feature/login`<br>`git merge feature/signup` | 두 브랜치 순서대로 머지 |
| 13 | 최종 반영 | `git push origin main` | 머지된 main 최종 푸시 |

#### Response 예시

```json
{
  "status": 200,
  "message": "튜토리얼 조회 성공",
  "data": {
    "steps": [
      {
        "order": 1,
        "title": "게임 시작",
        "description": "프로젝트를 가져오는 것부터 시작해요. git clone으로 게임을 시작합니다.",
        "commands": [
          {
            "sequence": 1,
            "command": "git clone https://github.com/gitcat/project.git",
            "explanation": "원격 저장소를 내 컴퓨터로 복사합니다. 모든 모드는 이 명령어로 시작해요."
          }
        ]
      },
      {
        "order": 12,
        "title": "브랜치 합치기",
        "description": "작업한 브랜치들을 main에 합쳐봐요.",
        "commands": [
          {
            "sequence": 1,
            "command": "git merge feature/login",
            "explanation": "다른 브랜치의 작업 내용을 현재 브랜치로 가져와 합칩니다."
          },
          {
            "sequence": 2,
            "command": "git merge feature/signup",
            "explanation": "두 번째 브랜치도 동일하게 머지합니다."
          }
        ]
      }
    ]
  }
}
```

#### 에러 코드

| 에러 코드 | HTTP Status | 발생 조건 |
| --- | --- | --- |
| `INTERNAL_ERROR` | 500 | 서버 내부 오류 |

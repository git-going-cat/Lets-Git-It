# Claude CLI 온보딩 가이드

> 이 문서는 팀원들이 Claude CLI를 프로젝트에서 효과적으로 활용할 수 있도록 작성된 가이드입니다.

---

## 목차

1. [시작하기 전에](#1-시작하기-전에)
2. [docs 폴더 구조 및 파일 설명](#2-docs-폴더-구조-및-파일-설명)
3. [@ 로 파일·폴더 참조하기](#3--로-파일폴더-참조하기)
4. [작업 시작 전 필수 프롬프트](#4-작업-시작-전-필수-프롬프트)
5. [구현 문서 작성 요청하기](#5-구현-문서-작성-요청하기)
6. [/compact 로 토큰 절약하기](#6-compact-로-토큰-절약하기)
7. [꿀팁 모음](#7-꿀팁-모음)

---

## 1. 시작하기 전에

Claude CLI는 터미널에서 Claude와 대화하며 코드 작성·탐색·문서화 등을 함께 수행하는 도구입니다.  
**반드시 프로젝트 루트 디렉토리(`S14P31A304/`)에서 실행하세요.**

```bash
# 프로젝트 루트로 이동 후 실행
cd S14P31A304
claude
```

---

## 2. docs 폴더 구조 및 파일 설명

```
docs/
├── 00_ONBOARDING/          # 개발 규칙·컨벤션·기술 스택 등 신규 팀원 필수 숙지 문서
├── 10_ARCHITECTURE/        # 시스템 설계·ERD·API 명세 등 아키텍처 문서
├── 30_MODULES/             # 모듈별 구현 결과·트러블슈팅 기록 (작업 후 Claude에게 작성 요청)
├── 90_AGENTS/              # Claude 에이전트 전용 규칙·가이드
└── HOW_TO_USE_CLI_ONBOARDING.md   # 이 파일 (Claude CLI 사용 가이드)
```

### 00_ONBOARDING — 개발 시작 전 필독

| 파일 | 설명 |
|------|------|
| `CODING_STANDARD.md` | 엔티티·Repository·Service·DTO·Exception·테스트·로깅 등 백엔드 코딩 표준 전반 |
| `CONVENTION.md` | Git Flow, 브랜치 네이밍, PR 규칙, Jira 계층, 코드 리뷰 체크리스트 |
| `GUIDE_COMMIT.md` | 커밋 PREFIX·Type·메시지 형식, 한 커밋 = 하나의 논리적 변경사항 원칙 |
| `TECH_STACK.md` | 프로젝트 전체 기술 스택 (BE: Spring Boot 3.5 / FE: React 19 + Phaser 4) |
| `TESTING_POLICY.md` | 단위·통합 테스트 방침, 한글 메서드명 + Given/When/Then 형식 |

### 10_ARCHITECTURE — 설계 참고용

| 파일 | 설명 |
|------|------|
| `ERD.md` | 전체 테이블 DDL (UUID BINARY(16) 저장, snake_case 네이밍) |
| `GIT_TYPING_GAME_SPEC.md` | 게임 모드별 상세 스펙 (싱글·기여도 뺏기·타임어택·협력) |
| `PROJECT_STRUCTURE.md` | 패키지 구조, 4-File DIP Repository 패턴, 의존성 방향 |
| `RESPONSE_EXCEPTION.md` | ApiResponse·ErrorResponse 공통 포맷, ErrorCode 목록 |
| `REST_API.md` | 전체 REST API 명세 (인증·회원·도감·랭킹·싱글·방·튜토리얼) |
| `WEBSOCKET_API.md` | STOMP 기반 WebSocket 명세 (발행·구독 경로, 이벤트 타입 40+) |

### 30_MODULES — 작업 기록 저장소

모듈별 구현 완료 내용·트러블슈팅·설계 결정 사항을 Claude에게 요청해 기록합니다.

```
30_MODULES/
├── BE/     # 백엔드 구현 문서
├── FE/     # 프론트엔드 구현 문서
└── AI/     # AI 관련 구현 문서
```

### 90_AGENTS — Claude 에이전트 규칙

| 파일 | 설명 |
|------|------|
| `CLAUDE.md` | Claude가 반드시 지켜야 할 제약사항·워크플로우 정의 |
| `COMMON_RULES.md` | 커밋 규칙, 구현 문서 작성 템플릿·필수 섹션, 30_MODULES 활용법 |
| `DB_GUIDE.md` | UUID 변환, 시간 단위(ms), Soft Delete, Redis 키 네이밍 등 DB 주의사항 |

---

## 3. @ 로 파일·폴더 참조하기

`@` 뒤에 경로를 입력하면 해당 파일·폴더를 Claude의 컨텍스트에 포함시킬 수 있습니다.

```
# 특정 파일 참조
@docs/10_ARCHITECTURE/REST_API.md 이 API 명세를 기반으로 Controller를 작성해줘.

# 폴더 전체 참조
@backend/src/main/java/com/gitcat/letsgitit/domain/member 이 도메인 구조를 분석해줘.

# 여러 파일 동시 참조
@docs/10_ARCHITECTURE/PROJECT_STRUCTURE.md @docs/00_ONBOARDING/CODING_STANDARD.md
위 문서를 참고해서 ranking 도메인 패키지 구조를 만들어줘.
```

**주의:** 폴더를 참조할 때는 하위 파일이 많으면 컨텍스트가 커집니다. 필요한 파일만 골라 참조하는 게 효율적입니다.

---

## 4. 작업 시작 전 필수 프롬프트

**모든 작업 세션은 아래 프롬프트로 시작하세요.**  
Claude가 프로젝트 규칙·아키텍처·컨벤션을 숙지한 상태에서 작업하도록 만들어 줍니다.

```
@docs 하단 파일들 모두 숙지해줘.
```

이 한 줄로 Claude는 docs 전체(컨벤션, 아키텍처, API 명세, 에이전트 규칙 등)를 읽고 작업 준비를 마칩니다.

이후 작업 지시를 이어서 입력하면 됩니다.

```
@docs 하단 파일들 모두 숙지해줘.

숙지 완료하면 ranking 도메인의 Service, Repository 계층을 구현해줘.
```

---

## 5. 구현 문서 작성 요청하기

작업이 끝난 후 Claude에게 구현 내용을 문서로 정리해달라고 요청하면 `docs/30_MODULES` 하위에 저장됩니다.  
트러블슈팅, 설계 결정 이유, 주의사항 등을 팀 전체가 공유할 수 있게 됩니다.

```
방금 구현한 랭킹 집계 로직에 대해서 트러블슈팅 내용과 설계 결정 사항을
docs/30_MODULES/BE 하단에 md 형식으로 정리해줘.
```

문서는 아래 템플릿을 따라 작성됩니다 (`COMMON_RULES.md` 기준):

```
docs/30_MODULES/{BE|FE|AI}/{Domain}/IMPLEMENTATION_{기능명}.md
```

| 섹션 | 필수 여부 | 내용 |
|------|-----------|------|
| Background / Context | 필수 | 왜 이 작업을 했는지, 어떤 문제를 해결하는지 |
| Decision | 필수 | 어떤 방식으로 구현했는지, 왜 이 방법을 선택했는지 |
| Why | 권장 | 다른 선택지와 비교한 이유 |
| Caution | 권장 | 사용 시 주의사항, 알려진 제약 |
| Test Plan | 권장 | 검증 방법·테스트 시나리오 |

---

## 6. /compact 로 토큰 절약하기

대화가 길어지면 컨텍스트 윈도우가 가득 찹니다. `/compact`를 사용하면 이전 대화를 압축해 토큰을 절약하고 작업을 이어갈 수 있습니다.

```
/compact 로그인 API 연동
/compact 랭킹 집계 서비스 구현
/compact WebSocket 기여도 뺏기 모드 핸들러 작성
```

**언제 쓰면 좋나요?**
- 한 세션에서 작업을 오래 이어갈 때
- "컨텍스트가 길어졌습니다" 경고가 뜰 때
- 새로운 서브 태스크로 전환할 때

`/compact` 뒤에 **현재 작업 내용을 한 줄로 요약**해서 적으면 압축 후에도 Claude가 흐름을 유지합니다.

---

## 7. 꿀팁 모음

### 작업 범위를 좁게 지정하기

범위가 넓으면 Claude가 불필요한 파일까지 수정할 수 있습니다. 도메인·파일·메서드 단위로 좁게 지정하세요.

```
# 범위가 넓은 요청 (주의)
랭킹 기능 만들어줘.

# 범위를 좁힌 요청 (권장)
@docs/10_ARCHITECTURE/PROJECT_STRUCTURE.md 를 참고해서
RankingService 인터페이스와 RankingServiceImpl 클래스만 작성해줘.
비즈니스 로직은 주간 랭킹 조회(getSingleRanking)부터 시작해.
```

### 커밋 메시지 생성 요청

```
방금 작업한 내용을 GUIDE_COMMIT.md 컨벤션에 맞게 커밋 메시지 초안 작성해줘.
```

### 코드 리뷰 요청

```
@backend/src/main/java/com/gitcat/letsgitit/domain/ranking
이 디렉토리의 코드를 @docs/00_ONBOARDING/CODING_STANDARD.md 기준으로 리뷰해줘.
```

### 에러 디버깅

```
아래 에러 로그를 분석해서 원인과 해결 방법을 알려줘.

[에러 로그 붙여넣기]
```

### API 명세 기반 구현

```
@docs/10_ARCHITECTURE/REST_API.md 의 "6. 방 관리" 섹션을 참고해서
RoomController를 @docs/00_ONBOARDING/CODING_STANDARD.md 표준에 맞게 구현해줘.
```

### WebSocket 핸들러 구현

```
@docs/10_ARCHITECTURE/WEBSOCKET_API.md 의 협력 모드 이벤트 명세를 참고해서
CoopHandler를 작성해줘. Redis Pub/Sub 연동 포함해줘.
```

### 특정 규칙만 적용하고 싶을 때

docs 전체 대신 필요한 파일만 지정하면 더 빠르고 정확합니다.

```
# 커밋 규칙만 참고
@docs/00_ONBOARDING/GUIDE_COMMIT.md 이 규칙에 맞게 커밋 메시지 작성해줘.

# DB 규칙만 참고
@docs/90_AGENTS/DB_GUIDE.md 이 가이드를 따라 UUID 처리 방식이 올바른지 검토해줘.
```

### 구현 전에 계획 확인하기

Claude가 바로 코드를 작성하기 전에 계획을 먼저 확인하면 방향이 틀리는 것을 방지할 수 있습니다.

```
구현 전에 어떤 순서로 작업할 건지 계획만 먼저 알려줘. 코드는 아직 쓰지 마.
```

---

## 참고

- 에이전트 규칙 전체: `docs/90_AGENTS/CLAUDE.md`
- 구현 문서 작성 규칙: `docs/90_AGENTS/COMMON_RULES.md`
- DB 작업 주의사항: `docs/90_AGENTS/DB_GUIDE.md`

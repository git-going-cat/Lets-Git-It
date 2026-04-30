# Let's Git it 협업 컨벤션 (Collaboration Convention)

<role_definition>
이 문서는 Let's Git it 프로젝트의 모든 팀원이 준수해야 하는 협업 컨벤션입니다. Git 워크플로우, 이슈/PR 관리, 브랜치 전략을 정의하며, 효율적인 협업과 코드 품질 유지를 위한 필수 규칙을 제시합니다.

**적용 대상:**
- 모든 프로젝트 기여자 (백엔드, 프론트엔드)
- GitHub Issue, Pull Request, Git Commit 작업
- CI/CD 파이프라인 설정 및 관리
  </role_definition>

---

## 목차
1. [브랜치 전략 (Git Flow)](#1-브랜치-전략-git-flow)
2. [Git Commit 컨벤션](#2-git-commit-컨벤션)
3. [Pull Request 규칙](#3-pull-request-규칙)
4. [Jira 이슈 관리](#4-jira-이슈-관리)
5. [기술 스택](#5-기술-스택)
6. [코드 리뷰 체크리스트](#6-코드-리뷰-체크리스트)

---

## 1. 브랜치 전략 (Git Flow)

### 1.1. 브랜치 구조

    main     ────────────────●(tag v1.0)────────
                ▲         ┌─── release/1.0 ───┐
                │         └─────────┬─────────┘
    develop  ───┼─────┬─────────────┴────────────
                ├─ feat/BE-127-회원가입 ───┘
                └─ feat/FE-128-로그인UI ────┘
    hotfix/*: main에서 급하게 따서 main+develop에 반영

### 1.2. 브랜치 종류 및 역할

| 브랜치 | 설명 | 생성 기준 | 병합 대상 |
|--------|------|-----------|-----------|
| main | 운영 서버 배포 브랜치 (안정 버전만 유지) | - | - |
| release | 배포 준비 브랜치 (테스트 서버 배포 및 QA) | develop | main, develop |
| develop | 개발 통합 브랜치 (배포 전 최종 테스트) | main | main (via release) |
| feat/BE-{ticket}-{기능} | 백엔드 기능 개발 | develop | develop |
| feat/FE-{ticket}-{기능} | 프론트엔드 기능 개발 | develop | develop |
| fix/BE-{ticket}-{기능} | 백엔드 버그 수정 | develop | develop |
| fix/FE-{ticket}-{기능} | 프론트엔드 버그 수정 | develop | develop |
| hotfix/{기능설명} | 긴급 버그 수정 | main | main, develop |

### 1.3. 브랜치 네이밍 규칙

**백엔드**

    feat/BE-127-회원가입
    feat/BE-145-소셜로그인
    fix/BE-156-토큰만료처리

**프론트엔드**

    feat/FE-128-로그인UI
    feat/FE-149-게임화면
    fix/FE-157-모달닫힘오류

**Hotfix**

    hotfix/랭킹정산오류수정
    hotfix/웹소켓연결끊김수정

### 1.4. 브랜치 생성 방법

**Jira 이슈 화면에서 브랜치 생성**
1. Jira Task 화면에서 [Create Branch] 클릭
2. 브랜치 이름이 자동으로 Jira 이슈 번호 포함하여 생성됨
3. Jira 이슈와 Git 브랜치 자동 연결 유지

**로컬에서 직접 생성 (수동)**

    # develop 브랜치에서 feature 브랜치 생성
    git checkout develop
    git pull origin develop
    git checkout -b feat/BE-127-회원가입
    
    # 작업 완료 후 push
    git push origin feat/BE-127-회원가입

### 1.5. 브랜치 삭제 규칙

- develop 또는 main에 병합 완료된 feat/fix 브랜치는 **즉시 삭제**
- main, develop, release 브랜치는 **절대 삭제 금지**

---

## 2. Git Commit 컨벤션

### 2.1. Commit Message 형식

    [PREFIX] type: 제목
    
    본문 (선택사항)

### 2.2. PREFIX 종류

| PREFIX | 설명 |
|--------|------|
| [BE] | 백엔드 관련 커밋 |
| [FE] | 프론트엔드 관련 커밋 |

### 2.3. Type 종류

| Type | 설명 | 예시 |
|------|------|------|
| feat | 새로운 기능 추가 (디자인 포함) | [BE] feat: 이메일 인증 코드 발송 기능 추가 |
| fix | 버그 수정 | [FE] fix: 로그인 페이지 토큰 만료 오류 수정 |
| docs | 문서 수정 | [BE] docs: API 명세 업데이트 |
| style | 코드 포맷팅, 세미콜론 누락 등 | [FE] style: ESLint 규칙 적용 |
| refactor | 코드 리팩토링 | [BE] refactor: 랭킹 조회 로직 개선 |
| test | 테스트 코드 추가/수정 | [BE] test: 회원가입 테스트 케이스 추가 |
| chore | 빌드 업무, 패키지 매니저 설정 등 | [BE] chore: Spring Boot 3.2.5 업그레이드 |

### 2.4. Commit Message 예시

**좋은 예시 ✅**

    [BE] feat: 회원가입 API 추가
    [FE] fix: 로그인 페이지 토큰 만료 오류 수정
    [BE] refactor: Redis 키 네이밍 패턴 통일
    [FE] chore: ESLint, Prettier 설정 추가

**나쁜 예시 ❌**

    회원가입 기능 추가          # PREFIX, type 누락
    feat: Add signup API       # 영어 사용, PREFIX 누락
    [BE] fix: 버그 수정         # 지나치게 모호함

### 2.5. Commit 본문 작성 규칙 (선택사항)

제목으로 설명이 부족할 경우, 한 줄 띄우고 본문 작성

    [BE] feat: 기여도 뺏기 모드 명령어 선점 로직 구현
    
    - Redis SETNX를 활용한 동시성 제어
    - 명령어 입력 시 선점 여부 확인
    - 선점 실패 시 에러 응답 반환

---

## 3. Pull Request 규칙

### 3.1. PR 제목 형식

    [팀/브랜치타입/티켓번호] 기능 설명

**예시**

    [BE/feat/127] 회원가입 API 구현
    [FE/fix/156] 로그인 토큰 만료 처리 수정
    [BE/feat/195] 진료 대기열 확인 프로세스 구현

### 3.2. PR 템플릿

    ## 기능 설명
    필요시 실행 결과 스크린샷 첨부 (프론트는 화면의 변경이 있을 경우 디바이스 별로 업로드)
    
    ## 체크리스트
    - [ ] PR 제목 규칙 잘 지켰는가?
    - [ ] 추가/수정사항을 설명하였는가?
    - [ ] 이슈넘버를 적었는가?
    - [ ] master로 merge 설정이 되어있지는 않은가?

### 3.3. PR 생성 규칙

1. **브랜치 확인**: feat/fix 브랜치에서 develop으로 PR 생성
2. **리뷰어 지정**: 최소 1명 이상의 팀원을 리뷰어로 지정
3. **라벨 추가**: feat, fix, docs, refactor 등 적절한 라벨 추가
4. **Jira 연동**: PR 본문에 Jira 이슈 번호 명시
5. **충돌 해결**: PR 생성 전 develop 브랜치 최신화 및 충돌 해결

### 3.4. PR 승인 및 병합 규칙

- **최소 승인 인원**: 1명 이상
- **병합 방식**: Squash and Merge 권장
- **브랜치 삭제**: 병합 후 자동 삭제 설정 권장

---

## 4. Jira 이슈 관리

### 4.1. Jira 이슈 계층 구조

**[EPIC]**: 사용자 기능 대분류

    예시: 부모 웹: 계정/프로필/자녀 관리

**[STORY]**: 사용자 기능 소분류 (사용자 제공 가치)

    예시: 로컬 회원가입(+휴대폰 본인인증)

**[TASK]**: 개발 단위

    예시: [BE] 회원가입 프로세스 구현

### 4.2. Jira Task 작성 규칙

**제목 형식**

    [BE] 회원가입 API 구현
    [FE] 로그인 화면 UI 개발

**설명 필수 포함 사항**
- 구현할 기능 상세 설명
- 관련 API 명세 또는 화면 설계
- 완료 조건 (Definition of Done)

### 4.3. Jira 이슈 상태 관리

| 상태 | 설명 |
|------|------|
| To Do | 작업 대기 중 |
| In Progress | 작업 진행 중 |
| In Review | PR 생성 및 리뷰 대기 중 |
| Done | 작업 완료 및 develop 병합 완료 |

---

## 5. 기술 스택

### 5.1. Backend

| 카테고리 | 기술 | 버전 |
|----------|------|------|
| Language | Java | 17 |
| Framework | Spring Boot | 3.2.x |
| ORM | JPA/Hibernate | - |
| Query | QueryDSL | 5.0.0 |
| WebSocket | STOMP | - |
| Security | Spring Security | - |
| Build Tool | Gradle | 8.x |

### 5.2. Frontend

| 카테고리 | 기술 | 버전 |
|----------|------|------|
| Language | TypeScript | 5.x |
| Framework | React | 18.x |
| State | Zustand/Recoil | - |
| Build Tool | Vite | 5.x |
| Linter | ESLint | - |
| Formatter | Prettier | - |

### 5.3. Database

| 카테고리 | 기술 | 용도 |
|----------|------|------|
| RDBMS | PostgreSQL 15.x | 주 데이터베이스 |
| Cache | Redis 7.x | 캐싱, 세션, 랭킹 |

### 5.4. Infra

| 카테고리 | 기술 | 용도 |
|----------|------|------|
| Cloud | AWS EC2 | 애플리케이션 서버 |
| Database | AWS RDS | PostgreSQL 호스팅 |
| Cache | AWS ElastiCache | Redis 호스팅 |
| CI/CD | GitHub Actions | 자동 배포 |

---

## 6. 코드 리뷰 체크리스트

### 6.1. 필수 체크 항목

**구현**
- [ ] 요구사항이 정확히 구현되었는가?
- [ ] 에러 처리가 적절한가?
- [ ] 동시성 이슈가 없는가?
- [ ] N+1 쿼리 문제가 없는가?

**테스트**
- [ ] 단위 테스트가 작성되었는가?
- [ ] 테스트 커버리지가 충분한가?
- [ ] 경계값 테스트가 포함되었는가?

**보안**
- [ ] SQL Injection 취약점이 없는가?
- [ ] 민감 정보가 로그에 노출되지 않는가?
- [ ] 인증/인가 처리가 적절한가?

**성능**
- [ ] 불필요한 DB 조회가 없는가?
- [ ] Redis 캐싱이 적절히 적용되었는가?
- [ ] 인덱스가 필요한 컬럼에 생성되었는가?

**코드 품질**
- [ ] 코딩 컨벤션을 준수했는가?
- [ ] 불필요한 코드가 없는가?
- [ ] 주석이 필요한 부분에 작성되었는가?

**문서**
- [ ] API 명세가 업데이트되었는가?
- [ ] JavaDoc이 작성되었는가?
- [ ] README가 업데이트되었는가?

### 6.2. 리뷰 코멘트 가이드

**긍정적 피드백**

    ✅ LGTM (Looks Good To Me)
    👍 좋은 구현입니다!
    💡 이 부분 잘 해결하셨네요!

**개선 제안**

    💡 제안: 이 부분은 Stream API로 개선할 수 있을 것 같습니다.
    🤔 고려: Redis TTL 설정이 필요할 것 같습니다.

**질문**

    ❓ 질문: 이 로직에서 NPE 가능성은 없을까요?
    ❓ 확인: 이 부분 테스트 케이스 추가 필요할까요?

**수정 요청**

    🔧 수정 요청: ErrorCode enum에 이 케이스 추가 부탁드립니다.
    ⚠️ 필수: 이 부분 예외 처리 추가 필요합니다.

---

## 7. CI/CD 전략

### 7.1. Frontend CI

**Lint 검사**
- ESLint 규칙 준수 확인
- Prettier 포맷팅 확인

**빌드 검증**
- develop 브랜치 PR 생성 시 자동 실행
- 빌드 성공 여부 확인

### 7.2. Backend CI

**코드 품질 검사**
- Spotless 포맷팅 확인
- 컴파일 오류 확인

**테스트 실행**
- 단위 테스트 실행
- 통합 테스트 실행 (선택)

### 7.3. CD (Continuous Deployment)

**자동 배포 트리거**
- develop 브랜치 병합 시: 개발 서버 자동 배포
- main 브랜치 병합 시: 운영 서버 자동 배포

---

**이 컨벤션은 팀의 효율적인 협업을 위해 모든 팀원이 반드시 준수해야 합니다.**
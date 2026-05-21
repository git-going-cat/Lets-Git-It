# Let's Git it 기술 스택 (Tech Stack)

## 📚 목차
1. [Backend](#backend)
2. [Frontend](#frontend)
3. [Infrastructure & Monitoring](#infrastructure--monitoring)

---

## Backend

| 분류 | 기술명 | 버전 | 선정 이유 |
|------|--------|------|-----------|
| **Language** | Java | 17 | LTS 버전, Record/Stream/Sealed Class 등 최신 문법 활용 |
| **Framework** | Spring Boot | 3.5.13 | 표준 Java 백엔드 프레임워크, 빠른 설정 |
| **ORM** | Spring Data JPA / Hibernate | - | 객체 중심 DB 접근, 반복 쿼리 최소화 |
| **Query** | QueryDSL | - | 복잡한 동적 쿼리를 타입 안전하게 작성 |
| **Database** | MySQL | 8.0 | 트랜잭션 기반 데이터 관리, 안정적인 RDBMS |
| **Cache** | Redis | 7.x | 게임 상태 캐싱, 세션 관리, 랭킹 실시간 집계 |
| **분산 락** | Redisson | - | 개발 일정이 한정된 프로젝트에서 락 구현의 안정성을 라이브러리에 위임하고 핵심 게임 로직 개발에 집중 ([참고](https://velog.io/@dobby0628/Redis-분산락-SETNX-vs-Redisson-완벽-정리)) |
| **실시간 통신** | WebSocket + STOMP | - | 멀티플레이어 게임 실시간 동기화 (명령어 선점, Conflict 공격/방어, 협력 모드 순서 동기화) |
| **API** | REST API | - | 표준 HTTP 기반 FE-BE 통신 |
| **인증** | Spring Security + JWT | - | Stateless 인증, 토큰 기반 사용자 관리 |
| **문서화** | Swagger (SpringDoc) | - | API 명세 자동화, FE 협업 효율화 |

---

## Frontend

| 분류 | 기술명 | 버전 | 선정 이유 |
|------|--------|------|-----------|
| **Framework** | React + TypeScript | 19 + 6 | 프로젝트의 기본 뼈대 및 타입 안정성 확보 (`strict: true` 필수) |
| **게임 엔진** | Phaser | 4 | 떨어지는 Git 명령어 오브젝트 물리 처리, 브랜치 그래프 실시간 렌더링, Conflict 방향키 미니게임 등 캔버스 기반 게임 로직 전담. React와 역할을 분리하여 게임 씬과 UI 레이어를 명확히 구분 |
| **Build Tool** | Vite | - | 빠른 HMR과 ES Module 기반 빌드로 개발 생산성 확보. Phaser 4와의 번들링 호환성이 좋고 TypeScript 설정 오버헤드가 적음 |
| **전역 상태 관리** | Zustand | - | 유저 정보, 현재 방 코드, 설정 등 변동성이 적은 메타데이터 보관 |
| **인게임 상태 관리** | Jotai | - | 점수, 콤보 등 잦은 업데이트가 필요한 상태의 렌더링 병목 최소화 |
| **데이터 페칭** | TanStack Query | - | 랭킹 보드, 도감 등 서버 API 통신 및 캐싱 |
| **라우팅** | TanStack Router | - | 팀의 타입스크립트 숙련도에 따라 선택 (속도는 React Router, 안정성은 TanStack) |
| **CSS 스타일링** | Tailwind CSS | - | 로비, 대기실, 랭킹 등 정적 UI의 극단적인 개발 속도 향상 |
| **실시간 통신** | WebSocket + STOMP.js | - | Spring Boot 백엔드의 STOMP 브로커와 연동. 멀티 모드의 명령어 선점, Conflict 공격/방어, 협력 모드 순서 동기화 등 실시간 게임 이벤트 처리 |
| **HTTP** | Axios | - | 인터셉터를 활용한 JWT 토큰 자동 주입 및 공통 에러 핸들링. TanStack Query와 조합하여 랭킹, 도감, 캐릭터 커스터마이징 등 REST API 통신 |
| **폼 관리** | React Hook Form | - | 로그인, 방 생성 등 UI 폼의 비제어 컴포넌트 방식 관리로 불필요한 리렌더링 최소화 |
| **데이터 검증** | Zod | - | 웹소켓(멀티 모드)으로 들어오는 실시간 패킷 데이터의 런타임 타입 검사. React Hook Form과 연동하여 폼 유효성 검증 스키마도 공유 |
| **테스트** | Vitest | - | Vite 기반 프로젝트에 최적화된 테스트 환경. 별도 설정 없이 TypeScript와 ESM을 네이티브 지원하며 Jest 호환 API로 러닝커브 최소화 |

---

## Infrastructure & Monitoring

| 분류 | 기술명 | 선정 이유 |
|------|--------|-----------|
| **모니터링** | Actuator + Prometheus + Grafana | 시스템 메트릭 수집 및 시각화 |
| **에러 트래킹** | Sentry | 실시간 에러 추적 및 알림 |

---

**이 문서는 Let's Git it 프로젝트의 기술 스택과 선정 이유를 명확하게 정리합니다.**
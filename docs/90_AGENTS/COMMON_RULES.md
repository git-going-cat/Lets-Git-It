# 필수 준수 사항

## 한국어로 설명

## 커밋 메시지는 한글로 작성
GUIDE_COMMIT.md 참조

커밋 메시지 형식: `[PREFIX] type: 제목`
- PREFIX: `[BE]`, `[FE]`, `[AI]`, `[INFRA]`

## 구현 문서 필수 템플릿 규칙

RULE: 코드 구현 시 구현한 기능에 대해 추가적으로 문서를 작성해야합니다

DOCUMENTATION_STRATEGY.md 에 따라 아래 형식으로 작성해야합니다:
- 백엔드: `docs/30_MODULES/BE/{Domain}/IMPLEMENTATION_{기능명}.md`
- 프론트엔드: `docs/30_MODULES/FE/{기능명}/...`
- AI: `docs/30_MODULES/AI/{기능명}/...`

예시: `docs/30_MODULES/BE/Session/IMPLEMENTATION_GAME_SESSION_CREATE.md`

작성하는 모든 구현 문서는 아래 템플릿을 사용해야 하며,
Background/Context와 Decision 섹션은 필수로 작성해야 합니다.
해당 섹션이 누락된 문서는 작성되지 않은 것으로 간주합니다.

📌 필수 작성 항목 (Required)
### Background / Context
- 해결하려는 문제의 맥락
- 기존 구조 또는 정책의 한계
- 왜 이 구현이 필요해졌는지

### Decision
- 최종적으로 선택한 구현 방식
- 배제한 대안이 있다면 간단한 요약


WHY:

구현의 출발점과 의사결정 결과를 강제함으로써
"왜 이 코드가 존재하는가"를 언제든 복원 가능하게 합니다.

리뷰 및 유지보수 시 추측에 의존하지 않도록 하기 위함입니다.

📎 권장 작성 항목 (Recommended)
### Why
- 대안 비교
- 현재 선택이 가장 적절한 이유

### Caution
- 실패 케이스
- 보안
- 성능
- 영향 받는 도메인/모듈
- 이벤트/메시지/DTO/스키마 변경 여부
- 변경 시 깨질 수 있는 전제
- 그 외 주의사항

### Test Plan
- 검증 방법
- 핵심 테스트 케이스
- 배포 후 확인 포인트

WHY:

위험 요소와 검증 방법을 문서에 남겨
운영·리팩터링·장애 대응 시 즉시 참고할 수 있게 하기 위함입니다.

## 30_MODULES 활용 규칙

`docs/30_MODULES/` 하위는 **기능 구현 완료 후** 작성하는 모듈별 문서 공간입니다.

```
docs/30_MODULES/
├── BE/          # 백엔드 구현 문서
│   ├── Auth/    # 인증 관련 구현 문서
│   ├── Session/ # 게임 세션 관련 구현 문서
│   ├── Episode/ # 에피소드 관련 구현 문서
│   └── ...      # 도메인별 폴더 추가
├── FE/          # 프론트엔드 구현 문서
└── AI/          # AI 서버 구현 문서
```

문서 종류:
- `IMPLEMENTATION_*.md`: 구현 내용 및 의사결정 기록
- `TROUBLESHOOTING_*.md`: 트러블슈팅 기록
- `CHANGELOG_*.md`: 변경 이력
- `API_*.md`: 모듈별 API 변경사항 (팀 내 공유용)

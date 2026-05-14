# Claude CLI 작업 가이드

---

## 기본 컨텍스트

- DB: MySQL 8.0
- Primary Key: 모든 테이블 BINARY(16) (UUID 저장)
- 시간 단위: play_time, clear_time, best_time 모두 밀리초(ms)
- Soft Delete: member.deleted_at만 존재
- coop_map.is_active: 활성화 토글용 (soft delete 아님)

---

## UUID 처리

```sql
-- 삽입 시
UUID_TO_BIN(UUID())

-- 조회 시 (WHERE 절)
WHERE member_id = UUID_TO_BIN('550e8400-e29b-41d4-a716-446655440000')

-- 결과 출력 시
SELECT BIN_TO_UUID(member_id) FROM member;
```

> ⚠️ WHERE 절에 BIN_TO_UUID()를 쓰면 인덱스를 타지 않음
> 반드시 UUID_TO_BIN()으로 변환해서 비교할 것

---

## Redis 세션 연동

- 게임 결과 테이블: single_result, coop_result, contribution_result, timeattack_result
- session_id VARCHAR(100) 필드로 Redis 게임 세션 참조
- DB 저장은 게임 종료 시점에만 발생

---

## Redis 랭킹 Key 구조

```
ranking:SINGLE:{difficulty}:{week}         # 예: ranking:SINGLE:NORMAL:2025-04-3
ranking:CONTRIBUTION:{week}                # 예: ranking:CONTRIBUTION:2025-04-3
ranking:TIME_ATTACK:{week}                 # 예: ranking:TIME_ATTACK:2025-04-3
ranking:COOP:{coop_map_id}:{week}          # 예: ranking:COOP:{UUID}:2025-04-3
```

---

## 주간 랭킹 키

- week 필드 형식: YYYY-MM-W (예: 2025-04-3)
- year, month, week 별도 필드 없음 → 복합 키 문자열 하나로 저장

---

## 명령어 세트 구조

- Single: single_command_set → single_command_set_item (command_type: CREATE/MERGE/SWITCH/COMMON/CONFLICT)
- Competitive: competitive_command_set → competitive_command_set_item
- Coop: coop_command_set → coop_command_set_item (라운드제, round 1~5)
- Tutorial: tutorial_command_set → tutorial_command_set_item (sequence 1~14)

---

## 작업 시 주의사항

**member 조회**
```sql
-- 탈퇴 회원 제외 필수
SELECT * FROM member WHERE deleted_at IS NULL;
```
> ⚠️ deleted_at IS NULL 조건 누락 시 탈퇴 회원 데이터가 같이 조회됨

**coop_map 삭제 금지**
```sql
-- 삭제 대신 비활성화
UPDATE coop_map SET is_active = 0 WHERE coop_map_id = UUID_TO_BIN('...');
```

**랭킹 테이블 변경 시**
- member_best_record, member_coop_best_record 동기화 필요

**Foreign Key 확인**
- 삭제/수정 전 FK 제약 확인 필수
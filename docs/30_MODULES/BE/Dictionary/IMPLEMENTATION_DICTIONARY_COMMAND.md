# IMPLEMENTATION_DICTIONARY_COMMAND

## Background / Context

도감(Dictionary)은 게임에서 사용되는 Git 커맨드 목록과 각 커맨드의 옵션(`-m`, `--amend` 등)을 조회하는 기능이다.

커맨드(`DictionaryCommand`)와 옵션(`DictionaryCommandOption`)은 1:N 관계이며, 응답 구조 자체가 "커맨드 → 옵션 리스트"로 계층적이다. 즉 API 호출 시 항상 커맨드와 옵션을 함께 조회해야 한다.

---

## Decision

### 1. N+1 방지: LEFT JOIN FETCH + DISTINCT

`DictionaryCommand`의 `options` 필드는 `@OneToMany(fetch = FetchType.LAZY)`로 선언했다. 단순 조회 시 커맨드 수만큼 옵션 쿼리가 추가 발생하므로(N+1), JPA Repository 쿼리에서 `LEFT JOIN FETCH`와 `DISTINCT`를 함께 사용해 단일 쿼리로 해결했다.

```java
@Query("""
    select distinct c
    from DictionaryCommand c
    left join fetch c.options
    order by c.name asc
""")
List<DictionaryCommand> findAllInGameWithOptions();
```

- `DISTINCT`: Hibernate가 조인 결과로 중복된 커맨드 row를 하나로 합친다.
- `order by c.name asc`: 응답 정렬을 DB 레벨에서 처리한다.

### 2. 유니크 제약: (command, option) 복합 키

같은 커맨드에 동일한 옵션이 중복 등록되는 것을 방지하기 위해 `DictionaryCommandOption` 테이블에 복합 유니크 제약을 설정했다.

```java
@Table(name = "dictionary_command_option", uniqueConstraints = {
    @UniqueConstraint(name = "uq_dictionary_command_option",
        columnNames = {"dictionary_command_id", "option"})
})
```

### 3. 이미지: Spring Boot static 리소스 서빙

커맨드 이미지는 별도 업로드 기능 없이 **조회 전용**이다. 이미지 파일은 Spring Boot 프로젝트의 `src/main/resources/static/images/dictionary/` 경로에 정적으로 배치하고, `imageUrl`은 해당 경로를 가리키는 URL 문자열을 DB에 직접 저장한다.

이미지 추가·변경은 파일을 교체하고 서버를 재배포하는 방식으로만 이루어진다. 런타임 중 이미지 업로드 API는 존재하지 않는다.

### 4. 인증 불필요

도감 조회는 비로그인 사용자도 접근 가능한 공개 API이므로 Security 설정에서 인증을 요구하지 않는다.

### 5. 응답 구조: 내부 Record 계층화

응답 DTO는 `DictionaryCommandResponse` 하나로 구성하되, 내부 레코드를 계층화하여 직렬화 결과가 의도한 JSON 구조와 일치하도록 했다.

```
DictionaryCommandResponse
  └─ List<CommandDto>
       └─ List<OptionDto>
```

---

## Why

- `LAZY + JOIN FETCH`를 선택한 이유: `EAGER`로 설정하면 도감 외 다른 컨텍스트(예: 어드민 단건 조회)에서도 항상 옵션이 함께 로딩된다. `LAZY`를 기본으로 두고 도감 조회 쿼리에서만 `JOIN FETCH`를 사용하면, 로딩 시점을 필요한 곳에서만 제어할 수 있다.

- `isInGame` 필드를 엔티티에 포함한 이유: 게임에서 실제로 사용되는 커맨드와 그렇지 않은 커맨드를 구분하기 위한 플래그다. 현재 쿼리는 전체 커맨드를 반환하고 있으며, 프론트엔드에서 이 필드를 기준으로 게임용 커맨드를 필터링할 수 있다.

- 응답 정렬을 DB 레벨에서 처리한 이유: 애플리케이션 레벨에서 `Comparator`로 정렬하면 커맨드 수가 늘어날수록 불필요한 객체 정렬 비용이 발생한다. DB의 인덱스를 활용한 정렬이 더 효율적이다.

---

## Caution

- `DictionaryCommandOption`의 `option` 컬럼은 SQL 예약어(`OPTION`)와 충돌할 수 있어 백틱으로 감쌌다 (`` `option` ``). JPA 설정에서 컬럼명 그대로 사용 시 쿼리 오류가 발생할 수 있으니 주의한다.

- `imageUrl`은 Spring Boot static 리소스 경로를 가리키는 문자열이다. 파일이 실제로 `src/main/resources/static/` 하위에 존재해야 URL 접근이 가능하다. DB에 경로가 저장되어 있어도 파일이 없으면 404가 반환된다.

- 현재 `findAllInGameWithOptions()`는 `isInGame` 여부와 관계없이 전체 커맨드를 반환한다. 추후 게임용 커맨드만 필터링해서 조회하는 요구사항이 생기면 쿼리에 `where c.isInGame = true` 조건을 추가해야 한다.

- 커맨드 수가 많아져도 전체 목록을 한 번에 반환하는 구조다. 현재는 도감 데이터셋이 작고 정적이므로 페이지네이션 없이 허용 가능하지만, 데이터가 늘어나면 페이지네이션 또는 캐싱 전략을 검토해야 한다.

---

## Test Data

현재 MySQL에 더미 데이터가 삽입되어 있어 별도 데이터 설정 없이 API 호출로 바로 테스트할 수 있다.

- `dictionary_command` 테이블: Git 커맨드 다수 등록 (`git commit`, `git add`, `git merge` 등)
- `dictionary_command_option` 테이블: 각 커맨드별 주요 옵션 등록 (`-m`, `--amend`, `-u` 등)
- 이미지는 아직 static 파일이 준비되지 않은 경우 `imageUrl`이 `null`이거나 플레이스홀더 URL일 수 있다.

---

## API

| 항목 | 내용 |
|------|------|
| Method | `GET` |
| Path | `/api/v1/dictionary/commands` |
| 인증 | 불필요 |
| 응답 | `ApiResponse<DictionaryCommandResponse>` |

**응답 예시**

```json
{
  "status": 200,
  "message": "도감 조회 성공",
  "data": {
    "commands": [
      {
        "commandId": "550e8400-e29b-41d4-a716-446655440001",
        "name": "git commit",
        "description": "변경사항을 로컬 저장소에 저장합니다.",
        "imageUrl": "https://cdn.example.com/commands/commit.png",
        "isInGame": true,
        "options": [
          { "option": "-m", "description": "커밋 메시지를 인라인으로 작성" },
          { "option": "--amend", "description": "직전 커밋 수정" }
        ]
      }
    ]
  }
}
```

---

## 관련 클래스

| 레이어 | 클래스 |
|--------|--------|
| Entity | `DictionaryCommand`, `DictionaryCommandOption` |
| Repository | `DictionaryCommandRepository` (인터페이스), `DictionaryCommandRepositoryImpl`, `DictionaryCommandJpaRepository` |
| Service | `DictionaryService` (인터페이스), `DictionaryServiceImpl` |
| Controller | `DictionaryController`, `DictionaryControllerDocs` |
| DTO | `DictionaryCommandResponse` (`CommandDto`, `OptionDto` 내부 레코드 포함) |

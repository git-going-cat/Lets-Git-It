# 테스트 정책

## 기본 원칙
- 기본은 단위 테스트 (JUnit 5)
- 라이브러리: AssertJ, Mockito
- 통합 테스트는 필요 시에만 사용 (Spring Boot Test)
- DB: 단위 테스트는 H2, 통합 테스트는 H2 (prod은 MySQL)
- 테스트 네이밍은 한글
- 구조는 Given / When / Then
- MR 올리기 전에 전체 테스트 실행 필수

## 통합 테스트 적용 기준
- Service 계층에서 트랜잭션 연동이 중요한 로직
- Repository의 QueryDSL 또는 복잡 쿼리 검증

## 예시

**RULE**: 테스트 메서드명은 한글, `@DisplayName`은 사용하지 않습니다.

<example type="correct">
```java
@Test
void 회원을_저장하고_조회하면_모든_필드가_정확히_매핑된다() {
  // given
  Member member = Member.builder()
      .email("test@email.com")
      .name("테스트")
      .build();

  // when
  memberRepository.save(member);
  Member found = memberRepository.findById(member.getId()).orElseThrow();

  // then
  assertThat(found).usingRecursiveComparison().isEqualTo(member);
}
```
</example>

<rule id="6" category="querydsl" severity="medium">
### QueryDSL: Generated Only

**RULE**: QClass는 `build/generated/querydsl` 자동 생성본만 사용합니다. QClass를 직접 작성하지 않습니다.
</rule>

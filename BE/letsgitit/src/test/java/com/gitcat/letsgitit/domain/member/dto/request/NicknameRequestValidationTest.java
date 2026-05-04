package com.gitcat.letsgitit.domain.member.dto.request;

import static org.assertj.core.api.Assertions.*;

import java.util.Set;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class NicknameRequestValidationTest {

	private static Validator validator;

	@BeforeAll
	static void setUp() {
		ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
		validator = factory.getValidator();
	}

	private Set<ConstraintViolation<NicknameRequest>> validate(String nickname) {
		return validator.validate(new NicknameRequest(nickname));
	}

	// ===================== 성공 케이스 =====================

	@ParameterizedTest
	@ValueSource(strings = {"ab", "dobby", "가나", "홍길동", "abc123", "한글3", "가나다라마바"})
	void 유효한_닉네임은_검증을_통과한다(String nickname) {
		assertThat(validate(nickname)).isEmpty();
	}

	// ===================== 길이 검증 =====================

	@Test
	void 닉네임이_1자이면_검증에_실패한다() {
		// given
		NicknameRequest request = new NicknameRequest("a");

		// when
		Set<ConstraintViolation<NicknameRequest>> violations = validator.validate(request);

		// then
		assertThat(violations).isNotEmpty();
		assertThat(violations).anyMatch(v -> v.getMessage().equals("닉네임은 2~6자여야 합니다."));
	}

	@Test
	void 닉네임이_7자이면_검증에_실패한다() {
		// given
		NicknameRequest request = new NicknameRequest("abcdefg");

		// when
		Set<ConstraintViolation<NicknameRequest>> violations = validator.validate(request);

		// then
		assertThat(violations).isNotEmpty();
		assertThat(violations).anyMatch(v -> v.getMessage().equals("닉네임은 2~6자여야 합니다."));
	}

	@Test
	void 닉네임이_빈_문자열이면_검증에_실패한다() {
		// given
		NicknameRequest request = new NicknameRequest("");

		// when
		Set<ConstraintViolation<NicknameRequest>> violations = validator.validate(request);

		// then
		assertThat(violations).isNotEmpty();
	}

	@Test
	void 닉네임이_null이면_검증에_실패한다() {
		// given
		NicknameRequest request = new NicknameRequest(null);

		// when
		Set<ConstraintViolation<NicknameRequest>> violations = validator.validate(request);

		// then
		assertThat(violations).isNotEmpty();
		assertThat(violations).anyMatch(v -> v.getMessage().equals("닉네임을 입력해주세요."));
	}

	// ===================== 초성/자음/모음 금지 =====================

	@ParameterizedTest
	@ValueSource(strings = {"ㄱㄴ", "ㅎㅎㅎ", "ㅇㅇ"})
	void 자음으로만_이루어진_닉네임은_검증에_실패한다(String nickname) {
		assertThat(validate(nickname)).isNotEmpty()
			.anyMatch(v -> v.getMessage().equals("닉네임은 한글, 영문, 숫자만 사용 가능합니다."));
	}

	@ParameterizedTest
	@ValueSource(strings = {"ㅏㅑ", "ㅣㅓ"})
	void 모음으로만_이루어진_닉네임은_검증에_실패한다(String nickname) {
		assertThat(validate(nickname)).isNotEmpty()
			.anyMatch(v -> v.getMessage().equals("닉네임은 한글, 영문, 숫자만 사용 가능합니다."));
	}

	@Test
	void 자음과_완성형_한글이_섞인_닉네임은_검증에_실패한다() {
		// given: "ㅇ란ㅏ" - ㅇ(자음), 란(완성형), ㅏ(모음)
		NicknameRequest request = new NicknameRequest("ㅇ란ㅏ");

		// when
		Set<ConstraintViolation<NicknameRequest>> violations = validator.validate(request);

		// then
		assertThat(violations).isNotEmpty();
		assertThat(violations).anyMatch(v -> v.getMessage().equals("닉네임은 한글, 영문, 숫자만 사용 가능합니다."));
	}

	// ===================== 특수문자 금지 =====================

	@ParameterizedTest
	@ValueSource(strings = {"닉네임!", "ab@cd", "hello#", "nick_name", "test.id", "id-1"})
	void 특수문자가_포함된_닉네임은_검증에_실패한다(String nickname) {
		assertThat(validate(nickname)).isNotEmpty()
			.anyMatch(v -> v.getMessage().equals("닉네임은 한글, 영문, 숫자만 사용 가능합니다."));
	}

	@Test
	void 공백이_포함된_닉네임은_검증에_실패한다() {
		// given
		NicknameRequest request = new NicknameRequest("nick name");

		// when
		Set<ConstraintViolation<NicknameRequest>> violations = validator.validate(request);

		// then
		assertThat(violations).isNotEmpty();
		assertThat(violations).anyMatch(v -> v.getMessage().equals("닉네임은 한글, 영문, 숫자만 사용 가능합니다."));
	}
}

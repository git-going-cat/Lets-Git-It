package com.gitcat.letsgitit.domain.room.dto.request;

import static org.assertj.core.api.Assertions.*;

import java.util.Set;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class PasswordVerifyRequestValidationTest {

	private static Validator validator;

	@BeforeAll
	static void setUp() {
		ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
		validator = factory.getValidator();
	}

	private Set<ConstraintViolation<PasswordVerifyRequest>> validate(String password) {
		return validator.validate(new PasswordVerifyRequest(password));
	}

	@Test
	void 유효한_비밀번호는_검증을_통과한다() {
		assertThat(validate("myPassword123")).isEmpty();
	}

	@Test
	void null이면_검증에_실패한다() {
		assertThat(validate(null)).isNotEmpty();
	}

	@Test
	void 빈_문자열이면_검증에_실패한다() {
		assertThat(validate("")).isNotEmpty();
	}

	@Test
	void 공백만_있으면_검증에_실패한다() {
		assertThat(validate("   ")).isNotEmpty();
	}
}

package com.gitcat.letsgitit.domain.coop.dto.request;

import static org.assertj.core.api.Assertions.*;

import java.util.Set;
import java.util.UUID;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class CoopResetRequestValidationTest {

	private static Validator validator;

	@BeforeAll
	static void setUp() {
		ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
		validator = factory.getValidator();
	}

	private Set<ConstraintViolation<CoopResetRequest>> validate(String inputText) {
		return validator.validate(new CoopResetRequest("COOP_RESET", UUID.randomUUID(), inputText));
	}

	@Test
	void 유효한_inputText는_검증을_통과한다() {
		assertThat(validate("git reset")).isEmpty();
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

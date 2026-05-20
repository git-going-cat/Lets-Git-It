package com.gitcat.letsgitit.domain.room.dto.request;

import static org.assertj.core.api.Assertions.*;

import java.util.Set;
import java.util.UUID;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class UpdateCoopRoomInfoRequestValidationTest {

	private static Validator validator;

	@BeforeAll
	static void setUp() {
		ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
		validator = factory.getValidator();
	}

	private Set<ConstraintViolation<UpdateCoopRoomInfoRequest>> validate(String teamName) {
		return validator.validate(
			new UpdateCoopRoomInfoRequest("방 제목", teamName, false, null, UUID.randomUUID()));
	}

	@Test
	void 한글_팀_이름은_검증을_통과한다() {
		assertThat(validate("최강팀")).isEmpty();
	}

	@Test
	void 영문_팀_이름은_검증을_통과한다() {
		assertThat(validate("TeamA")).isEmpty();
	}

	@Test
	void 여덟자는_검증을_통과한다() {
		assertThat(validate("12345678")).isEmpty();
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
	void 특수문자가_포함되면_검증에_실패한다() {
		assertThat(validate("팀@이름")).isNotEmpty();
	}

	@Test
	void 아홉자_이상이면_검증에_실패한다() {
		assertThat(validate("123456789")).isNotEmpty();
	}
}

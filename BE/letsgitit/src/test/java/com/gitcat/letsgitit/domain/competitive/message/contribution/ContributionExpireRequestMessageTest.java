package com.gitcat.letsgitit.domain.competitive.message.contribution;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import java.util.UUID;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

class ContributionExpireRequestMessageTest {

	private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

	@Nested
	class Constraints {

		@Test
		void 필수값이_누락되면_검증에_실패한다() {
			// given
			ContributionExpireRequestMessage request = new ContributionExpireRequestMessage(null, null, null, null);

			// when
			Set<ConstraintViolation<ContributionExpireRequestMessage>> violations = validator.validate(request);

			// then
			assertThat(violations).isNotEmpty();
			assertThat(violations)
				.extracting(violation -> violation.getPropertyPath().toString())
				.contains("type", "requestId", "gameSessionId", "commandSequence");
		}

		@Test
		void type이_COMMAND_EXPIRE_REQUEST가_아니면_검증에_실패한다() {
			// given
			ContributionExpireRequestMessage request = new ContributionExpireRequestMessage(
				"CONTRIBUTION_INPUT",
				UUID.randomUUID(),
				UUID.randomUUID(),
				0);

			// when
			Set<ConstraintViolation<ContributionExpireRequestMessage>> violations = validator.validate(request);

			// then
			assertThat(violations)
				.extracting(violation -> violation.getPropertyPath().toString())
				.contains("commandExpireRequestType");
		}

		@Test
		void commandSequence가_음수이면_검증에_실패한다() {
			// given
			ContributionExpireRequestMessage request = new ContributionExpireRequestMessage(
				"COMMAND_EXPIRE_REQUEST",
				UUID.randomUUID(),
				UUID.randomUUID(),
				-1);

			// when
			Set<ConstraintViolation<ContributionExpireRequestMessage>> violations = validator.validate(request);

			// then
			assertThat(violations)
				.extracting(violation -> violation.getPropertyPath().toString())
				.contains("commandSequence");
		}
	}
}

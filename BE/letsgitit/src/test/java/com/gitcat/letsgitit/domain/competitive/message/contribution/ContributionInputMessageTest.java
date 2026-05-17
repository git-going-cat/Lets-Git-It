package com.gitcat.letsgitit.domain.competitive.message.contribution;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import java.util.UUID;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

import org.junit.jupiter.api.Test;

class ContributionInputMessageTest {

	private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

	@Test
	void 필수값이_누락되면_검증에_실패한다() {
		// given
		ContributionInputMessage request = new ContributionInputMessage(null, null, null, null, " ");

		// when
		Set<ConstraintViolation<ContributionInputMessage>> violations = validator.validate(request);

		// then
		assertThat(violations).isNotEmpty();
		assertThat(violations)
			.extracting(violation -> violation.getPropertyPath().toString())
			.contains("type", "requestId", "gameSessionId", "commandSequence", "inputText");
	}

	@Test
	void type이_CONTRIBUTION_INPUT이_아니면_검증에_실패한다() {
		// given
		ContributionInputMessage request = new ContributionInputMessage(
			"READY_UPDATE",
			UUID.randomUUID(),
			UUID.randomUUID(),
			0,
			"git add .");

		// when
		Set<ConstraintViolation<ContributionInputMessage>> violations = validator.validate(request);

		// then
		assertThat(violations)
			.extracting(violation -> violation.getPropertyPath().toString())
			.contains("contributionInputType");
	}

	@Test
	void commandSequence가_음수이면_검증에_실패한다() {
		// given
		ContributionInputMessage request = new ContributionInputMessage(
			"CONTRIBUTION_INPUT",
			UUID.randomUUID(),
			UUID.randomUUID(),
			-1,
			"git add .");

		// when
		Set<ConstraintViolation<ContributionInputMessage>> violations = validator.validate(request);

		// then
		assertThat(violations)
			.extracting(violation -> violation.getPropertyPath().toString())
			.contains("commandSequence");
	}
}

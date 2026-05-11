package com.gitcat.letsgitit.domain.single.dto.request;

import static org.assertj.core.api.Assertions.*;

import java.util.Set;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import com.gitcat.letsgitit.domain.ranking.constants.RankingKeyUtil;
import com.gitcat.letsgitit.domain.single.entity.enums.Grade;
import com.gitcat.letsgitit.domain.single.entity.enums.SingleResultStatus;

class SingleResultSaveRequestValidationTest {

	private static Validator validator;

	@BeforeAll
	static void setUp() {
		ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
		validator = factory.getValidator();
	}

	@Test
	void 최대_점수와_최대_플레이시간은_검증을_통과한다() {
		// given
		SingleResultSaveRequest request = new SingleResultSaveRequest(
			SingleResultStatus.SUCCESS,
			RankingKeyUtil.MAX_SINGLE_SCORE,
			(int)RankingKeyUtil.MAX_PLAY_TIME_MS,
			Grade.S);

		// when
		Set<ConstraintViolation<SingleResultSaveRequest>> violations = validator.validate(request);

		// then
		assertThat(violations).isEmpty();
	}

	@Test
	void 보너스_점수로_10000점을_초과해도_최대_점수_이하면_검증을_통과한다() {
		// given
		SingleResultSaveRequest request = new SingleResultSaveRequest(
			SingleResultStatus.SUCCESS,
			11_740,
			90_000,
			Grade.S);

		// when
		Set<ConstraintViolation<SingleResultSaveRequest>> violations = validator.validate(request);

		// then
		assertThat(violations).isEmpty();
	}

	@Test
	void 최대_점수를_초과하면_검증에_실패한다() {
		// given
		SingleResultSaveRequest request = new SingleResultSaveRequest(
			SingleResultStatus.SUCCESS,
			RankingKeyUtil.MAX_SINGLE_SCORE + 1,
			90_000,
			Grade.S);

		// when
		Set<ConstraintViolation<SingleResultSaveRequest>> violations = validator.validate(request);

		// then
		assertThat(violations).isNotEmpty()
			.anyMatch(v -> v.getMessage().equals("점수는 20000점 이하여야 합니다."));
	}

	@Test
	void 최대_플레이시간을_초과하면_검증에_실패한다() {
		// given
		SingleResultSaveRequest request = new SingleResultSaveRequest(
			SingleResultStatus.SUCCESS,
			8500,
			(int)RankingKeyUtil.MAX_PLAY_TIME_MS + 1,
			Grade.A);

		// when
		Set<ConstraintViolation<SingleResultSaveRequest>> violations = validator.validate(request);

		// then
		assertThat(violations).isNotEmpty()
			.anyMatch(v -> v.getMessage().equals("플레이 시간은 3600000ms 이하여야 합니다."));
	}
}

package com.gitcat.letsgitit.domain.ranking.constants;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;

class RankingKeyUtilTest {

	@Test
	void plain_score는_그대로_복원한다() {
		// given
		double redisScore = 9800.0;

		// when
		int score = RankingKeyUtil.toPlainSingleScore(redisScore);

		// then
		assertThat(score).isEqualTo(9800);
	}

	@Test
	void composite_score는_원래_점수로_복원한다() {
		// given
		int plainScore = 9800;
		long playTimeComponent = (RankingKeyUtil.MAX_PLAY_TIME_MS - 95_432L) * RankingKeyUtil.PLAY_TIME_UNIT;
		double redisScore = (double)((plainScore + 1L) * RankingKeyUtil.SCORE_UNIT
			+ playTimeComponent
			+ 123_456L);

		// when
		int score = RankingKeyUtil.toPlainSingleScore(redisScore);

		// then
		assertThat(score).isEqualTo(plainScore);
	}

	@Test
	void 최대_싱글_점수_기준_composite_score는_long_범위를_넘지_않는다() {
		// given
		long maxPlayTimeComponent = RankingKeyUtil.MAX_PLAY_TIME_MS * RankingKeyUtil.PLAY_TIME_UNIT;

		// when
		long maxComposite = (RankingKeyUtil.MAX_SINGLE_SCORE + 1L) * RankingKeyUtil.SCORE_UNIT
			+ maxPlayTimeComponent
			+ RankingKeyUtil.DECISECONDS_IN_WEEK;

		// then
		assertThat(maxComposite).isPositive().isLessThan(Long.MAX_VALUE);
	}
}

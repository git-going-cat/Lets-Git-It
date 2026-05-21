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

	// ───────────────────────────────────────────
	// Coop 랭킹 관련 테스트
	// ───────────────────────────────────────────

	@Test
	void formatCoopLexString은_정해진_포맷으로_lexString을_생성한다() {
		// given
		int elapsedTime = 61000;
		int wrongOrder = 2;
		int wrongType = 3;
		long registeredAt = 1234567;
		String coopResultId = "550e8400-e29b-41d4-a716-446655440000";

		// when
		String lexString = RankingKeyUtil.formatCoopLexString(
			elapsedTime, wrongOrder, wrongType, registeredAt, coopResultId);

		// then
		assertThat(lexString).isEqualTo("000061000:0002:0003:1234567:550e8400-e29b-41d4-a716-446655440000");
	}

	@Test
	void formatCoopLexString은_최대값도_정상적으로_포맷한다() {
		// given
		int elapsedTime = RankingKeyUtil.MAX_COOP_ELAPSED_TIME; // 1_800_000
		int wrongOrder = RankingKeyUtil.MAX_COOP_WRONG_ORDER; // 1_000
		int wrongType = RankingKeyUtil.MAX_COOP_WRONG_TYPE; // 1_000
		long registeredAt = 9999999;
		String coopResultId = "ffffffff-ffff-ffff-ffff-ffffffffffff";

		// when
		String lexString = RankingKeyUtil.formatCoopLexString(
			elapsedTime, wrongOrder, wrongType, registeredAt, coopResultId);

		// then
		assertThat(lexString).isEqualTo("001800000:1000:1000:9999999:ffffffff-ffff-ffff-ffff-ffffffffffff");
	}

	@Test
	void parseCoopResultIdFromLexString은_coopResultId를_정확히_추출한다() {
		// given
		String lexString = "000061000:0002:0003:1234567:550e8400-e29b-41d4-a716-446655440000";

		// when
		String coopResultId = RankingKeyUtil.parseCoopResultIdFromLexString(lexString);

		// then
		assertThat(coopResultId).isEqualTo("550e8400-e29b-41d4-a716-446655440000");
	}

	@Test
	void Coop_lexString은_elapsedTime_기준_사전순_정렬이_가능하다() {
		// given
		String fast = RankingKeyUtil.formatCoopLexString(60000, 0, 0, 1000000, "aaaa-aaaa");
		String slow = RankingKeyUtil.formatCoopLexString(70000, 0, 0, 1000000, "aaaa-aaaa");

		// then — fast가 사전순으로 앞에 온다
		assertThat(fast.compareTo(slow)).isLessThan(0);
	}

	@Test
	void Coop_lexString은_elapsedTime이_같으면_wrongOrder_기준_정렬이_된다() {
		// given
		String lessWrongOrder = RankingKeyUtil.formatCoopLexString(60000, 1, 5, 1000000, "aaaa-aaaa");
		String moreWrongOrder = RankingKeyUtil.formatCoopLexString(60000, 3, 5, 1000000, "aaaa-aaaa");

		// then — wrongOrder가 적은 것이 사전순으로 앞에 온다
		assertThat(lessWrongOrder.compareTo(moreWrongOrder)).isLessThan(0);
	}

	@Test
	void Coop_lexString은_wrongOrder도_같으면_wrongType_기준_정렬이_된다() {
		// given
		String lessWrongType = RankingKeyUtil.formatCoopLexString(60000, 2, 1, 1000000, "aaaa-aaaa");
		String moreWrongType = RankingKeyUtil.formatCoopLexString(60000, 2, 5, 1000000, "aaaa-aaaa");

		// then
		assertThat(lessWrongType.compareTo(moreWrongType)).isLessThan(0);
	}

	@Test
	void Coop_lexString은_모두_같으면_registeredAt_기준_정렬이_된다() {
		// given
		String earlier = RankingKeyUtil.formatCoopLexString(60000, 2, 3, 1000000, "aaaa-aaaa");
		String later = RankingKeyUtil.formatCoopLexString(60000, 2, 3, 1000001, "aaaa-aaaa");

		// then — 먼저 등록된 것이 사전순으로 앞에 온다
		assertThat(earlier.compareTo(later)).isLessThan(0);
	}

	@Test
	void coopRankingKey는_올바른_키_형식을_반환한다() {
		// when
		String key = RankingKeyUtil.coopRankingKey("2026-W20");

		// then
		assertThat(key).isEqualTo("ranking:COOP:2026-W20");
	}

	@Test
	void coopRankingDataKey는_올바른_키_형식을_반환한다() {
		// when
		String key = RankingKeyUtil.coopRankingDataKey("2026-W20");

		// then
		assertThat(key).isEqualTo("ranking:COOP:2026-W20:data");
	}

	@Test
	void coopRankingMembersKey는_올바른_키_형식을_반환한다() {
		// when
		String key = RankingKeyUtil.coopRankingMembersKey("2026-W20", "member-uuid");

		// then
		assertThat(key).isEqualTo("ranking:COOP:2026-W20:members:member-uuid");
	}
}

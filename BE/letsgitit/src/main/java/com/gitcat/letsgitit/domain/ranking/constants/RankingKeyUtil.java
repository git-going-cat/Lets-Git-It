package com.gitcat.letsgitit.domain.ranking.constants;

public class RankingKeyUtil {
	private RankingKeyUtil() {}

	public static final int MAX_SINGLE_SCORE = 10_000;
	public static final long SCORE_UNIT = 30_000_000_000_000L;
	public static final long PLAY_TIME_UNIT = 7_000_000L;
	public static final long MAX_PLAY_TIME_MS = 3_600_000L;
	public static final long DECISECONDS_IN_WEEK = 6_048_000L;
	// MAX_SINGLE_SCORE 기준 최대 composite는 약 3.000552e17로 Long.MAX_VALUE보다 작다.

	private static final String SINGLE = "ranking:SINGLE:%s:%s";
	private static final String SINGLE_GRADE = "ranking:SINGLE:%s:%s:grade";
	private static final String SINGLE_PLAY_TIME = "ranking:SINGLE:%s:%s:playtime";
	private static final String CONTRIBUTION = "ranking:CONTRIBUTION_RUN:%s";
	private static final String TIME_ATTACK = "ranking:TIME_ATTACK:%s";
	private static final String COOP = "ranking:COOP:%s:%s";

	public static String singleKey(String difficulty, String week) {
		return String.format(SINGLE, difficulty, week);
	}

	public static String singleGradeKey(String difficulty, String week) {
		return String.format(SINGLE_GRADE, difficulty, week);
	}

	public static String singlePlayTimeKey(String difficulty, String week) {
		return String.format(SINGLE_PLAY_TIME, difficulty, week);
	}

	public static String contributionKey(String week) {
		return String.format(CONTRIBUTION, week);
	}

	public static String timeAttackKey(String week) {
		return String.format(TIME_ATTACK, week);
	}

	public static String coopKey(String coopMapId, String week) {
		return String.format(COOP, coopMapId, week);
	}

	public static int toPlainSingleScore(double redisScore) {
		if (redisScore < SCORE_UNIT) {
			return (int)Math.round(redisScore);
		}
		return (int)(redisScore / SCORE_UNIT) - 1;
	}
}

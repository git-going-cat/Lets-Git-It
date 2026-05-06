package com.gitcat.letsgitit.domain.ranking.constants;

public class RankingKeyUtil {
	private RankingKeyUtil() {}

	private static final String SINGLE = "ranking:SINGLE:%s:%s";
	private static final String SINGLE_GRADE = "ranking:SINGLE:%s:%s:grade";
	private static final String CONTRIBUTION = "ranking:CONTRIBUTION_RUN:%s";
	private static final String TIME_ATTACK = "ranking:TIME_ATTACK:%s";
	private static final String COOP = "ranking:COOP:%s:%s";

	public static String singleKey(String difficulty, String week) {
		return String.format(SINGLE, difficulty, week);
	}

	public static String singleGradeKey(String difficulty, String week) {
		return String.format(SINGLE_GRADE, difficulty, week);
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
}

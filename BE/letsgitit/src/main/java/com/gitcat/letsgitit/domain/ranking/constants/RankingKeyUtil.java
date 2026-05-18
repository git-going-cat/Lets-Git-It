package com.gitcat.letsgitit.domain.ranking.constants;

public class RankingKeyUtil {
	private RankingKeyUtil() {}

	// Single 랭킹 상수
	public static final int MAX_SINGLE_SCORE = 20_000;
	public static final long SCORE_UNIT = 30_000_000_000_000L;
	public static final long PLAY_TIME_UNIT = 7_000_000L;
	public static final long MAX_PLAY_TIME_MS = 3_600_000L;
	public static final long DECISECONDS_IN_WEEK = 6_048_000L;
	// MAX_SINGLE_SCORE 기준 최대 composite는 약 6.000552e17로 Long.MAX_VALUE보다 작다.

	// Contribution 랭킹 상수
	public static final int MAX_CONTRIBUTION = 1_000_000;
	public static final int MAX_PLAY_COUNT = 10_000;
	public static final long CONTRIBUTION_UNIT = 20_000_000L;
	public static final long PLAY_COUNT_UNIT = 1_000L;
	// MAX_CONTRIBUTION 기준 최대 composite는 약 2e13으로 Redis double 정밀도(9e15) 범위 내.

	// Coop 랭킹 상수
	public static final int MAX_COOP_ELAPSED_TIME = 1_800_000; // 30분 (ms)
	public static final int MAX_COOP_WRONG_ORDER = 1_000;
	public static final int MAX_COOP_WRONG_TYPE = 1_000;
	// lexString 형식: {elapsedTime:9}:{wrongOrder:4}:{wrongType:4}:{registeredAt:7}:{coopResultId:36}

	private static final String SINGLE = "ranking:SINGLE:%s:%s";
	private static final String SINGLE_GRADE = "ranking:SINGLE:%s:%s:grade";
	private static final String SINGLE_PLAY_TIME = "ranking:SINGLE:%s:%s:playtime";
	private static final String CONTRIBUTION = "ranking:CONTRIBUTION:%s";
	private static final String CONTRIBUTION_CONTRIBUTION = "ranking:CONTRIBUTION:%s:contribution";
	private static final String CONTRIBUTION_PLAY_COUNT = "ranking:CONTRIBUTION:%s:playcount";
	private static final String CONTRIBUTION_REGISTERED_AT = "ranking:CONTRIBUTION:%s:registeredAt";
	private static final String TIME_ATTACK = "ranking:TIME_ATTACK:%s";
	private static final String COOP = "ranking:COOP:%s:%s";

	// Coop 랭킹 Redis 키 패턴 (전체 협력 랭킹용)
	private static final String COOP_RANKING = "ranking:COOP:%s";
	private static final String COOP_RANKING_DATA = "ranking:COOP:%s:data";
	private static final String COOP_RANKING_LOOKUP = "ranking:COOP:%s:lookup";
	private static final String COOP_RANKING_MEMBERS = "ranking:COOP:%s:members:%s";
	private static final String COOP_RANKING_MEMBER_KEYS = "ranking:COOP:%s:memberKeys";

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

	public static String contributionContributionKey(String week) {
		return String.format(CONTRIBUTION_CONTRIBUTION, week);
	}

	public static String contributionPlayCountKey(String week) {
		return String.format(CONTRIBUTION_PLAY_COUNT, week);
	}

	public static String contributionRegisteredAtKey(String week) {
		return String.format(CONTRIBUTION_REGISTERED_AT, week);
	}

	public static String timeAttackKey(String week) {
		return String.format(TIME_ATTACK, week);
	}

	public static String coopKey(String coopMapId, String week) {
		return String.format(COOP, coopMapId, week);
	}

	// Coop 랭킹 키 생성 메서드 (전체 협력 랭킹용)
	public static String coopRankingKey(String week) {
		return String.format(COOP_RANKING, week);
	}

	public static String coopRankingDataKey(String week) {
		return String.format(COOP_RANKING_DATA, week);
	}

	public static String coopRankingLookupKey(String week) {
		return String.format(COOP_RANKING_LOOKUP, week);
	}

	public static String coopRankingMembersKey(String week, String memberId) {
		return String.format(COOP_RANKING_MEMBERS, week, memberId);
	}

	public static String coopRankingMemberKeysKey(String week) {
		return String.format(COOP_RANKING_MEMBER_KEYS, week);
	}

	// Coop lexString 포맷팅: 정렬용 문자열 생성
	public static String formatCoopLexString(int elapsedTime, int wrongOrder, int wrongType,
		long registeredAt, String coopResultId) {
		return String.format("%09d:%04d:%04d:%07d:%s",
			elapsedTime, wrongOrder, wrongType, registeredAt, coopResultId);
	}

	// Coop lexString 파싱: coopResultId 추출
	public static String parseCoopResultIdFromLexString(String lexString) {
		String[] parts = lexString.split(":");
		return parts[4];
	}

	public static int toPlainSingleScore(double redisScore) {
		if (redisScore < SCORE_UNIT) {
			return (int)Math.round(redisScore);
		}
		return (int)(redisScore / SCORE_UNIT) - 1;
	}
}

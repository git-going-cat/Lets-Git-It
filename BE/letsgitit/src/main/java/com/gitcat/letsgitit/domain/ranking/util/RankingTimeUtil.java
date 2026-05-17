package com.gitcat.letsgitit.domain.ranking.util;

import java.time.DayOfWeek;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.temporal.TemporalAdjusters;

public class RankingTimeUtil {

	private static final ZoneId KOREA_ZONE = ZoneId.of("Asia/Seoul");

	private RankingTimeUtil() {}

	/**
	 * 이번 주 월요일 00:00 기준 경과 deciseconds (0.1초 단위)
	 * 범위: 0 ~ 6,048,000 (1주)
	 */
	public static long currentWeekDeciseconds() {
		ZonedDateTime now = ZonedDateTime.now(KOREA_ZONE);
		ZonedDateTime weekStart = now
			.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
			.toLocalDate()
			.atStartOfDay(KOREA_ZONE);

		long elapsedMs = now.toInstant().toEpochMilli() - weekStart.toInstant().toEpochMilli();
		return elapsedMs / 100;
	}
}

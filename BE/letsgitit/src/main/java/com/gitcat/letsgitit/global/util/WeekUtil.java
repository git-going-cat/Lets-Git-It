package com.gitcat.letsgitit.global.util;

import java.time.LocalDate;
import java.time.temporal.WeekFields;
import java.util.Locale;

public class WeekUtil {
	private WeekUtil() {}

	private static final WeekFields WEEK_FIELDS = WeekFields.of(Locale.KOREA);

	public static String getCurrentWeek() {
		return getWeek(LocalDate.now());
	}

	public static int getCurrentYear() {
		return LocalDate.now().getYear();
	}

	public static int getCurrentMonth() {
		return LocalDate.now().getMonthValue();
	}

	public static int getCurrentWeekOfMonth() {
		return LocalDate.now().get(WEEK_FIELDS.weekOfMonth());
	}

	public static String getWeek(LocalDate date) {
		int year = date.getYear();
		int month = date.getMonthValue();
		int weekOfMonth = date.get(WEEK_FIELDS.weekOfMonth());
		return getWeek(year, month, weekOfMonth);
	}

	public static String getWeek(int year, int month, int week) {
		return year + "-" + String.format("%02d", month) + "-" + week;
	}

	public static int getYear(LocalDate date) {
		return date.getYear();
	}

	public static int getMonth(LocalDate date) {
		return date.getMonthValue();
	}

	public static int getWeekOfMonth(LocalDate date) {
		return date.get(WEEK_FIELDS.weekOfMonth());
	}
}

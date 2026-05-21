package com.gitcat.letsgitit.domain.single.constants;

public class SingleSessionKeyUtil {

	private SingleSessionKeyUtil() {}

	private static final String SESSION = "single:session:%s";

	public static String singleSessionKey(String sessionId) {
		return String.format(SESSION, sessionId);
	}
}

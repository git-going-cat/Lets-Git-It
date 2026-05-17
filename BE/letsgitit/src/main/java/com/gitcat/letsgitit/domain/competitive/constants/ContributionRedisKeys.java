package com.gitcat.letsgitit.domain.competitive.constants;

import java.util.UUID;

public final class ContributionRedisKeys {

	private static final String SESSION_PREFIX = "contribution:session:";
	private static final String COMMAND_LOCK_PREFIX = "lock:contribution:session:";

	private ContributionRedisKeys() {}

	public static String meta(UUID gameSessionId) {
		return SESSION_PREFIX + gameSessionId + ":meta";
	}

	public static String commands(UUID gameSessionId) {
		return SESSION_PREFIX + gameSessionId + ":commands";
	}

	public static String players(UUID gameSessionId) {
		return SESSION_PREFIX + gameSessionId + ":players";
	}

	public static String scores(UUID gameSessionId) {
		return SESSION_PREFIX + gameSessionId + ":scores";
	}

	public static String positions(UUID gameSessionId) {
		return SESSION_PREFIX + gameSessionId + ":positions";
	}

	public static String commandLock(UUID gameSessionId, int commandSequence) {
		return COMMAND_LOCK_PREFIX + gameSessionId + ":command:" + commandSequence;
	}
}

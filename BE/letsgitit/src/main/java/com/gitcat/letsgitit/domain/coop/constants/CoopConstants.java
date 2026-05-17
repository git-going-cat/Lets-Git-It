package com.gitcat.letsgitit.domain.coop.constants;

public class CoopConstants {

	// Redis key patterns
	public static final String KEY_STATE = "coop:%s:state";
	public static final String KEY_PLAYERS = "coop:%s:players";
	public static final String KEY_COMMANDS = "coop:%s:r%d:commands";
	public static final String KEY_ASSIGN = "coop:%s:r%d:assign";
	public static final String KEY_ROOM_SESSION = "coop:room:%d:session";

	// Redis key patterns (플레이어별 오타/순서오류 카운터)
	public static final String KEY_WRONG_TYPE = "coop:%s:wrong_type";
	public static final String KEY_WRONG_ORDER = "coop:%s:wrong_order";

	// State Hash field names
	public static final String FIELD_ROUND = "round";
	public static final String FIELD_COMPLETED = "completedCount";
	public static final String FIELD_BLOCKED = "blocked";
	public static final String FIELD_RESET_TARGET = "resetTargetId";
	public static final String FIELD_START_TIME = "startTime";
	public static final String FIELD_MAP_ID = "mapId";
	public static final String FIELD_ROOM_ID = "roomId";
	public static final String FIELD_MAP_NAME = "mapName";
	public static final String FIELD_MAP_DIFFICULTY = "mapDifficulty";
	public static final String FIELD_TEAM_NAME = "teamName";

	// Game rules
	public static final int TOTAL_ROUNDS = 5;
	public static final int COMMANDS_PER_ROUND = 4;
	public static final int TOTAL_COMMANDS = TOTAL_ROUNDS * COMMANDS_PER_ROUND;
	public static final long REVEAL_DURATION_MS = 3000L;
	public static final long GAME_TTL_SECONDS = 7200L; // 2시간

	// Reset command
	public static final String GIT_RESET_COMMAND = "git reset";

	// Distributed lock keys
	public static final String LOCK_INPUT = "coop:lock:input:%s";
	public static final String LOCK_RESET = "coop:lock:reset:%s";
	public static final long LOCK_WAIT_SECONDS = 3L;
	public static final long LOCK_LEASE_SECONDS = 10L;

	private CoopConstants() {}
}

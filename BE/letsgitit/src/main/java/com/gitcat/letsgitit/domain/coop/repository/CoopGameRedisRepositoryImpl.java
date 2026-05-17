package com.gitcat.letsgitit.domain.coop.repository;

import static com.gitcat.letsgitit.domain.coop.constants.CoopConstants.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Repository
public class CoopGameRedisRepositoryImpl implements CoopGameRedisRepository {

	private final StringRedisTemplate redisTemplate;

	public CoopGameRedisRepositoryImpl(
		@Qualifier("gameStringRedisTemplate")
		StringRedisTemplate redisTemplate) {
		this.redisTemplate = redisTemplate;
	}

	// ── 초기화 ──────────────────────────────────────────────────────────────────

	@Override
	public void initGameState(UUID gameSessionId, UUID mapId, Long roomId, List<UUID> playerIds,
		String mapName, String mapDifficulty, String teamName) {
		String stateKey = stateKey(gameSessionId);
		String playersKey = playersKey(gameSessionId);

		redisTemplate.opsForHash().putAll(stateKey, Map.of(
			FIELD_ROUND, "1",
			FIELD_COMPLETED, "0",
			FIELD_BLOCKED, "false",
			FIELD_RESET_TARGET, "",
			FIELD_START_TIME, String.valueOf(System.currentTimeMillis()),
			FIELD_MAP_ID, mapId.toString(),
			FIELD_ROOM_ID, roomId.toString(),
			FIELD_MAP_NAME, mapName,
			FIELD_MAP_DIFFICULTY, mapDifficulty,
			FIELD_TEAM_NAME, teamName));
		redisTemplate.expire(stateKey, GAME_TTL_SECONDS, TimeUnit.SECONDS);

		List<String> playerStrings = playerIds.stream().map(UUID::toString).toList();
		redisTemplate.opsForList().rightPushAll(playersKey, playerStrings);
		redisTemplate.expire(playersKey, GAME_TTL_SECONDS, TimeUnit.SECONDS);

		log.info("[coop] game state initialized. gameSessionId={}", gameSessionId);
	}

	// ── 상태 조회 ────────────────────────────────────────────────────────────────

	@Override
	public boolean isGameActive(UUID gameSessionId) {
		return Boolean.TRUE.equals(redisTemplate.hasKey(stateKey(gameSessionId)));
	}

	@Override
	public int getCurrentRound(UUID gameSessionId) {
		return readInt(gameSessionId, FIELD_ROUND);
	}

	@Override
	public int getCompletedCount(UUID gameSessionId) {
		return readInt(gameSessionId, FIELD_COMPLETED);
	}

	@Override
	public long getStartTime(UUID gameSessionId) {
		String val = readString(gameSessionId, FIELD_START_TIME);
		return val.isEmpty() ? 0L : Long.parseLong(val);
	}

	@Override
	public UUID getMapId(UUID gameSessionId) {
		String val = readString(gameSessionId, FIELD_MAP_ID);
		return val.isEmpty() ? null : UUID.fromString(val);
	}

	@Override
	public Long getRoomId(UUID gameSessionId) {
		String val = readString(gameSessionId, FIELD_ROOM_ID);
		return val.isEmpty() ? null : Long.parseLong(val);
	}

	@Override
	public List<UUID> getPlayers(UUID gameSessionId) {
		List<String> values = redisTemplate.opsForList().range(playersKey(gameSessionId), 0, -1);
		if (values == null) {
			return Collections.emptyList();
		}
		return values.stream().map(UUID::fromString).toList();
	}

	// ── 차단 상태 ────────────────────────────────────────────────────────────────

	@Override
	public boolean isBlocked(UUID gameSessionId) {
		return "true".equals(readString(gameSessionId, FIELD_BLOCKED));
	}

	@Override
	public void block(UUID gameSessionId, UUID resetTargetPlayerId) {
		// HSET 두 번 대신 HMSET(putAll)으로 두 필드를 한 번에 원자적으로 기록
		redisTemplate.opsForHash().putAll(stateKey(gameSessionId), Map.of(
			FIELD_BLOCKED, "true",
			FIELD_RESET_TARGET, resetTargetPlayerId.toString()));
	}

	@Override
	public void unblock(UUID gameSessionId) {
		redisTemplate.opsForHash().put(stateKey(gameSessionId), FIELD_BLOCKED, "false");
		redisTemplate.opsForHash().put(stateKey(gameSessionId), FIELD_RESET_TARGET, "");
	}

	@Override
	public UUID getResetTargetPlayerId(UUID gameSessionId) {
		String val = readString(gameSessionId, FIELD_RESET_TARGET);
		return val.isEmpty() ? null : UUID.fromString(val);
	}

	// ── 라운드 명령어 ─────────────────────────────────────────────────────────────

	@Override
	public void saveRoundCommands(UUID gameSessionId, int round, Map<Integer, String> commands) {
		String key = commandsKey(gameSessionId, round);
		commands.forEach((order, text) -> redisTemplate.opsForHash().put(key, String.valueOf(order), text));
		redisTemplate.expire(key, GAME_TTL_SECONDS, TimeUnit.SECONDS);
	}

	@Override
	public String getCommandByOrder(UUID gameSessionId, int round, int order) {
		Object val = redisTemplate.opsForHash().get(commandsKey(gameSessionId, round),
			String.valueOf(order));
		return val == null ? "" : val.toString();
	}

	// ── 플레이어 배정 ─────────────────────────────────────────────────────────────

	@Override
	public void assignCommand(UUID gameSessionId, int round, UUID playerId, String commandText) {
		String key = assignKey(gameSessionId, round);
		redisTemplate.opsForHash().put(key, playerId.toString(), commandText);
		redisTemplate.expire(key, GAME_TTL_SECONDS, TimeUnit.SECONDS);
	}

	@Override
	public String getAssignedCommand(UUID gameSessionId, int round, UUID playerId) {
		Object val = redisTemplate.opsForHash().get(assignKey(gameSessionId, round),
			playerId.toString());
		return val == null ? "" : val.toString();
	}

	// ── 진행도 업데이트 ───────────────────────────────────────────────────────────

	@Override
	public int incrementCompletedCount(UUID gameSessionId) {
		Long val = redisTemplate.opsForHash().increment(stateKey(gameSessionId), FIELD_COMPLETED, 1);
		return val == null ? 0 : val.intValue();
	}

	@Override
	public void setRound(UUID gameSessionId, int round) {
		redisTemplate.opsForHash().put(stateKey(gameSessionId), FIELD_ROUND, String.valueOf(round));
	}

	@Override
	public void resetRoundProgress(UUID gameSessionId, int round) {
		redisTemplate.opsForHash().put(stateKey(gameSessionId), FIELD_COMPLETED,
			String.valueOf((round - 1) * COMMANDS_PER_ROUND));
	}

	// ── 게임 종료 ────────────────────────────────────────────────────────────────

	@Override
	public void deleteGameState(UUID gameSessionId) {
		redisTemplate.delete(stateKey(gameSessionId));
		redisTemplate.delete(playersKey(gameSessionId));
		redisTemplate.delete(String.format(KEY_WRONG_TYPE, gameSessionId));
		redisTemplate.delete(String.format(KEY_WRONG_ORDER, gameSessionId));
		for (int round = 1; round <= TOTAL_ROUNDS; round++) {
			redisTemplate.delete(commandsKey(gameSessionId, round));
			redisTemplate.delete(assignKey(gameSessionId, round));
		}
		log.info("[coop] game state deleted. gameSessionId={}", gameSessionId);
	}

	// ── 플레이어별 오타/순서오류 카운터 ─────────────────────────────────────────────────

	@Override
	public void incrementWrongType(UUID gameSessionId, UUID playerId) {
		String key = String.format(KEY_WRONG_TYPE, gameSessionId);
		redisTemplate.opsForHash().increment(key, playerId.toString(), 1L);
		redisTemplate.expire(key, GAME_TTL_SECONDS, TimeUnit.SECONDS);
	}

	@Override
	public void incrementWrongOrder(UUID gameSessionId, UUID playerId) {
		String key = String.format(KEY_WRONG_ORDER, gameSessionId);
		redisTemplate.opsForHash().increment(key, playerId.toString(), 1L);
		redisTemplate.expire(key, GAME_TTL_SECONDS, TimeUnit.SECONDS);
	}

	@Override
	public int getWrongType(UUID gameSessionId, UUID playerId) {
		Object val = redisTemplate.opsForHash().get(String.format(KEY_WRONG_TYPE, gameSessionId),
			playerId.toString());
		return val == null ? 0 : Integer.parseInt(val.toString());
	}

	@Override
	public int getWrongOrder(UUID gameSessionId, UUID playerId) {
		Object val = redisTemplate.opsForHash().get(String.format(KEY_WRONG_ORDER, gameSessionId),
			playerId.toString());
		return val == null ? 0 : Integer.parseInt(val.toString());
	}

	@Override
	public String getMapName(UUID gameSessionId) {
		return readString(gameSessionId, FIELD_MAP_NAME);
	}

	@Override
	public String getMapDifficulty(UUID gameSessionId) {
		return readString(gameSessionId, FIELD_MAP_DIFFICULTY);
	}

	@Override
	public String getTeamName(UUID gameSessionId) {
		return readString(gameSessionId, FIELD_TEAM_NAME);
	}

	// ── private helpers ──────────────────────────────────────────────────────────

	private String stateKey(UUID id) {
		return String.format(KEY_STATE, id);
	}

	private String playersKey(UUID id) {
		return String.format(KEY_PLAYERS, id);
	}

	private String commandsKey(UUID id, int round) {
		return String.format(KEY_COMMANDS, id, round);
	}

	private String assignKey(UUID id, int round) {
		return String.format(KEY_ASSIGN, id, round);
	}

	private String readString(UUID gameSessionId, String field) {
		Object val = redisTemplate.opsForHash().get(stateKey(gameSessionId), field);
		return val == null ? "" : val.toString();
	}

	private int readInt(UUID gameSessionId, String field) {
		String val = readString(gameSessionId, field);
		return val.isEmpty() ? 0 : Integer.parseInt(val);
	}

	@Override
	public void saveRoomGameSession(Long roomId, UUID gameSessionId) {
		String key = String.format(KEY_ROOM_SESSION, roomId);
		redisTemplate.opsForValue().set(key, gameSessionId.toString(), GAME_TTL_SECONDS, TimeUnit.SECONDS);
	}

	@Override
	public UUID findGameSessionIdByRoomId(Long roomId) {
		String val = redisTemplate.opsForValue().get(String.format(KEY_ROOM_SESSION, roomId));
		return val == null ? null : UUID.fromString(val);
	}

	@Override
	public void deleteRoomGameSession(Long roomId) {
		redisTemplate.delete(String.format(KEY_ROOM_SESSION, roomId));
	}
}

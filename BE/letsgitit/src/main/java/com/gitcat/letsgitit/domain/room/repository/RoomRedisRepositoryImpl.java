package com.gitcat.letsgitit.domain.room.repository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.room.constants.RoomConstants;
import com.gitcat.letsgitit.domain.room.dto.RoomCache;
import com.gitcat.letsgitit.domain.room.dto.response.SelectedMapDto;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Repository
public class RoomRedisRepositoryImpl implements RoomRedisRepository {

	private static final long PASSWORD_VERIFIED_TTL_MINUTES = 5;

	// KEYS[1]=infoKey, KEYS[2]=membersKey, KEYS[3]=codeKey("" if none), KEYS[4]=listKey("" if none)
	// ARGV[1]=roomId (value-serialized, matches the ZSet member stored by opsForZSet)
	private static final RedisScript<Long> DISSOLVE_SCRIPT = RedisScript.of("""
		redis.call('DEL', KEYS[1])
		redis.call('DEL', KEYS[2])
		if KEYS[3] ~= '' then redis.call('DEL', KEYS[3]) end
		if KEYS[4] ~= '' then redis.call('ZREM', KEYS[4], ARGV[1]) end
		return 1
		""", Long.class);

	private final RedisTemplate<String, Object> gameRedisTemplate;
	private final StringRedisTemplate authStringRedisTemplate;

	public RoomRedisRepositoryImpl(
		@Qualifier("gameRedisTemplate")
		RedisTemplate<String, Object> gameRedisTemplate,
		@Qualifier("authStringRedisTemplate")
		StringRedisTemplate authStringRedisTemplate) {
		this.gameRedisTemplate = gameRedisTemplate;
		this.authStringRedisTemplate = authStringRedisTemplate;
	}

	@Override
	public List<RoomCache> findAll() {
		List<ZSetOperations.TypedTuple<Object>> allTuples = new ArrayList<>();
		for (String mode : List.of("CONTRIBUTION", "COOP")) {
			Set<ZSetOperations.TypedTuple<Object>> tuples = gameRedisTemplate.opsForZSet()
				.rangeWithScores(RoomConstants.ROOM_LIST_KEY_PREFIX + mode, 0, -1);
			if (tuples != null) {
				allTuples.addAll(tuples);
			}
		}
		if (allTuples.isEmpty()) {
			return List.of();
		}
		return allTuples.stream()
			.sorted(Comparator.comparingDouble(t -> t.getScore() != null ? t.getScore() : 0.0))
			.map(tuple -> {
				String roomId = String.valueOf(tuple.getValue());
				String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
				Map<Object, Object> fields = gameRedisTemplate.opsForHash().entries(key);
				return toCache(roomId, fields);
			})
			.filter(Objects::nonNull)
			.toList();
	}

	@Override
	public boolean existsById(Long roomId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		return Boolean.TRUE.equals(gameRedisTemplate.hasKey(key));
	}

	@Override
	public String findPasswordById(Long roomId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		Object value = gameRedisTemplate.opsForHash().get(key, "password");
		return value == null ? null : String.valueOf(value);
	}

	@Override
	public Optional<RoomCache> findByCode(String code) {
		String codeKey = RoomConstants.ROOM_CODE_KEY_PREFIX + code;
		Object roomIdObj = gameRedisTemplate.opsForValue().get(codeKey);
		if (roomIdObj == null) {
			return Optional.empty();
		}
		String roomId = String.valueOf(roomIdObj);
		String infoKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		Map<Object, Object> fields = gameRedisTemplate.opsForHash().entries(infoKey);
		return Optional.ofNullable(toCache(roomId, fields));
	}

	@Override
	public String findHostIdById(Long roomId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		Object value = gameRedisTemplate.opsForHash().get(key, "hostMemberId");
		return value == null ? null : String.valueOf(value);
	}

	@Override
	public boolean existsMember(Long roomId, String playerId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		return Boolean.TRUE.equals(gameRedisTemplate.opsForHash().hasKey(key, playerId));
	}

	@Override
	public void removeMember(Long roomId, String playerId) {
		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		gameRedisTemplate.opsForHash().delete(membersKey, playerId);
	}

	@Override
	public Set<String> findAllMemberIds(Long roomId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		Set<Object> keys = gameRedisTemplate.opsForHash().keys(key);
		return keys.stream().map(String::valueOf).collect(java.util.stream.Collectors.toSet());
	}

	@Override
	public void updateHostId(Long roomId, String newHostId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		gameRedisTemplate.opsForHash().put(key, "hostMemberId", newHostId);
	}

	@Override
	public void dissolveRoom(Long roomId) {
		String infoKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;

		Object roomCodeObj = gameRedisTemplate.opsForHash().get(infoKey, "roomCode");
		Object modeObj = gameRedisTemplate.opsForHash().get(infoKey, "mode");

		String codeKey = roomCodeObj == null ? "" : RoomConstants.ROOM_CODE_KEY_PREFIX + roomCodeObj;
		String listKey = modeObj == null ? "" : RoomConstants.ROOM_LIST_KEY_PREFIX + modeObj;

		gameRedisTemplate.execute(DISSOLVE_SCRIPT,
			List.of(infoKey, membersKey, codeKey, listKey),
			roomId.toString());
	}

	@Override
	public void savePasswordVerified(String memberId, Long roomId) {
		String key = "room:" + roomId + ":password:verified:" + memberId;
		authStringRedisTemplate.opsForValue()
			.set(key, "true", PASSWORD_VERIFIED_TTL_MINUTES, TimeUnit.MINUTES);
	}

	private RoomCache toCache(String roomId, Map<Object, Object> fields) {
		if (fields.isEmpty()) {
			return null;
		}
		Integer maxPlayers = (Integer)fields.get("maxPlayers");
		Boolean hasPassword = (Boolean)fields.get("hasPassword");
		if (maxPlayers == null || hasPassword == null) {
			log.warn("[room] 손상된 방 데이터. roomId={}", roomId);
			return null;
		}

		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		int currentPlayers = gameRedisTemplate.opsForHash().size(membersKey).intValue();

		String selectedMapId = (String)fields.get("selectedMapId");
		SelectedMapDto selectedMap = selectedMapId == null ? null : new SelectedMapDto(
			UUID.fromString(selectedMapId),
			(String)fields.get("selectedMapName"),
			(Integer)fields.get("selectedMapDifficulty"));
		return new RoomCache(
			Long.parseLong(roomId),
			(String)fields.get("title"),
			(String)fields.get("mode"),
			currentPlayers,
			maxPlayers,
			hasPassword,
			(String)fields.get("roomState"),
			selectedMap);
	}
}

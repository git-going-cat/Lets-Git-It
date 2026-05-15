package com.gitcat.letsgitit.domain.room.repository;

import java.time.Duration;
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
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.SessionCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gitcat.letsgitit.domain.room.constants.RoomConstants;
import com.gitcat.letsgitit.domain.room.dto.RoomCache;
import com.gitcat.letsgitit.domain.room.dto.response.SelectedMapDto;
import com.gitcat.letsgitit.global.enums.GameMode;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@Repository
public class RoomRedisRepositoryImpl implements RoomRedisRepository {

	private static final long PASSWORD_VERIFIED_TTL_MINUTES = 5;

	// KEYS[1]=memberRoomKey, KEYS[2]=membersKey
	// ARGV[1]=roomId, ARGV[2]=memberId, ARGV[3]=serialized memberInfo
	private static final RedisScript<Long> SAVE_MEMBER_IF_NOT_IN_ANY_ROOM_SCRIPT = RedisScript.of("""
		if redis.call('EXISTS', KEYS[1]) == 1 then
			return 0
		end
		redis.call('SET', KEYS[1], ARGV[1])
		redis.call('HSET', KEYS[2], ARGV[2], ARGV[3])
		return 1
		""", Long.class);

	private final RedisTemplate<String, Object> gameRedisTemplate;
	private final StringRedisTemplate authStringRedisTemplate;
	private final ObjectMapper objectMapper;

	public RoomRedisRepositoryImpl(
		@Qualifier("gameRedisTemplate")
		RedisTemplate<String, Object> gameRedisTemplate,
		@Qualifier("authStringRedisTemplate")
		StringRedisTemplate authStringRedisTemplate,
		ObjectMapper objectMapper) {
		this.gameRedisTemplate = gameRedisTemplate;
		this.authStringRedisTemplate = authStringRedisTemplate;
		this.objectMapper = objectMapper;
	}

	@Override
	public Long generateRoomId() {
		Long nextId = gameRedisTemplate.opsForValue().increment("room:id:sequence");
		if (nextId == null) {
			throw new IllegalStateException("Failed to generate roomId");
		}
		return nextId;
	}

	@Override
	public boolean reserveRoomCode(String roomCode) {
		String key = RoomConstants.ROOM_CODE_KEY_PREFIX + roomCode;
		return Boolean.TRUE.equals(
			gameRedisTemplate.opsForValue().setIfAbsent(key, "RESERVED", Duration.ofMinutes(1)));
	}

	@Override
	public void confirmRoomCode(String roomCode, String roomId) {
		gameRedisTemplate.opsForValue().set(RoomConstants.ROOM_CODE_KEY_PREFIX + roomCode, roomId);
	}

	@Override
	public void deleteRoomCode(String roomCode) {
		gameRedisTemplate.delete(RoomConstants.ROOM_CODE_KEY_PREFIX + roomCode);
	}

	@Override
	public void saveRoomInfo(String roomId, Map<String, Object> roomInfo) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		gameRedisTemplate.opsForHash().putAll(key, roomInfo);
	}

	@Override
	public void updateRoomInfo(String roomId, Map<String, Object> roomInfo) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		Map<String, Object> nonNullFields = roomInfo.entrySet().stream()
			.filter(entry -> entry.getValue() != null)
			.collect(java.util.stream.Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
		List<String> nullFields = roomInfo.entrySet().stream()
			.filter(entry -> entry.getValue() == null)
			.map(Map.Entry::getKey)
			.toList();
		if (!nonNullFields.isEmpty()) {
			gameRedisTemplate.opsForHash().putAll(key, nonNullFields);
		}
		if (!nullFields.isEmpty()) {
			gameRedisTemplate.opsForHash().delete(key, nullFields.toArray());
		}
	}

	@Override
	public Optional<Map<Object, Object>> getRoomInfo(String roomId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		Map<Object, Object> roomInfo = gameRedisTemplate.opsForHash().entries(key);
		if (roomInfo == null || roomInfo.isEmpty()) {
			return Optional.empty();
		}
		return Optional.of(roomInfo);
	}

	@Override
	public boolean saveMemberIfNotInAnyRoom(String roomId, String memberId, Map<String, Object> memberInfo) {
		String memberRoomKey = memberRoomKey(memberId);
		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		Long result = gameRedisTemplate.execute(
			SAVE_MEMBER_IF_NOT_IN_ANY_ROOM_SCRIPT,
			List.of(memberRoomKey, membersKey),
			roomId,
			memberId,
			toJson(memberInfo));
		return result != null && result == 1L;
	}

	@Override
	public Map<Object, Object> getMembers(String roomId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		return gameRedisTemplate.opsForHash().entries(key);
	}

	@Override
	public long getMembersCount(String roomId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		Long size = gameRedisTemplate.opsForHash().size(key);
		return size != null ? size : 0L;
	}

	@Override
	public void addRoomToList(GameMode mode, String roomId, double score) {
		gameRedisTemplate.opsForZSet().add(RoomConstants.ROOM_LIST_KEY_PREFIX + mode.name(), roomId, score);
	}

	@Override
	public void deleteRoom(Long roomId) {
		String roomIdValue = roomId.toString();
		String infoKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomIdValue + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomIdValue + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		Map<Object, Object> members = gameRedisTemplate.opsForHash().entries(membersKey);
		Object roomCodeObj = gameRedisTemplate.opsForHash().get(infoKey, "roomCode");
		Object modeObj = gameRedisTemplate.opsForHash().get(infoKey, "mode");

		dissolveRoomKeys(infoKey, membersKey, roomCodeObj, modeObj, members, roomIdValue);
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
	public Optional<Long> findJoinedRoomId(String playerId) {
		Object roomIdObj = gameRedisTemplate.opsForValue().get(memberRoomKey(playerId));
		if (roomIdObj == null) {
			return Optional.empty();
		}
		return Optional.of(Long.parseLong(String.valueOf(roomIdObj)));
	}

	@Override
	public void removeMember(Long roomId, String playerId) {
		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		gameRedisTemplate.executePipelined(new SessionCallback<Object>() {
			@Override
			public <K, V> Object execute(RedisOperations<K, V> operations) throws DataAccessException {
				operations.opsForHash().delete((K)membersKey, playerId);
				operations.delete((K)memberRoomKey(playerId));
				return null;
			}
		});
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
		String roomIdValue = roomId.toString();
		String infoKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomIdValue + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomIdValue + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		Map<Object, Object> members = gameRedisTemplate.opsForHash().entries(membersKey);
		Object roomCodeObj = gameRedisTemplate.opsForHash().get(infoKey, "roomCode");
		Object modeObj = gameRedisTemplate.opsForHash().get(infoKey, "mode");

		dissolveRoomKeys(infoKey, membersKey, roomCodeObj, modeObj, members, roomIdValue);
	}

	@Override
	public void savePasswordVerified(String memberId, Long roomId) {
		String key = "room:" + roomId + ":password:verified:" + memberId;
		authStringRedisTemplate.opsForValue()
			.set(key, "true", PASSWORD_VERIFIED_TTL_MINUTES, TimeUnit.MINUTES);
	}

	@Override
	public boolean isPasswordVerified(String memberId, Long roomId) {
		String key = "room:" + roomId + ":password:verified:" + memberId;
		return Boolean.TRUE.equals(authStringRedisTemplate.hasKey(key));
	}

	private void dissolveRoomKeys(String infoKey, String membersKey, Object roomCodeObj, Object modeObj,
		Map<Object, Object> members, String roomIdValue) {
		gameRedisTemplate.executePipelined(new SessionCallback<Object>() {
			@Override
			public <K, V> Object execute(RedisOperations<K, V> operations) throws DataAccessException {
				operations.delete((K)infoKey);
				operations.delete((K)membersKey);
				if (roomCodeObj != null) {
					operations.delete((K)(RoomConstants.ROOM_CODE_KEY_PREFIX + roomCodeObj));
				}
				if (modeObj != null) {
					operations.opsForZSet().remove((K)(RoomConstants.ROOM_LIST_KEY_PREFIX + modeObj), roomIdValue);
				}
				for (Object memberKey : members.keySet()) {
					operations.delete((K)memberRoomKey(String.valueOf(memberKey)));
				}
				return null;
			}
		});
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

	private String memberRoomKey(String memberId) {
		return "member:" + memberId + ":room";
	}

	private String toJson(Map<String, Object> memberInfo) {
		try {
			return objectMapper.writeValueAsString(memberInfo);
		} catch (JsonProcessingException e) {
			throw new IllegalStateException("Failed to serialize memberInfo", e);
		}
	}
}

package com.gitcat.letsgitit.domain.room.repository;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.connection.RedisStringCommands;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.SessionCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.data.redis.serializer.SerializationException;
import org.springframework.stereotype.Repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
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

	// KEYS[1]=memberRoomKey, KEYS[2]=membersKey, KEYS[3]=memberMappingsKey
	// ARGV[1]=roomId, ARGV[2]=memberId, ARGV[3]=serialized memberInfo
	private static final RedisScript<Long> SAVE_MEMBER_IF_NOT_IN_ANY_ROOM_SCRIPT = RedisScript.of("""
		if redis.call('EXISTS', KEYS[1]) == 1 then
			return 0
		end
		redis.call('SET', KEYS[1], ARGV[1])
		redis.call('HSET', KEYS[2], ARGV[2], ARGV[3])
		redis.call('SADD', KEYS[3], ARGV[2])
		return 1
		""", Long.class);

	// transferHost용 Lua 스크립트 (검증 먼저, 변경 나중)
	// KEYS[1]=infoKey, KEYS[2]=membersKey
	// ARGV[1]=prevHostId, ARGV[2]=newHostId
	private static final RedisScript<Long> TRANSFER_HOST_SCRIPT = RedisScript.of("""
		local infoKey = KEYS[1]
		local membersKey = KEYS[2]
		local prevHostId = ARGV[1]
		local newHostId = ARGV[2]

		local prevHostJson = redis.call('HGET', membersKey, prevHostId)
		if not prevHostJson then
			return -1
		end

		local newHostJson = redis.call('HGET', membersKey, newHostId)
		if not newHostJson then
			return -2
		end

		local prevHost = cjson.decode(prevHostJson)
		local newHost = cjson.decode(newHostJson)

		prevHost['isHost'] = false
		prevHost['isReady'] = false
		newHost['isHost'] = true
		newHost['isReady'] = true

		redis.call('HSET', membersKey, prevHostId, cjson.encode(prevHost))
		redis.call('HSET', membersKey, newHostId, cjson.encode(newHost))
		redis.call('HSET', infoKey, 'hostMemberId', cjson.encode(newHostId))

		return 1
		""", Long.class);

	// leaveRoom 방장 위임용 Lua 스크립트 (검증 먼저, 변경 나중)
	// KEYS[1]=infoKey, KEYS[2]=membersKey
	// ARGV[1]=newHostId
	private static final RedisScript<Long> DELEGATE_HOST_SCRIPT = RedisScript.of("""
		local infoKey = KEYS[1]
		local membersKey = KEYS[2]
		local newHostId = ARGV[1]

		local newHostJson = redis.call('HGET', membersKey, newHostId)
		if not newHostJson then
			return -1
		end

		local newHost = cjson.decode(newHostJson)
		newHost['isHost'] = true
		newHost['isReady'] = true

		redis.call('HSET', membersKey, newHostId, cjson.encode(newHost))
		redis.call('HSET', infoKey, 'hostMemberId', cjson.encode(newHostId))

		return 1
		""", Long.class);

	private final RedisTemplate<String, Object> gameRedisTemplate;
	private final StringRedisTemplate gameStringRedisTemplate;
	private final StringRedisTemplate authStringRedisTemplate;
	private final ObjectMapper objectMapper;

	public RoomRedisRepositoryImpl(
		@Qualifier("gameRedisTemplate")
		RedisTemplate<String, Object> gameRedisTemplate,
		@Qualifier("gameStringRedisTemplate")
		StringRedisTemplate gameStringRedisTemplate,
		@Qualifier("authStringRedisTemplate")
		StringRedisTemplate authStringRedisTemplate,
		ObjectMapper objectMapper) {
		this.gameRedisTemplate = gameRedisTemplate;
		this.gameStringRedisTemplate = gameStringRedisTemplate;
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
		Map<Object, Object> roomInfo = readRoomInfoFields(roomId);
		if (roomInfo == null || roomInfo.isEmpty()) {
			return Optional.empty();
		}
		return Optional.of(roomInfo);
	}

	@Override
	public boolean saveMemberIfNotInAnyRoom(String roomId, String memberId, Map<String, Object> memberInfo) {
		String memberRoomKey = memberRoomKey(memberId);
		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		String memberMappingsKey = roomMemberMappingsKey(roomId);
		Long result = gameStringRedisTemplate.execute(
			SAVE_MEMBER_IF_NOT_IN_ANY_ROOM_SCRIPT,
			List.of(memberRoomKey, membersKey, memberMappingsKey),
			roomId,
			memberId,
			toJson(memberInfo));
		return result != null && result == 1L;
	}

	@Override
	public void saveMember(String roomId, String memberId, Map<String, Object> memberInfo) {
		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		String memberMappingsKey = roomMemberMappingsKey(roomId);
		gameStringRedisTemplate.opsForHash().put(membersKey, memberId, toJson(memberInfo));
		gameStringRedisTemplate.opsForSet().add(memberMappingsKey, memberId);
	}

	@Override
	public Map<Object, Object> getMembers(String roomId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		return gameStringRedisTemplate.opsForHash().entries(key);
	}

	@Override
	public long getMembersCount(String roomId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		Long size = gameStringRedisTemplate.opsForHash().size(key);
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
		Map<Object, Object> members = gameStringRedisTemplate.opsForHash().entries(membersKey);
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
				Map<Object, Object> fields = readRoomInfoFields(roomId);
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
		Map<Object, Object> fields = readRoomInfoFields(roomId);
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
		return Boolean.TRUE.equals(gameStringRedisTemplate.opsForHash().hasKey(key, playerId));
	}

	@Override
	public Optional<Long> findJoinedRoomId(String playerId) {
		String roomIdObj = gameStringRedisTemplate.opsForValue().get(memberRoomKey(playerId));
		return normalizeRoomIdValue(roomIdObj);
	}

	@Override
	public void removeMember(Long roomId, String playerId) {
		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		String memberMappingsKey = roomMemberMappingsKey(roomId.toString());
		gameStringRedisTemplate.executePipelined(new SessionCallback<Object>() {
			@Override
			public <K, V> Object execute(RedisOperations<K, V> operations) throws DataAccessException {
				operations.opsForHash().delete((K)membersKey, playerId);
				operations.opsForSet().remove((K)memberMappingsKey, playerId);
				operations.delete((K)memberRoomKey(playerId));
				return null;
			}
		});
	}

	@Override
	public Set<String> findAllMemberIds(Long roomId) {
		String roomIdValue = roomId.toString();
		String memberMappingsKey = roomMemberMappingsKey(roomIdValue);
		Set<String> members = new HashSet<>();
		Set<String> indexedMembers = gameStringRedisTemplate.opsForSet().members(memberMappingsKey);
		if (indexedMembers != null && !indexedMembers.isEmpty()) {
			members.addAll(indexedMembers);
			return members;
		}

		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomIdValue + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		Set<Object> memberHashKeys = gameStringRedisTemplate.opsForHash().keys(membersKey);
		if (memberHashKeys != null && !memberHashKeys.isEmpty()) {
			memberHashKeys.stream()
				.map(String::valueOf)
				.forEach(members::add);
		}

		if (!members.isEmpty()) {
			gameStringRedisTemplate.opsForSet().add(memberMappingsKey, members.toArray(String[]::new));
			log.warn("[room] member-mappings index backfilled from members hash. roomId={}, memberCount={}",
				roomId, members.size());
			return members;
		}

		Set<String> legacyMemberIds = findLegacyMappedMemberIds(roomIdValue, Set.of());
		if (legacyMemberIds.isEmpty()) {
			return Set.of();
		}

		gameStringRedisTemplate.opsForSet().add(memberMappingsKey, legacyMemberIds.toArray(String[]::new));
		log.warn("[room] member-mappings index backfilled from legacy member-room mappings. roomId={}, memberCount={}",
			roomId, legacyMemberIds.size());
		return legacyMemberIds;
	}

	@Override
	public void updateHostId(Long roomId, String newHostId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		gameRedisTemplate.opsForHash().put(key, "hostMemberId", newHostId);
	}

	@Override
	public void updateMemberHostFlags(Long roomId, String newHostId) {
		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		Map<Object, Object> members = gameStringRedisTemplate.opsForHash().entries(membersKey);
		for (Map.Entry<Object, Object> entry : members.entrySet()) {
			String memberId = String.valueOf(entry.getKey());
			Map<String, Object> memberInfo = readMemberInfo(entry.getValue());
			memberInfo.put("isHost", memberId.equals(newHostId));
			gameStringRedisTemplate.opsForHash().put(membersKey, memberId, toJson(memberInfo));
		}
	}

	@Override
	public void dissolveRoom(Long roomId) {
		String roomIdValue = roomId.toString();
		String infoKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomIdValue + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomIdValue + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		Map<Object, Object> members = gameStringRedisTemplate.opsForHash().entries(membersKey);
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

	@Override
	public void updateMemberIsReady(String roomId, String memberId, boolean isReady) {
		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		String memberJson = (String)gameStringRedisTemplate.opsForHash().get(membersKey, memberId);
		if (memberJson == null) {
			throw new IllegalStateException(
				"Member not found in room members hash. roomId=" + roomId + ", memberId=" + memberId);
		}
		try {
			Map<String, Object> memberInfo = objectMapper.readValue(memberJson,
				new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
			memberInfo.put("isReady", isReady);
			gameStringRedisTemplate.opsForHash().put(membersKey, memberId, objectMapper.writeValueAsString(memberInfo));
		} catch (JsonProcessingException e) {
			throw new IllegalStateException(
				"Failed to update member isReady. roomId=" + roomId + ", memberId=" + memberId, e);
		}
	}

	private void dissolveRoomKeys(String infoKey, String membersKey, Object roomCodeObj, Object modeObj,
		Map<Object, Object> members, String roomIdValue) {
		String memberMappingsKey = roomMemberMappingsKey(roomIdValue);
		String roomListKey = modeObj != null ? RoomConstants.ROOM_LIST_KEY_PREFIX + modeObj : null;
		Set<String> rawMappedMemberIds = gameStringRedisTemplate.opsForSet().members(memberMappingsKey);
		Set<String> mappedMemberIds = rawMappedMemberIds != null ? new HashSet<>(rawMappedMemberIds) : null;
		Set<String> knownMemberIds = new HashSet<>();
		members.keySet().stream()
			.map(String::valueOf)
			.forEach(knownMemberIds::add);
		if (mappedMemberIds != null) {
			members.keySet().stream()
				.map(String::valueOf)
				.forEach(mappedMemberIds::remove);
			knownMemberIds.addAll(rawMappedMemberIds);
		}

		Set<String> legacyMappedMemberIds = findLegacyMappedMemberIds(roomIdValue, knownMemberIds);
		if (!legacyMappedMemberIds.isEmpty()) {
			log.warn("[room] legacy member-room mappings found during room dissolve. roomId={}, memberCount={}",
				roomIdValue, legacyMappedMemberIds.size());
		}
		gameStringRedisTemplate.executePipelined(new SessionCallback<Object>() {
			@Override
			public <K, V> Object execute(RedisOperations<K, V> operations) throws DataAccessException {
				operations.delete((K)infoKey);
				operations.delete((K)membersKey);
				operations.delete((K)memberMappingsKey);
				if (roomCodeObj != null) {
					operations.delete((K)(RoomConstants.ROOM_CODE_KEY_PREFIX + roomCodeObj));
				}
				for (Object memberKey : members.keySet()) {
					operations.delete((K)memberRoomKey(String.valueOf(memberKey)));
				}
				if (mappedMemberIds != null) {
					for (String memberId : mappedMemberIds) {
						operations.delete((K)memberRoomKey(memberId));
					}
				}
				for (String memberId : legacyMappedMemberIds) {
					operations.delete((K)memberRoomKey(memberId));
				}
				return null;
			}
		});
		// gameRedisTemplate(ZSet)은 gameStringRedisTemplate 파이프라인과 템플릿이 달라 원자적 처리 불가.
		// 파이프라인 성공 후 ZSet 삭제 실패 시 room:list:{mode}에 orphan roomId가 남을 수 있으나,
		// findAll()에서 info hash가 없는 roomId는 null 필터링되므로 서비스 영향 없음.
		if (roomListKey != null) {
			gameRedisTemplate.opsForZSet().remove(roomListKey, roomIdValue);
		}
	}

	private Set<String> findLegacyMappedMemberIds(String roomIdValue, Set<String> knownMemberIds) {
		Set<String> legacyMemberIds = gameStringRedisTemplate.execute((RedisCallback<Set<String>>)connection -> {
			Set<String> discoveredMemberIds = new HashSet<>();
			ScanOptions options = ScanOptions.scanOptions()
				.match("member:*:room")
				.count(1000)
				.build();
			RedisStringCommands stringCommands = connection.stringCommands();
			try (Cursor<byte[]> cursor = connection.scan(options)) {
				while (cursor.hasNext()) {
					byte[] keyBytes = cursor.next();
					byte[] valueBytes = stringCommands.get(keyBytes);
					if (valueBytes == null) {
						continue;
					}
					Optional<Long> mappedRoomId = normalizeRoomIdValue(new String(valueBytes, StandardCharsets.UTF_8));
					if (mappedRoomId.isEmpty() || !roomIdValue.equals(String.valueOf(mappedRoomId.get()))) {
						continue;
					}
					String key = new String(keyBytes, StandardCharsets.UTF_8);
					extractMemberIdFromMemberRoomKey(key)
						.filter(memberId -> !knownMemberIds.contains(memberId))
						.ifPresent(discoveredMemberIds::add);
				}
			}
			return discoveredMemberIds;
		});
		return legacyMemberIds != null ? legacyMemberIds : Set.of();
	}

	private Optional<Long> normalizeRoomIdValue(String rawRoomId) {
		if (rawRoomId == null) {
			return Optional.empty();
		}

		String trimmed = rawRoomId.trim();
		if (trimmed.isEmpty()) {
			return Optional.empty();
		}

		try {
			return Optional.of(Long.parseLong(trimmed));
		} catch (NumberFormatException ignored) {
			// fall through to JSON normalization
		}

		try {
			JsonNode node = objectMapper.readTree(trimmed);
			if (node == null || node.isNull()) {
				return Optional.empty();
			}
			if (node.isNumber()) {
				return Optional.of(node.longValue());
			}
			if (node.isTextual()) {
				return normalizeRoomIdValue(node.asText());
			}
			if (node.isArray() && node.size() > 0) {
				return normalizeRoomIdValue(node.get(node.size() - 1).asText());
			}
		} catch (Exception ignored) {
			// legacy garbage: treat as missing
		}

		return Optional.empty();
	}

	@Override
	public String findRoomStateById(Long roomId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		Object value = gameRedisTemplate.opsForHash().get(key, "roomState");
		return value == null ? null : String.valueOf(value);
	}

	@Override
	public String findModeById(Long roomId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		Object value = gameRedisTemplate.opsForHash().get(key, "mode");
		return value == null ? null : String.valueOf(value);
	}

	@Override
	public boolean isAllMembersReady(Long roomId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		return gameStringRedisTemplate.opsForHash().entries(key).entrySet().stream()
			.allMatch(e -> {
				try {
					return objectMapper.readTree((String)e.getValue()).path("isReady").asBoolean(false);
				} catch (Exception ex) {
					log.warn("[room] isAllMembersReady parse error. memberId={}", e.getKey(), ex);
					return false;
				}
			});
	}

	@Override
	public void updateRoomState(Long roomId, String state) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		gameRedisTemplate.opsForHash().put(key, "roomState", state);
	}

	@Override
	public void saveGameSessionId(Long roomId, String gameSessionId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		gameRedisTemplate.opsForHash().put(key, "gameSessionId", gameSessionId);
	}

	@Override
	public String findSelectedMapId(Long roomId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		Object value = gameRedisTemplate.opsForHash().get(key, "selectedMapId");
		return value == null ? null : String.valueOf(value);
	}

	@Override
	public String findTeamNameById(Long roomId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		Object value = gameRedisTemplate.opsForHash().get(key, "teamName");
		return value == null ? "" : String.valueOf(value);
	}

	private RoomCache toCache(String roomId, Map<Object, Object> fields) {
		if (fields.isEmpty()) {
			return null;
		}
		Integer maxPlayers = extractInteger(fields, "maxPlayers");
		Boolean hasPassword = extractBoolean(fields, "hasPassword");
		if (maxPlayers == null || hasPassword == null) {
			log.warn("[room] 손상된 방 데이터. roomId={}", roomId);
			return null;
		}

		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;
		Long currentPlayers = gameStringRedisTemplate.opsForHash().size(membersKey);

		String selectedMapId = (String)fields.get("selectedMapId");
		SelectedMapDto selectedMap = selectedMapId == null ? null : new SelectedMapDto(
			UUID.fromString(selectedMapId),
			(String)fields.get("selectedMapName"),
			extractInteger(fields, "selectedMapDifficulty"));
		return new RoomCache(
			Long.parseLong(roomId),
			(String)fields.get("title"),
			(String)fields.get("mode"),
			currentPlayers != null ? currentPlayers.intValue() : 0,
			maxPlayers,
			hasPassword,
			(String)fields.get("roomState"),
			selectedMap);
	}

	private Boolean extractBoolean(Map<Object, Object> fields, String key) {
		Object val = fields.get(key);
		if (val == null)
			return null;
		if (val instanceof Boolean b)
			return b;
		if (val instanceof String s)
			return Boolean.parseBoolean(s);
		return null;
	}

	private Integer extractInteger(Map<Object, Object> fields, String key) {
		Object val = fields.get(key);
		if (val == null)
			return null;
		if (val instanceof Integer i)
			return i;
		if (val instanceof Number n)
			return n.intValue();
		if (val instanceof String s) {
			try {
				return Integer.parseInt(s);
			} catch (NumberFormatException e) {
				return null;
			}
		}
		return null;
	}

	private String memberRoomKey(String memberId) {
		return "member:" + memberId + ":room";
	}

	private String roomMemberMappingsKey(String roomId) {
		return RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBER_MAPPINGS_KEY_SUFFIX;
	}

	private Map<Object, Object> readRoomInfoFields(String roomId) {
		String key = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		try {
			return gameRedisTemplate.opsForHash().entries(key);
		} catch (SerializationException e) {
			log.warn("[room] room info hash fallback to string template. roomId={}", roomId);
			return gameStringRedisTemplate.opsForHash().entries(key);
		}
	}

	private Optional<String> extractMemberIdFromMemberRoomKey(String key) {
		String prefix = "member:";
		String suffix = ":room";
		if (!key.startsWith(prefix) || !key.endsWith(suffix) || key.length() <= prefix.length() + suffix.length()) {
			return Optional.empty();
		}
		return Optional.of(key.substring(prefix.length(), key.length() - suffix.length()));
	}

	private String toJson(Map<String, Object> memberInfo) {
		try {
			return objectMapper.writeValueAsString(memberInfo);
		} catch (JsonProcessingException e) {
			throw new IllegalStateException("Failed to serialize memberInfo", e);
		}
	}

	private Map<String, Object> readMemberInfo(Object memberValue) {
		if (memberValue instanceof Map<?, ?> memberMap) {
			return memberMap.entrySet().stream()
				.collect(java.util.stream.Collectors.toMap(
					entry -> String.valueOf(entry.getKey()),
					Map.Entry::getValue,
					(left, right) -> right));
		}
		if (memberValue instanceof String memberJson) {
			try {
				return objectMapper.readValue(memberJson, new TypeReference<Map<String, Object>>() {});
			} catch (Exception e) {
				throw new IllegalStateException("Failed to deserialize room member info", e);
			}
		}
		throw new IllegalStateException("Unsupported room member info type");
	}

	@Override
	public void transferHostAtomic(String roomId, String prevHostId, String newHostId) {
		String infoKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;

		Long result = gameStringRedisTemplate.execute(
			TRANSFER_HOST_SCRIPT,
			List.of(infoKey, membersKey),
			prevHostId, newHostId);

		if (result == null) {
			throw new IllegalStateException("Transfer host script execution failed. roomId=" + roomId);
		}
		if (result.equals(-1L)) {
			throw new IllegalStateException("Prev host not found. roomId=" + roomId + ", prevHostId=" + prevHostId);
		}
		if (result.equals(-2L)) {
			throw new IllegalStateException("New host not found. roomId=" + roomId + ", newHostId=" + newHostId);
		}
		if (!result.equals(1L)) {
			throw new IllegalStateException("Unexpected script result=" + result + ". roomId=" + roomId);
		}
	}

	@Override
	public void delegateHostAtomic(String roomId, String newHostId) {
		String infoKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_INFO_KEY_SUFFIX;
		String membersKey = RoomConstants.ROOM_INFO_KEY_PREFIX + roomId + RoomConstants.ROOM_MEMBERS_KEY_SUFFIX;

		Long result = gameStringRedisTemplate.execute(
			DELEGATE_HOST_SCRIPT,
			List.of(infoKey, membersKey),
			newHostId);

		if (result == null) {
			throw new IllegalStateException("Delegate host script execution failed. roomId=" + roomId);
		}
		if (result.equals(-1L)) {
			throw new IllegalStateException("New host not found. roomId=" + roomId + ", newHostId=" + newHostId);
		}
		if (!result.equals(1L)) {
			throw new IllegalStateException("Unexpected script result=" + result + ". roomId=" + roomId);
		}
	}
}

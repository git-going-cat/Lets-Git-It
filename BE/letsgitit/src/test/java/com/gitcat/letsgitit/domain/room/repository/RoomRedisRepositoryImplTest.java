package com.gitcat.letsgitit.domain.room.repository;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.BDDMockito.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisStringCommands;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.DefaultTypedTuple;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.SessionCallback;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gitcat.letsgitit.domain.room.dto.RoomCache;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings({"unchecked", "rawtypes"})
class RoomRedisRepositoryImplTest {

	private RoomRedisRepositoryImpl repository;

	@Mock
	private RedisTemplate<String, Object> gameRedisTemplate;

	@Mock
	private StringRedisTemplate gameStringRedisTemplate;

	@Mock
	private StringRedisTemplate authStringRedisTemplate;

	@Mock
	private HashOperations hashOps;

	@Mock
	private ZSetOperations zSetOps;

	@Mock
	private ValueOperations valueOps;

	@Mock
	private SetOperations setOps;

	@Mock
	private RedisOperations<Object, Object> redisOperations;

	@Mock
	private RedisConnection redisConnection;

	@Mock
	private RedisStringCommands redisStringCommands;

	@Mock
	private Cursor<byte[]> scanCursor;

	@Mock
	private HashOperations<Object, Object, Object> pipelineHashOps;

	@Mock
	private SetOperations<Object, Object> pipelineSetOps;

	private static final Long ROOM_ID = 1L;
	private static final String INFO_KEY = "room:1:info";
	private static final String MEMBERS_KEY = "room:1:members";
	private static final String MEMBER_MAPPINGS_KEY = "room:1:member-mappings";
	private static final String CODE = "ABC123";
	private static final String CODE_KEY = "room:code:ABC123";
	private static final String MEMBER_ID = "aaaaaaaa-0000-0000-0000-000000000001";

	@BeforeEach
	void setUp() {
		repository = new RoomRedisRepositoryImpl(
			gameRedisTemplate,
			gameStringRedisTemplate,
			authStringRedisTemplate,
			new ObjectMapper());
	}

	private Map<Object, Object> buildInfoFields(String mode) {
		return Map.of(
			"title", "테스트 방",
			"mode", mode,
			"maxPlayers", 4,
			"hasPassword", false,
			"roomState", "WAITING",
			"roomCode", CODE);
	}

	// ===================== existsById =====================

	@Nested
	class ExistsById {

		@Test
		void 키가_존재하면_true를_반환한다() {
			given(gameRedisTemplate.hasKey(INFO_KEY)).willReturn(true);

			assertThat(repository.existsById(ROOM_ID)).isTrue();
		}

		@Test
		void 키가_없으면_false를_반환한다() {
			given(gameRedisTemplate.hasKey(INFO_KEY)).willReturn(false);

			assertThat(repository.existsById(ROOM_ID)).isFalse();
		}
	}

	// ===================== findPasswordById =====================

	@Nested
	class FindPasswordById {

		@Test
		void password_필드가_있으면_값을_반환한다() {
			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.get(INFO_KEY, "password")).willReturn("plainpw");

			assertThat(repository.findPasswordById(ROOM_ID)).isEqualTo("plainpw");
		}

		@Test
		void password_필드가_없으면_null을_반환한다() {
			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.get(INFO_KEY, "password")).willReturn(null);

			assertThat(repository.findPasswordById(ROOM_ID)).isNull();
		}
	}

	// ===================== findHostIdById =====================

	@Nested
	class FindHostIdById {

		@Test
		void hostMemberId_필드가_있으면_값을_반환한다() {
			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.get(INFO_KEY, "hostMemberId")).willReturn(MEMBER_ID);

			assertThat(repository.findHostIdById(ROOM_ID)).isEqualTo(MEMBER_ID);
		}

		@Test
		void hostMemberId_필드가_없으면_null을_반환한다() {
			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.get(INFO_KEY, "hostMemberId")).willReturn(null);

			assertThat(repository.findHostIdById(ROOM_ID)).isNull();
		}
	}

	// ===================== existsMember =====================

	@Nested
	class ExistsMember {

		@Test
		void 멤버가_존재하면_true를_반환한다() {
			given(gameStringRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.hasKey(MEMBERS_KEY, MEMBER_ID)).willReturn(true);

			assertThat(repository.existsMember(ROOM_ID, MEMBER_ID)).isTrue();
		}

		@Test
		void 멤버가_없으면_false를_반환한다() {
			given(gameStringRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.hasKey(MEMBERS_KEY, MEMBER_ID)).willReturn(false);

			assertThat(repository.existsMember(ROOM_ID, MEMBER_ID)).isFalse();
		}
	}

	// ===================== findJoinedRoomId =====================

	@Nested
	class FindJoinedRoomId {

		@Test
		void legacy_json_string_value도_roomId로_정규화한다() {
			String memberRoomKey = "member:" + MEMBER_ID + ":room";
			given(gameStringRedisTemplate.opsForValue()).willReturn(valueOps);
			given(valueOps.get(memberRoomKey)).willReturn("\"1\"");

			assertThat(repository.findJoinedRoomId(MEMBER_ID)).contains(ROOM_ID);
		}

		@Test
		void legacy_jackson_array_wrapper_value도_roomId로_정규화한다() {
			String memberRoomKey = "member:" + MEMBER_ID + ":room";
			given(gameStringRedisTemplate.opsForValue()).willReturn(valueOps);
			given(valueOps.get(memberRoomKey)).willReturn("[\"java.lang.String\",\"1\"]");

			assertThat(repository.findJoinedRoomId(MEMBER_ID)).contains(ROOM_ID);
		}
	}

	// ===================== removeMember =====================

	@Nested
	class RemoveMember {

		@Test
		void members_Hash와_memberRoom매핑을_파이프라인으로_삭제한다() {
			ArgumentCaptor<SessionCallback<Object>> callbackCaptor = ArgumentCaptor.forClass(SessionCallback.class);
			given(redisOperations.opsForHash()).willReturn(pipelineHashOps);

			repository.removeMember(ROOM_ID, MEMBER_ID);

			then(gameStringRedisTemplate).should().executePipelined(callbackCaptor.capture());

			given(redisOperations.opsForSet()).willReturn(pipelineSetOps);
			callbackCaptor.getValue().execute(redisOperations);

			then(redisOperations).should().opsForHash();
			then(redisOperations).should().opsForSet();
			then(pipelineHashOps).should().delete(MEMBERS_KEY, MEMBER_ID);
			then(pipelineSetOps).should().remove(MEMBER_MAPPINGS_KEY, MEMBER_ID);
			then(redisOperations).should().delete("member:" + MEMBER_ID + ":room");
		}
	}

	// ===================== findAllMemberIds =====================

	@Nested
	class FindAllMemberIds {

		@Test
		void members_Hash의_모든_키를_반환한다() {
			String other = "bbbbbbbb-0000-0000-0000-000000000002";
			given(gameStringRedisTemplate.opsForSet()).willReturn(setOps);
			given(setOps.members(MEMBER_MAPPINGS_KEY)).willReturn(Set.of(MEMBER_ID, other));

			Set<String> result = repository.findAllMemberIds(ROOM_ID);

			assertThat(result).containsExactlyInAnyOrder(MEMBER_ID, other);
		}

		@Test
		void memberMappings가_비어있으면_members_Hash에서_fallback하고_backfill한다() {
			String other = "bbbbbbbb-0000-0000-0000-000000000002";
			given(gameStringRedisTemplate.opsForSet()).willReturn(setOps);
			given(setOps.members(MEMBER_MAPPINGS_KEY)).willReturn(Set.of());
			given(gameStringRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.keys(MEMBERS_KEY)).willReturn(Set.of(MEMBER_ID, other));

			Set<String> result = repository.findAllMemberIds(ROOM_ID);

			assertThat(result).containsExactlyInAnyOrder(MEMBER_ID, other);
			then(setOps).should().add(MEMBER_MAPPINGS_KEY, MEMBER_ID, other);
		}

		@Test
		void memberMappings와_members_Hash가_비어있으면_legacy_mapping_only_멤버를_SCAN으로_복구한다() {
			String legacyMemberId = "cccccccc-0000-0000-0000-000000000003";
			String legacyMappingKey = "member:" + legacyMemberId + ":room";

			given(gameStringRedisTemplate.opsForSet()).willReturn(setOps);
			given(setOps.members(MEMBER_MAPPINGS_KEY)).willReturn(Set.of());
			given(gameStringRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.keys(MEMBERS_KEY)).willReturn(Set.of());
			given(gameStringRedisTemplate.execute(any(RedisCallback.class)))
				.willAnswer(
					invocation -> invocation.<RedisCallback<Set<String>>>getArgument(0).doInRedis(redisConnection));
			given(redisConnection.stringCommands()).willReturn(redisStringCommands);
			given(redisConnection.scan(any(ScanOptions.class))).willReturn(scanCursor);
			given(scanCursor.hasNext()).willReturn(true, false);
			given(scanCursor.next()).willReturn(legacyMappingKey.getBytes());
			given(redisStringCommands.get(legacyMappingKey.getBytes())).willReturn(ROOM_ID.toString().getBytes());

			Set<String> result = repository.findAllMemberIds(ROOM_ID);

			assertThat(result).containsExactly(legacyMemberId);
			then(setOps).should().add(MEMBER_MAPPINGS_KEY, legacyMemberId);
		}

		@Test
		void memberMappings가_비어있고_members_Hash도_비어있으면_json_string_legacy_value도_SCAN으로_복구한다() {
			String legacyMemberId = "dddddddd-0000-0000-0000-000000000004";
			String legacyMappingKey = "member:" + legacyMemberId + ":room";

			given(gameStringRedisTemplate.opsForSet()).willReturn(setOps);
			given(setOps.members(MEMBER_MAPPINGS_KEY)).willReturn(Set.of());
			given(gameStringRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.keys(MEMBERS_KEY)).willReturn(Set.of());
			given(gameStringRedisTemplate.execute(any(RedisCallback.class)))
				.willAnswer(
					invocation -> invocation.<RedisCallback<Set<String>>>getArgument(0).doInRedis(redisConnection));
			given(redisConnection.stringCommands()).willReturn(redisStringCommands);
			given(redisConnection.scan(any(ScanOptions.class))).willReturn(scanCursor);
			given(scanCursor.hasNext()).willReturn(true, false);
			given(scanCursor.next()).willReturn(legacyMappingKey.getBytes());
			given(redisStringCommands.get(legacyMappingKey.getBytes())).willReturn("\"1\"".getBytes());

			Set<String> result = repository.findAllMemberIds(ROOM_ID);

			assertThat(result).containsExactly(legacyMemberId);
			then(setOps).should().add(MEMBER_MAPPINGS_KEY, legacyMemberId);
		}
	}

	// ===================== updateHostId =====================

	@Nested
	class UpdateHostId {

		@Test
		void info_Hash의_hostMemberId를_갱신한다() {
			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);

			repository.updateHostId(ROOM_ID, MEMBER_ID);

			then(hashOps).should().put(INFO_KEY, "hostMemberId", MEMBER_ID);
		}
	}

	// ===================== updateMemberHostFlags =====================

	@Nested
	class UpdateMemberHostFlags {

		@Test
		void members_Hash의_isHost를_새_방장_기준으로_갱신한다() {
			String otherId = "bbbbbbbb-0000-0000-0000-000000000002";
			given(gameStringRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.entries(MEMBERS_KEY)).willReturn(Map.of(
				MEMBER_ID, """
					{"playerId":"aaaaaaaa-0000-0000-0000-000000000001","nickname":"a","isHost":true}
					""",
				otherId, """
					{"playerId":"bbbbbbbb-0000-0000-0000-000000000002","nickname":"b","isHost":false}
					"""));

			repository.updateMemberHostFlags(ROOM_ID, otherId);

			ArgumentCaptor<String> memberCaptor = ArgumentCaptor.forClass(String.class);
			ArgumentCaptor<String> jsonCaptor = ArgumentCaptor.forClass(String.class);
			then(hashOps).should(times(2)).put(eq(MEMBERS_KEY), memberCaptor.capture(), jsonCaptor.capture());

			assertThat(jsonCaptor.getAllValues())
				.anySatisfy(json -> assertThat(json).contains("\"playerId\":\"" + MEMBER_ID + "\"", "\"isHost\":false"))
				.anySatisfy(json -> assertThat(json).contains("\"playerId\":\"" + otherId + "\"", "\"isHost\":true"));
		}
	}

	// ===================== savePasswordVerified =====================

	@Nested
	class SavePasswordVerified {

		@Test
		void TTL_5분으로_인증_완료_키를_저장한다() {
			given(authStringRedisTemplate.opsForValue()).willReturn(valueOps);

			repository.savePasswordVerified(MEMBER_ID, ROOM_ID);

			then(valueOps).should().set(
				"room:" + ROOM_ID + ":password:verified:" + MEMBER_ID,
				"true",
				5L,
				TimeUnit.MINUTES);
		}
	}

	// ===================== findByCode =====================

	@Nested
	class FindByCode {

		@Test
		void 코드로_방_정보를_반환한다() {
			given(gameRedisTemplate.opsForValue()).willReturn(valueOps);
			given(valueOps.get(CODE_KEY)).willReturn("1");
			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.entries(INFO_KEY)).willReturn(buildInfoFields("CONTRIBUTION"));
			given(gameStringRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.size(MEMBERS_KEY)).willReturn(2L);

			Optional<RoomCache> result = repository.findByCode(CODE);

			assertThat(result).isPresent();
			assertThat(result.get().roomId()).isEqualTo(ROOM_ID);
			assertThat(result.get().currentPlayers()).isEqualTo(2);
		}

		@Test
		void 코드에_해당하는_방이_없으면_empty를_반환한다() {
			given(gameRedisTemplate.opsForValue()).willReturn(valueOps);
			given(valueOps.get(CODE_KEY)).willReturn(null);

			Optional<RoomCache> result = repository.findByCode(CODE);

			assertThat(result).isEmpty();
		}
	}

	// ===================== findAll =====================

	@Nested
	class FindAll {

		@Test
		void CONTRIBUTION과_COOP_방을_score_순으로_반환한다() {
			ZSetOperations.TypedTuple<Object> tuple1 = new DefaultTypedTuple<>("1", 1000.0);
			ZSetOperations.TypedTuple<Object> tuple2 = new DefaultTypedTuple<>("2", 2000.0);
			given(gameRedisTemplate.opsForZSet()).willReturn(zSetOps);
			given(zSetOps.rangeWithScores("room:list:CONTRIBUTION", 0, -1)).willReturn(Set.of(tuple1));
			given(zSetOps.rangeWithScores("room:list:COOP", 0, -1)).willReturn(Set.of(tuple2));

			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.entries("room:1:info")).willReturn(buildInfoFields("CONTRIBUTION"));
			given(hashOps.entries("room:2:info")).willReturn(buildInfoFields("COOP"));
			given(gameStringRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.size("room:1:members")).willReturn(2L);
			given(hashOps.size("room:2:members")).willReturn(1L);

			List<RoomCache> result = repository.findAll();

			assertThat(result).hasSize(2);
			assertThat(result.get(0).roomId()).isEqualTo(1L);
			assertThat(result.get(1).roomId()).isEqualTo(2L);
		}

		@Test
		void 두_ZSet이_모두_비어있으면_빈_리스트를_반환한다() {
			given(gameRedisTemplate.opsForZSet()).willReturn(zSetOps);
			given(zSetOps.rangeWithScores("room:list:CONTRIBUTION", 0, -1)).willReturn(Set.of());
			given(zSetOps.rangeWithScores("room:list:COOP", 0, -1)).willReturn(Set.of());

			List<RoomCache> result = repository.findAll();

			assertThat(result).isEmpty();
		}
	}

	// ===================== dissolveRoom =====================

	@Nested
	class DissolveRoom {

		@Test
		void roomInfo_members_codeKey_listKey와_memberRoom매핑을_파이프라인으로_삭제한다() {
			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.get(INFO_KEY, "roomCode")).willReturn(CODE);
			given(hashOps.get(INFO_KEY, "mode")).willReturn("CONTRIBUTION");
			given(gameStringRedisTemplate.opsForHash()).willReturn(hashOps);
			given(gameStringRedisTemplate.opsForSet()).willReturn(setOps);
			given(hashOps.entries(MEMBERS_KEY)).willReturn(Map.of(MEMBER_ID, "member-json"));
			given(setOps.members(MEMBER_MAPPINGS_KEY)).willReturn(Set.of(MEMBER_ID));
			given(gameRedisTemplate.opsForZSet()).willReturn(zSetOps);

			repository.dissolveRoom(ROOM_ID);

			ArgumentCaptor<SessionCallback<Object>> callbackCaptor = ArgumentCaptor.forClass(SessionCallback.class);
			then(gameStringRedisTemplate).should().executePipelined(callbackCaptor.capture());

			callbackCaptor.getValue().execute(redisOperations);

			then(redisOperations).should().delete(INFO_KEY);
			then(redisOperations).should().delete(MEMBERS_KEY);
			then(redisOperations).should().delete(MEMBER_MAPPINGS_KEY);
			then(redisOperations).should().delete(CODE_KEY);
			then(zSetOps).should().remove("room:list:CONTRIBUTION", ROOM_ID.toString());
			then(redisOperations).should().delete("member:" + MEMBER_ID + ":room");
		}

		@Test
		void roomCode가_없으면_codeKey는_삭제하지_않는다() {
			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.get(INFO_KEY, "roomCode")).willReturn(null);
			given(hashOps.get(INFO_KEY, "mode")).willReturn("CONTRIBUTION");
			given(gameStringRedisTemplate.opsForHash()).willReturn(hashOps);
			given(gameStringRedisTemplate.opsForSet()).willReturn(setOps);
			given(hashOps.entries(MEMBERS_KEY)).willReturn(Map.of());
			given(setOps.members(MEMBER_MAPPINGS_KEY)).willReturn(Set.of());
			given(gameRedisTemplate.opsForZSet()).willReturn(zSetOps);

			repository.dissolveRoom(ROOM_ID);

			ArgumentCaptor<SessionCallback<Object>> callbackCaptor = ArgumentCaptor.forClass(SessionCallback.class);
			then(gameStringRedisTemplate).should().executePipelined(callbackCaptor.capture());

			callbackCaptor.getValue().execute(redisOperations);

			then(redisOperations).should().delete(INFO_KEY);
			then(redisOperations).should().delete(MEMBERS_KEY);
			then(redisOperations).should().delete(MEMBER_MAPPINGS_KEY);
			then(redisOperations).should(never()).delete("");
			then(zSetOps).should().remove("room:list:CONTRIBUTION", ROOM_ID.toString());
		}

		@Test
		void members_Hash에_없어도_같은_방을_가리키는_stale_memberRoom매핑은_함께_삭제한다() {
			String staleMemberId = "bbbbbbbb-0000-0000-0000-000000000002";
			String staleMappingKey = "member:" + staleMemberId + ":room";

			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.get(INFO_KEY, "roomCode")).willReturn(CODE);
			given(hashOps.get(INFO_KEY, "mode")).willReturn("CONTRIBUTION");
			given(gameStringRedisTemplate.opsForHash()).willReturn(hashOps);
			given(gameStringRedisTemplate.opsForSet()).willReturn(setOps);
			given(hashOps.entries(MEMBERS_KEY)).willReturn(Map.of(MEMBER_ID, "member-json"));
			given(setOps.members(MEMBER_MAPPINGS_KEY)).willReturn(Set.of(MEMBER_ID, staleMemberId));
			given(gameRedisTemplate.opsForZSet()).willReturn(zSetOps);

			repository.dissolveRoom(ROOM_ID);

			ArgumentCaptor<SessionCallback<Object>> callbackCaptor = ArgumentCaptor.forClass(SessionCallback.class);
			then(gameStringRedisTemplate).should().executePipelined(callbackCaptor.capture());

			callbackCaptor.getValue().execute(redisOperations);

			then(redisOperations).should().delete("member:" + MEMBER_ID + ":room");
			then(redisOperations).should().delete(staleMappingKey);
		}

		@Test
		void Hash와_Set에_없는_legacy_mapping_only_멤버도_SCAN으로_정리한다() throws Exception {
			String legacyMemberId = "cccccccc-0000-0000-0000-000000000003";
			String legacyMappingKey = "member:" + legacyMemberId + ":room";

			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.get(INFO_KEY, "roomCode")).willReturn(CODE);
			given(hashOps.get(INFO_KEY, "mode")).willReturn("CONTRIBUTION");
			given(gameStringRedisTemplate.opsForHash()).willReturn(hashOps);
			given(gameStringRedisTemplate.opsForSet()).willReturn(setOps);
			given(hashOps.entries(MEMBERS_KEY)).willReturn(Map.of());
			given(setOps.members(MEMBER_MAPPINGS_KEY)).willReturn(Set.of());
			given(gameStringRedisTemplate.execute(any(RedisCallback.class)))
				.willAnswer(
					invocation -> invocation.<RedisCallback<Set<String>>>getArgument(0).doInRedis(redisConnection));
			given(redisConnection.stringCommands()).willReturn(redisStringCommands);
			given(redisConnection.scan(any(ScanOptions.class))).willReturn(scanCursor);
			given(scanCursor.hasNext()).willReturn(true, false);
			given(scanCursor.next()).willReturn(legacyMappingKey.getBytes());
			given(redisStringCommands.get(legacyMappingKey.getBytes())).willReturn(ROOM_ID.toString().getBytes());
			given(gameRedisTemplate.opsForZSet()).willReturn(zSetOps);

			repository.dissolveRoom(ROOM_ID);

			ArgumentCaptor<SessionCallback<Object>> callbackCaptor = ArgumentCaptor.forClass(SessionCallback.class);
			then(gameStringRedisTemplate).should().executePipelined(callbackCaptor.capture());

			callbackCaptor.getValue().execute(redisOperations);

			then(redisOperations).should().delete(legacyMappingKey);
			then(scanCursor).should().close();
		}
	}
}

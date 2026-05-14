package com.gitcat.letsgitit.domain.room.repository;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.BDDMockito.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.DefaultTypedTuple;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.data.redis.core.script.RedisScript;

import com.gitcat.letsgitit.domain.room.dto.RoomCache;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings({"unchecked", "rawtypes"})
class RoomRedisRepositoryImplTest {

	private RoomRedisRepositoryImpl repository;

	@Mock
	private RedisTemplate<String, Object> gameRedisTemplate;

	@Mock
	private StringRedisTemplate authStringRedisTemplate;

	@Mock
	private HashOperations hashOps;

	@Mock
	private ZSetOperations zSetOps;

	@Mock
	private ValueOperations valueOps;

	private static final Long ROOM_ID = 1L;
	private static final String INFO_KEY = "room:1:info";
	private static final String MEMBERS_KEY = "room:1:members";
	private static final String CODE = "ABC123";
	private static final String CODE_KEY = "room:code:ABC123";
	private static final String MEMBER_ID = "aaaaaaaa-0000-0000-0000-000000000001";

	@BeforeEach
	void setUp() {
		repository = new RoomRedisRepositoryImpl(gameRedisTemplate, authStringRedisTemplate);
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
			given(hashOps.get(INFO_KEY, "password")).willReturn("hashedpw");

			assertThat(repository.findPasswordById(ROOM_ID)).isEqualTo("hashedpw");
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
			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.hasKey(MEMBERS_KEY, MEMBER_ID)).willReturn(true);

			assertThat(repository.existsMember(ROOM_ID, MEMBER_ID)).isTrue();
		}

		@Test
		void 멤버가_없으면_false를_반환한다() {
			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.hasKey(MEMBERS_KEY, MEMBER_ID)).willReturn(false);

			assertThat(repository.existsMember(ROOM_ID, MEMBER_ID)).isFalse();
		}
	}

	// ===================== removeMember =====================

	@Nested
	class RemoveMember {

		@Test
		void members_Hash에서_해당_플레이어를_삭제한다() {
			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);

			repository.removeMember(ROOM_ID, MEMBER_ID);

			then(hashOps).should().delete(MEMBERS_KEY, MEMBER_ID);
		}
	}

	// ===================== findAllMemberIds =====================

	@Nested
	class FindAllMemberIds {

		@Test
		void members_Hash의_모든_키를_반환한다() {
			String other = "bbbbbbbb-0000-0000-0000-000000000002";
			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.keys(MEMBERS_KEY)).willReturn(Set.of(MEMBER_ID, other));

			Set<String> result = repository.findAllMemberIds(ROOM_ID);

			assertThat(result).containsExactlyInAnyOrder(MEMBER_ID, other);
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
			given(hashOps.size("room:1:members")).willReturn(2L);
			given(hashOps.entries("room:2:info")).willReturn(buildInfoFields("COOP"));
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
		void Lua_스크립트로_4개_키를_원자적으로_삭제한다() {
			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.get(INFO_KEY, "roomCode")).willReturn(CODE);
			given(hashOps.get(INFO_KEY, "mode")).willReturn("CONTRIBUTION");

			repository.dissolveRoom(ROOM_ID);

			then(gameRedisTemplate).should().execute(
				any(RedisScript.class),
				eq(List.of(INFO_KEY, MEMBERS_KEY, CODE_KEY, "room:list:CONTRIBUTION")),
				eq(ROOM_ID.toString()));
		}

		@Test
		void roomCode가_없으면_codeKey를_빈_문자열로_전달한다() {
			given(gameRedisTemplate.opsForHash()).willReturn(hashOps);
			given(hashOps.get(INFO_KEY, "roomCode")).willReturn(null);
			given(hashOps.get(INFO_KEY, "mode")).willReturn("CONTRIBUTION");

			repository.dissolveRoom(ROOM_ID);

			then(gameRedisTemplate).should().execute(
				any(RedisScript.class),
				eq(List.of(INFO_KEY, MEMBERS_KEY, "", "room:list:CONTRIBUTION")),
				eq(ROOM_ID.toString()));
		}
	}
}

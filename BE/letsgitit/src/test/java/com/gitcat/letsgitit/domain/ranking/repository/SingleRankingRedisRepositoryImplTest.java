package com.gitcat.letsgitit.domain.ranking.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.BDDMockito.given;

import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisScriptingCommands;
import org.springframework.data.redis.connection.ReturnType;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings({"rawtypes", "unchecked"})
class SingleRankingRedisRepositoryImplTest {

	@Mock
	private StringRedisTemplate rankingStringRedisTemplate;

	@Mock
	private RedisConnection redisConnection;

	@Mock
	private RedisScriptingCommands scriptingCommands;

	private SingleRankingRedisRepositoryImpl repository;

	@BeforeEach
	void setUp() {
		repository = new SingleRankingRedisRepositoryImpl(rankingStringRedisTemplate);
		given(redisConnection.scriptingCommands()).willReturn(scriptingCommands);
	}

	@Test
	void Lua_script가_갱신하면_true를_반환한다() {
		// given
		given(rankingStringRedisTemplate.execute(any(RedisCallback.class)))
			.willAnswer(invocation -> invocation.<RedisCallback<Long>>getArgument(0).doInRedis(redisConnection));
		givenEvalResult(1L);

		// when
		boolean updated = repository.saveScoreGradeAndPlayTime(
			"ranking:SINGLE:NORMAL:2026-05-2",
			"ranking:SINGLE:NORMAL:2026-05-2:grade",
			"ranking:SINGLE:NORMAL:2026-05-2:playtime",
			UUID.randomUUID(),
			1000.0,
			"S",
			95_001);

		// then
		assertThat(updated).isTrue();
	}

	@Test
	void Lua_script가_갱신하지_않으면_false를_반환한다() {
		// given
		given(rankingStringRedisTemplate.execute(any(RedisCallback.class)))
			.willAnswer(invocation -> invocation.<RedisCallback<Long>>getArgument(0).doInRedis(redisConnection));
		givenEvalResult(0L);

		// when
		boolean updated = repository.saveScoreGradeAndPlayTime(
			"ranking:SINGLE:NORMAL:2026-05-2",
			"ranking:SINGLE:NORMAL:2026-05-2:grade",
			"ranking:SINGLE:NORMAL:2026-05-2:playtime",
			UUID.randomUUID(),
			1000.0,
			"S",
			95_001);

		// then
		assertThat(updated).isFalse();
	}

	private void givenEvalResult(long result) {
		given(scriptingCommands.eval(
			any(byte[].class),
			any(ReturnType.class),
			anyInt(),
			any(byte[].class),
			any(byte[].class),
			any(byte[].class),
			any(byte[].class),
			any(byte[].class),
			any(byte[].class),
			any(byte[].class)))
			.willReturn(result);
	}
}

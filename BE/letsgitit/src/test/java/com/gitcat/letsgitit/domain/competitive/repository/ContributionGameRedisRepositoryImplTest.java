package com.gitcat.letsgitit.domain.competitive.repository;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionCommandCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionGameSessionCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionPlayerCache;

class ContributionGameRedisRepositoryImplTest {

	private static final Duration SESSION_TTL = Duration.ofHours(2);

	private StringRedisTemplate redisTemplate;
	private ContributionGameRedisRepositoryImpl repository;

	@BeforeEach
	void setUp() {
		redisTemplate = mock(StringRedisTemplate.class);
		ValueOperations<String, String> valueOperations = mock();
		HashOperations<String, Object, Object> hashOperations = mock();
		when(redisTemplate.opsForValue()).thenReturn(valueOperations);
		when(redisTemplate.opsForHash()).thenReturn(hashOperations);
		repository = new ContributionGameRedisRepositoryImpl(redisTemplate, new ObjectMapper());
	}

	@Test
	void 세션을_초기화하면_모든_세션_키에_TTL을_설정한다() {
		// given
		UUID gameSessionId = UUID.randomUUID();
		ContributionGameSessionCache session = ContributionGameSessionCache.inProgress(
			1L,
			gameSessionId,
			1,
			System.currentTimeMillis(),
			"main",
			List.of(ContributionCommandCache.ready(0, "git add .", "main")),
			List.of(new ContributionPlayerCache(UUID.randomUUID(), "dobby", 0)));

		// when
		repository.initializeSession(session);

		// then
		verify(redisTemplate, times(5)).expire(anyString(), eq(SESSION_TTL));
	}
}

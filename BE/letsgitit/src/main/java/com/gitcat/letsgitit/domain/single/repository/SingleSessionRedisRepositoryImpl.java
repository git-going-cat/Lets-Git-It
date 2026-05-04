package com.gitcat.letsgitit.domain.single.repository;

import java.time.Duration;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.single.constants.SingleSessionKeyUtil;
import com.gitcat.letsgitit.domain.single.dto.SingleSessionCache;

@Repository
public class SingleSessionRedisRepositoryImpl implements SingleSessionRedisRepository {

	private static final Duration SESSION_TTL = Duration.ofMinutes(30);

	private final RedisTemplate<String, SingleSessionCache> singleSessionRedisTemplate;

	public SingleSessionRedisRepositoryImpl(
		@Qualifier("singleSessionRedisTemplate")
		RedisTemplate<String, SingleSessionCache> singleSessionRedisTemplate) {
		this.singleSessionRedisTemplate = singleSessionRedisTemplate;
	}

	@Override
	public void save(SingleSessionCache sessionCache) {
		singleSessionRedisTemplate.opsForValue().set(
			SingleSessionKeyUtil.singleSessionKey(sessionCache.sessionId()),
			sessionCache,
			SESSION_TTL);
	}

	@Override
	public Optional<SingleSessionCache> findBySessionId(String sessionId) {
		SingleSessionCache sessionCache = singleSessionRedisTemplate.opsForValue()
			.get(SingleSessionKeyUtil.singleSessionKey(sessionId));

		return Optional.ofNullable(sessionCache);
	}

	@Override
	public void deleteBySessionId(String sessionId) {
		singleSessionRedisTemplate.delete(
			SingleSessionKeyUtil.singleSessionKey(sessionId));
	}
}

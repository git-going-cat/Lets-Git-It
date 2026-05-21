package com.gitcat.letsgitit.domain.single.repository;

import java.time.Duration;
import java.util.Optional;

import com.gitcat.letsgitit.domain.single.dto.SingleSessionCache;

public interface SingleSessionRedisRepository {

	void save(SingleSessionCache sessionCache);

	void save(SingleSessionCache sessionCache, Duration ttl);

	Optional<SingleSessionCache> findBySessionId(String sessionId);

	void deleteBySessionId(String sessionId);

	Duration getSessionTtl();
}

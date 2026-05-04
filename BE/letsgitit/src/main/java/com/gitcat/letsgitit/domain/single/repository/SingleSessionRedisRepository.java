package com.gitcat.letsgitit.domain.single.repository;

import java.util.Optional;

import com.gitcat.letsgitit.domain.single.dto.SingleSessionCache;

public interface SingleSessionRedisRepository {

	void save(SingleSessionCache sessionCache);

	Optional<SingleSessionCache> findBySessionId(String sessionId);

	void deleteBySessionId(String sessionId);
}

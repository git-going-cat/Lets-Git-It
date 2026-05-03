package com.gitcat.letsgitit;

import org.junit.jupiter.api.Test;
import org.redisson.api.RedissonClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.gitcat.letsgitit.domain.auth.repository.AuthRedisRepository;

@ActiveProfiles("test")
@SpringBootTest
class LetsgititApplicationTests {

	@MockitoBean
	RedissonClient redissonClient;

	@MockitoBean
	private AuthRedisRepository authRedisRepository;

	@MockitoBean(name = "rankingStringRedisTemplate")
	StringRedisTemplate rankingStringRedisTemplate;

	@Test
	void contextLoads() {}

}

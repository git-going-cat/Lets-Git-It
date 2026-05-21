package com.gitcat.letsgitit;

import org.junit.jupiter.api.Test;
import org.redisson.api.RedissonClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import com.gitcat.letsgitit.domain.auth.repository.AuthRedisRepository;
import com.gitcat.letsgitit.domain.member.repository.MemberRedisRepository;
import com.gitcat.letsgitit.domain.room.repository.RoomRedisRepository;
import com.gitcat.letsgitit.domain.single.repository.SingleSessionRedisRepository;

@ActiveProfiles("test")
@SpringBootTest
class LetsgititApplicationTests {

	@MockitoBean
	RedissonClient redissonClient;

	@MockitoBean
	private AuthRedisRepository authRedisRepository;

	@MockitoBean
	private MemberRedisRepository memberRedisRepository;

	@MockitoBean
	private SingleSessionRedisRepository singleSessionRedisRepository;

	@MockitoBean
	private RoomRedisRepository roomRedisRepository;

	@MockitoBean(name = "rankingStringRedisTemplate")
	StringRedisTemplate rankingStringRedisTemplate;

	@MockitoBean(name = "gameStringRedisTemplate")
	StringRedisTemplate gameStringRedisTemplate;

	@Test
	void contextLoads() {}

}

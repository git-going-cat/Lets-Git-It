package com.gitcat.letsgitit;

import org.junit.jupiter.api.Test;
import org.redisson.api.RedissonClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@ActiveProfiles("test")
@SpringBootTest
class LetsgititApplicationTests {

	@MockitoBean
	RedissonClient redissonClient;

	@Test
	void contextLoads() {}

}

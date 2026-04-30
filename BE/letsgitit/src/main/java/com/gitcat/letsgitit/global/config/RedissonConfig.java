package com.gitcat.letsgitit.global.config;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RedissonConfig {

	@Bean(destroyMethod = "shutdown")
	public RedissonClient redissonClient(
		@Value("${redis.game.host}")
		String host,
		@Value("${redis.game.port}")
		int port) {
		Config config = new Config();
		config.useSingleServer()
			.setAddress("redis://" + host + ":" + port);
		return Redisson.create(config);
	}
}

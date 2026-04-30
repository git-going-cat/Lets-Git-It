package com.gitcat.letsgitit.global.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.databind.jsontype.PolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@Configuration
@Profile("!test")
public class RedisConfig {

	@Primary
	@Bean
	public RedisConnectionFactory authRedisConnectionFactory(
		@Value("${redis.auth.host}")
		String host,
		@Value("${redis.auth.port}")
		int port) {
		return new LettuceConnectionFactory(new RedisStandaloneConfiguration(host, port));
	}

	@Bean
	public RedisConnectionFactory gameRedisConnectionFactory(
		@Value("${redis.game.host}")
		String host,
		@Value("${redis.game.port}")
		int port) {
		return new LettuceConnectionFactory(new RedisStandaloneConfiguration(host, port));
	}

	@Bean
	public RedisConnectionFactory rankingRedisConnectionFactory(
		@Value("${redis.ranking.host}")
		String host,
		@Value("${redis.ranking.port}")
		int port) {
		return new LettuceConnectionFactory(new RedisStandaloneConfiguration(host, port));
	}

	// ===================== TEMPLATES =====================

	@Bean
	public StringRedisTemplate authStringRedisTemplate(
		@Qualifier("authRedisConnectionFactory")
		RedisConnectionFactory factory) {
		StringRedisTemplate template = new StringRedisTemplate();
		template.setConnectionFactory(factory);
		return template;
	}

	@Primary
	@Bean
	public RedisTemplate<String, Object> authRedisTemplate(
		@Qualifier("authRedisConnectionFactory")
		RedisConnectionFactory factory) {
		return buildTemplate(factory);
	}

	@Bean
	public RedisTemplate<String, Object> gameRedisTemplate(
		@Qualifier("gameRedisConnectionFactory")
		RedisConnectionFactory factory) {
		return buildTemplate(factory);
	}

	@Bean
	public RedisTemplate<String, Object> rankingRedisTemplate(
		@Qualifier("rankingRedisConnectionFactory")
		RedisConnectionFactory factory) {
		return buildTemplate(factory);
	}

	// ===================== SERIALIZER =====================

	private RedisTemplate<String, Object> buildTemplate(RedisConnectionFactory factory) {
		ObjectMapper objectMapper = new ObjectMapper();
		objectMapper.registerModule(new JavaTimeModule());
		objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
		PolymorphicTypeValidator typeValidator = BasicPolymorphicTypeValidator.builder()
			.allowIfSubType("com.gitcat.letsgitit")
			.allowIfSubType("java.util")
			.build();
		objectMapper.activateDefaultTyping(typeValidator, ObjectMapper.DefaultTyping.NON_FINAL);

		GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer(objectMapper);
		StringRedisSerializer stringSerializer = new StringRedisSerializer();

		RedisTemplate<String, Object> template = new RedisTemplate<>();
		template.setConnectionFactory(factory);
		template.setKeySerializer(stringSerializer);
		template.setHashKeySerializer(stringSerializer);
		template.setValueSerializer(serializer);
		template.setHashValueSerializer(serializer);
		return template;
	}
}

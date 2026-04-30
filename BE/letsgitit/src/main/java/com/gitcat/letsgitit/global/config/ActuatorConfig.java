package com.gitcat.letsgitit.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.autoconfigure.metrics.MeterRegistryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.micrometer.core.instrument.MeterRegistry;

@Configuration
public class ActuatorConfig {

	@Bean
	public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags(
		@Value("${spring.profiles.active:default}")
		String profile) {
		return registry -> registry.config()
			.commonTags("application", "letsgitit", "env", profile);
	}
}

package com.gitcat.letsgitit.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

@Configuration
public class SwaggerConfig {

	@Bean
	public OpenAPI openAPI() {
		return new OpenAPI()
			.info(new Info()
				.title("LetsGitIt API")
				.description("LetsGitIt 백엔드 API 문서입니다.")
				.version("v1.0.0"));
	}
}

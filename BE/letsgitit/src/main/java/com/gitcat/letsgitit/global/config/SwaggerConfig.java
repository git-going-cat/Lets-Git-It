package com.gitcat.letsgitit.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;

@Configuration
public class SwaggerConfig {

	@Bean
	public OpenAPI openAPI() {
		return new OpenAPI()
			.info(new Info()
				.title("LetsGitIt API")
				.description("LetsGitIt 백엔드 API 문서입니다.")
				.version("v1.0.0"))
			// 전역 Bearer 인증 스키마 등록
			// - Swagger UI 우측 상단 Authorize 버튼에서 AT 입력 가능
			.addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
			.components(new Components()
				.addSecuritySchemes("bearerAuth",
					new SecurityScheme()
						.name("bearerAuth")
						.type(SecurityScheme.Type.HTTP)
						.scheme("bearer")
						.bearerFormat("JWT")));
	}
}

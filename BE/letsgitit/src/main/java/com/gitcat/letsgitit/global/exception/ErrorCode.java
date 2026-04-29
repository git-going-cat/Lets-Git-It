package com.gitcat.letsgitit.global.exception;

import org.springframework.http.HttpStatus;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
	// auth
	INVALID_AUTH_CODE(HttpStatus.UNAUTHORIZED.value(), "INVALID_AUTH_CODE", "유효하지 않거나 만료된 인증 코드입니다."),
	AUTHENTICATION_REQUIRED(HttpStatus.UNAUTHORIZED.value(), "AUTHENTICATION_REQUIRED", "로그인이 필요한 서비스입니다."),
	AUTHENTICATION_FAILED(HttpStatus.UNAUTHORIZED.value(), "AUTHENTICATION_FAILED", "인증에 실패했습니다."),
	OAUTH2_LOGIN_FAILED(HttpStatus.UNAUTHORIZED.value(), "OAUTH2_LOGIN_FAILED", "소셜 로그인에 실패했습니다."),
	OAUTH2_PROVIDER_ERROR(HttpStatus.BAD_GATEWAY.value(), "OAUTH2_PROVIDER_ERROR", "소셜 로그인 제공자와의 통신에 실패했습니다."),
	TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED.value(), "TOKEN_EXPIRED", "액세스 토큰이 만료되었습니다."),
	REFRESH_TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED.value(), "REFRESH_TOKEN_EXPIRED", "인증 정보가 만료되었습니다. 다시 로그인해주세요."),
	INVALID_TOKEN(HttpStatus.UNAUTHORIZED.value(), "INVALID_TOKEN", "유효하지 않은 토큰입니다."),
	TOKEN_MISMATCH(HttpStatus.UNAUTHORIZED.value(), "TOKEN_MISMATCH", "저장된 토큰 정보와 일치하지 않습니다."),
	TOKEN_BLACKLISTED(HttpStatus.UNAUTHORIZED.value(), "TOKEN_BLACKLISTED", "로그아웃된 토큰입니다."),

	// member
	MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND.value(), "MEMBER_NOT_FOUND", "존재하지 않는 회원입니다."),
	EMAIL_ALREADY_EXISTS(HttpStatus.CONFLICT.value(), "EMAIL_ALREADY_EXISTS", "이미 사용 중인 이메일입니다."),

	// system
	INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST.value(), "INVALID_INPUT_VALUE", "잘못된 값의 파라미터입니다."),
	INVALID_TYPE_VALUE(HttpStatus.BAD_REQUEST.value(), "INVALID_TYPE_VALUE", "잘못된 타입의 파라미터 값이 전달되었습니다."),
	MISSING_PARAMETER(HttpStatus.BAD_REQUEST.value(), "MISSING_PARAMETER", "요청 파라미터가 누락되었습니다."),
	MISSING_COOKIE(HttpStatus.BAD_REQUEST.value(), "MISSING_COOKIE", "필수 쿠키가 누락되었습니다."),

	ACCESS_DENIED(HttpStatus.FORBIDDEN.value(), "ACCESS_DENIED", "접근 권한이 없습니다."),

	API_NOT_FOUND(HttpStatus.NOT_FOUND.value(), "API_NOT_FOUND", "요청하신 API를 찾을 수 없습니다."),
	RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND.value(), "RESOURCE_NOT_FOUND", "지원하지 않는 리소스 요청입니다."),

	METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED.value(), "METHOD_NOT_ALLOWED", "지원하지 않는 HTTP 메서드입니다."),

	INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR.value(), "INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다.");

	private final int status;
	private final String code;
	private final String message;

}

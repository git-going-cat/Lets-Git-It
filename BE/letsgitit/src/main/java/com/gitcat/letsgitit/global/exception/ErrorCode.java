package com.gitcat.letsgitit.global.exception;

import org.springframework.http.HttpStatus;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
	// auth - token
	INVALID_AUTH_CODE(HttpStatus.BAD_REQUEST.value(), "INVALID_AUTH_CODE", "유효하지 않거나 만료된 인증 코드입니다."),
	EXPIRED_AUTH_CODE(HttpStatus.UNAUTHORIZED.value(), "EXPIRED_AUTH_CODE", "인증 코드가 만료되었습니다. (5분 초과)"),
	AUTHENTICATION_REQUIRED(HttpStatus.UNAUTHORIZED.value(), "AUTHENTICATION_REQUIRED", "로그인이 필요한 서비스입니다."),
	AUTHENTICATION_FAILED(HttpStatus.UNAUTHORIZED.value(), "AUTHENTICATION_FAILED", "인증에 실패했습니다."),
	OAUTH2_LOGIN_FAILED(HttpStatus.UNAUTHORIZED.value(), "OAUTH2_LOGIN_FAILED", "소셜 로그인에 실패했습니다."),
	OAUTH2_PROVIDER_ERROR(HttpStatus.BAD_GATEWAY.value(), "OAUTH2_PROVIDER_ERROR", "소셜 로그인 제공자와의 통신에 실패했습니다."),
	INVALID_PROVIDER_TOKEN(HttpStatus.UNAUTHORIZED.value(), "INVALID_PROVIDER_TOKEN", "구글 인증에 실패했습니다."),
	INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED.value(), "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다."),
	TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED.value(), "TOKEN_EXPIRED", "액세스 토큰이 만료되었습니다."),
	REFRESH_TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED.value(), "REFRESH_TOKEN_EXPIRED", "인증 정보가 만료되었습니다. 다시 로그인해주세요."),
	INVALID_TOKEN(HttpStatus.UNAUTHORIZED.value(), "INVALID_TOKEN", "유효하지 않은 토큰입니다."),
	TOKEN_MISMATCH(HttpStatus.UNAUTHORIZED.value(), "TOKEN_MISMATCH", "저장된 토큰 정보와 일치하지 않습니다."),
	TOKEN_BLACKLISTED(HttpStatus.UNAUTHORIZED.value(), "TOKEN_BLACKLISTED", "로그아웃된 토큰입니다."),

	// auth - email & password
	EMAIL_DUPLICATE(HttpStatus.CONFLICT.value(), "EMAIL_DUPLICATE", "이미 사용 중인 이메일입니다."),
	INVALID_EMAIL_FORMAT(HttpStatus.BAD_REQUEST.value(), "INVALID_EMAIL_FORMAT", "이메일 형식이 올바르지 않습니다."),
	EMAIL_SEND_FAILED(HttpStatus.INTERNAL_SERVER_ERROR.value(), "EMAIL_SEND_FAILED", "이메일 발송에 실패했습니다."),
	TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS.value(), "TOO_MANY_REQUESTS", "요청이 너무 많습니다. 60초 후 다시 시도해주세요."),
	TOO_MANY_EMAIL_REQUESTS(HttpStatus.TOO_MANY_REQUESTS.value(), "TOO_MANY_EMAIL_REQUESTS",
		"이메일 발송 횟수를 초과했습니다. (목적별 최대 3회)"),
	EMAIL_NOT_VERIFIED(HttpStatus.FORBIDDEN.value(), "EMAIL_NOT_VERIFIED", "이메일 인증이 완료되지 않았습니다."),
	INVALID_PASSWORD_FORMAT(HttpStatus.BAD_REQUEST.value(), "INVALID_PASSWORD_FORMAT", "비밀번호 형식이 올바르지 않습니다."),
	INVALID_GIT_PROFICIENCY(HttpStatus.BAD_REQUEST.value(), "INVALID_GIT_PROFICIENCY", "유효하지 않은 Git 익숙도 값입니다."),
	OAUTH_ACCOUNT(HttpStatus.BAD_REQUEST.value(), "OAUTH_ACCOUNT", "소셜 로그인 계정은 비밀번호를 사용할 수 없습니다."),
	SAME_AS_CURRENT_PASSWORD(HttpStatus.CONFLICT.value(), "SAME_AS_CURRENT_PASSWORD", "현재 비밀번호와 동일합니다."),
	PASSWORD_MISMATCH(HttpStatus.UNAUTHORIZED.value(), "PASSWORD_MISMATCH", "비밀번호가 일치하지 않습니다."),
	// verifyPassword API를 호출하지 않고 바로 changePassword를 호출한 경우
	// Redis 키 없음/만료로 검증 단계 우회를 차단
	PASSWORD_VERIFY_REQUIRED(HttpStatus.FORBIDDEN.value(), "PASSWORD_VERIFY_REQUIRED",
		"비밀번호 검증이 필요합니다. 먼저 비밀번호를 검증해주세요."),

	// member
	MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND.value(), "MEMBER_NOT_FOUND", "존재하지 않는 회원입니다."),
	AUTH_MEMBER_NOT_FOUND(HttpStatus.UNAUTHORIZED.value(), "AUTH_MEMBER_NOT_FOUND", "해당 이메일의 회원을 찾을 수 없습니다."),
	NICKNAME_DUPLICATED(HttpStatus.CONFLICT.value(), "NICKNAME_DUPLICATED", "이미 사용 중인 닉네임입니다."),
	NICKNAME_DUPLICATE(HttpStatus.CONFLICT.value(), "NICKNAME_DUPLICATE", "이미 사용 중인 닉네임입니다."),
	NICKNAME_INVALID(HttpStatus.BAD_REQUEST.value(), "NICKNAME_INVALID", "닉네임 형식이 올바르지 않습니다."),
	NICKNAME_NOT_SET(HttpStatus.BAD_REQUEST.value(), "NICKNAME_NOT_SET", "닉네임이 설정되지 않았습니다."),
	NICKNAME_ALREADY_SET(HttpStatus.BAD_REQUEST.value(), "NICKNAME_ALREADY_SET", "이미 닉네임이 설정되어 있습니다. 닉네임 수정을 요청해주세요."),
	TUTORIAL_ALREADY_COMPLETED(HttpStatus.BAD_REQUEST.value(), "TUTORIAL_ALREADY_COMPLETED", "이미 튜토리얼을 완료했습니다."),

	// room
	ROOM_NOT_FOUND(HttpStatus.NOT_FOUND.value(), "ROOM_NOT_FOUND", "존재하지 않는 방입니다."),
	ROOM_FULL(HttpStatus.CONFLICT.value(), "ROOM_FULL", "방 정원이 초과되었습니다."),
	ROOM_IN_GAME(HttpStatus.CONFLICT.value(), "ROOM_IN_GAME", "이미 게임 중인 방입니다."),
	ROOM_MODE_MISMATCH(HttpStatus.BAD_REQUEST.value(), "ROOM_MODE_MISMATCH", "요청한 방 모드와 실제 방 모드가 일치하지 않습니다."),
	INVALID_PASSWORD(HttpStatus.BAD_REQUEST.value(), "INVALID_PASSWORD", "비밀번호가 일치하지 않습니다."),
	NOT_HOST(HttpStatus.FORBIDDEN.value(), "NOT_HOST", "방장만 수행할 수 있습니다."),
	HOST_ALWAYS_READY(HttpStatus.BAD_REQUEST.value(), "HOST_ALWAYS_READY", "방장은 항상 준비 완료 상태입니다."),
	PLAYER_NOT_FOUND(HttpStatus.NOT_FOUND.value(), "PLAYER_NOT_FOUND", "해당 플레이어를 찾을 수 없습니다."),
	PLAYER_NOT_IN_ROOM(HttpStatus.FORBIDDEN.value(), "PLAYER_NOT_IN_ROOM", "해당 방에 참여하지 않은 플레이어입니다."),
	ALREADY_IN_ROOM(HttpStatus.CONFLICT.value(), "ALREADY_IN_ROOM", "이미 해당 방에 참여 중입니다."),
	ALREADY_IN_ANOTHER_ROOM(HttpStatus.CONFLICT.value(), "ALREADY_IN_ANOTHER_ROOM", "이미 다른 방에 참여 중입니다."),
	CANNOT_KICK_SELF(HttpStatus.BAD_REQUEST.value(), "CANNOT_KICK_SELF", "자기 자신을 추방할 수 없습니다."),
	SELF_TRANSFER(HttpStatus.BAD_REQUEST.value(), "SELF_TRANSFER", "자기 자신에게 위임할 수 없습니다."),
	PASSWORD_REQUIRED(HttpStatus.BAD_REQUEST.value(), "PASSWORD_REQUIRED", "비밀번호 설정 시 비밀번호는 필수입니다."),
	PASSWORD_NOT_VERIFIED(HttpStatus.FORBIDDEN.value(), "PASSWORD_NOT_VERIFIED",
		"비밀방 입장을 위한 비밀번호 검증이 완료되지 않았습니다."),
	ROOM_PASSWORD_INVALID_FORMAT(HttpStatus.BAD_REQUEST.value(), "ROOM_PASSWORD_INVALID_FORMAT",
		"방 비밀번호는 숫자 4자리여야 합니다."),
	LOCK_ACQUISITION_FAILED(HttpStatus.CONFLICT.value(), "LOCK_ACQUISITION_FAILED",
		"다른 요청이 처리 중입니다. 잠시 후 다시 시도해주세요."),
	LOCK_INTERRUPTED(HttpStatus.INTERNAL_SERVER_ERROR.value(), "LOCK_INTERRUPTED", "요청 처리가 중단되었습니다."),
	CANNOT_REDUCE_MAX_PLAYERS_BELOW_CURRENT(HttpStatus.BAD_REQUEST.value(), "CANNOT_REDUCE_MAX_PLAYERS_BELOW_CURRENT",
		"현재 인원보다 최대 인원을 줄일 수 없습니다."),
	COOP_MODE_MAX_PLAYERS_FIXED(HttpStatus.BAD_REQUEST.value(), "COOP_MODE_MAX_PLAYERS_FIXED",
		"협력 모드는 최대 인원이 4명으로 고정입니다."),
	COOP_MAP_NOT_FOUND(HttpStatus.NOT_FOUND.value(), "COOP_MAP_NOT_FOUND", "존재하지 않는 협력 맵입니다."),
	ROOM_CODE_GENERATION_FAILED(HttpStatus.INTERNAL_SERVER_ERROR.value(), "ROOM_CODE_GENERATION_FAILED",
		"방 코드 생성에 실패했습니다."),
	MESSAGE_TOO_LONG(HttpStatus.BAD_REQUEST.value(), "MESSAGE_TOO_LONG", "메시지가 너무 깁니다."),
	MESSAGE_EMPTY(HttpStatus.BAD_REQUEST.value(), "MESSAGE_EMPTY", "메시지를 입력해주세요."),
	NOT_ALL_READY(HttpStatus.BAD_REQUEST.value(), "NOT_ALL_READY", "모든 플레이어가 준비되지 않았습니다."),
	NOT_ENOUGH_PLAYERS(HttpStatus.BAD_REQUEST.value(), "NOT_ENOUGH_PLAYERS", "협력 모드는 4명이 필요합니다."),
	GAME_ALREADY_STARTED(HttpStatus.CONFLICT.value(), "GAME_ALREADY_STARTED", "이미 게임이 시작되었습니다."),
	COMMAND_SET_NOT_FOUND(HttpStatus.NOT_FOUND.value(), "COMMAND_SET_NOT_FOUND", "명령어 세트를 찾을 수 없습니다."),

	// contribution game
	INVALID_CONTRIBUTION(HttpStatus.BAD_REQUEST.value(), "INVALID_CONTRIBUTION", "기여도 값이 유효하지 않습니다."),
	GAME_NOT_STARTED(HttpStatus.BAD_REQUEST.value(), "GAME_NOT_STARTED", "게임이 시작되지 않았습니다."),
	INVALID_COMMAND(HttpStatus.BAD_REQUEST.value(), "INVALID_COMMAND", "존재하지 않는 명령어입니다."),
	COMMAND_ALREADY_CLEARED(HttpStatus.CONFLICT.value(), "COMMAND_ALREADY_CLEARED", "이미 완료된 명령어입니다."),
	COMMAND_EXPIRED(HttpStatus.GONE.value(), "COMMAND_EXPIRED", "현재 활성 명령어가 아닙니다."),
	GAME_ALREADY_ENDED(HttpStatus.CONFLICT.value(), "GAME_ALREADY_ENDED", "이미 종료된 게임입니다."),
	SESSION_MISMATCH(HttpStatus.BAD_REQUEST.value(), "SESSION_MISMATCH", "요청한 게임 세션이 현재 게임과 일치하지 않습니다."),
	PLAYER_NOT_IN_GAME(HttpStatus.FORBIDDEN.value(), "PLAYER_NOT_IN_GAME", "현재 게임에 참여하지 않은 플레이어입니다."),

	// single game session
	SESSION_NOT_FOUND(HttpStatus.NOT_FOUND.value(), "SESSION_NOT_FOUND", "세션을 찾을 수 없습니다."),
	SESSION_EXPIRED(HttpStatus.GONE.value(), "SESSION_EXPIRED", "세션이 만료되었습니다."),
	ALREADY_FINISHED(HttpStatus.CONFLICT.value(), "ALREADY_FINISHED", "이미 종료된 세션입니다."),

	// coop
	COOP_MAP_NOT_ACTIVE(HttpStatus.BAD_REQUEST.value(), "COOP_MAP_NOT_ACTIVE", "협력 모드 맵이 활성화 되어 있지 않습니다."),
	INPUT_BLOCKED(HttpStatus.BAD_REQUEST.value(), "INPUT_BLOCKED", "현재 입력이 차단된 상태입니다."),
	NOT_RESET_PLAYER(HttpStatus.FORBIDDEN.value(), "NOT_RESET_PLAYER", "git reset을 입력해야 하는 플레이어가 아닙니다."),
	RESET_NOT_REQUIRED(HttpStatus.BAD_REQUEST.value(), "RESET_NOT_REQUIRED", "현재 리셋 대기 상태가 아닙니다."),

	// system
	INVALID_REQUEST(HttpStatus.BAD_REQUEST.value(), "INVALID_REQUEST", "잘못된 요청입니다."),
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

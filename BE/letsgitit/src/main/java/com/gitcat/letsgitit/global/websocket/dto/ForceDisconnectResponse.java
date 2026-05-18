package com.gitcat.letsgitit.global.websocket.dto;

public record ForceDisconnectResponse(
	String type,
	String code,
	String message) implements BaseWebSocketResponse {

	public static ForceDisconnectResponse loggedOut() {
		return new ForceDisconnectResponse(
			"FORCE_DISCONNECT",
			"LOGGED_OUT",
			"로그아웃으로 인해 연결이 종료되었습니다.");
	}

	public static ForceDisconnectResponse replacedByNewLogin() {
		return new ForceDisconnectResponse(
			"FORCE_DISCONNECT",
			"REPLACED_BY_NEW_LOGIN",
			"새 로그인으로 인해 기존 연결이 종료되었습니다.");
	}
}

package com.gitcat.letsgitit.global.websocket.dto;

public record WebSocketErrorResponse(
	String type,
	String code,
	String message) {
	public static WebSocketErrorResponse of(String code, String message) {
		return new WebSocketErrorResponse("ERROR", code, message);
	}
}

package com.gitcat.letsgitit.domain.room.dto.websocket.response;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.gitcat.letsgitit.global.websocket.dto.BaseWebSocketResponse;

public record ReadyChangedResponse(
	String type,
	UUID playerId,
	String nickname,
	@JsonProperty("isReady")
	Boolean isReady,
	@JsonProperty("allReady")
	Boolean allReady) implements BaseWebSocketResponse {

	public static ReadyChangedResponse of(
		UUID playerId,
		String nickname,
		Boolean isReady,
		Boolean allReady) {
		return new ReadyChangedResponse("READY_CHANGED", playerId, nickname, isReady, allReady);
	}
}

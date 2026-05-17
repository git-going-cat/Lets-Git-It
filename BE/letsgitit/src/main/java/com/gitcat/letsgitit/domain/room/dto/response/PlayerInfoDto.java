package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;

public record PlayerInfoDto(
	UUID playerId,
	String nickname,
	String characterHair,
	String characterHairColor,
	String characterBody,
	String characterEye,
	String characterOutfit,
	String characterOutfitColor,
	@JsonProperty("isReady")
	Boolean isReady,
	@JsonProperty("isHost")
	Boolean isHost) {
}

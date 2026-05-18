package com.gitcat.letsgitit.domain.room.dto;

import java.util.UUID;

public record PlayerInfoDto(
	UUID playerId,
	String nickname,
	String characterHair,
	String characterHairColor,
	String characterBody,
	String characterEye,
	String characterOutfit,
	String characterOutfitColor,
	Boolean isReady,
	Boolean isHost,
	Boolean isMe) {
}

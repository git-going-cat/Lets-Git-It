package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.List;

import com.gitcat.letsgitit.domain.room.entity.enums.RoomState;
import com.gitcat.letsgitit.global.enums.GameMode;

public record ContributionRoomInfoResponse(
	Long roomId,
	String roomCode,
	String title,
	GameMode mode,
	RoomState roomState,
	Integer currentPlayers,
	Boolean hasPassword,
	Integer maxPlayers,
	List<PlayerInfoDto> members) {
}

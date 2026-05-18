package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.List;

import com.gitcat.letsgitit.domain.room.entity.enums.RoomState;
import com.gitcat.letsgitit.global.enums.GameMode;

public record JoinContributionRoomResponse(
	Long roomId,
	String roomCode,
	String title,
	GameMode mode,
	RoomState roomState,
	Integer currentPlayers,
	Integer maxPlayers,
	List<PlayerInfoDto> members) {
}

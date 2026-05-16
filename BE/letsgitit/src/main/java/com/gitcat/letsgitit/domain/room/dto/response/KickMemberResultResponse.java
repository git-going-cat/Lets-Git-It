package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.List;
import java.util.UUID;

public record KickMemberResultResponse(
	UUID kickedPlayerId,
	String kickedNickname,
	List<PlayerInfoDto> remainMembers) {
}

package com.gitcat.letsgitit.domain.room.dto.response;

import java.util.List;
import java.util.UUID;

public record HostTransferredResponse(
	String type,
	UUID newHostId,
	String newHostNickname,
	List<PlayerInfoDto> allMembers) {

	public static HostTransferredResponse of(UUID newHostId, String newHostNickname, List<PlayerInfoDto> allMembers) {
		return new HostTransferredResponse("HOST_TRANSFERRED", newHostId, newHostNickname, allMembers);
	}
}

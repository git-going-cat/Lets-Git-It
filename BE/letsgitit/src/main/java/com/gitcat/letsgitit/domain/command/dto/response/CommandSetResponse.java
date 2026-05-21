package com.gitcat.letsgitit.domain.command.dto.response;

import java.util.List;

import com.gitcat.letsgitit.domain.room.dto.response.CommandSetItemDto;

public record CommandSetResponse(
	int commandSetId,
	String initialBranch,
	List<CommandSetItemDto> commandSet) {
}

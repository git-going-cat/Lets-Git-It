package com.gitcat.letsgitit.domain.single.dto.response;

import com.gitcat.letsgitit.domain.single.entity.SingleCommandSetItem;
import com.gitcat.letsgitit.domain.single.entity.enums.CommandType;

public record CommandSetDto(
	Integer commandSequence,
	String text,
	String branchName,
	CommandType type) {
	public static CommandSetDto from(SingleCommandSetItem item) {
		return new CommandSetDto(
			item.getSequence(),
			item.getCommandText(),
			item.getBranchName(),
			item.getCommandType());
	}
}

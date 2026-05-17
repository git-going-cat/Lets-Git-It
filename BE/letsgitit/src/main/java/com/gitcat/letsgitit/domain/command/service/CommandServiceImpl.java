package com.gitcat.letsgitit.domain.command.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.util.List;
import java.util.Random;

import org.springframework.stereotype.Service;

import com.gitcat.letsgitit.domain.command.dto.response.CommandSetResponse;
import com.gitcat.letsgitit.domain.command.entity.CompetitiveCommandSet;
import com.gitcat.letsgitit.domain.command.entity.CompetitiveCommandSetItem;
import com.gitcat.letsgitit.domain.command.repository.CommandSetItemRepository;
import com.gitcat.letsgitit.domain.command.repository.CommandSetRepository;
import com.gitcat.letsgitit.domain.room.dto.response.CommandSetItemDto;
import com.gitcat.letsgitit.global.enums.CompetitiveMode;
import com.gitcat.letsgitit.global.exception.BusinessException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CommandServiceImpl implements CommandService {

	private static final Random RANDOM = new Random();

	private final CommandSetRepository commandSetRepository;
	private final CommandSetItemRepository commandSetItemRepository;

	@Override
	public CommandSetResponse getRandomContributionCommandSet() {
		List<CompetitiveCommandSet> sets = commandSetRepository.findAllByMode(CompetitiveMode.CONTRIBUTION);
		if (sets.isEmpty()) {
			throw new BusinessException(COMMAND_SET_NOT_FOUND);
		}

		CompetitiveCommandSet set = sets.get(RANDOM.nextInt(sets.size()));
		List<CompetitiveCommandSetItem> items = commandSetItemRepository.findAllByCommandSetId(set.getId());

		String initialBranch = items.isEmpty() ? "main" : items.get(0).getBranchName();

		List<CommandSetItemDto> commandSet = items.stream()
			.map(item -> new CommandSetItemDto(item.getSequence(), item.getCommandText(), item.getBranchName()))
			.toList();

		return new CommandSetResponse(set.getSetNumber(), initialBranch, commandSet);
	}
}

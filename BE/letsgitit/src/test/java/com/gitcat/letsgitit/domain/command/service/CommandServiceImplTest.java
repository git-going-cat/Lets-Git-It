package com.gitcat.letsgitit.domain.command.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.COMMAND_SET_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.gitcat.letsgitit.domain.command.dto.response.CommandSetResponse;
import com.gitcat.letsgitit.domain.command.entity.CompetitiveCommandSet;
import com.gitcat.letsgitit.domain.command.entity.CompetitiveCommandSetItem;
import com.gitcat.letsgitit.domain.command.repository.CommandSetItemRepository;
import com.gitcat.letsgitit.domain.command.repository.CommandSetRepository;
import com.gitcat.letsgitit.global.enums.CompetitiveMode;
import com.gitcat.letsgitit.global.exception.BusinessException;

class CommandServiceImplTest {

	@Mock
	private CommandSetRepository commandSetRepository;

	@Mock
	private CommandSetItemRepository commandSetItemRepository;

	private CommandServiceImpl commandService;

	@BeforeEach
	void setUp() {
		MockitoAnnotations.openMocks(this);
		commandService = new CommandServiceImpl(commandSetRepository, commandSetItemRepository);
	}

	@Test
	void playerCount에_맞는_기여도_명령어_셋을_조회한다() {
		// given
		CompetitiveCommandSet set = CompetitiveCommandSet.of(1, CompetitiveMode.CONTRIBUTION, 2);
		when(commandSetRepository.findAllByModeAndPlayerCount(CompetitiveMode.CONTRIBUTION, 2))
			.thenReturn(List.of(set));
		when(commandSetItemRepository.findAllByCommandSetId(set.getId()))
			.thenReturn(List.of(CompetitiveCommandSetItem.of(
				set.getId(),
				1,
				"git add .",
				"main")));

		// when
		CommandSetResponse response = commandService.getRandomContributionCommandSet(2);

		// then
		assertThat(response.commandSetId()).isEqualTo(1);
		assertThat(response.commandSet()).singleElement()
			.satisfies(command -> {
				assertThat(command.commandSequence()).isEqualTo(1);
				assertThat(command.fallDurationMs()).isEqualTo(20000L);
			});
		verify(commandSetRepository).findAllByModeAndPlayerCount(CompetitiveMode.CONTRIBUTION, 2);
	}

	@Test
	void playerCount에_맞는_기여도_명령어_셋이_없으면_예외가_발생한다() {
		// given
		when(commandSetRepository.findAllByModeAndPlayerCount(CompetitiveMode.CONTRIBUTION, 3))
			.thenReturn(List.of());

		// when & then
		assertThatThrownBy(() -> commandService.getRandomContributionCommandSet(3))
			.isInstanceOf(BusinessException.class)
			.extracting("errorCode")
			.isEqualTo(COMMAND_SET_NOT_FOUND);
	}
}

package com.gitcat.letsgitit.domain.dictionary.dto.response;

import java.util.List;
import java.util.UUID;

import com.gitcat.letsgitit.domain.dictionary.entity.DictionaryCommand;
import com.gitcat.letsgitit.domain.dictionary.entity.DictionaryCommandOption;

public record DictionaryCommandResponse(
	List<CommandDto> commands) {

	public static DictionaryCommandResponse of(List<DictionaryCommand> commands) {
		return new DictionaryCommandResponse(
			commands.stream()
				.map(CommandDto::of)
				.toList());
	}

	public record CommandDto(
		UUID commandId,
		String name,
		String description,
		String imageUrl,
		boolean isInGame,
		List<OptionDto> options) {
		public static CommandDto of(DictionaryCommand command) {
			return new CommandDto(
				command.getId(),
				command.getName(),
				command.getDescription(),
				command.getImageUrl(),
				command.isInGame(),
				command.getOptions().stream()
					.map(OptionDto::of)
					.toList());
		}
	}

	public record OptionDto(
		String option,
		String description) {
		public static OptionDto of(DictionaryCommandOption option) {
			return new OptionDto(
				option.getOption(),
				option.getDescription());
		}
	}
}

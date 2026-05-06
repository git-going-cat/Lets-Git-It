package com.gitcat.letsgitit.domain.dictionary.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.BDDMockito.*;

import java.lang.reflect.Field;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.gitcat.letsgitit.domain.dictionary.dto.response.DictionaryCommandResponse;
import com.gitcat.letsgitit.domain.dictionary.entity.DictionaryCommand;
import com.gitcat.letsgitit.domain.dictionary.entity.DictionaryCommandOption;
import com.gitcat.letsgitit.domain.dictionary.repository.DictionaryCommandRepository;

@ExtendWith(MockitoExtension.class)
class DictionaryServiceImplTest {

	@Mock
	private DictionaryCommandRepository dictionaryCommandRepository;

	@InjectMocks
	private DictionaryServiceImpl dictionaryService;

	@Test
	void 게임_내_명령어와_옵션이_DTO로_변환되어_반환된다() {
		// given
		UUID commandId = UUID.randomUUID();
		DictionaryCommand command = DictionaryCommand.of(
			"git commit", "변경 내용을 저장소에 기록합니다.", "커밋 팁입니다.", "git commit -m \"메시지\"", true);
		setCommandId(command, commandId);

		DictionaryCommandOption option1 = DictionaryCommandOption.of(command, "-m \"메시지\"", "커밋 메시지를 인라인으로 지정합니다.");
		DictionaryCommandOption option2 = DictionaryCommandOption.of(command, "--amend", "직전 커밋을 수정합니다.");
		addOptions(command, List.of(option1, option2));

		given(dictionaryCommandRepository.findAllWithOptions()).willReturn(List.of(command));

		// when
		DictionaryCommandResponse response = dictionaryService.getCommands();

		// then
		assertThat(response.commands()).hasSize(1);

		DictionaryCommandResponse.CommandDto commandDto = response.commands().get(0);
		assertThat(commandDto.commandId()).isEqualTo(commandId);
		assertThat(commandDto.name()).isEqualTo("git commit");
		assertThat(commandDto.description()).isEqualTo("변경 내용을 저장소에 기록합니다.");
		assertThat(commandDto.tip()).isEqualTo("커밋 팁입니다.");
		assertThat(commandDto.example()).isEqualTo("git commit -m \"메시지\"");
		assertThat(commandDto.options()).hasSize(2);
		assertThat(commandDto.options().get(0).option()).isEqualTo("-m \"메시지\"");
		assertThat(commandDto.options().get(0).description()).isEqualTo("커밋 메시지를 인라인으로 지정합니다.");
		assertThat(commandDto.options().get(1).option()).isEqualTo("--amend");
		assertThat(commandDto.options().get(1).description()).isEqualTo("직전 커밋을 수정합니다.");
	}

	@Test
	void 게임_내_명령어가_없으면_빈_목록을_반환한다() {
		// given
		given(dictionaryCommandRepository.findAllWithOptions()).willReturn(List.of());

		// when
		DictionaryCommandResponse response = dictionaryService.getCommands();

		// then
		assertThat(response.commands()).isEmpty();
	}

	@Test
	void 옵션이_없는_명령어도_빈_옵션_목록으로_정상_반환된다() {
		// given
		DictionaryCommand command = DictionaryCommand.of("git init", "저장소를 초기화합니다.", null, null, true);
		setCommandId(command, UUID.randomUUID());

		given(dictionaryCommandRepository.findAllWithOptions()).willReturn(List.of(command));

		// when
		DictionaryCommandResponse response = dictionaryService.getCommands();

		// then
		assertThat(response.commands()).hasSize(1);
		assertThat(response.commands().get(0).name()).isEqualTo("git init");
		assertThat(response.commands().get(0).tip()).isNull();
		assertThat(response.commands().get(0).options()).isEmpty();
	}

	@Test
	void 여러_명령어가_각각의_옵션과_함께_반환된다() {
		// given
		DictionaryCommand commit = DictionaryCommand.of("git commit", "커밋 명령어", null, null, true);
		setCommandId(commit, UUID.randomUUID());
		addOptions(commit, List.of(
			DictionaryCommandOption.of(commit, "-m \"메시지\"", "커밋 메시지를 인라인으로 지정합니다.")));

		DictionaryCommand push = DictionaryCommand.of("git push", "원격 저장소에 반영합니다.", null, null, true);
		setCommandId(push, UUID.randomUUID());
		addOptions(push, List.of(
			DictionaryCommandOption.of(push, "--force", "강제로 푸시합니다."),
			DictionaryCommandOption.of(push, "-u origin main", "업스트림을 설정하며 푸시합니다.")));

		given(dictionaryCommandRepository.findAllWithOptions()).willReturn(List.of(commit, push));

		// when
		DictionaryCommandResponse response = dictionaryService.getCommands();

		// then
		assertThat(response.commands()).hasSize(2);
		assertThat(response.commands().get(0).options()).hasSize(1);
		assertThat(response.commands().get(1).options()).hasSize(2);
		assertThat(response.commands().get(1).options())
			.extracting(DictionaryCommandResponse.OptionDto::option)
			.containsExactly("--force", "-u origin main");
	}

	private void setCommandId(DictionaryCommand command, UUID id) {
		try {
			Field field = DictionaryCommand.class.getDeclaredField("id");
			field.setAccessible(true);
			field.set(command, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
	}

	@SuppressWarnings("unchecked")
	private void addOptions(DictionaryCommand command, List<DictionaryCommandOption> options) {
		try {
			Field field = DictionaryCommand.class.getDeclaredField("options");
			field.setAccessible(true);
			List<DictionaryCommandOption> optionList = (List<DictionaryCommandOption>)field.get(command);
			optionList.addAll(options);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
	}
}

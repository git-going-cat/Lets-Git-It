package com.gitcat.letsgitit.domain.tutorial.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.BDDMockito.*;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.gitcat.letsgitit.domain.tutorial.dto.response.TutorialResponse;
import com.gitcat.letsgitit.domain.tutorial.entity.TutorialStep;
import com.gitcat.letsgitit.domain.tutorial.entity.TutorialStepItem;
import com.gitcat.letsgitit.domain.tutorial.repository.TutorialRepository;

@ExtendWith(MockitoExtension.class)
public class TutorialServiceImplTest {

	@Mock
	private TutorialRepository tutorialRepository;

	@InjectMocks
	private TutorialServiceImpl tutorialService;

	@Test
	void 튜토리얼_조회_시_단계와_명령어를_응답으로_변환한다() {
		// given
		TutorialStep firstStep = TutorialStep.of(
			1,
			"게임 시작",
			"프로젝트를 가져오는 것부터 시작해요. git clone으로 게임을 시작합니다.");
		UUID firstStepId = UUID.randomUUID();
		setTutorialStepId(firstStep, firstStepId);
		TutorialStepItem firstItem = TutorialStepItem.of(
			firstStepId,
			1,
			"git clone https://github.com/gitcat/project.git",
			"원격 저장소를 내 컴퓨터로 복사합니다. 모든 모드는 이 명령어로 시작해요.");

		TutorialStep secondStep = TutorialStep.of(
			12,
			"브랜치 합치기",
			"작업한 브랜치들을 main에 합쳐봐요.");
		UUID secondStepId = UUID.randomUUID();
		setTutorialStepId(secondStep, secondStepId);
		TutorialStepItem secondItem = TutorialStepItem.of(
			secondStepId,
			1,
			"git merge feature/login",
			"다른 브랜치의 작업 내용을 현재 브랜치로 가져와 합칩니다.");
		TutorialStepItem thirdItem = TutorialStepItem.of(
			secondStepId,
			2,
			"git merge feature/signup",
			"두 번째 브랜치도 동일하게 머지합니다.");

		given(tutorialRepository.findAllByStepOrderAsc()).willReturn(List.of(firstStep, secondStep));
		given(tutorialRepository.findItemsGroupByStepId(List.of(firstStepId, secondStepId))).willReturn(
			Map.of(
				firstStepId, List.of(firstItem),
				secondStepId, List.of(secondItem, thirdItem)));

		// when
		TutorialResponse response = tutorialService.getTutorial();

		// then
		assertThat(response.steps()).hasSize(2);
		assertThat(response.steps().get(0).order()).isEqualTo(1);
		assertThat(response.steps().get(0).title()).isEqualTo("게임 시작");
		assertThat(response.steps().get(0).commands()).hasSize(1);
		assertThat(response.steps().get(0).commands().get(0).sequence()).isEqualTo(1);
		assertThat(response.steps().get(0).commands().get(0).command())
			.isEqualTo("git clone https://github.com/gitcat/project.git");

		assertThat(response.steps().get(1).order()).isEqualTo(12);
		assertThat(response.steps().get(1).commands())
			.extracting(command -> command.sequence())
			.containsExactly(1, 2);
		assertThat(response.steps().get(1).commands().get(1).explanation())
			.isEqualTo("두 번째 브랜치도 동일하게 머지합니다.");
	}

	@Test
	void 튜토리얼_데이터가_없으면_빈_목록을_반환한다() {
		// given
		given(tutorialRepository.findAllByStepOrderAsc()).willReturn(List.of());
		given(tutorialRepository.findItemsGroupByStepId(List.of())).willReturn(Map.of());

		// when
		TutorialResponse response = tutorialService.getTutorial();

		// then
		assertThat(response.steps()).isEmpty();
	}

	private void setTutorialStepId(TutorialStep step, UUID id) {
		try {
			Field field = TutorialStep.class.getDeclaredField("id");
			field.setAccessible(true);
			field.set(step, id);
		} catch (ReflectiveOperationException e) {
			throw new IllegalStateException(e);
		}
	}
}

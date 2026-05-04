package com.gitcat.letsgitit.domain.single.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.gitcat.letsgitit.domain.single.dto.request.SingleSessionStartRequest;
import com.gitcat.letsgitit.domain.single.dto.response.SingleSessionStartResponse;
import com.gitcat.letsgitit.domain.single.entity.SingleCommandSet;
import com.gitcat.letsgitit.domain.single.entity.SingleCommandSetItem;
import com.gitcat.letsgitit.domain.single.entity.SingleResult;
import com.gitcat.letsgitit.domain.single.entity.enums.CommandType;
import com.gitcat.letsgitit.domain.single.entity.enums.Grade;
import com.gitcat.letsgitit.domain.single.entity.enums.SingleResultStatus;
import com.gitcat.letsgitit.domain.single.repository.SingleCommandSetRepository;
import com.gitcat.letsgitit.domain.single.repository.SingleResultRepository;
import com.gitcat.letsgitit.domain.single.repository.SingleSessionRedisRepository;
import com.gitcat.letsgitit.global.enums.Difficulty;

@ExtendWith(MockitoExtension.class)
class SingleServiceImplTest {

	@InjectMocks
	private SingleServiceImpl singleService;

	@Mock
	private SingleResultRepository singleResultRepository;
	@Mock
	private SingleCommandSetRepository singleCommandSetRepository;
	@Mock
	private SingleSessionRedisRepository singleSessionRedisRepository;

	private static final UUID MEMBER_ID = UUID.randomUUID();
	private static final Difficulty DIFFICULTY = Difficulty.EASY;

	@Nested
	class StartSession {

		@Test
		void 정상_시작_시_응답_반환() {
			// given
			SingleSessionStartRequest request = new SingleSessionStartRequest(DIFFICULTY);

			SingleCommandSet commandSet = createCommandSet(DIFFICULTY);
			UUID commandSetId = UUID.randomUUID();
			ReflectionTestUtils.setField(commandSet, "id", commandSetId);

			List<SingleCommandSetItem> items = List.of(
				createCommandSetItem(commandSetId, 1, "git init"),
				createCommandSetItem(commandSetId, 2, "git add ."));

			SingleResult bestResult = SingleResult.of(
				"prev-session", MEMBER_ID, DIFFICULTY,
				SingleResultStatus.SUCCESS, 1500, Grade.A, 60);

			given(singleCommandSetRepository.findAllByDifficulty(DIFFICULTY))
				.willReturn(List.of(commandSet));
			given(singleCommandSetRepository.findAllBySingleCommandSetIdOrderBySequenceAsc(commandSetId))
				.willReturn(items);
			given(singleResultRepository.findTopByMemberIdAndDifficultyOrderByScoreDesc(MEMBER_ID, DIFFICULTY))
				.willReturn(Optional.of(bestResult));

			// when
			SingleSessionStartResponse response = singleService.startSession(MEMBER_ID, request);

			// then
			assertThat(response.sessionId()).isNotNull();
			assertThat(response.difficulty()).isEqualTo(DIFFICULTY);
			assertThat(response.bestScore()).isEqualTo(1500);
			assertThat(response.commandSet()).hasSize(2);
			assertThat(response.commandSet().get(0).text()).isEqualTo("git init");
			assertThat(response.commandSet().get(1).text()).isEqualTo("git add .");
		}

		@Test
		void 최고_점수_없을_때_0_반환() {
			// given
			SingleSessionStartRequest request = new SingleSessionStartRequest(DIFFICULTY);

			SingleCommandSet commandSet = createCommandSet(DIFFICULTY);
			UUID commandSetId = UUID.randomUUID();
			ReflectionTestUtils.setField(commandSet, "id", commandSetId);

			List<SingleCommandSetItem> items = List.of(
				createCommandSetItem(commandSetId, 1, "git init"));

			given(singleCommandSetRepository.findAllByDifficulty(DIFFICULTY))
				.willReturn(List.of(commandSet));
			given(singleCommandSetRepository.findAllBySingleCommandSetIdOrderBySequenceAsc(commandSetId))
				.willReturn(items);
			given(singleResultRepository.findTopByMemberIdAndDifficultyOrderByScoreDesc(MEMBER_ID, DIFFICULTY))
				.willReturn(Optional.empty());

			// when
			SingleSessionStartResponse response = singleService.startSession(MEMBER_ID, request);

			// then
			assertThat(response.bestScore()).isZero();
		}

		@Test
		void 난이도별_command_set_없을_때_예외() {
			// given
			SingleSessionStartRequest request = new SingleSessionStartRequest(DIFFICULTY);

			given(singleCommandSetRepository.findAllByDifficulty(DIFFICULTY))
				.willReturn(Collections.emptyList());

			// when & then
			assertThatThrownBy(() -> singleService.startSession(MEMBER_ID, request))
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("Single command set is missing");
		}

		@Test
		void command_item_비어_있을_때_예외() {
			// given
			SingleSessionStartRequest request = new SingleSessionStartRequest(DIFFICULTY);

			SingleCommandSet commandSet = createCommandSet(DIFFICULTY);
			UUID commandSetId = UUID.randomUUID();
			ReflectionTestUtils.setField(commandSet, "id", commandSetId);

			given(singleCommandSetRepository.findAllByDifficulty(DIFFICULTY))
				.willReturn(List.of(commandSet));
			given(singleCommandSetRepository.findAllBySingleCommandSetIdOrderBySequenceAsc(commandSetId))
				.willReturn(Collections.emptyList());

			// when & then
			assertThatThrownBy(() -> singleService.startSession(MEMBER_ID, request))
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("Single command set items are missing");
		}

		@Test
		void Redis_세션_저장_호출_확인() {
			// given
			SingleSessionStartRequest request = new SingleSessionStartRequest(DIFFICULTY);

			SingleCommandSet commandSet = createCommandSet(DIFFICULTY);
			UUID commandSetId = UUID.randomUUID();
			ReflectionTestUtils.setField(commandSet, "id", commandSetId);

			List<SingleCommandSetItem> items = List.of(
				createCommandSetItem(commandSetId, 1, "git init"));

			given(singleCommandSetRepository.findAllByDifficulty(DIFFICULTY))
				.willReturn(List.of(commandSet));
			given(singleCommandSetRepository.findAllBySingleCommandSetIdOrderBySequenceAsc(commandSetId))
				.willReturn(items);
			given(singleResultRepository.findTopByMemberIdAndDifficultyOrderByScoreDesc(MEMBER_ID, DIFFICULTY))
				.willReturn(Optional.empty());

			// when
			singleService.startSession(MEMBER_ID, request);

			// then
			then(singleSessionRedisRepository).should(times(1)).save(any());
		}
	}

	private SingleCommandSet createCommandSet(Difficulty difficulty) {
		return SingleCommandSet.of(1, difficulty);
	}

	private SingleCommandSetItem createCommandSetItem(UUID commandSetId, int sequence, String commandText) {
		return SingleCommandSetItem.of(
			commandSetId, sequence, commandText, null, CommandType.COMMON);
	}
}

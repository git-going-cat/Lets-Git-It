package com.gitcat.letsgitit.domain.single.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.ranking.service.SingleRankingService;
import com.gitcat.letsgitit.domain.record.service.RecordService;
import com.gitcat.letsgitit.domain.single.dto.SingleSessionCache;
import com.gitcat.letsgitit.domain.single.dto.request.SingleResultSaveRequest;
import com.gitcat.letsgitit.domain.single.dto.request.SingleSessionStartRequest;
import com.gitcat.letsgitit.domain.single.dto.response.SingleResultResponse;
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
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;

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
	@Mock
	private SingleRankingService singleRankingService;
	@Mock
	private RecordService recordService;
	@Mock
	private MemberService memberService;

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

	@Nested
	class SaveResult {

		@BeforeEach
		void setUpTransactionSync() {
			TransactionSynchronizationManager.initSynchronization();
		}

		@AfterEach
		void clearTransactionSync() {
			TransactionSynchronizationManager.clearSynchronization();
		}

		@Test
		void 신기록이면_결과_저장_후_랭킹과_최고기록을_갱신한다() {
			// given
			String sessionId = UUID.randomUUID().toString();
			SingleResultSaveRequest request = new SingleResultSaveRequest(
				SingleResultStatus.SUCCESS,
				2000,
				120_000,
				Grade.S);

			given(singleResultRepository.existsBySessionId(sessionId)).willReturn(false);
			given(singleSessionRedisRepository.findBySessionId(sessionId))
				.willReturn(Optional.of(SingleSessionCache.of(sessionId, MEMBER_ID, DIFFICULTY)));
			given(singleResultRepository.findTopByMemberIdAndDifficultyOrderByScoreDesc(MEMBER_ID, DIFFICULTY))
				.willReturn(Optional.of(SingleResult.of(
					"prev-session", MEMBER_ID, DIFFICULTY,
					SingleResultStatus.SUCCESS, 1500, Grade.A, 60)));
			given(singleRankingService.getCurrentWeekScore(DIFFICULTY, MEMBER_ID)).willReturn(1500);
			given(singleRankingService.updateSingleScore(DIFFICULTY, MEMBER_ID, 2000)).willReturn(3);

			// when
			SingleResultResponse response = singleService.saveResult(MEMBER_ID, sessionId, request);
			TransactionSynchronizationManager.getSynchronizations()
				.forEach(TransactionSynchronization::afterCommit);

			// then
			assertThat(response.isNewRecord()).isTrue();
			then(singleResultRepository).should().save(any(SingleResult.class));
			then(memberService).should().addPlayTime(MEMBER_ID, 120);
			then(singleRankingService).should().updateSingleScore(DIFFICULTY, MEMBER_ID, 2000);
			then(recordService).should().updateSingleBestRecord(MEMBER_ID, DIFFICULTY, 2000, 3);
			then(singleSessionRedisRepository).should().deleteBySessionId(sessionId);
		}

		@Test
		void 기존_결과가_있으면_이미_종료된_세션_예외가_발생한다() {
			// given
			String sessionId = UUID.randomUUID().toString();
			SingleResultSaveRequest request = new SingleResultSaveRequest(
				SingleResultStatus.SUCCESS,
				1500,
				100,
				Grade.A);

			given(singleResultRepository.existsBySessionId(sessionId)).willReturn(true);

			// when & then
			assertThatThrownBy(() -> singleService.saveResult(MEMBER_ID, sessionId, request))
				.isInstanceOf(BusinessException.class)
				.hasFieldOrPropertyWithValue("errorCode", ErrorCode.ALREADY_FINISHED);
			then(singleSessionRedisRepository).shouldHaveNoInteractions();
		}

		@Test
		void Redis_세션이_없으면_세션_없음_예외가_발생한다() {
			// given
			String sessionId = UUID.randomUUID().toString();
			SingleResultSaveRequest request = new SingleResultSaveRequest(
				SingleResultStatus.SUCCESS,
				1500,
				100,
				Grade.A);

			given(singleResultRepository.existsBySessionId(sessionId)).willReturn(false);
			given(singleSessionRedisRepository.findBySessionId(sessionId)).willReturn(Optional.empty());

			// when & then
			assertThatThrownBy(() -> singleService.saveResult(MEMBER_ID, sessionId, request))
				.isInstanceOf(BusinessException.class)
				.hasFieldOrPropertyWithValue("errorCode", ErrorCode.SESSION_NOT_FOUND);
		}

		@Test
		void 첫_플레이는_점수와_무관하게_신기록으로_처리된다() {
			// given
			String sessionId = UUID.randomUUID().toString();
			SingleResultSaveRequest request = new SingleResultSaveRequest(
				SingleResultStatus.SUCCESS,
				0,
				60_000,
				Grade.S);

			given(singleResultRepository.existsBySessionId(sessionId)).willReturn(false);
			given(singleSessionRedisRepository.findBySessionId(sessionId))
				.willReturn(Optional.of(SingleSessionCache.of(sessionId, MEMBER_ID, DIFFICULTY)));
			given(singleResultRepository.findTopByMemberIdAndDifficultyOrderByScoreDesc(MEMBER_ID, DIFFICULTY))
				.willReturn(Optional.empty());
			given(singleRankingService.getCurrentWeekScore(DIFFICULTY, MEMBER_ID)).willReturn(null);
			given(singleRankingService.updateSingleScore(DIFFICULTY, MEMBER_ID, 0)).willReturn(1);

			// when
			SingleResultResponse response = singleService.saveResult(MEMBER_ID, sessionId, request);
			TransactionSynchronizationManager.getSynchronizations()
				.forEach(TransactionSynchronization::afterCommit);

			// then
			assertThat(response.isNewRecord()).isTrue();
			then(singleRankingService).should().updateSingleScore(DIFFICULTY, MEMBER_ID, 0);
			then(recordService).should().updateSingleBestRecord(MEMBER_ID, DIFFICULTY, 0, 1);
		}

		@Test
		void 신기록이_아니고_금주차_최고점도_아니면_랭킹과_최고기록을_갱신하지_않는다() {
			// given
			String sessionId = UUID.randomUUID().toString();
			SingleResultSaveRequest request = new SingleResultSaveRequest(
				SingleResultStatus.GAMEOVER,
				1000,
				90,
				Grade.B);

			given(singleResultRepository.existsBySessionId(sessionId)).willReturn(false);
			given(singleSessionRedisRepository.findBySessionId(sessionId))
				.willReturn(Optional.of(SingleSessionCache.of(sessionId, MEMBER_ID, DIFFICULTY)));
			given(singleResultRepository.findTopByMemberIdAndDifficultyOrderByScoreDesc(MEMBER_ID, DIFFICULTY))
				.willReturn(Optional.of(SingleResult.of(
					"prev-session", MEMBER_ID, DIFFICULTY,
					SingleResultStatus.SUCCESS, 1500, Grade.A, 60)));
			given(singleRankingService.getCurrentWeekScore(DIFFICULTY, MEMBER_ID)).willReturn(1200);

			// when
			SingleResultResponse response = singleService.saveResult(MEMBER_ID, sessionId, request);
			TransactionSynchronizationManager.getSynchronizations()
				.forEach(TransactionSynchronization::afterCommit);

			// then
			assertThat(response.isNewRecord()).isFalse();
			then(singleRankingService).should().getCurrentWeekScore(DIFFICULTY, MEMBER_ID);
			then(singleRankingService).should(never()).updateSingleScore(any(), any(), anyInt());
			then(recordService).shouldHaveNoInteractions();
			then(singleSessionRedisRepository).should().deleteBySessionId(sessionId);
		}

		@Test
		void 역대_신기록이_아니어도_금주차_최고점이면_랭킹만_갱신한다() {
			// given
			String sessionId = UUID.randomUUID().toString();
			SingleResultSaveRequest request = new SingleResultSaveRequest(
				SingleResultStatus.SUCCESS,
				1200,
				90_000,
				Grade.A);

			given(singleResultRepository.existsBySessionId(sessionId)).willReturn(false);
			given(singleSessionRedisRepository.findBySessionId(sessionId))
				.willReturn(Optional.of(SingleSessionCache.of(sessionId, MEMBER_ID, DIFFICULTY)));
			given(singleResultRepository.findTopByMemberIdAndDifficultyOrderByScoreDesc(MEMBER_ID, DIFFICULTY))
				.willReturn(Optional.of(SingleResult.of(
					"prev-session", MEMBER_ID, DIFFICULTY,
					SingleResultStatus.SUCCESS, 1500, Grade.S, 60)));
			given(singleRankingService.getCurrentWeekScore(DIFFICULTY, MEMBER_ID)).willReturn(1000);

			// when
			SingleResultResponse response = singleService.saveResult(MEMBER_ID, sessionId, request);
			TransactionSynchronizationManager.getSynchronizations()
				.forEach(TransactionSynchronization::afterCommit);

			// then
			assertThat(response.isNewRecord()).isFalse();
			then(singleRankingService).should().updateSingleScore(DIFFICULTY, MEMBER_ID, 1200);
			then(recordService).shouldHaveNoInteractions();
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

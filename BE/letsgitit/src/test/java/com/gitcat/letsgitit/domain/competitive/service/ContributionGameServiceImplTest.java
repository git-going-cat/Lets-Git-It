package com.gitcat.letsgitit.domain.competitive.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.COMMAND_ALREADY_CLEARED;
import static com.gitcat.letsgitit.global.exception.ErrorCode.GAME_ALREADY_ENDED;
import static com.gitcat.letsgitit.global.exception.ErrorCode.INVALID_COMMAND;
import static com.gitcat.letsgitit.global.exception.ErrorCode.LOCK_ACQUISITION_FAILED;
import static com.gitcat.letsgitit.global.exception.ErrorCode.PLAYER_NOT_IN_GAME;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;

import com.gitcat.letsgitit.domain.competitive.dto.ContributionCommandCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionGameSessionCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionInputResult;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionPlayerCache;
import com.gitcat.letsgitit.domain.competitive.message.contribution.CommandExpiredMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionExpireRequestMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionGameEndMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionInputFailedMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionInputMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionPlayerDisconnectedMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.PositionUpdateMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ScoreUpdateMessage;
import com.gitcat.letsgitit.domain.competitive.repository.ContributionGameRedisRepository;
import com.gitcat.letsgitit.domain.ranking.service.ContributionRankingService;
import com.gitcat.letsgitit.global.exception.BusinessException;

class ContributionGameServiceImplTest {

	private static final Long ROOM_ID = 42L;
	private static final UUID GAME_SESSION_ID = UUID.randomUUID();
	private static final UUID REQUEST_ID = UUID.randomUUID();
	private static final UUID PLAYER_ID = UUID.randomUUID();
	private static final UUID OTHER_PLAYER_ID = UUID.randomUUID();

	@Mock
	private ContributionGameRedisRepository repository;

	@Mock
	private RedissonClient redissonClient;

	@Mock
	private RLock lock;

	@Mock
	private ContributionResultSaveService contributionResultSaveService;

	@Mock
	private ContributionRankingService contributionRankingService;

	private ContributionGameServiceImpl service;

	@BeforeEach
	void setUp() {
		MockitoAnnotations.openMocks(this);
		service = new ContributionGameServiceImpl(
			repository,
			redissonClient,
			contributionResultSaveService,
			contributionRankingService);
		when(redissonClient.getLock(anyString())).thenReturn(lock);
		try {
			when(lock.tryLock(anyLong(), any(TimeUnit.class))).thenReturn(true);
		} catch (InterruptedException e) {
			throw new IllegalStateException(e);
		}
		when(repository.markSessionEndedIfInProgress(any())).thenReturn(true);
	}

	@Nested
	class ProcessInput {

		@Test
		void 일반_명령어_정답이면_점수를_갱신하고_SCORE_UPDATE를_반환한다() {
			// given
			ContributionInputMessage request = input(1, "git commit -m 'fix'");
			ContributionCommandCache command = ContributionCommandCache.ready(1, "git commit -m 'fix'", "main");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 1)).thenReturn(Optional.of(command));
			when(repository.findPosition(GAME_SESSION_ID, PLAYER_ID)).thenReturn(Optional.of("main"));
			when(repository.findCommands(GAME_SESSION_ID)).thenReturn(List.of(command));
			when(repository.findPlayers(GAME_SESSION_ID)).thenReturn(List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0),
				new ContributionPlayerCache(OTHER_PLAYER_ID, "alice", 0)));
			when(repository.findSuccessCount(GAME_SESSION_ID, PLAYER_ID)).thenReturn(1);
			when(repository.findSuccessCount(GAME_SESSION_ID, OTHER_PLAYER_ID)).thenReturn(0);
			when(repository.findCatExpiredCount(GAME_SESSION_ID)).thenReturn(0);
			when(repository.countScoredClearedCommands(GAME_SESSION_ID)).thenReturn(1);

			// when
			ContributionInputResult result = service.processInput(ROOM_ID, PLAYER_ID, request);

			// then
			assertThat(result.broadcast()).isTrue();
			assertThat(result.payload()).isInstanceOf(ScoreUpdateMessage.class);
			ScoreUpdateMessage payload = (ScoreUpdateMessage)result.payload();
			assertThat(payload.type()).isEqualTo("SCORE_UPDATE");
			assertThat(payload.scores()).anySatisfy(score -> {
				assertThat(score.playerId()).isEqualTo(PLAYER_ID);
				assertThat(score.contribution()).isEqualTo(100);
			});
			assertThat(payload.scores()).anySatisfy(score -> {
				assertThat(score.playerId()).isNull();
				assertThat(score.nickname()).isEqualTo("[CAT]");
			});
			assertThat(payload.progress().current()).isEqualTo(1);
			assertThat(payload.progress().total()).isEqualTo(2);
			assertThat(payload.progress().percent()).isEqualTo(50);
			verify(repository).saveCommand(GAME_SESSION_ID, command.cleared(PLAYER_ID));
			verify(repository).incrementSuccessCount(GAME_SESSION_ID, PLAYER_ID);
		}

		@Test
		void 커밋_메시지_따옴표와_줄바꿈이_달라도_정답으로_처리한다() {
			// given
			ContributionInputMessage request = input(1, "git commit\n-m \"fix\"\n");
			ContributionCommandCache command = ContributionCommandCache.ready(1, "git commit -m 'fix'", "main");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 1)).thenReturn(Optional.of(command));
			when(repository.findPosition(GAME_SESSION_ID, PLAYER_ID)).thenReturn(Optional.of("main"));
			when(repository.findCommands(GAME_SESSION_ID)).thenReturn(List.of(command));
			when(repository.findPlayers(GAME_SESSION_ID)).thenReturn(List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0),
				new ContributionPlayerCache(OTHER_PLAYER_ID, "alice", 0)));
			when(repository.findSuccessCount(GAME_SESSION_ID, PLAYER_ID)).thenReturn(1);
			when(repository.findSuccessCount(GAME_SESSION_ID, OTHER_PLAYER_ID)).thenReturn(0);
			when(repository.findCatExpiredCount(GAME_SESSION_ID)).thenReturn(0);
			when(repository.countScoredClearedCommands(GAME_SESSION_ID)).thenReturn(1);

			// when
			ContributionInputResult result = service.processInput(ROOM_ID, PLAYER_ID, request);

			// then
			assertThat(result.broadcast()).isTrue();
			assertThat(result.payload()).isInstanceOf(ScoreUpdateMessage.class);
			verify(repository).saveCommand(GAME_SESSION_ID, command.cleared(PLAYER_ID));
			verify(repository).incrementSuccessCount(GAME_SESSION_ID, PLAYER_ID);
		}

		@Test
		void 일반_명령어_중간에_줄바꿈이_있어도_정답으로_처리한다() {
			// given
			ContributionInputMessage request = input(3, "git push origin\n  main");
			ContributionCommandCache command = ContributionCommandCache.ready(3, "git push origin main", "main");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 3)).thenReturn(Optional.of(command));
			when(repository.findPosition(GAME_SESSION_ID, PLAYER_ID)).thenReturn(Optional.of("main"));
			when(repository.findCommands(GAME_SESSION_ID)).thenReturn(List.of(command));
			when(repository.findPlayers(GAME_SESSION_ID)).thenReturn(List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0),
				new ContributionPlayerCache(OTHER_PLAYER_ID, "alice", 0)));
			when(repository.findSuccessCount(GAME_SESSION_ID, PLAYER_ID)).thenReturn(1);
			when(repository.findSuccessCount(GAME_SESSION_ID, OTHER_PLAYER_ID)).thenReturn(0);
			when(repository.findCatExpiredCount(GAME_SESSION_ID)).thenReturn(0);
			when(repository.countScoredClearedCommands(GAME_SESSION_ID)).thenReturn(1);

			// when
			ContributionInputResult result = service.processInput(ROOM_ID, PLAYER_ID, request);

			// then
			assertThat(result.broadcast()).isTrue();
			assertThat(result.payload()).isInstanceOf(ScoreUpdateMessage.class);
			verify(repository).saveCommand(GAME_SESSION_ID, command.cleared(PLAYER_ID));
			verify(repository).incrementSuccessCount(GAME_SESSION_ID, PLAYER_ID);
		}

		@Test
		void 일반_명령어가_현재_브랜치와_다르면_점수를_갱신하지_않고_INVALID_BRANCH를_반환한다() {
			// given
			ContributionInputMessage request = input(1, "git commit -m 'fix'");
			ContributionCommandCache command = ContributionCommandCache.ready(1, "git commit -m 'fix'", "develop");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 1)).thenReturn(Optional.of(command));
			when(repository.findPosition(GAME_SESSION_ID, PLAYER_ID)).thenReturn(Optional.of("main"));

			// when
			ContributionInputResult result = service.processInput(ROOM_ID, PLAYER_ID, request);

			// then
			assertThat(result.broadcast()).isFalse();
			assertThat(result.payload()).isInstanceOf(ContributionInputFailedMessage.class);
			ContributionInputFailedMessage payload = (ContributionInputFailedMessage)result.payload();
			assertThat(payload.errorReason()).isEqualTo("INVALID_BRANCH");
			verify(repository, never()).saveCommand(GAME_SESSION_ID, command.cleared(PLAYER_ID));
			verify(repository, never()).incrementSuccessCount(GAME_SESSION_ID, PLAYER_ID);
		}

		@Test
		void 현재_브랜치의_가장_낮은_READY_명령어가_아니면_INVALID_COMMAND_ORDER를_반환한다() {
			// given
			ContributionInputMessage request = input(7, "git commit -m 'feat'");
			ContributionCommandCache command = ContributionCommandCache.ready(7, "git commit -m 'feat'", "develop");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(branchOrderSession()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 7)).thenReturn(Optional.of(command));
			when(repository.findPosition(GAME_SESSION_ID, PLAYER_ID)).thenReturn(Optional.of("develop"));
			when(repository.findCommands(GAME_SESSION_ID)).thenReturn(List.of(
				ContributionCommandCache.ready(3, "git add .", "develop"),
				command,
				ContributionCommandCache.ready(10, "git push origin develop", "develop"),
				ContributionCommandCache.ready(6, "git pull origin main", "main")));

			// when
			ContributionInputResult result = service.processInput(ROOM_ID, PLAYER_ID, request);

			// then
			assertThat(result.broadcast()).isFalse();
			assertThat(result.payload()).isInstanceOf(ContributionInputFailedMessage.class);
			ContributionInputFailedMessage payload = (ContributionInputFailedMessage)result.payload();
			assertThat(payload.errorReason()).isEqualTo("INVALID_COMMAND_ORDER");
			verify(repository, never()).saveCommand(GAME_SESSION_ID, command.cleared(PLAYER_ID));
			verify(repository, never()).incrementSuccessCount(GAME_SESSION_ID, PLAYER_ID);
		}

		@Test
		void 다른_브랜치의_낮은_READY_명령어는_현재_브랜치_정답을_막지_않는다() {
			// given
			ContributionInputMessage request = input(3, "git add .");
			ContributionCommandCache command = ContributionCommandCache.ready(3, "git add .", "develop");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(branchOrderSession()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 3)).thenReturn(Optional.of(command));
			when(repository.findPosition(GAME_SESSION_ID, PLAYER_ID)).thenReturn(Optional.of("develop"));
			when(repository.findCommands(GAME_SESSION_ID)).thenReturn(List.of(
				command,
				ContributionCommandCache.ready(6, "git pull origin main", "main"),
				ContributionCommandCache.ready(7, "git commit -m 'feat'", "develop")));
			when(repository.findPlayers(GAME_SESSION_ID)).thenReturn(List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0),
				new ContributionPlayerCache(OTHER_PLAYER_ID, "alice", 0)));
			when(repository.findSuccessCount(GAME_SESSION_ID, PLAYER_ID)).thenReturn(1);
			when(repository.findSuccessCount(GAME_SESSION_ID, OTHER_PLAYER_ID)).thenReturn(0);
			when(repository.findCatExpiredCount(GAME_SESSION_ID)).thenReturn(0);
			when(repository.countScoredClearedCommands(GAME_SESSION_ID)).thenReturn(1);

			// when
			ContributionInputResult result = service.processInput(ROOM_ID, PLAYER_ID, request);

			// then
			assertThat(result.broadcast()).isTrue();
			assertThat(result.payload()).isInstanceOf(ScoreUpdateMessage.class);
			verify(repository).saveCommand(GAME_SESSION_ID, command.cleared(PLAYER_ID));
			verify(repository).incrementSuccessCount(GAME_SESSION_ID, PLAYER_ID);
		}

		@Test
		void 같은_브랜치의_낮은_명령어가_이미_처리됐으면_다음_READY_명령어를_정답으로_처리한다() {
			// given
			ContributionInputMessage request = input(7, "git commit -m 'feat'");
			ContributionCommandCache command = ContributionCommandCache.ready(7, "git commit -m 'feat'", "develop");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(branchOrderSession()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 7)).thenReturn(Optional.of(command));
			when(repository.findPosition(GAME_SESSION_ID, PLAYER_ID)).thenReturn(Optional.of("develop"));
			when(repository.findCommands(GAME_SESSION_ID)).thenReturn(List.of(
				ContributionCommandCache.ready(3, "git add .", "develop").cleared(OTHER_PLAYER_ID),
				command,
				ContributionCommandCache.ready(10, "git push origin develop", "develop"),
				ContributionCommandCache.ready(6, "git pull origin main", "main")));
			when(repository.findPlayers(GAME_SESSION_ID)).thenReturn(List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0),
				new ContributionPlayerCache(OTHER_PLAYER_ID, "alice", 0)));
			when(repository.findSuccessCount(GAME_SESSION_ID, PLAYER_ID)).thenReturn(1);
			when(repository.findSuccessCount(GAME_SESSION_ID, OTHER_PLAYER_ID)).thenReturn(1);
			when(repository.findCatExpiredCount(GAME_SESSION_ID)).thenReturn(0);
			when(repository.countScoredClearedCommands(GAME_SESSION_ID)).thenReturn(2);

			// when
			ContributionInputResult result = service.processInput(ROOM_ID, PLAYER_ID, request);

			// then
			assertThat(result.broadcast()).isTrue();
			assertThat(result.payload()).isInstanceOf(ScoreUpdateMessage.class);
			verify(repository).saveCommand(GAME_SESSION_ID, command.cleared(PLAYER_ID));
			verify(repository).incrementSuccessCount(GAME_SESSION_ID, PLAYER_ID);
		}

		@Test
		void 같은_브랜치의_낮은_명령어가_만료됐으면_다음_READY_명령어를_정답으로_처리한다() {
			// given
			ContributionInputMessage request = input(7, "git commit -m 'feat'");
			ContributionCommandCache command = ContributionCommandCache.ready(7, "git commit -m 'feat'", "develop");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(branchOrderSession()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 7)).thenReturn(Optional.of(command));
			when(repository.findPosition(GAME_SESSION_ID, PLAYER_ID)).thenReturn(Optional.of("develop"));
			when(repository.findCommands(GAME_SESSION_ID)).thenReturn(List.of(
				ContributionCommandCache.ready(3, "git add .", "develop").expired(),
				command,
				ContributionCommandCache.ready(10, "git push origin develop", "develop"),
				ContributionCommandCache.ready(6, "git pull origin main", "main")));
			when(repository.findPlayers(GAME_SESSION_ID)).thenReturn(List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0),
				new ContributionPlayerCache(OTHER_PLAYER_ID, "alice", 0)));
			when(repository.findSuccessCount(GAME_SESSION_ID, PLAYER_ID)).thenReturn(1);
			when(repository.findSuccessCount(GAME_SESSION_ID, OTHER_PLAYER_ID)).thenReturn(0);
			when(repository.findCatExpiredCount(GAME_SESSION_ID)).thenReturn(1);
			when(repository.countScoredClearedCommands(GAME_SESSION_ID)).thenReturn(1);

			// when
			ContributionInputResult result = service.processInput(ROOM_ID, PLAYER_ID, request);

			// then
			assertThat(result.broadcast()).isTrue();
			assertThat(result.payload()).isInstanceOf(ScoreUpdateMessage.class);
			verify(repository).saveCommand(GAME_SESSION_ID, command.cleared(PLAYER_ID));
			verify(repository).incrementSuccessCount(GAME_SESSION_ID, PLAYER_ID);
		}

		@Test
		void switch_명령어는_commandSequence_없이_위치를_갱신하고_POSITION_UPDATE를_반환한다() {
			// given
			ContributionInputMessage request = switchInput("git\nswitch\n  feature/login\n");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.existsBranch(GAME_SESSION_ID, "feature/login")).thenReturn(true);

			// when
			ContributionInputResult result = service.processInput(ROOM_ID, PLAYER_ID, request);

			// then
			assertThat(result.broadcast()).isTrue();
			assertThat(result.payload()).isInstanceOf(PositionUpdateMessage.class);
			PositionUpdateMessage payload = (PositionUpdateMessage)result.payload();
			assertThat(payload.type()).isEqualTo("POSITION_UPDATE");
			assertThat(payload.branch()).isEqualTo("feature/login");
			verify(repository).updatePosition(GAME_SESSION_ID, PLAYER_ID, "feature/login");
			verify(repository, never()).findCommand(any(), anyInt());
			verify(repository, never()).saveCommand(any(), any());
			verify(repository, never()).incrementSuccessCount(GAME_SESSION_ID, PLAYER_ID);
		}

		@Test
		void switch_대상_브랜치가_없으면_개인_실패_메시지를_반환한다() {
			// given
			ContributionInputMessage request = switchInput("git switch missing");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.existsBranch(GAME_SESSION_ID, "missing")).thenReturn(false);

			// when
			ContributionInputResult result = service.processInput(ROOM_ID, PLAYER_ID, request);

			// then
			assertThat(result.broadcast()).isFalse();
			assertThat(result.payload()).isInstanceOf(ContributionInputFailedMessage.class);
			ContributionInputFailedMessage payload = (ContributionInputFailedMessage)result.payload();
			assertThat(payload.errorReason()).isEqualTo("INVALID_BRANCH");
		}

		@Test
		void checkout_명령어는_브랜치_이동으로_허용하지_않는다() {
			// given
			ContributionInputMessage request = switchInput("git checkout feature/payment");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);

			// when & then
			assertThatThrownBy(() -> service.processInput(ROOM_ID, PLAYER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting("errorCode")
				.isEqualTo(INVALID_COMMAND);
			verify(repository, never()).updatePosition(any(), any(), anyString());
		}

		@Test
		void 참가자가_아니면_PLAYER_NOT_IN_GAME_예외가_발생한다() {
			// given
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(false);

			// when & then
			assertThatThrownBy(() -> service.processInput(ROOM_ID, PLAYER_ID, input(1, "git commit -m 'fix'")))
				.isInstanceOf(BusinessException.class)
				.extracting("errorCode")
				.isEqualTo(PLAYER_NOT_IN_GAME);
		}

		@Test
		void 이탈_마킹된_플레이어는_PLAYER_NOT_IN_GAME_예외가_발생한다() {
			// given
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.isPlayerDisconnected(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);

			// when & then
			assertThatThrownBy(() -> service.processInput(ROOM_ID, PLAYER_ID, input(1, "git commit -m 'fix'")))
				.isInstanceOf(BusinessException.class)
				.extracting("errorCode")
				.isEqualTo(PLAYER_NOT_IN_GAME);
		}

		@Test
		void 이미_완료된_명령어면_COMMAND_ALREADY_CLEARED_예외가_발생한다() {
			// given
			ContributionCommandCache command = ContributionCommandCache.ready(1, "git commit -m 'fix'", "main")
				.cleared(OTHER_PLAYER_ID);
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 1)).thenReturn(Optional.of(command));

			// when & then
			assertThatThrownBy(() -> service.processInput(ROOM_ID, PLAYER_ID, input(1, "git commit -m 'fix'")))
				.isInstanceOf(BusinessException.class)
				.extracting("errorCode")
				.isEqualTo(COMMAND_ALREADY_CLEARED);
		}

		@Test
		void 입력_락을_획득하지_못하면_LOCK_ACQUISITION_FAILED_예외가_발생한다() throws Exception {
			// given
			when(lock.tryLock(anyLong(), any(TimeUnit.class))).thenReturn(false);
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);

			// when & then
			assertThatThrownBy(() -> service.processInput(ROOM_ID, PLAYER_ID, input(1, "git commit -m 'fix'")))
				.isInstanceOf(BusinessException.class)
				.extracting("errorCode")
				.isEqualTo(LOCK_ACQUISITION_FAILED);
		}

		@Test
		void 마지막_명령어_성공이면_SCORE_UPDATE_이후_GAME_END를_반환한다() {
			// given
			ContributionInputMessage request = input(1, "git commit -m 'fix'");
			ContributionCommandCache command = ContributionCommandCache.ready(1, "git commit -m 'fix'", "main");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(singleCommandSession()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 1)).thenReturn(Optional.of(command));
			when(repository.findCommands(GAME_SESSION_ID)).thenReturn(List.of(command));
			when(repository.findPlayers(GAME_SESSION_ID)).thenReturn(List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0),
				new ContributionPlayerCache(OTHER_PLAYER_ID, "alice", 0)));
			when(repository.findSuccessCount(GAME_SESSION_ID, PLAYER_ID)).thenReturn(1);
			when(repository.findSuccessCount(GAME_SESSION_ID, OTHER_PLAYER_ID)).thenReturn(0);
			when(repository.findCatExpiredCount(GAME_SESSION_ID)).thenReturn(0);
			when(repository.countScoredClearedCommands(GAME_SESSION_ID)).thenReturn(1);

			// when
			ContributionInputResult result = service.processInput(ROOM_ID, PLAYER_ID, request);

			// then
			assertThat(result.payloads()).hasSize(2);
			assertThat(result.payloads().get(0)).isInstanceOf(ScoreUpdateMessage.class);
			assertThat(result.payloads().get(1)).isInstanceOf(ContributionGameEndMessage.class);
			ContributionGameEndMessage end = (ContributionGameEndMessage)result.payloads().get(1);
			assertThat(end.isSuccess()).isTrue();
			assertThat(end.reason()).isEqualTo("GAME_COMPLETED");
			assertThat(end.winnerVideoTarget()).isEqualTo(PLAYER_ID);
			verify(contributionResultSaveService).saveCompletedResult(any(), any(), any(), anyLong());
			verify(contributionRankingService).updateContributionScore(PLAYER_ID, 100);
			verify(contributionRankingService).updateContributionScore(OTHER_PLAYER_ID, 0);
			verify(repository).markSessionEndedIfInProgress(GAME_SESSION_ID);
		}

		@Test
		void 결과_DB_저장_실패해도_GAME_END를_반환한다() {
			// given
			ContributionInputMessage request = input(1, "git commit -m 'fix'");
			ContributionCommandCache command = ContributionCommandCache.ready(1, "git commit -m 'fix'", "main");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(singleCommandSession()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 1)).thenReturn(Optional.of(command));
			when(repository.findCommands(GAME_SESSION_ID)).thenReturn(List.of(command));
			when(repository.findPlayers(GAME_SESSION_ID)).thenReturn(List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0)));
			when(repository.findSuccessCount(GAME_SESSION_ID, PLAYER_ID)).thenReturn(1);
			when(repository.findCatExpiredCount(GAME_SESSION_ID)).thenReturn(0);
			when(repository.countScoredClearedCommands(GAME_SESSION_ID)).thenReturn(1);
			doThrow(new RuntimeException("db down"))
				.when(contributionResultSaveService)
				.saveCompletedResult(any(), any(), any(), anyLong());

			// when
			ContributionInputResult result = service.processInput(ROOM_ID, PLAYER_ID, request);

			// then
			assertThat(result.payloads()).hasSize(2);
			assertThat(result.payloads().get(1)).isInstanceOf(ContributionGameEndMessage.class);
			verify(repository).markSessionEndedIfInProgress(GAME_SESSION_ID);
			verify(contributionRankingService, never()).updateContributionScore(any(), anyInt());
		}

		@Test
		void 랭킹_Redis_갱신_실패해도_GAME_END를_반환한다() {
			// given
			ContributionInputMessage request = input(1, "git commit -m 'fix'");
			ContributionCommandCache command = ContributionCommandCache.ready(1, "git commit -m 'fix'", "main");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(singleCommandSession()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 1)).thenReturn(Optional.of(command));
			when(repository.findCommands(GAME_SESSION_ID)).thenReturn(List.of(command));
			when(repository.findPlayers(GAME_SESSION_ID)).thenReturn(List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0)));
			when(repository.findSuccessCount(GAME_SESSION_ID, PLAYER_ID)).thenReturn(1);
			when(repository.findCatExpiredCount(GAME_SESSION_ID)).thenReturn(0);
			when(repository.countScoredClearedCommands(GAME_SESSION_ID)).thenReturn(1);
			doThrow(new RuntimeException("redis down"))
				.when(contributionRankingService)
				.updateContributionScore(PLAYER_ID, 100);

			// when
			ContributionInputResult result = service.processInput(ROOM_ID, PLAYER_ID, request);

			// then
			assertThat(result.payloads()).hasSize(2);
			assertThat(result.payloads().get(1)).isInstanceOf(ContributionGameEndMessage.class);
			verify(contributionResultSaveService).saveCompletedResult(any(), any(), any(), anyLong());
			verify(contributionRankingService).updateContributionScore(PLAYER_ID, 100);
		}

		@Test
		void 이미_종료_확정된_세션이면_GAME_END를_추가로_반환하지_않는다() {
			// given
			ContributionInputMessage request = input(1, "git commit -m 'fix'");
			ContributionCommandCache command = ContributionCommandCache.ready(1, "git commit -m 'fix'", "main");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(singleCommandSession()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 1)).thenReturn(Optional.of(command));
			when(repository.findCommands(GAME_SESSION_ID)).thenReturn(List.of(command));
			when(repository.findPlayers(GAME_SESSION_ID)).thenReturn(List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0)));
			when(repository.findSuccessCount(GAME_SESSION_ID, PLAYER_ID)).thenReturn(1);
			when(repository.findCatExpiredCount(GAME_SESSION_ID)).thenReturn(0);
			when(repository.countScoredClearedCommands(GAME_SESSION_ID)).thenReturn(1);
			when(repository.markSessionEndedIfInProgress(GAME_SESSION_ID)).thenReturn(false);

			// when
			ContributionInputResult result = service.processInput(ROOM_ID, PLAYER_ID, request);

			// then
			assertThat(result.payloads()).hasSize(1);
			assertThat(result.payloads().get(0)).isInstanceOf(ScoreUpdateMessage.class);
			verify(repository, never()).saveFinalRankings(any(), any());
			verify(contributionResultSaveService, never()).saveCompletedResult(any(), any(), any(), anyLong());
		}

		@Test
		void 동점이면_동일_순위를_부여하고_다음_순위는_건너뛴다() {
			// given
			ContributionInputMessage request = input(2, "git push");
			ContributionCommandCache command = ContributionCommandCache.ready(2, "git push", "main");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(twoCommandSession()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 2)).thenReturn(Optional.of(command));
			when(repository.findCommands(GAME_SESSION_ID)).thenReturn(List.of(command));
			when(repository.findPlayers(GAME_SESSION_ID)).thenReturn(List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0),
				new ContributionPlayerCache(OTHER_PLAYER_ID, "alice", 0)));
			when(repository.findSuccessCount(GAME_SESSION_ID, PLAYER_ID)).thenReturn(1);
			when(repository.findSuccessCount(GAME_SESSION_ID, OTHER_PLAYER_ID)).thenReturn(1);
			when(repository.findCatExpiredCount(GAME_SESSION_ID)).thenReturn(0);
			when(repository.countScoredClearedCommands(GAME_SESSION_ID)).thenReturn(2);

			// when
			ContributionInputResult result = service.processInput(ROOM_ID, PLAYER_ID, request);

			// then
			ContributionGameEndMessage end = (ContributionGameEndMessage)result.payloads().get(1);
			assertThat(end.rankings())
				.filteredOn(ranking -> ranking.contribution() == 50)
				.allSatisfy(ranking -> assertThat(ranking.rank()).isEqualTo(1));
			assertThat(end.rankings())
				.filteredOn(ranking -> ranking.playerId() == null)
				.singleElement()
				.satisfies(ranking -> assertThat(ranking.rank()).isEqualTo(3));
		}

		@Test
		void 종료_이후_입력은_GAME_ALREADY_ENDED로_거절된다() {
			// given
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(singleCommandSession().ended()));

			// when & then
			assertThatThrownBy(() -> service.processInput(ROOM_ID, PLAYER_ID, input(1, "git commit -m 'fix'")))
				.isInstanceOf(BusinessException.class)
				.extracting("errorCode")
				.isEqualTo(GAME_ALREADY_ENDED);
		}
	}

	@Nested
	class ProcessExpireRequest {

		@Test
		void 명령어가_만료되면_CAT_기여도가_증가하고_COMMAND_EXPIRED를_반환한다() {
			// given
			ContributionCommandCache command = ContributionCommandCache.ready(1, "git commit -m 'fix'", "main");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 1)).thenReturn(Optional.of(command));
			when(repository.countScoredClearedCommands(GAME_SESSION_ID)).thenReturn(0);
			when(repository.findCatExpiredCount(GAME_SESSION_ID)).thenReturn(1);
			when(repository.findPlayers(GAME_SESSION_ID)).thenReturn(List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0),
				new ContributionPlayerCache(OTHER_PLAYER_ID, "alice", 0)));
			when(repository.findSuccessCount(GAME_SESSION_ID, PLAYER_ID)).thenReturn(0);
			when(repository.findSuccessCount(GAME_SESSION_ID, OTHER_PLAYER_ID)).thenReturn(0);

			// when
			ContributionInputResult result = service.processExpireRequest(ROOM_ID, PLAYER_ID, expireRequest(1));

			// then
			assertThat(result.broadcast()).isTrue();
			Object payload = result.payload();
			assertThat(payload).isInstanceOf(CommandExpiredMessage.class);
			CommandExpiredMessage expired = (CommandExpiredMessage)payload;
			assertThat(expired.scores()).anySatisfy(score -> {
				assertThat(score.playerId()).isNull();
				assertThat(score.nickname()).isEqualTo("[CAT]");
				assertThat(score.contribution()).isEqualTo(100);
			});
			assertThat(expired.progress().current()).isEqualTo(1);
			verify(repository).saveCommand(GAME_SESSION_ID, command.expired());
			verify(repository).incrementCatExpiredCount(GAME_SESSION_ID);
		}

		@Test
		void 성공_처리된_명령어는_만료되지_않는다() {
			// given
			ContributionCommandCache command = ContributionCommandCache.ready(1, "git commit -m 'fix'", "main")
				.cleared(PLAYER_ID);
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 1)).thenReturn(Optional.of(command));

			// when
			ContributionInputResult result = service.processExpireRequest(ROOM_ID, PLAYER_ID, expireRequest(1));

			// then
			assertThat(result).isNull();
			verify(repository, never()).incrementCatExpiredCount(GAME_SESSION_ID);
		}

		@Test
		void 같은_명령어_만료_요청이_중복되면_CAT은_한번만_증가한다() {
			// given
			ContributionCommandCache command = ContributionCommandCache.ready(1, "git commit -m 'fix'", "main")
				.expired();
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 1)).thenReturn(Optional.of(command));

			// when
			ContributionInputResult result = service.processExpireRequest(ROOM_ID, PLAYER_ID, expireRequest(1));

			// then
			assertThat(result).isNull();
			verify(repository, never()).incrementCatExpiredCount(GAME_SESSION_ID);
			verify(repository, never()).saveCommand(any(), any());
		}

		@Test
		void 마지막_명령어_만료이면_GAME_END만_반환한다() {
			// given
			ContributionCommandCache command = ContributionCommandCache.ready(1, "git commit -m 'fix'", "main");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(singleCommandSession()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 1)).thenReturn(Optional.of(command));
			when(repository.countScoredClearedCommands(GAME_SESSION_ID)).thenReturn(0);
			when(repository.findCatExpiredCount(GAME_SESSION_ID)).thenReturn(1);
			when(repository.findPlayers(GAME_SESSION_ID)).thenReturn(List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0)));
			when(repository.findSuccessCount(GAME_SESSION_ID, PLAYER_ID)).thenReturn(0);

			// when
			ContributionInputResult result = service.processExpireRequest(ROOM_ID, PLAYER_ID, expireRequest(1));

			// then
			assertThat(result.broadcast()).isTrue();
			Object payload = result.payload();
			assertThat(payload).isInstanceOf(ContributionGameEndMessage.class);
			ContributionGameEndMessage end = (ContributionGameEndMessage)payload;
			assertThat(end.isSuccess()).isTrue();
			assertThat(end.reason()).isEqualTo("GAME_COMPLETED");
			verify(contributionResultSaveService).saveCompletedResult(any(), any(), any(), anyLong());
			verify(contributionRankingService).updateContributionScore(PLAYER_ID, 0);
			verify(contributionRankingService, never()).updateContributionScore(isNull(), anyInt());
			verify(repository).markSessionEndedIfInProgress(GAME_SESSION_ID);
		}

		@Test
		void CAT이_1등이면_winnerVideoTarget은_null이다() {
			// given
			ContributionCommandCache command = ContributionCommandCache.ready(1, "git commit -m 'fix'", "main");
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(singleCommandSession()));
			when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.findCommand(GAME_SESSION_ID, 1)).thenReturn(Optional.of(command));
			when(repository.countScoredClearedCommands(GAME_SESSION_ID)).thenReturn(0);
			when(repository.findCatExpiredCount(GAME_SESSION_ID)).thenReturn(1);
			when(repository.findPlayers(GAME_SESSION_ID)).thenReturn(List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0)));
			when(repository.findSuccessCount(GAME_SESSION_ID, PLAYER_ID)).thenReturn(0);

			// when
			ContributionInputResult result = service.processExpireRequest(ROOM_ID, PLAYER_ID, expireRequest(1));
			ContributionGameEndMessage end = (ContributionGameEndMessage)result.payload();

			// then
			assertThat(end.winnerVideoTarget()).isNull();
		}
	}

	@Nested
	class EndByPlayerDisconnected {

		@Test
		void 종료된_세션은_이탈_종료_메시지를_반환하지_않는다() {
			// given
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(singleCommandSession().ended()));
			when(repository.markSessionEndedIfInProgress(GAME_SESSION_ID)).thenReturn(false);

			// when
			ContributionGameEndMessage result = service.endByPlayerDisconnected(ROOM_ID, GAME_SESSION_ID);

			// then
			assertThat(result).isNull();
			verify(repository, never()).markSessionEnded(GAME_SESSION_ID);
		}
	}

	@Nested
	class HandlePlayerDisconnected {

		@Test
		void 이탈자를_마킹하고_disconnected_true_상태를_브로드캐스트한다() {
			// given
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
			when(repository.countScoredClearedCommands(GAME_SESSION_ID)).thenReturn(1);
			when(repository.findCatExpiredCount(GAME_SESSION_ID)).thenReturn(0);
			when(repository.findPlayers(GAME_SESSION_ID)).thenReturn(List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0),
				new ContributionPlayerCache(OTHER_PLAYER_ID, "alice", 0)));
			when(repository.findSuccessCount(GAME_SESSION_ID, PLAYER_ID)).thenReturn(1);
			when(repository.findSuccessCount(GAME_SESSION_ID, OTHER_PLAYER_ID)).thenReturn(0);
			when(repository.isPlayerDisconnected(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
			when(repository.markPlayerDisconnected(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);

			// when
			ContributionInputResult result = service.handlePlayerDisconnected(GAME_SESSION_ID, PLAYER_ID);

			// then
			assertThat(result.broadcast()).isTrue();
			assertThat(result.payload()).isInstanceOf(ContributionPlayerDisconnectedMessage.class);
			ContributionPlayerDisconnectedMessage payload = (ContributionPlayerDisconnectedMessage)result.payload();
			assertThat(payload.type()).isEqualTo("CONTRIBUTION_PLAYER_DISCONNECTED");
			assertThat(payload.disconnectedPlayerId()).isEqualTo(PLAYER_ID);
			assertThat(payload.scores())
				.filteredOn(score -> PLAYER_ID.equals(score.playerId()))
				.singleElement()
				.satisfies(score -> assertThat(score.disconnected()).isTrue());
			verify(repository).markPlayerDisconnected(GAME_SESSION_ID, PLAYER_ID);
		}

		@Test
		void 이미_이탈_마킹된_플레이어면_disconnected_이벤트를_브로드캐스트하지_않는다() {
			// given
			when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
			when(repository.markPlayerDisconnected(GAME_SESSION_ID, PLAYER_ID)).thenReturn(false);

			// when
			ContributionInputResult result = service.handlePlayerDisconnected(GAME_SESSION_ID, PLAYER_ID);

			// then
			assertThat(result).isNull();
			verify(repository).markPlayerDisconnected(GAME_SESSION_ID, PLAYER_ID);
			verify(repository, never()).countScoredClearedCommands(any());
			verify(repository, never()).findPlayers(any());
		}
	}

	private ContributionInputMessage input(int commandSequence, String inputText) {
		return new ContributionInputMessage(
			"CONTRIBUTION_INPUT",
			REQUEST_ID,
			GAME_SESSION_ID,
			commandSequence,
			inputText);
	}

	private ContributionInputMessage switchInput(String inputText) {
		return new ContributionInputMessage(
			"CONTRIBUTION_INPUT",
			REQUEST_ID,
			GAME_SESSION_ID,
			null,
			inputText);
	}

	private ContributionExpireRequestMessage expireRequest(int commandSequence) {
		return new ContributionExpireRequestMessage(
			"COMMAND_EXPIRE_REQUEST",
			REQUEST_ID,
			GAME_SESSION_ID,
			commandSequence);
	}

	private ContributionGameSessionCache session() {
		return ContributionGameSessionCache.inProgress(
			ROOM_ID,
			GAME_SESSION_ID,
			1,
			System.currentTimeMillis(),
			"main",
			List.of(
				ContributionCommandCache.ready(1, "git commit -m 'fix'", "main"),
				ContributionCommandCache.ready(2, "git switch feature/login", "main"),
				ContributionCommandCache.ready(3, "git push", "main")),
			List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0),
				new ContributionPlayerCache(OTHER_PLAYER_ID, "alice", 0)));
	}

	private ContributionGameSessionCache branchOrderSession() {
		return ContributionGameSessionCache.inProgress(
			ROOM_ID,
			GAME_SESSION_ID,
			1,
			System.currentTimeMillis(),
			"main",
			List.of(
				ContributionCommandCache.ready(3, "git add .", "develop"),
				ContributionCommandCache.ready(6, "git pull origin main", "main"),
				ContributionCommandCache.ready(7, "git commit -m 'feat'", "develop"),
				ContributionCommandCache.ready(8, "git merge develop", "main"),
				ContributionCommandCache.ready(9, "git push origin main", "main"),
				ContributionCommandCache.ready(10, "git push origin develop", "develop")),
			List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0),
				new ContributionPlayerCache(OTHER_PLAYER_ID, "alice", 0)));
	}

	private ContributionGameSessionCache singleCommandSession() {
		return ContributionGameSessionCache.inProgress(
			ROOM_ID,
			GAME_SESSION_ID,
			1,
			System.currentTimeMillis(),
			"main",
			List.of(ContributionCommandCache.ready(1, "git commit -m 'fix'", "main")),
			List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0),
				new ContributionPlayerCache(OTHER_PLAYER_ID, "alice", 0)));
	}

	private ContributionGameSessionCache twoCommandSession() {
		return ContributionGameSessionCache.inProgress(
			ROOM_ID,
			GAME_SESSION_ID,
			1,
			System.currentTimeMillis(),
			"main",
			List.of(
				ContributionCommandCache.ready(1, "git commit -m 'init'", "main"),
				ContributionCommandCache.ready(2, "git push", "main")),
			List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0),
				new ContributionPlayerCache(OTHER_PLAYER_ID, "alice", 0)));
	}
}

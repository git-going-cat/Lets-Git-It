package com.gitcat.letsgitit.domain.competitive.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.COMMAND_ALREADY_CLEARED;
import static com.gitcat.letsgitit.global.exception.ErrorCode.LOCK_ACQUISITION_FAILED;
import static com.gitcat.letsgitit.global.exception.ErrorCode.PLAYER_NOT_IN_GAME;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;

import com.gitcat.letsgitit.domain.competitive.dto.ContributionCommandCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionGameSessionCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionInputResult;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionPlayerCache;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionInputFailedMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionInputMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.PositionUpdateMessage;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ScoreUpdateMessage;
import com.gitcat.letsgitit.domain.competitive.repository.ContributionGameRedisRepository;
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

	private ContributionGameServiceImpl service;

	@BeforeEach
	void setUp() {
		MockitoAnnotations.openMocks(this);
		service = new ContributionGameServiceImpl(repository, redissonClient);
		when(redissonClient.getLock(anyString())).thenReturn(lock);
		try {
			when(lock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(true);
		} catch (InterruptedException e) {
			throw new IllegalStateException(e);
		}
	}

	@Test
	void 일반_명령어_정답이면_점수를_갱신하고_SCORE_UPDATE를_반환한다() {
		// given
		ContributionInputMessage request = input(1, "git commit -m 'fix'");
		ContributionCommandCache command = ContributionCommandCache.ready(1, "git commit -m 'fix'", "main");
		when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
		when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
		when(repository.findCommand(GAME_SESSION_ID, 1)).thenReturn(Optional.of(command));
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
		assertThat(payload.progress().total()).isEqualTo(1);
		assertThat(payload.progress().percent()).isEqualTo(100);
		verify(repository).saveCommand(GAME_SESSION_ID, command.cleared(PLAYER_ID));
		verify(repository).incrementSuccessCount(GAME_SESSION_ID, PLAYER_ID);
	}

	@Test
	void switch_명령어_정답이면_위치를_갱신하고_POSITION_UPDATE를_반환한다() {
		// given
		ContributionInputMessage request = input(2, "git switch feature/login");
		ContributionCommandCache command = ContributionCommandCache.ready(2, "git switch feature/login", "main");
		when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
		when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
		when(repository.findCommand(GAME_SESSION_ID, 2)).thenReturn(Optional.of(command));
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
		verify(repository).saveCommand(GAME_SESSION_ID, command.switched(PLAYER_ID));
		verify(repository, never()).incrementSuccessCount(GAME_SESSION_ID, PLAYER_ID);
	}

	@Test
	void switch_대상_브랜치가_없으면_개인_실패_메시지를_반환한다() {
		// given
		ContributionInputMessage request = input(2, "git switch missing");
		ContributionCommandCache command = ContributionCommandCache.ready(2, "git switch missing", "main");
		when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
		when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
		when(repository.findCommand(GAME_SESSION_ID, 2)).thenReturn(Optional.of(command));
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
	void switch_명령어가_다른_유효_브랜치로_입력되면_WRONG_COMMAND를_반환한다() {
		// given
		ContributionInputMessage request = input(2, "git switch feature/payment");
		ContributionCommandCache command = ContributionCommandCache.ready(2, "git switch feature/login", "main");
		when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
		when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
		when(repository.findCommand(GAME_SESSION_ID, 2)).thenReturn(Optional.of(command));

		// when
		ContributionInputResult result = service.processInput(ROOM_ID, PLAYER_ID, request);

		// then
		assertThat(result.broadcast()).isFalse();
		assertThat(result.payload()).isInstanceOf(ContributionInputFailedMessage.class);
		ContributionInputFailedMessage payload = (ContributionInputFailedMessage)result.payload();
		assertThat(payload.errorReason()).isEqualTo("WRONG_COMMAND");
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
	void 이미_switch_처리된_명령어면_COMMAND_ALREADY_CLEARED_예외가_발생한다() {
		// given
		ContributionCommandCache command = ContributionCommandCache.ready(2, "git switch feature/login", "main")
			.switched(OTHER_PLAYER_ID);
		when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
		when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);
		when(repository.findCommand(GAME_SESSION_ID, 2)).thenReturn(Optional.of(command));

		// when & then
		assertThatThrownBy(() -> service.processInput(ROOM_ID, PLAYER_ID, input(2, "git switch feature/login")))
			.isInstanceOf(BusinessException.class)
			.extracting("errorCode")
			.isEqualTo(COMMAND_ALREADY_CLEARED);
	}

	@Test
	void 입력_락을_획득하지_못하면_LOCK_ACQUISITION_FAILED_예외가_발생한다() throws Exception {
		// given
		when(lock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).thenReturn(false);
		when(repository.findSession(GAME_SESSION_ID)).thenReturn(Optional.of(session()));
		when(repository.existsPlayer(GAME_SESSION_ID, PLAYER_ID)).thenReturn(true);

		// when & then
		assertThatThrownBy(() -> service.processInput(ROOM_ID, PLAYER_ID, input(1, "git commit -m 'fix'")))
			.isInstanceOf(BusinessException.class)
			.extracting("errorCode")
			.isEqualTo(LOCK_ACQUISITION_FAILED);
	}

	private ContributionInputMessage input(int commandSequence, String inputText) {
		return new ContributionInputMessage(
			"CONTRIBUTION_INPUT",
			REQUEST_ID,
			GAME_SESSION_ID,
			commandSequence,
			inputText);
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
				ContributionCommandCache.ready(2, "git switch feature/login", "main")),
			List.of(
				new ContributionPlayerCache(PLAYER_ID, "dobby", 0),
				new ContributionPlayerCache(OTHER_PLAYER_ID, "alice", 0)));
	}
}

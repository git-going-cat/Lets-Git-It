package com.gitcat.letsgitit.domain.coop.service;

import static com.gitcat.letsgitit.domain.coop.constants.CoopConstants.*;
import static com.gitcat.letsgitit.global.exception.ErrorCode.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionTemplate;

import com.gitcat.letsgitit.domain.coop.dto.request.CoopInputRequest;
import com.gitcat.letsgitit.domain.coop.dto.request.CoopResetRequest;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopGameEndResponse;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopInputCorrectResponse;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopInputWrongResponse;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopOrderWrongResponse;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopResetWrongResponse;
import com.gitcat.letsgitit.domain.coop.repository.CoopCommandSetItemRepository;
import com.gitcat.letsgitit.domain.coop.repository.CoopGameRedisRepository;
import com.gitcat.letsgitit.domain.coop.repository.CoopResultMemberRepository;
import com.gitcat.letsgitit.domain.coop.repository.CoopResultRepository;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.room.service.RoomService;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.websocket.WebSocketMessageSender;

@ExtendWith(MockitoExtension.class)
class CoopGameServiceImplTest {

	private static final Long ROOM_ID = 1L;
	private static final UUID GAME_SESSION_ID = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001");
	private static final UUID MEMBER_ID = UUID.fromString("bbbbbbbb-0000-0000-0000-000000000002");
	private static final UUID REQUEST_ID = UUID.fromString("cccccccc-0000-0000-0000-000000000003");

	@InjectMocks
	private CoopGameServiceImpl coopGameService;

	@Mock
	private CoopCommandSetItemRepository commandSetItemRepository;

	@Mock
	private CoopGameRedisRepository coopGameRedisRepository;

	@Mock
	private CoopResultRepository coopResultRepository;

	@Mock
	private CoopResultMemberRepository coopResultMemberRepository;

	@Mock
	private MemberService memberService;

	@Mock
	private WebSocketMessageSender messageSender;

	@Mock
	private RedissonClient redissonClient;

	@Mock
	private TaskScheduler taskScheduler;

	@Mock
	private TransactionTemplate transactionTemplate;

	@Mock
	private RoomService roomService;

	@Mock
	private RLock rLock;

	// @Lazy @Autowired 필드는 @RequiredArgsConstructor 생성자에 없으므로
	// Mockito @InjectMocks가 생성자 주입 성공 후 필드 주입을 건너뜀 → roomService는 null
	// ReflectionTestUtils.setField()로 직접 주입
	@BeforeEach
	void setUp() {
		ReflectionTestUtils.setField(coopGameService, "roomService", roomService);
	}

	// ── processInput ──────────────────────────────────────────────────────────

	@Nested
	class ProcessInput {

		@Test
		void 게임_세션이_없으면_GAME_ALREADY_ENDED를_던진다() {
			given(coopGameRedisRepository.findGameSessionIdByRoomId(ROOM_ID)).willReturn(null);

			CoopInputRequest request = new CoopInputRequest("COOP_INPUT", REQUEST_ID, "git add .");

			assertThatThrownBy(() -> coopGameService.processInput(ROOM_ID, MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(GAME_ALREADY_ENDED);
		}

		@Test
		void 락_획득_실패_시_LOCK_ACQUISITION_FAILED를_던진다() throws InterruptedException {
			given(coopGameRedisRepository.findGameSessionIdByRoomId(ROOM_ID)).willReturn(GAME_SESSION_ID);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(rLock.tryLock(anyLong(), anyLong(), any(TimeUnit.class))).willReturn(false);

			CoopInputRequest request = new CoopInputRequest("COOP_INPUT", REQUEST_ID, "git add .");

			assertThatThrownBy(() -> coopGameService.processInput(ROOM_ID, MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(LOCK_ACQUISITION_FAILED);
		}

		@Test
		void 게임이_비활성_상태면_GAME_ALREADY_ENDED를_던진다() throws InterruptedException {
			givenInputLockAcquired();
			given(coopGameRedisRepository.findGameSessionIdByRoomId(ROOM_ID)).willReturn(GAME_SESSION_ID);
			given(coopGameRedisRepository.isGameActive(GAME_SESSION_ID)).willReturn(false);

			CoopInputRequest request = new CoopInputRequest("COOP_INPUT", REQUEST_ID, "git add .");

			assertThatThrownBy(() -> coopGameService.processInput(ROOM_ID, MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(GAME_ALREADY_ENDED);
		}

		@Test
		void 게임이_블록된_상태면_INPUT_BLOCKED를_던진다() throws InterruptedException {
			givenInputLockAcquired();
			given(coopGameRedisRepository.findGameSessionIdByRoomId(ROOM_ID)).willReturn(GAME_SESSION_ID);
			given(coopGameRedisRepository.isGameActive(GAME_SESSION_ID)).willReturn(true);
			given(coopGameRedisRepository.isBlocked(GAME_SESSION_ID)).willReturn(true);

			CoopInputRequest request = new CoopInputRequest("COOP_INPUT", REQUEST_ID, "git add .");

			assertThatThrownBy(() -> coopGameService.processInput(ROOM_ID, MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(INPUT_BLOCKED);
		}

		@Test
		void 오타를_입력하면_COOP_INPUT_WRONG을_전송하고_wrongType을_증가시킨다() throws InterruptedException {
			givenInputLockAcquired();
			given(coopGameRedisRepository.findGameSessionIdByRoomId(ROOM_ID)).willReturn(GAME_SESSION_ID);
			given(coopGameRedisRepository.isGameActive(GAME_SESSION_ID)).willReturn(true);
			given(coopGameRedisRepository.isBlocked(GAME_SESSION_ID)).willReturn(false);
			given(coopGameRedisRepository.getCompletedCount(GAME_SESSION_ID)).willReturn(0);
			given(coopGameRedisRepository.getCommandByOrder(GAME_SESSION_ID, 1, 1)).willReturn("git add .");
			given(coopGameRedisRepository.getAssignedCommand(GAME_SESSION_ID, 1, MEMBER_ID)).willReturn("git add .");

			CoopInputRequest request = new CoopInputRequest("COOP_INPUT", REQUEST_ID, "git addd .");

			coopGameService.processInput(ROOM_ID, MEMBER_ID, request);

			then(coopGameRedisRepository).should().incrementWrongType(GAME_SESSION_ID, MEMBER_ID);
			then(coopGameRedisRepository).should(never()).block(any(), any());

			ArgumentCaptor<CoopInputWrongResponse> captor = ArgumentCaptor.forClass(CoopInputWrongResponse.class);
			then(messageSender).should().sendToUser(eq(MEMBER_ID.toString()), captor.capture());
			assertThat(captor.getValue().type()).isEqualTo("COOP_INPUT_WRONG");
			assertThat(captor.getValue().playerId()).isEqualTo(MEMBER_ID);
		}

		@Test
		void 내_배정_명령어를_정확히_입력했지만_내_차례가_아니면_블록하고_COOP_ORDER_WRONG을_브로드캐스트한다()
			throws InterruptedException {
			givenInputLockAcquired();
			given(coopGameRedisRepository.findGameSessionIdByRoomId(ROOM_ID)).willReturn(GAME_SESSION_ID);
			given(coopGameRedisRepository.isGameActive(GAME_SESSION_ID)).willReturn(true);
			given(coopGameRedisRepository.isBlocked(GAME_SESSION_ID)).willReturn(false);
			given(coopGameRedisRepository.getCompletedCount(GAME_SESSION_ID)).willReturn(0);
			given(coopGameRedisRepository.getCommandByOrder(GAME_SESSION_ID, 1, 1)).willReturn("git add .");
			given(coopGameRedisRepository.getAssignedCommand(GAME_SESSION_ID, 1, MEMBER_ID)).willReturn("git commit");
			given(memberService.getNicknameById(MEMBER_ID)).willReturn("dobby");

			CoopInputRequest request = new CoopInputRequest("COOP_INPUT", REQUEST_ID, "git commit");

			coopGameService.processInput(ROOM_ID, MEMBER_ID, request);

			then(coopGameRedisRepository).should().block(GAME_SESSION_ID, MEMBER_ID);
			then(coopGameRedisRepository).should().incrementWrongOrder(GAME_SESSION_ID, MEMBER_ID);
			then(coopGameRedisRepository).should(never()).incrementWrongType(any(), any());

			ArgumentCaptor<CoopOrderWrongResponse> captor = ArgumentCaptor.forClass(CoopOrderWrongResponse.class);
			then(messageSender).should().send(eq("/topic/room/" + ROOM_ID + "/coop"), captor.capture());
			assertThat(captor.getValue().type()).isEqualTo("COOP_ORDER_WRONG");
			assertThat(captor.getValue().resetTargetPlayerId()).isEqualTo(MEMBER_ID);
		}

		@Test
		void 정확히_입력하고_내_차례면_COOP_INPUT_CORRECT를_브로드캐스트한다() throws InterruptedException {
			givenInputLockAcquired();
			given(coopGameRedisRepository.findGameSessionIdByRoomId(ROOM_ID)).willReturn(GAME_SESSION_ID);
			given(coopGameRedisRepository.isGameActive(GAME_SESSION_ID)).willReturn(true);
			given(coopGameRedisRepository.isBlocked(GAME_SESSION_ID)).willReturn(false);
			given(coopGameRedisRepository.getCompletedCount(GAME_SESSION_ID)).willReturn(0);
			given(coopGameRedisRepository.getCommandByOrder(GAME_SESSION_ID, 1, 1)).willReturn("git add .");
			given(coopGameRedisRepository.getAssignedCommand(GAME_SESSION_ID, 1, MEMBER_ID)).willReturn("git add .");
			given(coopGameRedisRepository.incrementCompletedCount(GAME_SESSION_ID)).willReturn(1);

			CoopInputRequest request = new CoopInputRequest("COOP_INPUT", REQUEST_ID, "git add .");

			coopGameService.processInput(ROOM_ID, MEMBER_ID, request);

			then(coopGameRedisRepository).should(never()).block(any(), any());
			then(coopGameRedisRepository).should(never()).incrementWrongType(any(), any());
			then(coopGameRedisRepository).should(never()).incrementWrongOrder(any(), any());

			ArgumentCaptor<CoopInputCorrectResponse> captor = ArgumentCaptor.forClass(CoopInputCorrectResponse.class);
			then(messageSender).should().send(eq("/topic/room/" + ROOM_ID + "/coop"), captor.capture());
			assertThat(captor.getValue().type()).isEqualTo("COOP_INPUT_CORRECT");
			assertThat(captor.getValue().sequence()).isEqualTo(1);
			assertThat(captor.getValue().round()).isEqualTo(1);
		}
	}

	// ── processReset ──────────────────────────────────────────────────────────

	@Nested
	class ProcessReset {

		@Test
		void 게임_세션이_없으면_GAME_ALREADY_ENDED를_던진다() {
			given(coopGameRedisRepository.findGameSessionIdByRoomId(ROOM_ID)).willReturn(null);

			CoopResetRequest request = new CoopResetRequest("COOP_RESET", REQUEST_ID, GIT_RESET_COMMAND);

			assertThatThrownBy(() -> coopGameService.processReset(ROOM_ID, MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(GAME_ALREADY_ENDED);
		}

		@Test
		void 게임이_비활성_상태면_GAME_ALREADY_ENDED를_던진다() throws InterruptedException {
			givenResetLockAcquired();
			given(coopGameRedisRepository.findGameSessionIdByRoomId(ROOM_ID)).willReturn(GAME_SESSION_ID);
			given(coopGameRedisRepository.isGameActive(GAME_SESSION_ID)).willReturn(false);

			CoopResetRequest request = new CoopResetRequest("COOP_RESET", REQUEST_ID, GIT_RESET_COMMAND);

			assertThatThrownBy(() -> coopGameService.processReset(ROOM_ID, MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(GAME_ALREADY_ENDED);
		}

		@Test
		void 게임이_블록_상태가_아니면_RESET_NOT_REQUIRED를_던진다() throws InterruptedException {
			givenResetLockAcquired();
			given(coopGameRedisRepository.findGameSessionIdByRoomId(ROOM_ID)).willReturn(GAME_SESSION_ID);
			given(coopGameRedisRepository.isGameActive(GAME_SESSION_ID)).willReturn(true);
			given(coopGameRedisRepository.isBlocked(GAME_SESSION_ID)).willReturn(false);

			CoopResetRequest request = new CoopResetRequest("COOP_RESET", REQUEST_ID, GIT_RESET_COMMAND);

			assertThatThrownBy(() -> coopGameService.processReset(ROOM_ID, MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(RESET_NOT_REQUIRED);
		}

		@Test
		void 리셋_대상이_아닌_플레이어가_요청하면_NOT_RESET_PLAYER를_던진다() throws InterruptedException {
			UUID otherPlayerId = UUID.fromString("dddddddd-0000-0000-0000-000000000004");
			givenResetLockAcquired();
			given(coopGameRedisRepository.findGameSessionIdByRoomId(ROOM_ID)).willReturn(GAME_SESSION_ID);
			given(coopGameRedisRepository.isGameActive(GAME_SESSION_ID)).willReturn(true);
			given(coopGameRedisRepository.isBlocked(GAME_SESSION_ID)).willReturn(true);
			given(coopGameRedisRepository.getResetTargetPlayerId(GAME_SESSION_ID)).willReturn(otherPlayerId);

			CoopResetRequest request = new CoopResetRequest("COOP_RESET", REQUEST_ID, GIT_RESET_COMMAND);

			assertThatThrownBy(() -> coopGameService.processReset(ROOM_ID, MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(NOT_RESET_PLAYER);
		}

		@Test
		void 리셋_명령어가_틀리면_COOP_RESET_WRONG을_전송한다() throws InterruptedException {
			givenResetLockAcquired();
			given(coopGameRedisRepository.findGameSessionIdByRoomId(ROOM_ID)).willReturn(GAME_SESSION_ID);
			given(coopGameRedisRepository.isGameActive(GAME_SESSION_ID)).willReturn(true);
			given(coopGameRedisRepository.isBlocked(GAME_SESSION_ID)).willReturn(true);
			given(coopGameRedisRepository.getResetTargetPlayerId(GAME_SESSION_ID)).willReturn(MEMBER_ID);

			CoopResetRequest request = new CoopResetRequest("COOP_RESET", REQUEST_ID, "git resett");

			coopGameService.processReset(ROOM_ID, MEMBER_ID, request);

			then(coopGameRedisRepository).should(never()).unblock(any());

			ArgumentCaptor<CoopResetWrongResponse> captor = ArgumentCaptor.forClass(CoopResetWrongResponse.class);
			then(messageSender).should().sendToUser(eq(MEMBER_ID.toString()), captor.capture());
			assertThat(captor.getValue().type()).isEqualTo("COOP_RESET_WRONG");
			assertThat(captor.getValue().playerId()).isEqualTo(MEMBER_ID);
		}

		@Test
		void 정확한_리셋_명령어를_입력하면_게임을_언블록하고_라운드_진행도를_초기화한다() throws InterruptedException {
			UUID mapId = UUID.fromString("eeeeeeee-0000-0000-0000-000000000005");
			givenResetLockAcquired();
			given(coopGameRedisRepository.findGameSessionIdByRoomId(ROOM_ID)).willReturn(GAME_SESSION_ID);
			given(coopGameRedisRepository.isGameActive(GAME_SESSION_ID)).willReturn(true);
			given(coopGameRedisRepository.isBlocked(GAME_SESSION_ID)).willReturn(true);
			given(coopGameRedisRepository.getResetTargetPlayerId(GAME_SESSION_ID)).willReturn(MEMBER_ID);
			given(coopGameRedisRepository.getCurrentRound(GAME_SESSION_ID)).willReturn(2);
			given(coopGameRedisRepository.getMapId(GAME_SESSION_ID)).willReturn(mapId);
			given(commandSetItemRepository.findByMapIdAndRound(mapId, 2)).willReturn(List.of());

			CoopResetRequest request = new CoopResetRequest("COOP_RESET", REQUEST_ID, GIT_RESET_COMMAND);

			coopGameService.processReset(ROOM_ID, MEMBER_ID, request);

			then(coopGameRedisRepository).should().unblock(GAME_SESSION_ID);
			then(coopGameRedisRepository).should().resetRoundProgress(GAME_SESSION_ID, 2);
		}
	}

	// ── handlePlayerDisconnect ────────────────────────────────────────────────

	@Nested
	class HandlePlayerDisconnect {

		// 구 동작: gameSessionId == null → GAME_NOT_STARTED 예외
		// 신 동작: 100ms 윈도우(initAndStartGame 실행 전) disconnect 케이스이므로
		//          Redis 정리는 생략하고 방 초기화 + COOP_GAME_END만 브로드캐스트
		@Test
		void 게임_세션이_없으면_Redis_정리는_생략하고_방_초기화_후_COOP_GAME_END를_브로드캐스트한다() {
			given(coopGameRedisRepository.findGameSessionIdByRoomId(ROOM_ID)).willReturn(null);

			coopGameService.handlePlayerDisconnect(ROOM_ID);

			then(coopGameRedisRepository).should(never()).deleteGameState(any());
			then(roomService).should().resetRoomAfterGame(ROOM_ID);

			ArgumentCaptor<CoopGameEndResponse> captor = ArgumentCaptor.forClass(CoopGameEndResponse.class);
			then(messageSender).should().send(eq("/topic/room/" + ROOM_ID + "/coop"), captor.capture());
			assertThat(captor.getValue().type()).isEqualTo("COOP_GAME_END");
			assertThat(captor.getValue().isSuccess()).isFalse();
			assertThat(captor.getValue().reason()).isEqualTo("PLAYER_DISCONNECTED");
		}

		// 구 동작: isGameActive == false → early return (아무 작업 없음)
		// 신 동작: endGame()이 이미 완료된 케이스이므로 Redis 정리는 생략하고
		//          방 초기화 + COOP_GAME_END 브로드캐스트 (멱등성 허용)
		@Test
		void 게임이_비활성이면_Redis_정리는_생략하고_방_초기화_후_COOP_GAME_END를_브로드캐스트한다() {
			given(coopGameRedisRepository.findGameSessionIdByRoomId(ROOM_ID)).willReturn(GAME_SESSION_ID);
			given(coopGameRedisRepository.isGameActive(GAME_SESSION_ID)).willReturn(false);

			coopGameService.handlePlayerDisconnect(ROOM_ID);

			then(coopGameRedisRepository).should(never()).deleteGameState(any());
			then(roomService).should().resetRoomAfterGame(ROOM_ID);

			ArgumentCaptor<CoopGameEndResponse> captor = ArgumentCaptor.forClass(CoopGameEndResponse.class);
			then(messageSender).should().send(eq("/topic/room/" + ROOM_ID + "/coop"), captor.capture());
			assertThat(captor.getValue().type()).isEqualTo("COOP_GAME_END");
			assertThat(captor.getValue().isSuccess()).isFalse();
			assertThat(captor.getValue().reason()).isEqualTo("PLAYER_DISCONNECTED");
		}

		@Test
		void 게임이_활성이면_게임_상태를_삭제하고_방_초기화_후_COOP_GAME_END를_브로드캐스트한다() {
			given(coopGameRedisRepository.findGameSessionIdByRoomId(ROOM_ID)).willReturn(GAME_SESSION_ID);
			given(coopGameRedisRepository.isGameActive(GAME_SESSION_ID)).willReturn(true);

			coopGameService.handlePlayerDisconnect(ROOM_ID);

			then(coopGameRedisRepository).should().deleteGameState(GAME_SESSION_ID);
			then(roomService).should().resetRoomAfterGame(ROOM_ID);

			ArgumentCaptor<CoopGameEndResponse> captor = ArgumentCaptor.forClass(CoopGameEndResponse.class);
			then(messageSender).should().send(eq("/topic/room/" + ROOM_ID + "/coop"), captor.capture());
			assertThat(captor.getValue().type()).isEqualTo("COOP_GAME_END");
			assertThat(captor.getValue().isSuccess()).isFalse();
			assertThat(captor.getValue().reason()).isEqualTo("PLAYER_DISCONNECTED");
		}
	}

	// ── helpers ───────────────────────────────────────────────────────────────

	private void givenInputLockAcquired() throws InterruptedException {
		given(redissonClient.getLock(String.format(LOCK_INPUT, GAME_SESSION_ID))).willReturn(rLock);
		given(rLock.tryLock(LOCK_WAIT_SECONDS, LOCK_LEASE_SECONDS, TimeUnit.SECONDS)).willReturn(true);
		given(rLock.isHeldByCurrentThread()).willReturn(true);
	}

	private void givenResetLockAcquired() throws InterruptedException {
		given(redissonClient.getLock(String.format(LOCK_RESET, GAME_SESSION_ID))).willReturn(rLock);
		given(rLock.tryLock(LOCK_WAIT_SECONDS, LOCK_LEASE_SECONDS, TimeUnit.SECONDS)).willReturn(true);
		given(rLock.isHeldByCurrentThread()).willReturn(true);
	}
}

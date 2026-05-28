package com.gitcat.letsgitit.domain.room.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.BDDMockito.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.scheduling.TaskScheduler;

import com.gitcat.letsgitit.domain.command.dto.response.CommandSetResponse;
import com.gitcat.letsgitit.domain.command.service.CommandService;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionInputResult;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionGameEndMessage;
import com.gitcat.letsgitit.domain.competitive.service.ContributionGameService;
import com.gitcat.letsgitit.domain.coop.dto.response.GraphDataDto;
import com.gitcat.letsgitit.domain.coop.service.CoopGameService;
import com.gitcat.letsgitit.domain.coop.service.CoopGraphDataStore;
import com.gitcat.letsgitit.domain.coop.service.CoopService;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.record.service.RecordService;
import com.gitcat.letsgitit.domain.room.dto.RoomCache;
import com.gitcat.letsgitit.domain.room.dto.request.GameStartRequest;
import com.gitcat.letsgitit.domain.room.dto.request.ReadyUpdateRequest;
import com.gitcat.letsgitit.domain.room.dto.response.ContributionRoomStateResponse;
import com.gitcat.letsgitit.domain.room.dto.response.CoopRoomStateResponse;
import com.gitcat.letsgitit.domain.room.dto.response.GameStartResult;
import com.gitcat.letsgitit.domain.room.dto.response.HostTransferredResponse;
import com.gitcat.letsgitit.domain.room.dto.response.PlayerInfoDto;
import com.gitcat.letsgitit.domain.room.dto.response.ReadyChangedResponse;
import com.gitcat.letsgitit.domain.room.dto.response.RoomListResponse;
import com.gitcat.letsgitit.domain.room.dto.response.RoomSearchResponse;
import com.gitcat.letsgitit.domain.room.dto.response.SelectedMapDto;
import com.gitcat.letsgitit.domain.room.entity.enums.RoomState;
import com.gitcat.letsgitit.domain.room.repository.RoomRedisRepository;
import com.gitcat.letsgitit.domain.room.util.RoomMemberMapper;
import com.gitcat.letsgitit.global.enums.RoomMode;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.websocket.dto.BaseWebSocketResponse;

@ExtendWith(MockitoExtension.class)
class RoomServiceImplTest {

	@InjectMocks
	private RoomServiceImpl roomService;

	@Mock
	private RoomRedisRepository roomRedisRepository;

	@Mock
	private RedissonClient redissonClient;

	@Mock
	private RLock rLock;

	@Mock
	private CoopService coopService;

	@Mock
	private CommandService commandService;

	@Mock
	private MemberService memberService;

	@Mock
	private RecordService recordService;

	@Mock
	private RoomMemberMapper roomMemberMapper;

	@Mock
	private RoomWebSocketEventPublisher roomWebSocketEventPublisher;

	@Mock
	private RoomMemberStateRecoveryService roomMemberStateRecoveryService;

	@Mock
	private CoopGraphDataStore coopGraphDataStore;

	@Mock
	private CoopGameService coopGameService;

	@Mock
	private TaskScheduler taskScheduler;

	@Mock
	private ContributionGameService contributionGameService;

	private static final Long ROOM_ID = 1L;
	private static final UUID MEMBER_ID = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001");
	private static final UUID OTHER_ID = UUID.fromString("bbbbbbbb-0000-0000-0000-000000000002");

	private RoomCache buildRoom(String mode, RoomState roomState) {
		return new RoomCache(ROOM_ID, "테스트 방", mode, 2, 4, false, roomState.name(), null);
	}

	private Map<Object, Object> buildRoomInfo(RoomState roomState) {
		return buildRoomInfo(roomState, OTHER_ID);
	}

	private Map<Object, Object> buildRoomInfo(RoomState roomState, UUID hostId) {
		return Map.of(
			"roomState", roomState.name(),
			"mode", "CONTRIBUTION",
			"hostMemberId", hostId.toString());
	}

	private PlayerInfoDto buildPlayer(UUID playerId, boolean isReady) {
		return new PlayerInfoDto(playerId, "닉네임", null, null, null, null, null, null, isReady, false);
	}

	@Nested
	class GetRooms {

		@Test
		void ALL_모드는_모든_방을_반환한다() {
			RoomCache contribution = buildRoom("CONTRIBUTION", RoomState.WAITING);
			RoomCache coop = buildRoom("COOP", RoomState.WAITING);
			given(roomRedisRepository.findAll()).willReturn(List.of(contribution, coop));

			RoomListResponse result = roomService.getRooms(RoomMode.ALL);

			assertThat(result.rooms()).hasSize(2);
		}

		@Test
		void CONTRIBUTION_모드는_기여도_뺏기_방만_반환한다() {
			RoomCache contribution = buildRoom("CONTRIBUTION", RoomState.WAITING);
			RoomCache coop = buildRoom("COOP", RoomState.WAITING);
			given(roomRedisRepository.findAll()).willReturn(List.of(contribution, coop));

			RoomListResponse result = roomService.getRooms(RoomMode.CONTRIBUTION);

			assertThat(result.rooms()).hasSize(1);
			assertThat(result.rooms().get(0).mode()).isEqualTo("CONTRIBUTION");
		}

		@Test
		void COOP_모드는_협력_방만_반환한다() {
			RoomCache contribution = buildRoom("CONTRIBUTION", RoomState.WAITING);
			RoomCache coop = buildRoom("COOP", RoomState.WAITING);
			given(roomRedisRepository.findAll()).willReturn(List.of(contribution, coop));

			RoomListResponse result = roomService.getRooms(RoomMode.COOP);

			assertThat(result.rooms()).hasSize(1);
			assertThat(result.rooms().get(0).mode()).isEqualTo("COOP");
		}
	}

	@Nested
	class VerifyRoomPassword {

		@Test
		void 비밀번호가_일치하면_인증_상태를_저장한다() {
			String password = "secret";
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(roomRedisRepository.findPasswordById(ROOM_ID)).willReturn(password);

			roomService.verifyRoomPassword(ROOM_ID, password, MEMBER_ID);

			then(roomRedisRepository).should().savePasswordVerified(MEMBER_ID.toString(), ROOM_ID);
		}

		@Test
		void 방이_없으면_ROOM_NOT_FOUND를_던진다() {
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(false);

			assertThatThrownBy(() -> roomService.verifyRoomPassword(ROOM_ID, "secret", MEMBER_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_NOT_FOUND);
		}

		@Test
		void 비밀번호가_틀리면_INVALID_PASSWORD를_던진다() {
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(roomRedisRepository.findPasswordById(ROOM_ID)).willReturn("correct");

			assertThatThrownBy(() -> roomService.verifyRoomPassword(ROOM_ID, "wrong", MEMBER_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(INVALID_PASSWORD);
		}
	}

	@Nested
	class SearchByCode {

		@Test
		void 코드로_방을_찾으면_RoomSearchResponse를_반환한다() {
			RoomCache room = buildRoom("CONTRIBUTION", RoomState.WAITING);
			given(roomRedisRepository.findByCode("ABC123")).willReturn(Optional.of(room));

			RoomSearchResponse result = roomService.searchByCode("ABC123");

			assertThat(result.roomId()).isEqualTo(ROOM_ID);
			assertThat(result.roomState()).isEqualTo(RoomState.WAITING.name());
		}

		@Test
		void 코드에_해당하는_방이_없으면_ROOM_NOT_FOUND를_던진다() {
			given(roomRedisRepository.findByCode("XXXXX")).willReturn(Optional.empty());

			assertThatThrownBy(() -> roomService.searchByCode("XXXXX"))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_NOT_FOUND);
		}

		@Test
		void 게임_중인_방이면_ROOM_IN_GAME을_던진다() {
			RoomCache room = buildRoom("CONTRIBUTION", RoomState.IN_GAME);
			given(roomRedisRepository.findByCode("ABC123")).willReturn(Optional.of(room));

			assertThatThrownBy(() -> roomService.searchByCode("ABC123"))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_IN_GAME);
		}
	}

	@Nested
	class GetRoomState {

		@Test
		void 기여도_방이면_CONTRIBUTION_ROOM_STATE를_반환한다() {
			Map<Object, Object> roomInfo = Map.of(
				"roomCode", "ABC123",
				"title", "기여도 방",
				"mode", "CONTRIBUTION",
				"roomState", "WAITING",
				"hasPassword", false,
				"maxPlayers", 4);
			Map<Object, Object> members = Map.of(MEMBER_ID.toString(), "member-json");
			List<PlayerInfoDto> players = List.of(buildPlayer(MEMBER_ID, true));

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberStateRecoveryService.ensureMemberInRoom(ROOM_ID, MEMBER_ID, roomInfo, "room-state"))
				.willReturn(true);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(members);
			given(roomMemberMapper.toPlayerInfoDtos(members)).willReturn(players);

			BaseWebSocketResponse response = roomService.getRoomState(MEMBER_ID, ROOM_ID);

			assertThat(response).isInstanceOf(ContributionRoomStateResponse.class);
			ContributionRoomStateResponse state = (ContributionRoomStateResponse)response;
			assertThat(state.type()).isEqualTo("CONTRIBUTION_ROOM_STATE");
			assertThat(state.roomId()).isEqualTo(ROOM_ID);
			assertThat(state.roomCode()).isEqualTo("ABC123");
			assertThat(state.mode().name()).isEqualTo("CONTRIBUTION");
			assertThat(state.roomState()).isEqualTo(RoomState.WAITING);
			assertThat(state.currentPlayers()).isEqualTo(1);
			assertThat(state.maxPlayers()).isEqualTo(4);
			assertThat(state.hasPassword()).isFalse();
			assertThat(state.members()).containsExactlyElementsOf(players);
		}

		@Test
		void 협력_방이면_COOP_ROOM_STATE와_selectedMap을_반환한다() {
			Map<Object, Object> roomInfo = Map.of(
				"roomCode", "ABC123",
				"title", "협력 방",
				"teamName", "팀명",
				"mode", "COOP",
				"roomState", "IN_GAME",
				"hasPassword", true,
				"maxPlayers", 4,
				"selectedMapId", "550e8400-e29b-41d4-a716-446655440002",
				"selectedMapName", "멋깔나는 맵",
				"selectedMapDifficulty", 3);
			Map<Object, Object> members = Map.of(MEMBER_ID.toString(), "member-json");
			List<PlayerInfoDto> players = List.of(buildPlayer(MEMBER_ID, true));

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberStateRecoveryService.ensureMemberInRoom(ROOM_ID, MEMBER_ID, roomInfo, "room-state"))
				.willReturn(true);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(members);
			given(roomMemberMapper.toPlayerInfoDtos(members)).willReturn(players);

			BaseWebSocketResponse response = roomService.getRoomState(MEMBER_ID, ROOM_ID);

			assertThat(response).isInstanceOf(CoopRoomStateResponse.class);
			CoopRoomStateResponse state = (CoopRoomStateResponse)response;
			assertThat(state.type()).isEqualTo("COOP_ROOM_STATE");
			assertThat(state.teamName()).isEqualTo("팀명");
			assertThat(state.roomState()).isEqualTo(RoomState.IN_GAME);
			assertThat(state.hasPassword()).isTrue();
			assertThat(state.selectedMap().mapId().toString()).isEqualTo("550e8400-e29b-41d4-a716-446655440002");
			assertThat(state.selectedMap().mapName()).isEqualTo("멋깔나는 맵");
			assertThat(state.selectedMap().difficulty()).isEqualTo(3);
			assertThat(state.members()).containsExactlyElementsOf(players);
		}

		@Test
		void 방이_없으면_ROOM_NOT_FOUND를_던진다() {
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.empty());

			assertThatThrownBy(() -> roomService.getRoomState(MEMBER_ID, ROOM_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_NOT_FOUND);
		}

		@Test
		void 방에_없는_회원이면_PLAYER_NOT_IN_ROOM을_던진다() {
			Map<Object, Object> roomInfo = Map.of(
				"roomCode", "ABC123",
				"title", "기여도 방",
				"mode", "CONTRIBUTION",
				"roomState", "WAITING",
				"hasPassword", false,
				"maxPlayers", 4);

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberStateRecoveryService.ensureMemberInRoom(ROOM_ID, MEMBER_ID, roomInfo, "room-state"))
				.willReturn(false);

			assertThatThrownBy(() -> roomService.getRoomState(MEMBER_ID, ROOM_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(PLAYER_NOT_IN_ROOM);
		}

		@Test
		void 멤버_hash가_누락되어도_member_room_매핑으로_복구되면_ROOM_STATE를_반환한다() {
			Map<Object, Object> roomInfo = Map.of(
				"roomCode", "ABC123",
				"title", "기여도 방",
				"mode", "CONTRIBUTION",
				"roomState", "WAITING",
				"hasPassword", false,
				"maxPlayers", 4);
			Map<Object, Object> recoveredMembers = Map.of(MEMBER_ID.toString(), "member-json");
			List<PlayerInfoDto> players = List.of(buildPlayer(MEMBER_ID, true));

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberStateRecoveryService.ensureMemberInRoom(ROOM_ID, MEMBER_ID, roomInfo, "room-state"))
				.willReturn(true);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(recoveredMembers);
			given(roomMemberMapper.toPlayerInfoDtos(recoveredMembers)).willReturn(players);

			BaseWebSocketResponse response = roomService.getRoomState(MEMBER_ID, ROOM_ID);

			assertThat(response).isInstanceOf(ContributionRoomStateResponse.class);
			ContributionRoomStateResponse state = (ContributionRoomStateResponse)response;
			assertThat(state.members()).containsExactlyElementsOf(players);
			then(roomMemberStateRecoveryService).should()
				.ensureMemberInRoom(ROOM_ID, MEMBER_ID, roomInfo, "room-state");
		}

		@Test
		void currentPlayers는_변환된_members_목록_크기를_사용한다() {
			Map<Object, Object> roomInfo = Map.of(
				"roomCode", "ABC123",
				"title", "기여도 방",
				"mode", "CONTRIBUTION",
				"roomState", "WAITING",
				"hasPassword", false,
				"maxPlayers", 4);
			Map<Object, Object> rawMembers = Map.of(
				MEMBER_ID.toString(), "member-json",
				OTHER_ID.toString(), "broken-member-json");
			List<PlayerInfoDto> players = List.of(buildPlayer(MEMBER_ID, true));

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberStateRecoveryService.ensureMemberInRoom(ROOM_ID, MEMBER_ID, roomInfo, "room-state"))
				.willReturn(true);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(rawMembers);
			given(roomMemberMapper.toPlayerInfoDtos(rawMembers)).willReturn(players);

			BaseWebSocketResponse response = roomService.getRoomState(MEMBER_ID, ROOM_ID);

			assertThat(response).isInstanceOf(ContributionRoomStateResponse.class);
			ContributionRoomStateResponse state = (ContributionRoomStateResponse)response;
			assertThat(state.currentPlayers()).isEqualTo(1);
			assertThat(state.members()).hasSize(1);
		}
	}

	@Nested
	class KickMember {

		@Test
		void 방장이_멤버를_추방하면_removeMember를_호출한다() {
			String targetId = OTHER_ID.toString();
			Map<Object, Object> roomInfo = buildRoomInfo(RoomState.WAITING, MEMBER_ID);
			List<PlayerInfoDto> players = List.of(
				buildPlayer(MEMBER_ID, true),
				buildPlayer(OTHER_ID, false));

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.existsMember(ROOM_ID, targetId)).willReturn(true);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(Map.of());
			given(roomMemberMapper.toPlayerInfoDtos(any())).willReturn(players, List.of(buildPlayer(MEMBER_ID, true)));

			roomService.kickMember(ROOM_ID, MEMBER_ID, targetId);

			then(roomRedisRepository).should().removeMember(ROOM_ID, targetId);
		}

		@Test
		void 방이_없으면_ROOM_NOT_FOUND를_던진다() {
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.empty());

			assertThatThrownBy(() -> roomService.kickMember(ROOM_ID, MEMBER_ID, OTHER_ID.toString()))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_NOT_FOUND);
		}

		@Test
		void 게임_중이면_ROOM_IN_GAME을_던진다() {
			Map<Object, Object> roomInfo = buildRoomInfo(RoomState.IN_GAME, MEMBER_ID);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));

			assertThatThrownBy(() -> roomService.kickMember(ROOM_ID, MEMBER_ID, OTHER_ID.toString()))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_IN_GAME);
		}

		@Test
		void 방장이_아니면_NOT_HOST를_던진다() {
			Map<Object, Object> roomInfo = buildRoomInfo(RoomState.WAITING, OTHER_ID);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(redissonClient.getLock(anyString())).willReturn(rLock);

			assertThatThrownBy(() -> roomService.kickMember(ROOM_ID, MEMBER_ID, OTHER_ID.toString()))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(NOT_HOST);
		}

		@Test
		void 자기_자신을_추방하면_CANNOT_KICK_SELF를_던진다() {
			Map<Object, Object> roomInfo = buildRoomInfo(RoomState.WAITING, MEMBER_ID);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(redissonClient.getLock(anyString())).willReturn(rLock);

			assertThatThrownBy(() -> roomService.kickMember(ROOM_ID, MEMBER_ID, MEMBER_ID.toString()))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(CANNOT_KICK_SELF);
		}

		@Test
		void 대상_멤버가_없으면_PLAYER_NOT_FOUND를_던진다() {
			String targetId = OTHER_ID.toString();
			Map<Object, Object> roomInfo = buildRoomInfo(RoomState.WAITING, MEMBER_ID);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.existsMember(ROOM_ID, targetId)).willReturn(false);

			assertThatThrownBy(() -> roomService.kickMember(ROOM_ID, MEMBER_ID, targetId))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(PLAYER_NOT_FOUND);
		}
	}

	@Nested
	class StartGame {

		private final GameStartRequest request = new GameStartRequest("GAME_START");

		@Test
		void 방이_없으면_ROOM_NOT_FOUND를_던진다() {
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(false);

			assertThatThrownBy(() -> roomService.startGame(ROOM_ID, MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_NOT_FOUND);
		}

		@Test
		void 이미_게임_중이면_GAME_ALREADY_STARTED를_던진다() {
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn(RoomState.IN_GAME.name());

			assertThatThrownBy(() -> roomService.startGame(ROOM_ID, MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(GAME_ALREADY_STARTED);
		}

		@Test
		void 방장이_아니면_NOT_HOST를_던진다() {
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn(RoomState.WAITING.name());
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(OTHER_ID.toString());

			assertThatThrownBy(() -> roomService.startGame(ROOM_ID, MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(NOT_HOST);
		}

		@Test
		void CONTRIBUTION_모드_1명이면_NOT_ENOUGH_PLAYERS를_던진다() {
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn(RoomState.WAITING.name());
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(MEMBER_ID.toString());
			given(roomRedisRepository.findAllMemberIds(ROOM_ID)).willReturn(Set.of(MEMBER_ID.toString()));
			given(roomRedisRepository.findModeById(ROOM_ID)).willReturn("CONTRIBUTION");

			assertThatThrownBy(() -> roomService.startGame(ROOM_ID, MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(NOT_ENOUGH_PLAYERS);
		}

		@Test
		void COOP_모드_3명이면_NOT_ENOUGH_PLAYERS를_던진다() {
			UUID p3 = UUID.fromString("cccccccc-0000-0000-0000-000000000003");
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn(RoomState.WAITING.name());
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(MEMBER_ID.toString());
			given(roomRedisRepository.findAllMemberIds(ROOM_ID)).willReturn(
				Set.of(MEMBER_ID.toString(), OTHER_ID.toString(), p3.toString()));
			given(roomRedisRepository.findModeById(ROOM_ID)).willReturn("COOP");

			assertThatThrownBy(() -> roomService.startGame(ROOM_ID, MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(NOT_ENOUGH_PLAYERS);
		}

		@Test
		void 모든_멤버가_준비되지_않으면_NOT_ALL_READY를_던진다() {
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn(RoomState.WAITING.name());
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(MEMBER_ID.toString());
			given(roomRedisRepository.findAllMemberIds(ROOM_ID)).willReturn(
				Set.of(MEMBER_ID.toString(), OTHER_ID.toString()));
			given(roomRedisRepository.findModeById(ROOM_ID)).willReturn("CONTRIBUTION");
			given(roomRedisRepository.isAllMembersReady(ROOM_ID)).willReturn(false);

			assertThatThrownBy(() -> roomService.startGame(ROOM_ID, MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(NOT_ALL_READY);
		}

		@Test
		void CONTRIBUTION_게임_시작_성공_시_IN_GAME으로_상태를_변경하고_토픽을_반환한다() {
			CommandSetResponse commandSet = new CommandSetResponse(1, "main", List.of());
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn(RoomState.WAITING.name());
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(MEMBER_ID.toString());
			given(roomRedisRepository.findAllMemberIds(ROOM_ID)).willReturn(
				Set.of(MEMBER_ID.toString(), OTHER_ID.toString()));
			given(roomRedisRepository.findModeById(ROOM_ID)).willReturn("CONTRIBUTION");
			given(roomRedisRepository.isAllMembersReady(ROOM_ID)).willReturn(true);
			given(memberService.getNicknamesByIds(anyList())).willReturn(
				Map.of(MEMBER_ID, "방장", OTHER_ID, "플레이어"));
			given(commandService.getRandomContributionCommandSet(2)).willReturn(commandSet);
			given(recordService.getBestRecords(any())).willReturn(List.of());

			GameStartResult result = roomService.startGame(ROOM_ID, MEMBER_ID, request);

			then(roomRedisRepository).should().updateRoomState(ROOM_ID, RoomState.IN_GAME.name());
			then(commandService).should().getRandomContributionCommandSet(2);
			assertThat(result.destination()).isEqualTo("/topic/room/" + ROOM_ID + "/contribution");
		}

		@Test
		void COOP_게임_시작_성공_시_IN_GAME으로_상태를_변경하고_토픽을_반환한다() {
			UUID p3 = UUID.fromString("cccccccc-0000-0000-0000-000000000003");
			UUID p4 = UUID.fromString("dddddddd-0000-0000-0000-000000000004");
			String mapId = UUID.randomUUID().toString();
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn(RoomState.WAITING.name());
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(MEMBER_ID.toString());
			given(roomRedisRepository.findAllMemberIds(ROOM_ID)).willReturn(
				Set.of(MEMBER_ID.toString(), OTHER_ID.toString(), p3.toString(), p4.toString()));
			given(roomRedisRepository.findModeById(ROOM_ID)).willReturn("COOP");
			given(roomRedisRepository.isAllMembersReady(ROOM_ID)).willReturn(true);
			given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());
			given(roomRedisRepository.findSelectedMapId(ROOM_ID)).willReturn(mapId);
			given(coopGraphDataStore.getByMapId(any())).willReturn(Mockito.mock(GraphDataDto.class));
			given(coopService.getSelectedMap(any()))
				.willReturn(new SelectedMapDto(UUID.fromString(mapId), "테스트 맵", 1));
			given(roomRedisRepository.findTeamNameById(ROOM_ID)).willReturn("테스트 팀");

			GameStartResult result = roomService.startGame(ROOM_ID, MEMBER_ID, request);

			then(roomRedisRepository).should().updateRoomState(ROOM_ID, RoomState.IN_GAME.name());
			assertThat(result.destination()).isEqualTo("/topic/room/" + ROOM_ID + "/coop");
		}

		@Test
		void COOP_게임_시작_시_플레이어_최고기록은_조회하지_않는다() {
			// CoopPlayerDto에서 bestTime이 제거(a3a51df)됨에 따라
			// startGame COOP 경로는 recordService를 호출하지 않는다
			UUID p3 = UUID.fromString("cccccccc-0000-0000-0000-000000000003");
			UUID p4 = UUID.fromString("dddddddd-0000-0000-0000-000000000004");
			String mapId = UUID.randomUUID().toString();
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn(RoomState.WAITING.name());
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(MEMBER_ID.toString());
			given(roomRedisRepository.findAllMemberIds(ROOM_ID)).willReturn(
				Set.of(MEMBER_ID.toString(), OTHER_ID.toString(), p3.toString(), p4.toString()));
			given(roomRedisRepository.findModeById(ROOM_ID)).willReturn("COOP");
			given(roomRedisRepository.isAllMembersReady(ROOM_ID)).willReturn(true);
			given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());
			given(roomRedisRepository.findSelectedMapId(ROOM_ID)).willReturn(mapId);
			given(coopGraphDataStore.getByMapId(any())).willReturn(Mockito.mock(GraphDataDto.class));
			given(coopService.getSelectedMap(any()))
				.willReturn(new SelectedMapDto(UUID.fromString(mapId), "기초 브랜치", 2));
			given(roomRedisRepository.findTeamNameById(ROOM_ID)).willReturn("테스트 팀");

			roomService.startGame(ROOM_ID, MEMBER_ID, request);

			then(recordService).should(never()).getBestCoopRecord(any());
			then(recordService).should(never()).getBestCoopRecordByMap(any(), any(), anyInt());
		}

		@Test
		void 데이터_조회_실패_시_WAITING으로_상태를_롤백한다() {
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn(RoomState.WAITING.name());
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(MEMBER_ID.toString());
			given(roomRedisRepository.findAllMemberIds(ROOM_ID)).willReturn(
				Set.of(MEMBER_ID.toString(), OTHER_ID.toString()));
			given(roomRedisRepository.findModeById(ROOM_ID)).willReturn("CONTRIBUTION");
			given(roomRedisRepository.isAllMembersReady(ROOM_ID)).willReturn(true);
			given(memberService.getNicknamesByIds(anyList())).willReturn(Map.of());
			given(commandService.getRandomContributionCommandSet(2))
				.willThrow(new BusinessException(COMMAND_SET_NOT_FOUND));

			assertThatThrownBy(() -> roomService.startGame(ROOM_ID, MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(COMMAND_SET_NOT_FOUND);

			// 선점으로 IN_GAME 변경 후 실패 시 WAITING으로 롤백되어야 한다
			then(roomRedisRepository).should().updateRoomState(ROOM_ID, RoomState.IN_GAME.name());
			then(roomRedisRepository).should().updateRoomState(ROOM_ID, RoomState.WAITING.name());
			then(contributionGameService).should().deleteSession(any(UUID.class));
		}

		@Test
		void 닉네임_조회_실패_시_WAITING으로_상태를_롤백한다() {
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn(RoomState.WAITING.name());
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(MEMBER_ID.toString());
			given(roomRedisRepository.findAllMemberIds(ROOM_ID)).willReturn(
				Set.of(MEMBER_ID.toString(), OTHER_ID.toString()));
			given(roomRedisRepository.findModeById(ROOM_ID)).willReturn("CONTRIBUTION");
			given(roomRedisRepository.isAllMembersReady(ROOM_ID)).willReturn(true);
			given(memberService.getNicknamesByIds(anyList()))
				.willThrow(new RuntimeException("DB connection failed"));

			assertThatThrownBy(() -> roomService.startGame(ROOM_ID, MEMBER_ID, request))
				.isInstanceOf(RuntimeException.class);

			then(roomRedisRepository).should().updateRoomState(ROOM_ID, RoomState.IN_GAME.name());
			then(roomRedisRepository).should().updateRoomState(ROOM_ID, RoomState.WAITING.name());
			then(contributionGameService).should().deleteSession(any(UUID.class));
		}
	}

	@Nested
	class LeaveRoom {

		@Test
		void 방장이_아닌_멤버가_나가면_removeMember만_호출한다() {
			PlayerInfoDto leftPlayer = player(MEMBER_ID, "member", false);
			PlayerInfoDto host = player(OTHER_ID, "host", true);
			Map<Object, Object> beforeMembers = Map.of("member", "before");
			Map<Object, Object> afterMembers = Map.of("host", "after");
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(OTHER_ID.toString());
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(beforeMembers, afterMembers);
			given(roomMemberMapper.toPlayerInfoDtos(beforeMembers)).willReturn(List.of(leftPlayer, host));
			given(roomMemberMapper.toPlayerInfoDtos(afterMembers)).willReturn(List.of(host));
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn("WAITING");

			roomService.leaveRoom(ROOM_ID, MEMBER_ID);

			then(roomRedisRepository).should().removeMember(ROOM_ID, MEMBER_ID.toString());
			then(roomRedisRepository).should(never()).dissolveRoom(any());
			then(roomRedisRepository).should(never()).updateHostId(any(), any());
			then(roomWebSocketEventPublisher).should()
				.publishPlayerLeft(ROOM_ID, MEMBER_ID, "member", List.of(host), "WAITING");
			then(roomWebSocketEventPublisher).should(never()).publishHostDelegated(any(), any(), any());
		}

		@Test
		void 방장이_나가고_남은_멤버가_있으면_PLAYER_LEFT_후_HOST_DELEGATED를_발행한다() {
			String newHostId = OTHER_ID.toString();
			PlayerInfoDto leftHost = player(MEMBER_ID, "host", true);
			PlayerInfoDto newHost = player(OTHER_ID, "newHost", true);
			Map<Object, Object> beforeMembers = Map.of("host", "before");
			Map<Object, Object> afterMembers = Map.of("newHost", "after");
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(MEMBER_ID.toString());
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(beforeMembers, afterMembers);
			given(roomMemberMapper.toPlayerInfoDtos(beforeMembers)).willReturn(List.of(leftHost, newHost));
			given(roomMemberMapper.toPlayerInfoDtos(afterMembers)).willReturn(List.of(newHost));
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn("WAITING");

			roomService.leaveRoom(ROOM_ID, MEMBER_ID);

			then(roomRedisRepository).should().delegateHostAtomic(ROOM_ID.toString(), newHostId);
			then(roomRedisRepository).should(never()).dissolveRoom(any());

			InOrder inOrder = Mockito.inOrder(roomWebSocketEventPublisher, rLock);
			inOrder.verify(roomWebSocketEventPublisher)
				.publishPlayerLeft(ROOM_ID, MEMBER_ID, "host", List.of(newHost), "WAITING");
			inOrder.verify(roomWebSocketEventPublisher)
				.publishHostDelegated(ROOM_ID, OTHER_ID, List.of(newHost));
			inOrder.verify(rLock).unlock();
		}

		@Test
		void memberMappings가_비어있어도_members_Hash기반_fallback으로_방장을_위임한다() {
			String newHostId = OTHER_ID.toString();
			PlayerInfoDto leftHost = player(MEMBER_ID, "host", true);
			PlayerInfoDto newHost = player(OTHER_ID, "newHost", true);
			Map<Object, Object> beforeMembers = Map.of("host", "before");
			Map<Object, Object> afterMembers = Map.of("newHost", "after");
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(MEMBER_ID.toString());
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(beforeMembers, afterMembers);
			given(roomMemberMapper.toPlayerInfoDtos(beforeMembers)).willReturn(List.of(leftHost, newHost));
			given(roomMemberMapper.toPlayerInfoDtos(afterMembers)).willReturn(List.of(newHost));

			roomService.leaveRoom(ROOM_ID, MEMBER_ID);

			then(roomRedisRepository).should().delegateHostAtomic(ROOM_ID.toString(), newHostId);
			then(roomRedisRepository).should(never()).dissolveRoom(any());
		}

		@Test
		void 방장이_나가고_남은_멤버가_없으면_방을_해산한다() {
			PlayerInfoDto leftHost = player(MEMBER_ID, "host", true);
			Map<Object, Object> beforeMembers = Map.of("host", "before");
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(MEMBER_ID.toString());
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(beforeMembers, Map.of());
			given(roomMemberMapper.toPlayerInfoDtos(beforeMembers)).willReturn(List.of(leftHost));
			given(roomMemberMapper.toPlayerInfoDtos(Map.of())).willReturn(List.of());

			roomService.leaveRoom(ROOM_ID, MEMBER_ID);

			then(roomRedisRepository).should().dissolveRoom(ROOM_ID);
			then(roomRedisRepository).should(never()).updateHostId(any(), any());
			then(roomWebSocketEventPublisher).shouldHaveNoInteractions();
		}

		@Test
		void 방이_없으면_ROOM_NOT_FOUND를_던진다() {
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(false);

			assertThatThrownBy(() -> roomService.leaveRoom(ROOM_ID, MEMBER_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_NOT_FOUND);
		}

		@Test
		void 방에_없는_멤버가_나가려하면_PLAYER_NOT_IN_ROOM을_던진다() {
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(false);
			given(roomRedisRepository.findJoinedRoomId(MEMBER_ID.toString())).willReturn(Optional.empty());

			assertThatThrownBy(() -> roomService.leaveRoom(ROOM_ID, MEMBER_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(PLAYER_NOT_IN_ROOM);
		}

		@Test
		void memberRoom_매핑만_존재하면_members_hash_없이도_퇴장_처리한다() {
			PlayerInfoDto host = player(OTHER_ID, "host", true);
			Map<Object, Object> beforeMembers = Map.of();
			Map<Object, Object> afterMembers = Map.of("host", "after");
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(false);
			given(roomRedisRepository.findJoinedRoomId(MEMBER_ID.toString())).willReturn(Optional.of(ROOM_ID));
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(OTHER_ID.toString());
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(beforeMembers, afterMembers);
			given(roomMemberMapper.toPlayerInfoDtos(beforeMembers)).willReturn(List.of());
			given(roomMemberMapper.toPlayerInfoDtos(afterMembers)).willReturn(List.of(host));
			given(memberService.getNicknameById(MEMBER_ID)).willReturn("member");
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn("WAITING");

			roomService.leaveRoom(ROOM_ID, MEMBER_ID);

			then(roomRedisRepository).should().removeMember(ROOM_ID, MEMBER_ID.toString());
			then(roomWebSocketEventPublisher).should()
				.publishPlayerLeft(ROOM_ID, MEMBER_ID, "member", List.of(host), "WAITING");
		}

		@Test
		void 기여도_게임_중_퇴장하면_방_멤버_제거_전에_기여도_세션을_이탈_마킹한다() {
			UUID gameSessionId = UUID.randomUUID();
			UUID remainMemberId = UUID.fromString("cccccccc-0000-0000-0000-000000000003");
			Object contributionPayload = new Object();
			PlayerInfoDto leftPlayer = player(MEMBER_ID, "member", false);
			PlayerInfoDto host = player(OTHER_ID, "host", true);
			PlayerInfoDto remainMember = player(remainMemberId, "remain", false);
			Map<Object, Object> beforeMembers = Map.of("member", "before", "host", "before", "remain", "before");
			Map<Object, Object> afterMembers = Map.of("host", "after", "remain", "after");
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(OTHER_ID.toString());
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn("IN_GAME");
			given(roomRedisRepository.findModeById(ROOM_ID)).willReturn("CONTRIBUTION");
			given(roomRedisRepository.findGameSessionId(ROOM_ID)).willReturn(gameSessionId.toString());
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(beforeMembers, afterMembers);
			given(roomMemberMapper.toPlayerInfoDtos(beforeMembers)).willReturn(List.of(leftPlayer, host, remainMember));
			given(roomMemberMapper.toPlayerInfoDtos(afterMembers)).willReturn(List.of(host, remainMember));
			given(contributionGameService.handlePlayerDisconnected(gameSessionId, MEMBER_ID))
				.willReturn(ContributionInputResult.broadcast(contributionPayload));

			roomService.leaveRoom(ROOM_ID, MEMBER_ID);

			InOrder inOrder = Mockito.inOrder(contributionGameService, roomRedisRepository,
				roomWebSocketEventPublisher);
			inOrder.verify(contributionGameService).handlePlayerDisconnected(gameSessionId, MEMBER_ID);
			inOrder.verify(roomRedisRepository).removeMember(ROOM_ID, MEMBER_ID.toString());
			inOrder.verify(roomWebSocketEventPublisher).publishContributionEvent(ROOM_ID, contributionPayload);
			then(contributionGameService).should(never()).endByPlayerDisconnected(any(), any());
			then(roomWebSocketEventPublisher).should()
				.publishPlayerLeft(ROOM_ID, MEMBER_ID, "member", List.of(host, remainMember), "IN_GAME");
		}

		@Test
		void COOP_게임_진행_중_나가면_handlePlayerDisconnect를_호출한다() {
			PlayerInfoDto leftPlayer = player(MEMBER_ID, "member", false);
			PlayerInfoDto host = player(OTHER_ID, "host", true);
			Map<Object, Object> beforeMembers = Map.of("member", "before");
			Map<Object, Object> afterMembers = Map.of("host", "after");
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(OTHER_ID.toString());
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn("IN_GAME");
			given(roomRedisRepository.findModeById(ROOM_ID)).willReturn("COOP");
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(beforeMembers, afterMembers);
			given(roomMemberMapper.toPlayerInfoDtos(beforeMembers)).willReturn(List.of(leftPlayer, host));
			given(roomMemberMapper.toPlayerInfoDtos(afterMembers)).willReturn(List.of(host));

			roomService.leaveRoom(ROOM_ID, MEMBER_ID);

			then(coopGameService).should().handlePlayerDisconnect(ROOM_ID);
		}

		@Test
		void CONTRIBUTION_게임_중_남은_인원이_1명_이하면_WAITING_복구_ready초기화_세션삭제_후_종료이벤트를_발행한다() {
			UUID gameSessionId = UUID.randomUUID();
			ContributionGameEndMessage gameEnd = ContributionGameEndMessage.playerDisconnected(gameSessionId);
			PlayerInfoDto leftPlayer = player(MEMBER_ID, "member", false);
			PlayerInfoDto host = player(OTHER_ID, "host", true);
			Map<Object, Object> beforeMembers = Map.of("member", "before");
			Map<Object, Object> afterMembers = Map.of("host", "after");
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(OTHER_ID.toString());
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn("IN_GAME", "WAITING");
			given(roomRedisRepository.findModeById(ROOM_ID)).willReturn("CONTRIBUTION");
			given(roomRedisRepository.findGameSessionId(ROOM_ID)).willReturn(gameSessionId.toString());
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(beforeMembers, afterMembers);
			given(roomMemberMapper.toPlayerInfoDtos(beforeMembers)).willReturn(List.of(leftPlayer, host));
			given(roomMemberMapper.toPlayerInfoDtos(afterMembers)).willReturn(List.of(host));
			given(contributionGameService.endByPlayerDisconnected(ROOM_ID, gameSessionId)).willReturn(gameEnd);

			roomService.leaveRoom(ROOM_ID, MEMBER_ID);

			InOrder inOrder = Mockito.inOrder(roomRedisRepository, contributionGameService,
				roomWebSocketEventPublisher);
			inOrder.verify(roomRedisRepository).updateRoomState(ROOM_ID, RoomState.WAITING.name());
			inOrder.verify(roomRedisRepository).resetMembersReadyExceptHost(ROOM_ID);
			inOrder.verify(contributionGameService).deleteSession(gameSessionId);
			inOrder.verify(roomWebSocketEventPublisher).publishContributionGameEnd(ROOM_ID, gameEnd);
		}

		@Test
		void leaveGameIfDisconnected_removes_contribution_waiting_room_member() {
			PlayerInfoDto leftPlayer = player(MEMBER_ID, "member", false);
			PlayerInfoDto host = player(OTHER_ID, "host", true);
			Map<Object, Object> beforeMembers = Map.of("member", "before", "host", "before");
			Map<Object, Object> afterMembers = Map.of("host", "after");
			given(roomRedisRepository.findJoinedRoomId(MEMBER_ID.toString())).willReturn(Optional.of(ROOM_ID));
			given(roomRedisRepository.findModeById(ROOM_ID)).willReturn("CONTRIBUTION");
			given(roomRedisRepository.findRoomStateById(ROOM_ID)).willReturn("WAITING");
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(OTHER_ID.toString());
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(beforeMembers, afterMembers);
			given(roomMemberMapper.toPlayerInfoDtos(beforeMembers)).willReturn(List.of(leftPlayer, host));
			given(roomMemberMapper.toPlayerInfoDtos(afterMembers)).willReturn(List.of(host));

			roomService.leaveGameIfDisconnected(MEMBER_ID.toString());

			then(roomRedisRepository).should().removeMember(ROOM_ID, MEMBER_ID.toString());
			then(roomWebSocketEventPublisher).should()
				.publishPlayerLeft(ROOM_ID, MEMBER_ID, "member", List.of(host), "WAITING");
			then(contributionGameService).shouldHaveNoInteractions();
		}
	}

	@Nested
	class ResetRoomAfterGame {

		@Test
		void WAITING으로_상태_변경과_비방장_멤버_준비_초기화를_함께_수행한다() {
			given(redissonClient.getLock("lock:room:" + ROOM_ID)).willReturn(rLock);

			roomService.resetRoomAfterGame(ROOM_ID);

			InOrder inOrder = Mockito.inOrder(rLock, roomRedisRepository);
			inOrder.verify(rLock).lock();
			inOrder.verify(roomRedisRepository).updateRoomState(ROOM_ID, RoomState.WAITING.name());
			inOrder.verify(roomRedisRepository).resetMembersReadyExceptHost(ROOM_ID);
			inOrder.verify(rLock).unlock();
		}
	}

	private PlayerInfoDto player(UUID playerId, String nickname, boolean isHost) {
		return new PlayerInfoDto(
			playerId,
			nickname,
			"Hair_01",
			"Hair-color_01",
			"Body_01",
			"Eye_01",
			"Outfit_01",
			"Outfit-color_01",
			false,
			isHost);
	}

	@Nested
	class UpdateReadyStatus {

		private final ReadyUpdateRequest readyRequest = new ReadyUpdateRequest("READY_UPDATE", true);

		@Test
		void 준비_상태_변경에_성공하면_ReadyChangedResponse를_반환한다() {
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString()))
				.willReturn(Optional.of(buildRoomInfo(RoomState.WAITING)));
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(Map.of());
			given(roomMemberMapper.toPlayerInfoDtos(any())).willReturn(
				List.of(buildPlayer(MEMBER_ID, true), buildPlayer(OTHER_ID, true)));

			ReadyChangedResponse result = roomService.updateReadyStatus(MEMBER_ID, ROOM_ID, readyRequest);

			assertThat(result.playerId()).isEqualTo(MEMBER_ID);
			assertThat(result.isReady()).isTrue();
			assertThat(result.allReady()).isTrue();
			then(roomRedisRepository).should().updateMemberIsReady(ROOM_ID.toString(), MEMBER_ID.toString(), true);
		}

		@Test
		void 비호스트_멤버_중_준비_안한_멤버가_있으면_allReady가_false이다() {
			UUID thirdMember = UUID.fromString("cccccccc-0000-0000-0000-000000000003");
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString()))
				.willReturn(Optional.of(buildRoomInfo(RoomState.WAITING)));
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(Map.of());
			given(roomMemberMapper.toPlayerInfoDtos(any())).willReturn(
				List.of(buildPlayer(MEMBER_ID, true), buildPlayer(OTHER_ID, true), buildPlayer(thirdMember, false)));

			ReadyChangedResponse result = roomService.updateReadyStatus(MEMBER_ID, ROOM_ID, readyRequest);

			assertThat(result.allReady()).isFalse();
		}

		@Test
		void 방이_없으면_ROOM_NOT_FOUND를_던진다() {
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.empty());

			assertThatThrownBy(() -> roomService.updateReadyStatus(MEMBER_ID, ROOM_ID, readyRequest))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_NOT_FOUND);
		}

		@Test
		void 게임_중인_방이면_ROOM_IN_GAME을_던진다() {
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString()))
				.willReturn(Optional.of(buildRoomInfo(RoomState.IN_GAME)));

			assertThatThrownBy(() -> roomService.updateReadyStatus(MEMBER_ID, ROOM_ID, readyRequest))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_IN_GAME);
		}

		@Test
		void 방에_없는_플레이어면_PLAYER_NOT_IN_ROOM을_던진다() {
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString()))
				.willReturn(Optional.of(buildRoomInfo(RoomState.WAITING)));
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(false);

			assertThatThrownBy(() -> roomService.updateReadyStatus(MEMBER_ID, ROOM_ID, readyRequest))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(PLAYER_NOT_IN_ROOM);
		}

		@Test
		void 방장이_준비_변경을_요청하면_HOST_ALWAYS_READY를_던진다() {
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString()))
				.willReturn(Optional.of(buildRoomInfo(RoomState.WAITING, MEMBER_ID)));
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);

			assertThatThrownBy(() -> roomService.updateReadyStatus(MEMBER_ID, ROOM_ID, readyRequest))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(HOST_ALWAYS_READY);
		}

		@Test
		void room_lock을_획득하고_해제한다() {
			given(redissonClient.getLock("lock:room:" + ROOM_ID)).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString()))
				.willReturn(Optional.of(buildRoomInfo(RoomState.WAITING)));
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(Map.of());
			given(roomMemberMapper.toPlayerInfoDtos(any())).willReturn(
				List.of(buildPlayer(MEMBER_ID, true)));

			roomService.updateReadyStatus(MEMBER_ID, ROOM_ID, readyRequest);

			InOrder inOrder = Mockito.inOrder(rLock);
			inOrder.verify(rLock).lock();
			inOrder.verify(rLock).unlock();
		}

		@Test
		void 예외_발생_시에도_lock을_해제한다() {
			given(redissonClient.getLock("lock:room:" + ROOM_ID)).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.empty());

			assertThatThrownBy(() -> roomService.updateReadyStatus(MEMBER_ID, ROOM_ID, readyRequest))
				.isInstanceOf(BusinessException.class);

			then(rLock).should().lock();
			then(rLock).should().unlock();
		}

		@Test
		void startGame과_동일한_lock_name을_사용한다() {
			String expectedLockName = "lock:room:" + ROOM_ID;
			given(redissonClient.getLock(expectedLockName)).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString()))
				.willReturn(Optional.of(buildRoomInfo(RoomState.WAITING)));
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(Map.of());
			given(roomMemberMapper.toPlayerInfoDtos(any())).willReturn(
				List.of(buildPlayer(MEMBER_ID, true)));

			roomService.updateReadyStatus(MEMBER_ID, ROOM_ID, readyRequest);

			then(redissonClient).should().getLock(expectedLockName);
		}
	}

	@Nested
	class TransferHost {

		@Test
		void 방이_없으면_ROOM_NOT_FOUND를_던진다() {
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.empty());

			assertThatThrownBy(() -> roomService.transferHost(ROOM_ID, MEMBER_ID, OTHER_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_NOT_FOUND);
		}

		@Test
		void 게임_중이면_ROOM_IN_GAME을_던진다() {
			Map<Object, Object> roomInfo = buildRoomInfo(RoomState.IN_GAME, MEMBER_ID);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));

			assertThatThrownBy(() -> roomService.transferHost(ROOM_ID, MEMBER_ID, OTHER_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_IN_GAME);
		}

		@Test
		void 방장이_아니면_NOT_HOST를_던진다() {
			Map<Object, Object> roomInfo = buildRoomInfo(RoomState.WAITING, OTHER_ID);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));

			assertThatThrownBy(() -> roomService.transferHost(ROOM_ID, MEMBER_ID, OTHER_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(NOT_HOST);
		}

		@Test
		void 자기_자신에게_위임하면_SELF_TRANSFER를_던진다() {
			Map<Object, Object> roomInfo = buildRoomInfo(RoomState.WAITING, MEMBER_ID);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));

			assertThatThrownBy(() -> roomService.transferHost(ROOM_ID, MEMBER_ID, MEMBER_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(SELF_TRANSFER);
		}

		@Test
		void 위임_대상이_방에_없으면_PLAYER_NOT_FOUND를_던진다() {
			Map<Object, Object> roomInfo = buildRoomInfo(RoomState.WAITING, MEMBER_ID);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomRedisRepository.existsMember(ROOM_ID, OTHER_ID.toString())).willReturn(false);

			assertThatThrownBy(() -> roomService.transferHost(ROOM_ID, MEMBER_ID, OTHER_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(PLAYER_NOT_FOUND);
		}

		@Test
		void 정상_위임_시_transferHostAtomic을_호출한다() {
			Map<Object, Object> roomInfo = buildRoomInfo(RoomState.WAITING, MEMBER_ID);
			List<PlayerInfoDto> players = List.of(
				buildPlayer(MEMBER_ID, false),
				buildPlayer(OTHER_ID, true));

			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomRedisRepository.existsMember(ROOM_ID, OTHER_ID.toString())).willReturn(true);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(Map.of());
			given(roomMemberMapper.toPlayerInfoDtos(any())).willReturn(players);

			HostTransferredResponse result = roomService.transferHost(ROOM_ID, MEMBER_ID, OTHER_ID);

			assertThat(result.newHostId()).isEqualTo(OTHER_ID);
			then(roomRedisRepository).should().transferHostAtomic(
				ROOM_ID.toString(), MEMBER_ID.toString(), OTHER_ID.toString());
		}
	}
}

package com.gitcat.letsgitit.domain.room.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;
import static org.mockito.Mockito.inOrder;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.test.util.ReflectionTestUtils;

import com.gitcat.letsgitit.domain.coop.service.CoopService;
import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.room.dto.request.CreateCoopRoomRequest;
import com.gitcat.letsgitit.domain.room.dto.request.UpdateCoopRoomInfoRequest;
import com.gitcat.letsgitit.domain.room.dto.response.CoopRoomInfoResponse;
import com.gitcat.letsgitit.domain.room.dto.response.CoopRoomInfoUpdatedResponse;
import com.gitcat.letsgitit.domain.room.dto.response.CreateCoopRoomResponse;
import com.gitcat.letsgitit.domain.room.dto.response.JoinCoopRoomResponse;
import com.gitcat.letsgitit.domain.room.dto.response.PlayerInfoDto;
import com.gitcat.letsgitit.domain.room.dto.response.SelectedMapDto;
import com.gitcat.letsgitit.domain.room.entity.enums.RoomState;
import com.gitcat.letsgitit.domain.room.repository.RoomRedisRepository;
import com.gitcat.letsgitit.domain.room.util.RoomMemberMapper;
import com.gitcat.letsgitit.global.enums.GameMode;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.websocket.WebSocketMessageSender;

@ExtendWith(MockitoExtension.class)
class CoopRoomServiceImplTest {

	private static final UUID MEMBER_ID = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001");
	private static final UUID MAP_ID = UUID.fromString("cccccccc-0000-0000-0000-000000000003");
	private static final Long ROOM_ID = 2L;

	@InjectMocks
	private CoopRoomServiceImpl coopRoomService;

	@Mock
	private CoopService coopService;

	@Mock
	private MemberService memberService;

	@Mock
	private RoomRedisRepository roomRedisRepository;

	@Mock
	private RoomCodeGenerator roomCodeGenerator;

	@Mock
	private RoomMemberMapper roomMemberMapper;

	@Mock
	private RoomWebSocketEventPublisher roomWebSocketEventPublisher;

	@Mock
	private RoomMemberRecoveryService roomMemberRecoveryService;

	@Mock
	private RedissonClient redissonClient;

	@Mock
	private RLock rLock;

	@Mock
	private WebSocketMessageSender messageSender;

	@Nested
	class CreateCoopRoom {

		@Test
		void 방_생성에_성공하면_맵_정보를_포함한_응답을_반환한다() {
			SelectedMapDto selectedMap = new SelectedMapDto(MAP_ID, "브랜치 기초", 1);
			CreateCoopRoomRequest request = new CreateCoopRoomRequest("협력 방", "gitcat", true, "1234", MAP_ID);

			Member member = createMember(MEMBER_ID, "dobby");
			Map<String, Object> memberInfo = Map.of("playerId", MEMBER_ID.toString(), "nickname", "dobby");
			given(memberService.findById(MEMBER_ID)).willReturn(member);
			given(coopService.getSelectedMap(MAP_ID)).willReturn(selectedMap);
			given(roomCodeGenerator.generate()).willReturn("COOP12");
			given(roomRedisRepository.reserveRoomCode("COOP12")).willReturn(true);
			given(roomRedisRepository.generateRoomId()).willReturn(ROOM_ID);
			given(roomMemberMapper.toMemberInfo(member, true)).willReturn(memberInfo);
			given(roomRedisRepository.saveMemberIfNotInAnyRoom(ROOM_ID.toString(), MEMBER_ID.toString(), memberInfo))
				.willReturn(true);

			CreateCoopRoomResponse response = coopRoomService.createCoopRoom(MEMBER_ID, request);

			assertThat(response.roomId()).isEqualTo(ROOM_ID);
			assertThat(response.teamName()).isEqualTo("gitcat");
			assertThat(response.roomCode()).isEqualTo("COOP12");
			assertThat(response.selectedMap()).isEqualTo(selectedMap);

			ArgumentCaptor<Map<String, Object>> roomInfoCaptor = ArgumentCaptor.forClass(Map.class);
			then(roomRedisRepository).should().saveRoomInfo(eq(ROOM_ID.toString()), roomInfoCaptor.capture());
			assertThat(roomInfoCaptor.getValue())
				.containsEntry("selectedMapId", MAP_ID.toString())
				.containsEntry("selectedMapName", "브랜치 기초")
				.containsEntry("selectedMapDifficulty", 1);
			then(roomRedisRepository).should().addRoomToList(eq(GameMode.COOP), eq(ROOM_ID.toString()), anyDouble());
		}
	}

	@Nested
	class CreateCoopRoomRollback {

		@Test
		void 호스트가_이미_다른_방에_있으면_롤백하고_예외를_던진다() {
			Member member = createMember(MEMBER_ID, "dobby");
			SelectedMapDto selectedMap = new SelectedMapDto(MAP_ID, "브랜치 기초", 1);
			CreateCoopRoomRequest request = new CreateCoopRoomRequest("협력 방", "gitcat", false, null, MAP_ID);
			Map<String, Object> memberInfo = Map.of("playerId", MEMBER_ID.toString(), "nickname", "dobby");

			given(memberService.findById(MEMBER_ID)).willReturn(member);
			given(coopService.getSelectedMap(MAP_ID)).willReturn(selectedMap);
			given(roomCodeGenerator.generate()).willReturn("COOP12");
			given(roomRedisRepository.reserveRoomCode("COOP12")).willReturn(true);
			given(roomRedisRepository.generateRoomId()).willReturn(ROOM_ID);
			given(roomMemberMapper.toMemberInfo(member, true)).willReturn(memberInfo);
			given(roomRedisRepository.saveMemberIfNotInAnyRoom(ROOM_ID.toString(), MEMBER_ID.toString(), memberInfo))
				.willReturn(false);

			assertThatThrownBy(() -> coopRoomService.createCoopRoom(MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ALREADY_IN_ANOTHER_ROOM);

			then(roomRedisRepository).should().deleteRoom(ROOM_ID);
		}
	}

	@Nested
	class JoinCoopRoom {

		@Test
		void 방_모드가_협력_모드가_아니면_ROOM_MODE_MISMATCH를_던진다() throws Exception {
			Map<Object, Object> roomInfo = waitingCoopRoomInfo();
			roomInfo.put("mode", GameMode.CONTRIBUTION.name());

			given(redissonClient.getLock("room:" + ROOM_ID + ":join-lock")).willReturn(rLock);
			given(rLock.tryLock(3L, 10L, TimeUnit.SECONDS)).willReturn(true);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(rLock.isHeldByCurrentThread()).willReturn(true);

			assertThatThrownBy(() -> coopRoomService.joinCoopRoom(MEMBER_ID, ROOM_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_MODE_MISMATCH);

			then(rLock).should().unlock();
			then(roomRedisRepository).should(never()).getMembersCount(anyString());
			then(roomRedisRepository).should(never())
				.saveMemberIfNotInAnyRoom(anyString(), anyString(), anyMap());
		}

		@Test
		void 비밀방_비밀번호_검증이_완료되지_않으면_PASSWORD_NOT_VERIFIED를_던진다() throws Exception {
			Map<Object, Object> roomInfo = waitingCoopRoomInfo();
			roomInfo.put("hasPassword", true);

			given(redissonClient.getLock("room:" + ROOM_ID + ":join-lock")).willReturn(rLock);
			given(rLock.tryLock(3L, 10L, TimeUnit.SECONDS)).willReturn(true);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomRedisRepository.isPasswordVerified(MEMBER_ID.toString(), ROOM_ID)).willReturn(false);
			given(rLock.isHeldByCurrentThread()).willReturn(true);

			assertThatThrownBy(() -> coopRoomService.joinCoopRoom(MEMBER_ID, ROOM_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(PASSWORD_NOT_VERIFIED);

			then(rLock).should().unlock();
			then(roomRedisRepository).should(never()).getMembersCount(anyString());
		}

		@Test
		void 락을_획득하지_못하면_LOCK_ACQUISITION_FAILED를_던진다() throws Exception {
			given(redissonClient.getLock("room:" + ROOM_ID + ":join-lock")).willReturn(rLock);
			given(rLock.tryLock(3L, 10L, TimeUnit.SECONDS)).willReturn(false);

			assertThatThrownBy(() -> coopRoomService.joinCoopRoom(MEMBER_ID, ROOM_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(LOCK_ACQUISITION_FAILED);
		}

		@Test
		void 이미_다른_방에_있으면_ALREADY_IN_ANOTHER_ROOM을_던진다() throws Exception {
			Member member = createMember(MEMBER_ID, "dobby");
			Map<Object, Object> roomInfo = waitingCoopRoomInfo();
			Map<String, Object> memberInfo = Map.of("playerId", MEMBER_ID.toString(), "nickname", "dobby");

			given(redissonClient.getLock("room:" + ROOM_ID + ":join-lock")).willReturn(rLock);
			given(rLock.tryLock(3L, 10L, TimeUnit.SECONDS)).willReturn(true);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomRedisRepository.getMembersCount(ROOM_ID.toString())).willReturn(1L);
			given(memberService.findById(MEMBER_ID)).willReturn(member);
			given(roomMemberMapper.toMemberInfo(member, false)).willReturn(memberInfo);
			given(roomRedisRepository.saveMemberIfNotInAnyRoom(ROOM_ID.toString(), MEMBER_ID.toString(), memberInfo))
				.willReturn(false);
			given(roomRedisRepository.findJoinedRoomId(MEMBER_ID.toString())).willReturn(Optional.of(99L));
			given(rLock.isHeldByCurrentThread()).willReturn(true);

			assertThatThrownBy(() -> coopRoomService.joinCoopRoom(MEMBER_ID, ROOM_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ALREADY_IN_ANOTHER_ROOM);

			then(rLock).should().unlock();
		}
	}

	@Nested
	class JoinCoopRoomAutoLeave {

		@Test
		void 다른_방에_있으면_이전_방을_나가고_현재_방에_입장한다() throws Exception {
			Member member = createMember(MEMBER_ID, "dobby");
			Map<Object, Object> roomInfo = waitingCoopRoomInfo();
			Map<String, Object> memberInfo = Map.of("playerId", MEMBER_ID.toString(), "nickname", "dobby");
			Map<Object, Object> members = Map.of(MEMBER_ID.toString(), "member-json");
			List<PlayerInfoDto> playerInfos = List.of(playerInfo(MEMBER_ID, true));
			SelectedMapDto selectedMap = new SelectedMapDto(MAP_ID, "é‡‰ëš®ì˜–ç§»?æ¹²ê³—í¹", 1);
			Long previousRoomId = 99L;

			given(redissonClient.getLock("room:" + ROOM_ID + ":join-lock")).willReturn(rLock);
			given(rLock.tryLock(3L, 10L, TimeUnit.SECONDS)).willReturn(true);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomRedisRepository.getMembersCount(ROOM_ID.toString())).willReturn(1L);
			given(memberService.findById(MEMBER_ID)).willReturn(member);
			given(roomMemberMapper.toMemberInfo(member, false)).willReturn(memberInfo);
			given(roomRedisRepository.saveMemberIfNotInAnyRoom(ROOM_ID.toString(), MEMBER_ID.toString(), memberInfo))
				.willReturn(false, true);
			given(roomRedisRepository.findJoinedRoomId(MEMBER_ID.toString())).willReturn(Optional.of(previousRoomId));
			given(roomMemberRecoveryService.leavePreviousRoomIfNecessary(MEMBER_ID, ROOM_ID, "coop"))
				.willReturn(true);
			given(coopService.getSelectedMap(MAP_ID)).willReturn(selectedMap);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(members);
			given(roomMemberMapper.toPlayerInfoDtos(members)).willReturn(playerInfos);
			given(rLock.isHeldByCurrentThread()).willReturn(true);

			JoinCoopRoomResponse response = coopRoomService.joinCoopRoom(MEMBER_ID, ROOM_ID);

			assertThat(response.roomId()).isEqualTo(ROOM_ID);
			assertThat(response.hasPassword()).isFalse();
			then(roomMemberRecoveryService).should()
				.leavePreviousRoomIfNecessary(MEMBER_ID, ROOM_ID, "coop");
			then(rLock).should().unlock();
		}
	}

	@Nested
	class UpdateCoopRoomInfo {

		@Test
		void 게임_중인_방은_수정할_수_없다() {
			UpdateCoopRoomInfoRequest request = new UpdateCoopRoomInfoRequest("새 협력 방", "new-team", false, null,
				MAP_ID);
			Map<Object, Object> roomInfo = waitingCoopRoomInfo();
			roomInfo.put("roomState", RoomState.IN_GAME.name());
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));

			assertThatThrownBy(() -> coopRoomService.updateCoopRoomInfo(MEMBER_ID, ROOM_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_IN_GAME);
		}

		@Test
		void 방장이_아니면_NOT_HOST를_던진다() {
			UpdateCoopRoomInfoRequest request = new UpdateCoopRoomInfoRequest("새 협력 방", "new-team", false, null,
				MAP_ID);
			Map<Object, Object> roomInfo = waitingCoopRoomInfo();
			roomInfo.put("hostMemberId", UUID.randomUUID().toString());

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberRecoveryService.ensureMemberInRoom(
				eq(ROOM_ID), eq(MEMBER_ID), same(roomInfo), eq("coop"))).willReturn(true);

			assertThatThrownBy(() -> coopRoomService.updateCoopRoomInfo(MEMBER_ID, ROOM_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(NOT_HOST);

			then(coopService).should(never()).getSelectedMap(any());
		}

		@Test
		void 방_수정_시_selectedMap_메타정보도_함께_저장한다() {
			UpdateCoopRoomInfoRequest request = new UpdateCoopRoomInfoRequest("새 협력 방", "new-team", true, "1234",
				MAP_ID);
			SelectedMapDto selectedMap = new SelectedMapDto(MAP_ID, "브랜치 기초", 1);
			Map<Object, Object> roomInfo = waitingCoopRoomInfo();
			Map<Object, Object> members = Map.of(MEMBER_ID.toString(), "member-json");
			List<PlayerInfoDto> playerInfos = List.of(playerInfo(MEMBER_ID, true));

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberRecoveryService.ensureMemberInRoom(
				eq(ROOM_ID), eq(MEMBER_ID), same(roomInfo), eq("coop"))).willReturn(true);
			given(coopService.getSelectedMap(MAP_ID)).willReturn(selectedMap);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(members);
			given(roomMemberMapper.toPlayerInfoDtos(members)).willReturn(playerInfos);

			coopRoomService.updateCoopRoomInfo(MEMBER_ID, ROOM_ID, request);

			ArgumentCaptor<Map<String, Object>> roomInfoCaptor = ArgumentCaptor.forClass(Map.class);
			then(roomRedisRepository).should().updateRoomInfo(eq(ROOM_ID.toString()), roomInfoCaptor.capture());
			assertThat(roomInfoCaptor.getValue())
				.containsEntry("selectedMapId", MAP_ID.toString())
				.containsEntry("selectedMapName", "브랜치 기초")
				.containsEntry("selectedMapDifficulty", 1);
		}

		@Test
		void memberRoom_매핑_기반으로_members_hash를_복구한_후_방_정보를_수정한다() {
			UpdateCoopRoomInfoRequest request = new UpdateCoopRoomInfoRequest("새 협력 방", "new-team", false, null,
				MAP_ID);
			Map<Object, Object> roomInfo = waitingCoopRoomInfo();
			Map<Object, Object> members = Map.of(MEMBER_ID.toString(), "member-json");
			List<PlayerInfoDto> playerInfos = List.of(playerInfo(MEMBER_ID, true));
			SelectedMapDto selectedMap = new SelectedMapDto(MAP_ID, "브랜치 기초", 1);

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberRecoveryService.ensureMemberInRoom(
				eq(ROOM_ID), eq(MEMBER_ID), same(roomInfo), eq("coop"))).willReturn(true);
			given(coopService.getSelectedMap(MAP_ID)).willReturn(selectedMap);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(members);
			given(roomMemberMapper.toPlayerInfoDtos(members)).willReturn(playerInfos);

			coopRoomService.updateCoopRoomInfo(MEMBER_ID, ROOM_ID, request);

			then(roomMemberRecoveryService).should()
				.ensureMemberInRoom(eq(ROOM_ID), eq(MEMBER_ID), same(roomInfo), eq("coop"));
			then(roomRedisRepository).should().updateRoomInfo(eq(ROOM_ID.toString()), anyMap());
		}

		@Test
		void 방_정보_수정_후_COOP_ROOM_INFO_UPDATED를_브로드캐스트한다() {
			UpdateCoopRoomInfoRequest request = new UpdateCoopRoomInfoRequest("새 협력 방", "new-team", false, null,
				MAP_ID);
			Map<Object, Object> roomInfo = waitingCoopRoomInfo();
			Map<Object, Object> members = Map.of(MEMBER_ID.toString(), "member-json");
			List<PlayerInfoDto> playerInfos = List.of(playerInfo(MEMBER_ID, true));
			SelectedMapDto selectedMap = new SelectedMapDto(MAP_ID, "브랜치 기초", 1);

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberRecoveryService.ensureMemberInRoom(
				eq(ROOM_ID), eq(MEMBER_ID), any(), eq("coop"))).willReturn(true);
			given(coopService.getSelectedMap(MAP_ID)).willReturn(selectedMap);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(members);
			given(roomMemberMapper.toPlayerInfoDtos(members)).willReturn(playerInfos);

			coopRoomService.updateCoopRoomInfo(MEMBER_ID, ROOM_ID, request);

			ArgumentCaptor<CoopRoomInfoUpdatedResponse> responseCaptor = ArgumentCaptor
				.forClass(CoopRoomInfoUpdatedResponse.class);

			then(messageSender).should().send(eq("/topic/room/" + ROOM_ID), responseCaptor.capture());
			assertThat(responseCaptor.getValue().type()).isEqualTo("COOP_ROOM_INFO_UPDATED");
			assertThat(responseCaptor.getValue().hasPassword()).isFalse();
		}
	}

	@Nested
	class GetCoopRoomInfo {

		@Test
		void 방_상세_조회에_성공하면_selectedMap을_포함한_응답을_반환한다() {
			Map<Object, Object> roomInfo = waitingCoopRoomInfo();
			Map<Object, Object> members = Map.of(MEMBER_ID.toString(), "member-json");
			List<PlayerInfoDto> playerInfos = List.of(playerInfo(MEMBER_ID, true));
			SelectedMapDto selectedMap = new SelectedMapDto(MAP_ID, "브랜치 기초", 1);

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberRecoveryService.ensureMemberInRoom(
				eq(ROOM_ID), eq(MEMBER_ID), same(roomInfo), eq("coop"))).willReturn(true);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(members);
			given(roomMemberMapper.toPlayerInfoDtos(members)).willReturn(playerInfos);
			given(coopService.getSelectedMap(MAP_ID)).willReturn(selectedMap);

			CoopRoomInfoResponse response = coopRoomService.getCoopRoomInfo(MEMBER_ID, ROOM_ID);

			assertThat(response.roomId()).isEqualTo(ROOM_ID);
			assertThat(response.hasPassword()).isFalse();
			assertThat(response.teamName()).isEqualTo("gitcat");
			assertThat(response.selectedMap()).isEqualTo(selectedMap);
			assertThat(response.members()).containsExactlyElementsOf(playerInfos);
		}

		@Test
		void 입장에_성공하면_응답을_반환한다() throws Exception {
			Map<Object, Object> roomInfo = waitingCoopRoomInfo();
			Map<Object, Object> members = Map.of(MEMBER_ID.toString(), "member-json");
			List<PlayerInfoDto> playerInfos = List.of(playerInfo(MEMBER_ID, true));
			SelectedMapDto selectedMap = new SelectedMapDto(MAP_ID, "브랜치 기초", 1);

			given(redissonClient.getLock("room:" + ROOM_ID + ":join-lock")).willReturn(rLock);
			given(rLock.tryLock(3L, 10L, TimeUnit.SECONDS)).willReturn(true);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomRedisRepository.getMembersCount(ROOM_ID.toString())).willReturn(1L);
			Member member = createMember(MEMBER_ID, "dobby");
			Map<String, Object> memberInfo = Map.of("playerId", MEMBER_ID.toString(), "nickname", "dobby");
			given(memberService.findById(MEMBER_ID)).willReturn(member);
			given(roomMemberMapper.toMemberInfo(member, false)).willReturn(memberInfo);
			given(roomRedisRepository.saveMemberIfNotInAnyRoom(ROOM_ID.toString(), MEMBER_ID.toString(), memberInfo))
				.willReturn(true);
			given(coopService.getSelectedMap(MAP_ID)).willReturn(selectedMap);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(members);
			given(roomMemberMapper.toPlayerInfoDtos(members)).willReturn(playerInfos);
			given(rLock.isHeldByCurrentThread()).willReturn(true);

			JoinCoopRoomResponse response = coopRoomService.joinCoopRoom(MEMBER_ID, ROOM_ID);

			assertThat(response.roomId()).isEqualTo(ROOM_ID);
			assertThat(response.roomCode()).isEqualTo("COOP12");
			assertThat(response.hasPassword()).isFalse();
			assertThat(response.selectedMap()).isEqualTo(selectedMap);
			assertThat(response.members()).containsExactlyElementsOf(playerInfos);

			InOrder inOrder = inOrder(roomWebSocketEventPublisher, rLock);
			inOrder.verify(roomWebSocketEventPublisher)
				.publishPlayerJoined(ROOM_ID, RoomState.WAITING, MEMBER_ID, playerInfos);
			inOrder.verify(rLock).unlock();
		}

		@Test
		void 협력_방_상세_조회_시_member_room_매핑으로_members_hash를_복구한다() {
			Member member = createMember(MEMBER_ID, "dobby");
			Map<Object, Object> roomInfo = waitingCoopRoomInfo();
			Map<Object, Object> members = Map.of(MEMBER_ID.toString(), "member-json");
			List<PlayerInfoDto> playerInfos = List.of(playerInfo(MEMBER_ID, true));
			SelectedMapDto selectedMap = new SelectedMapDto(MAP_ID, "브랜치기초", 1);

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberRecoveryService.ensureMemberInRoom(
				eq(ROOM_ID), eq(MEMBER_ID), same(roomInfo), eq("coop"))).willReturn(true);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(members);
			given(roomMemberMapper.toPlayerInfoDtos(members)).willReturn(playerInfos);
			given(coopService.getSelectedMap(MAP_ID)).willReturn(selectedMap);

			CoopRoomInfoResponse response = coopRoomService.getCoopRoomInfo(MEMBER_ID, ROOM_ID);

			assertThat(response.roomId()).isEqualTo(ROOM_ID);
			then(roomMemberRecoveryService).should()
				.ensureMemberInRoom(eq(ROOM_ID), eq(MEMBER_ID), same(roomInfo), eq("coop"));
		}
	}

	private Member createMember(UUID memberId, String nickname) {
		Member member = Member.of("user@example.com", "encodedPassword");
		member.updateNickname(nickname);
		ReflectionTestUtils.setField(member, "id", memberId);
		return member;
	}

	private Map<Object, Object> waitingCoopRoomInfo() {
		Map<Object, Object> roomInfo = new LinkedHashMap<>();
		roomInfo.put("roomCode", "COOP12");
		roomInfo.put("title", "협력 방");
		roomInfo.put("teamName", "gitcat");
		roomInfo.put("mode", GameMode.COOP.name());
		roomInfo.put("roomState", RoomState.WAITING.name());
		roomInfo.put("maxPlayers", 4);
		roomInfo.put("hasPassword", false);
		roomInfo.put("hostMemberId", MEMBER_ID.toString());
		roomInfo.put("selectedMapId", MAP_ID.toString());
		return roomInfo;
	}

	private PlayerInfoDto playerInfo(UUID playerId, boolean isHost) {
		return new PlayerInfoDto(
			playerId,
			"dobby",
			"Hairstyle_01",
			"Hairstyle-color_01",
			"Body_01",
			"Eyes_01",
			"Outfit_01",
			"Outfit-color_01",
			false,
			isHost);
	}
}

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
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.test.util.ReflectionTestUtils;

import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.room.dto.request.CreateContributionRoomRequest;
import com.gitcat.letsgitit.domain.room.dto.request.UpdateContributionRoomRequest;
import com.gitcat.letsgitit.domain.room.dto.response.ContributionRoomInfoResponse;
import com.gitcat.letsgitit.domain.room.dto.response.ContributionRoomInfoUpdatedResponse;
import com.gitcat.letsgitit.domain.room.dto.response.CreateContributionRoomResponse;
import com.gitcat.letsgitit.domain.room.dto.response.JoinContributionRoomResponse;
import com.gitcat.letsgitit.domain.room.dto.response.PlayerInfoDto;
import com.gitcat.letsgitit.domain.room.entity.enums.RoomState;
import com.gitcat.letsgitit.domain.room.repository.RoomRedisRepository;
import com.gitcat.letsgitit.domain.room.util.RoomMemberMapper;
import com.gitcat.letsgitit.global.enums.GameMode;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.websocket.WebSocketMessageSender;

@ExtendWith(MockitoExtension.class)
class ContributionRoomServiceImplTest {

	private static final UUID MEMBER_ID = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001");
	private static final Long ROOM_ID = 1L;

	@InjectMocks
	private ContributionRoomServiceImpl contributionRoomService;

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
	class CreateContributionRoom {

		@Test
		void 방_생성에_성공하면_redis에_저장하고_응답을_반환한다() {
			CreateContributionRoomRequest request = new CreateContributionRoomRequest("기여도 방", 4, true, "1234");

			Member member = createMember(MEMBER_ID, "dobby");
			Map<String, Object> memberInfo = Map.of("playerId", MEMBER_ID.toString(), "nickname", "dobby");

			given(memberService.findById(MEMBER_ID)).willReturn(member);
			given(roomCodeGenerator.generate()).willReturn("ABC123");
			given(roomRedisRepository.reserveRoomCode("ABC123")).willReturn(true);
			given(roomRedisRepository.generateRoomId()).willReturn(ROOM_ID);
			given(roomMemberMapper.toMemberInfo(member, true)).willReturn(memberInfo);
			given(roomRedisRepository.saveMemberIfNotInAnyRoom(ROOM_ID.toString(), MEMBER_ID.toString(), memberInfo))
				.willReturn(true);

			CreateContributionRoomResponse response = contributionRoomService.createContributionRoom(MEMBER_ID,
				request);

			assertThat(response.roomId()).isEqualTo(ROOM_ID);
			assertThat(response.roomCode()).isEqualTo("ABC123");
			assertThat(response.title()).isEqualTo("기여도 방");
			assertThat(response.hasPassword()).isTrue();
			assertThat(response.maxPlayers()).isEqualTo(4);

			then(roomRedisRepository).should().saveRoomInfo(eq(ROOM_ID.toString()), anyMap());
			then(roomRedisRepository).should().confirmRoomCode("ABC123", ROOM_ID.toString());
			then(roomRedisRepository).should().addRoomToList(eq(GameMode.CONTRIBUTION), eq(ROOM_ID.toString()),
				anyDouble());
		}

		@Test
		void 호스트가_이미_다른_방에_있으면_롤백하고_예외를_던진다() {
			Member member = createMember(MEMBER_ID, "dobby");
			CreateContributionRoomRequest request = new CreateContributionRoomRequest("기여도 방", 4, false, null);
			Map<String, Object> memberInfo = Map.of("playerId", MEMBER_ID.toString(), "nickname", "dobby");

			given(memberService.findById(MEMBER_ID)).willReturn(member);
			given(roomCodeGenerator.generate()).willReturn("ABC123");
			given(roomRedisRepository.reserveRoomCode("ABC123")).willReturn(true);
			given(roomRedisRepository.generateRoomId()).willReturn(ROOM_ID);
			given(roomMemberMapper.toMemberInfo(member, true)).willReturn(memberInfo);
			given(roomRedisRepository.saveMemberIfNotInAnyRoom(ROOM_ID.toString(), MEMBER_ID.toString(), memberInfo))
				.willReturn(false);

			assertThatThrownBy(() -> contributionRoomService.createContributionRoom(MEMBER_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ALREADY_IN_ANOTHER_ROOM);

			then(roomRedisRepository).should().deleteRoom(ROOM_ID);
		}
	}

	@Nested
	class JoinContributionRoom {

		@Test
		void 방_모드가_기여도_모드가_아니면_ROOM_MODE_MISMATCH를_던진다() throws Exception {
			Map<Object, Object> roomInfo = waitingContributionRoomInfo();
			roomInfo.put("mode", GameMode.COOP.name());

			given(redissonClient.getLock("room:" + ROOM_ID + ":join-lock")).willReturn(rLock);
			given(rLock.tryLock(3L, 10L, TimeUnit.SECONDS)).willReturn(true);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(rLock.isHeldByCurrentThread()).willReturn(true);

			assertThatThrownBy(() -> contributionRoomService.joinContributionRoom(MEMBER_ID, ROOM_ID))
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
			Map<Object, Object> roomInfo = waitingContributionRoomInfo();
			roomInfo.put("hasPassword", true);

			given(redissonClient.getLock("room:" + ROOM_ID + ":join-lock")).willReturn(rLock);
			given(rLock.tryLock(3L, 10L, TimeUnit.SECONDS)).willReturn(true);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomRedisRepository.isPasswordVerified(MEMBER_ID.toString(), ROOM_ID)).willReturn(false);
			given(rLock.isHeldByCurrentThread()).willReturn(true);

			assertThatThrownBy(() -> contributionRoomService.joinContributionRoom(MEMBER_ID, ROOM_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(PASSWORD_NOT_VERIFIED);

			then(rLock).should().unlock();
			then(roomRedisRepository).should(never()).getMembersCount(anyString());
		}

		@Test
		void 이미_같은_방에_입장해_있으면_ALREADY_IN_ROOM을_던진다() throws Exception {
			Member member = createMember(MEMBER_ID, "dobby");
			Map<Object, Object> roomInfo = waitingContributionRoomInfo();
			Map<String, Object> memberInfo = Map.of("playerId", MEMBER_ID.toString(), "nickname", "dobby");

			given(redissonClient.getLock("room:" + ROOM_ID + ":join-lock")).willReturn(rLock);
			given(rLock.tryLock(3L, 10L, TimeUnit.SECONDS)).willReturn(true);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomRedisRepository.getMembersCount(ROOM_ID.toString())).willReturn(1L);
			given(memberService.findById(MEMBER_ID)).willReturn(member);
			given(roomMemberMapper.toMemberInfo(member, false)).willReturn(memberInfo);
			given(roomRedisRepository.saveMemberIfNotInAnyRoom(ROOM_ID.toString(), MEMBER_ID.toString(), memberInfo))
				.willReturn(false);
			given(roomRedisRepository.findJoinedRoomId(MEMBER_ID.toString())).willReturn(Optional.of(ROOM_ID));
			given(rLock.isHeldByCurrentThread()).willReturn(true);

			assertThatThrownBy(() -> contributionRoomService.joinContributionRoom(MEMBER_ID, ROOM_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ALREADY_IN_ROOM);

			then(rLock).should().unlock();
		}

		@Test
		void 입장에_성공하면_응답을_반환한다() throws Exception {
			Member member = createMember(MEMBER_ID, "dobby");
			Map<Object, Object> roomInfo = waitingContributionRoomInfo();
			Map<String, Object> memberInfo = Map.of("playerId", MEMBER_ID.toString(), "nickname", "dobby");
			Map<Object, Object> members = Map.of(MEMBER_ID.toString(), "member-json");
			List<PlayerInfoDto> playerInfos = List.of(playerInfo(MEMBER_ID, true));

			given(redissonClient.getLock("room:" + ROOM_ID + ":join-lock")).willReturn(rLock);
			given(rLock.tryLock(3L, 10L, TimeUnit.SECONDS)).willReturn(true);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomRedisRepository.getMembersCount(ROOM_ID.toString())).willReturn(1L);
			given(memberService.findById(MEMBER_ID)).willReturn(member);
			given(roomMemberMapper.toMemberInfo(member, false)).willReturn(memberInfo);
			given(roomRedisRepository.saveMemberIfNotInAnyRoom(ROOM_ID.toString(), MEMBER_ID.toString(), memberInfo))
				.willReturn(true);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(members);
			given(roomMemberMapper.toPlayerInfoDtos(members)).willReturn(playerInfos);
			given(rLock.isHeldByCurrentThread()).willReturn(true);

			JoinContributionRoomResponse response = contributionRoomService.joinContributionRoom(MEMBER_ID, ROOM_ID);

			assertThat(response.roomId()).isEqualTo(ROOM_ID);
			assertThat(response.mode()).isEqualTo(GameMode.CONTRIBUTION);
			assertThat(response.roomState()).isEqualTo(RoomState.WAITING);
			assertThat(response.currentPlayers()).isEqualTo(1);
			assertThat(response.members()).containsExactlyElementsOf(playerInfos);

			InOrder inOrder = inOrder(roomWebSocketEventPublisher, rLock);
			inOrder.verify(roomWebSocketEventPublisher)
				.publishPlayerJoined(ROOM_ID, RoomState.WAITING, MEMBER_ID, playerInfos);
			inOrder.verify(rLock).unlock();
		}
	}

	@Nested
	class JoinContributionRoomAutoLeave {

		@Test
		void 다른_방에_있으면_이전_방을_나가고_현재_방에_입장한다() throws Exception {
			Member member = createMember(MEMBER_ID, "dobby");
			Map<Object, Object> roomInfo = waitingContributionRoomInfo();
			Map<String, Object> memberInfo = Map.of("playerId", MEMBER_ID.toString(), "nickname", "dobby");
			Map<Object, Object> members = Map.of(MEMBER_ID.toString(), "member-json");
			List<PlayerInfoDto> playerInfos = List.of(playerInfo(MEMBER_ID, true));
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
			given(roomMemberRecoveryService.leavePreviousRoomIfNecessary(MEMBER_ID, ROOM_ID, "contribution"))
				.willReturn(true);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(members);
			given(roomMemberMapper.toPlayerInfoDtos(members)).willReturn(playerInfos);
			given(rLock.isHeldByCurrentThread()).willReturn(true);

			JoinContributionRoomResponse response = contributionRoomService.joinContributionRoom(MEMBER_ID, ROOM_ID);

			assertThat(response.roomId()).isEqualTo(ROOM_ID);
			then(roomMemberRecoveryService).should()
				.leavePreviousRoomIfNecessary(MEMBER_ID, ROOM_ID, "contribution");
			then(rLock).should().unlock();
		}
	}

	@Nested
	class UpdateContributionRoomInfo {

		@Test
		void 게임_중인_방은_수정할_수_없다() {
			UpdateContributionRoomRequest request = new UpdateContributionRoomRequest("새 제목", 4, false, null);
			Map<Object, Object> roomInfo = waitingContributionRoomInfo();
			roomInfo.put("roomState", RoomState.IN_GAME.name());
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));

			assertThatThrownBy(() -> contributionRoomService.updateContributionRoomInfo(MEMBER_ID, ROOM_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_IN_GAME);
		}

		@Test
		void 방_회원이_아니면_PLAYER_NOT_IN_ROOM을_던진다() {
			UpdateContributionRoomRequest request = new UpdateContributionRoomRequest("새 제목", 4, false, null);
			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString()))
				.willReturn(Optional.of(waitingContributionRoomInfo()));
			given(roomMemberRecoveryService.ensureMemberInRoom(
				eq(ROOM_ID), eq(MEMBER_ID), anyMap(), eq("contribution"))).willReturn(false);

			assertThatThrownBy(() -> contributionRoomService.updateContributionRoomInfo(MEMBER_ID, ROOM_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(PLAYER_NOT_IN_ROOM);
		}

		@Test
		void memberRoom_매핑_기반으로_members_hash를_복구한_후_방_정보를_수정한다() {
			UpdateContributionRoomRequest request = new UpdateContributionRoomRequest("새 제목", 4, false, null);
			Map<Object, Object> roomInfo = waitingContributionRoomInfo();
			Map<Object, Object> members = Map.of(MEMBER_ID.toString(), "member-json");
			List<PlayerInfoDto> playerInfos = List.of(playerInfo(MEMBER_ID, true));

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberRecoveryService.ensureMemberInRoom(
				eq(ROOM_ID), eq(MEMBER_ID), same(roomInfo), eq("contribution"))).willReturn(true);
			given(roomRedisRepository.getMembersCount(ROOM_ID.toString())).willReturn(1L);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(members);
			given(roomMemberMapper.toPlayerInfoDtos(members)).willReturn(playerInfos);

			contributionRoomService.updateContributionRoomInfo(MEMBER_ID, ROOM_ID, request);

			then(roomMemberRecoveryService).should()
				.ensureMemberInRoom(eq(ROOM_ID), eq(MEMBER_ID), same(roomInfo), eq("contribution"));
			then(roomRedisRepository).should().updateRoomInfo(eq(ROOM_ID.toString()), anyMap());
		}

		@Test
		void 방장이_아니면_NOT_HOST를_던진다() {
			UpdateContributionRoomRequest request = new UpdateContributionRoomRequest("새 제목", 4, false, null);
			Map<Object, Object> roomInfo = waitingContributionRoomInfo();
			roomInfo.put("hostMemberId", UUID.randomUUID().toString());

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberRecoveryService.ensureMemberInRoom(
				eq(ROOM_ID), eq(MEMBER_ID), same(roomInfo), eq("contribution"))).willReturn(true);

			assertThatThrownBy(() -> contributionRoomService.updateContributionRoomInfo(MEMBER_ID, ROOM_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(NOT_HOST);
		}

		@Test
		void maxPlayers가_현재_인원수보다_작으면_CANNOT_REDUCE_MAX_PLAYERS_BELOW_CURRENT를_던진다() {
			UpdateContributionRoomRequest request = new UpdateContributionRoomRequest("새 제목", 2, false, null);
			Map<Object, Object> roomInfo = waitingContributionRoomInfo();

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberRecoveryService.ensureMemberInRoom(
				eq(ROOM_ID), eq(MEMBER_ID), same(roomInfo), eq("contribution"))).willReturn(true);
			given(roomRedisRepository.getMembersCount(ROOM_ID.toString())).willReturn(3L);

			assertThatThrownBy(() -> contributionRoomService.updateContributionRoomInfo(MEMBER_ID, ROOM_ID, request))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(CANNOT_REDUCE_MAX_PLAYERS_BELOW_CURRENT);
		}

		@Test
		void 방_정보_수정_후_ROOM_INFO_UPDATED를_브로드캐스트한다() {
			UpdateContributionRoomRequest request = new UpdateContributionRoomRequest("새 제목", 4, false, null);
			Map<Object, Object> roomInfo = waitingContributionRoomInfo();
			Map<Object, Object> members = Map.of(MEMBER_ID.toString(), "member-json");
			List<PlayerInfoDto> playerInfos = List.of(playerInfo(MEMBER_ID, true));

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberRecoveryService.ensureMemberInRoom(
				eq(ROOM_ID), eq(MEMBER_ID), any(), eq("contribution"))).willReturn(true);
			given(roomRedisRepository.getMembersCount(ROOM_ID.toString())).willReturn(1L);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(members);
			given(roomMemberMapper.toPlayerInfoDtos(members)).willReturn(playerInfos);

			contributionRoomService.updateContributionRoomInfo(MEMBER_ID, ROOM_ID, request);

			then(messageSender).should().send(eq("/topic/room/" + ROOM_ID),
				any(ContributionRoomInfoUpdatedResponse.class));
		}
	}

	@Nested
	class GetContributionRoomInfo {

		@Test
		void 방_상세_조회에_성공하면_응답을_반환한다() {
			Map<Object, Object> roomInfo = waitingContributionRoomInfo();
			Map<Object, Object> members = Map.of(MEMBER_ID.toString(), "member-json");
			List<PlayerInfoDto> playerInfos = List.of(playerInfo(MEMBER_ID, true));

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberRecoveryService.ensureMemberInRoom(
				eq(ROOM_ID), eq(MEMBER_ID), same(roomInfo), eq("contribution"))).willReturn(true);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(members);
			given(roomMemberMapper.toPlayerInfoDtos(members)).willReturn(playerInfos);

			ContributionRoomInfoResponse response = contributionRoomService.getContributionRoomInfo(MEMBER_ID, ROOM_ID);

			assertThat(response.roomId()).isEqualTo(ROOM_ID);
			assertThat(response.roomCode()).isEqualTo("ABC123");
			assertThat(response.currentPlayers()).isEqualTo(1);
			assertThat(response.members()).containsExactlyElementsOf(playerInfos);
		}

		@Test
		void 기여도_방_상세_조회_시_member_room_매핑으로_members_hash를_복구한다() {
			Map<Object, Object> roomInfo = waitingContributionRoomInfo();
			Map<Object, Object> members = Map.of(MEMBER_ID.toString(), "member-json");
			List<PlayerInfoDto> playerInfos = List.of(playerInfo(MEMBER_ID, true));

			given(roomRedisRepository.getRoomInfo(ROOM_ID.toString())).willReturn(Optional.of(roomInfo));
			given(roomMemberRecoveryService.ensureMemberInRoom(
				eq(ROOM_ID), eq(MEMBER_ID), same(roomInfo), eq("contribution"))).willReturn(true);
			given(roomRedisRepository.getMembers(ROOM_ID.toString())).willReturn(members);
			given(roomMemberMapper.toPlayerInfoDtos(members)).willReturn(playerInfos);

			ContributionRoomInfoResponse response = contributionRoomService.getContributionRoomInfo(MEMBER_ID, ROOM_ID);

			assertThat(response.roomId()).isEqualTo(ROOM_ID);
			then(roomMemberRecoveryService).should()
				.ensureMemberInRoom(eq(ROOM_ID), eq(MEMBER_ID), same(roomInfo), eq("contribution"));
		}
	}

	private Member createMember(UUID memberId, String nickname) {
		Member member = Member.of("user@example.com", "encodedPassword");
		member.updateNickname(nickname);
		ReflectionTestUtils.setField(member, "id", memberId);
		return member;
	}

	private Map<Object, Object> waitingContributionRoomInfo() {
		Map<Object, Object> roomInfo = new LinkedHashMap<>();
		roomInfo.put("roomCode", "ABC123");
		roomInfo.put("title", "기여도 방");
		roomInfo.put("mode", GameMode.CONTRIBUTION.name());
		roomInfo.put("roomState", RoomState.WAITING.name());
		roomInfo.put("maxPlayers", 4);
		roomInfo.put("hasPassword", false);
		roomInfo.put("hostMemberId", MEMBER_ID.toString());
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

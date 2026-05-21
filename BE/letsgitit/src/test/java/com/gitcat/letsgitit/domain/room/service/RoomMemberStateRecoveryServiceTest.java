package com.gitcat.letsgitit.domain.room.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.room.repository.RoomRedisRepository;
import com.gitcat.letsgitit.domain.room.util.RoomMemberMapper;

@ExtendWith(MockitoExtension.class)
class RoomMemberStateRecoveryServiceTest {

	private static final UUID MEMBER_ID = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001");
	private static final UUID HOST_ID = UUID.fromString("bbbbbbbb-0000-0000-0000-000000000002");
	private static final Long ROOM_ID = 1L;
	private static final Long PREVIOUS_ROOM_ID = 99L;

	@InjectMocks
	private RoomMemberStateRecoveryService roomMemberStateRecoveryService;

	@Mock
	private MemberService memberService;

	@Mock
	private RoomRedisRepository roomRedisRepository;

	@Mock
	private RoomMemberMapper roomMemberMapper;

	@Nested
	class EnsureMemberInRoom {

		@Test
		void existsMember가_true면_복구_없이_true를_반환한다() {
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);

			boolean result = roomMemberStateRecoveryService.ensureMemberInRoom(ROOM_ID, MEMBER_ID, roomInfo(), "coop");

			assertThat(result).isTrue();
			then(roomRedisRepository).should(never()).findJoinedRoomId(any());
			then(memberService).should(never()).findById(any());
		}

		@Test
		void findJoinedRoomId가_empty면_false를_반환한다() {
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(false);
			given(roomRedisRepository.findJoinedRoomId(MEMBER_ID.toString())).willReturn(Optional.empty());

			boolean result = roomMemberStateRecoveryService.ensureMemberInRoom(ROOM_ID, MEMBER_ID, roomInfo(), "coop");

			assertThat(result).isFalse();
			then(memberService).should(never()).findById(any());
		}

		@Test
		void findJoinedRoomId가_다른_roomId면_false를_반환한다() {
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(false);
			given(roomRedisRepository.findJoinedRoomId(MEMBER_ID.toString())).willReturn(Optional.of(PREVIOUS_ROOM_ID));

			boolean result = roomMemberStateRecoveryService.ensureMemberInRoom(ROOM_ID, MEMBER_ID, roomInfo(), "coop");

			assertThat(result).isFalse();
			then(memberService).should(never()).findById(any());
		}

		@Test
		void 정상_복구_성공_경로에서_멤버를_저장하고_true를_반환한다() {
			Member member = createMember(MEMBER_ID, "dobby");
			Map<String, Object> memberInfo = Map.of("playerId", MEMBER_ID.toString(), "isHost", false);
			Map<Object, Object> info = roomInfo();

			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(false);
			given(roomRedisRepository.findJoinedRoomId(MEMBER_ID.toString())).willReturn(Optional.of(ROOM_ID));
			given(memberService.findById(MEMBER_ID)).willReturn(member);
			given(roomMemberMapper.toMemberInfo(member, false)).willReturn(memberInfo);

			boolean result = roomMemberStateRecoveryService.ensureMemberInRoom(ROOM_ID, MEMBER_ID, info, "coop");

			assertThat(result).isTrue();
			then(roomRedisRepository).should().saveMember(ROOM_ID.toString(), MEMBER_ID.toString(), memberInfo);
		}

		@Test
		void roomInfo에_hostMemberId가_없으면_IllegalStateException을_던진다() {
			Map<Object, Object> infoWithoutHost = new LinkedHashMap<>();
			infoWithoutHost.put("roomCode", "ABC123");

			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(false);
			given(roomRedisRepository.findJoinedRoomId(MEMBER_ID.toString())).willReturn(Optional.of(ROOM_ID));
			given(memberService.findById(MEMBER_ID)).willReturn(createMember(MEMBER_ID, "dobby"));

			assertThatThrownBy(
				() -> roomMemberStateRecoveryService.ensureMemberInRoom(ROOM_ID, MEMBER_ID, infoWithoutHost, "coop"))
				.isInstanceOf(IllegalStateException.class);
		}
	}

	private Map<Object, Object> roomInfo() {
		Map<Object, Object> info = new LinkedHashMap<>();
		info.put("roomCode", "ABC123");
		info.put("hostMemberId", HOST_ID.toString());
		return info;
	}

	private Member createMember(UUID memberId, String nickname) {
		Member member = Member.of("user@example.com", "encodedPassword");
		member.updateNickname(nickname);
		ReflectionTestUtils.setField(member, "id", memberId);
		return member;
	}
}

package com.gitcat.letsgitit.domain.room.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;
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

import com.gitcat.letsgitit.domain.room.repository.RoomRedisRepository;
import com.gitcat.letsgitit.global.exception.BusinessException;

@ExtendWith(MockitoExtension.class)
class RoomMemberRecoveryServiceTest {

	private static final UUID MEMBER_ID = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001");
	private static final UUID HOST_ID = UUID.fromString("bbbbbbbb-0000-0000-0000-000000000002");
	private static final Long ROOM_ID = 1L;
	private static final Long PREVIOUS_ROOM_ID = 99L;

	@InjectMocks
	private RoomMemberRecoveryService roomMemberRecoveryService;

	@Mock
	private RoomMemberStateRecoveryService roomMemberStateRecoveryService;

	@Mock
	private RoomRedisRepository roomRedisRepository;

	@Mock
	private RoomService roomService;

	@Nested
	class EnsureMemberInRoom {

		@Test
		void 멤버_상태_복구_서비스에_위임한다() {
			Map<Object, Object> roomInfo = roomInfo();
			given(roomMemberStateRecoveryService.ensureMemberInRoom(ROOM_ID, MEMBER_ID, roomInfo, "coop"))
				.willReturn(true);

			boolean result = roomMemberRecoveryService.ensureMemberInRoom(ROOM_ID, MEMBER_ID, roomInfo, "coop");

			assertThat(result).isTrue();
			then(roomMemberStateRecoveryService).should().ensureMemberInRoom(ROOM_ID, MEMBER_ID, roomInfo, "coop");
		}
	}

	@Nested
	class LeavePreviousRoomIfNecessary {

		@Test
		void findJoinedRoomId가_empty면_false를_반환한다() {
			given(roomRedisRepository.findJoinedRoomId(MEMBER_ID.toString())).willReturn(Optional.empty());

			boolean result = roomMemberRecoveryService.leavePreviousRoomIfNecessary(MEMBER_ID, ROOM_ID, "coop");

			assertThat(result).isFalse();
			then(roomService).should(never()).leaveRoom(anyLong(), any());
		}

		@Test
		void findJoinedRoomId가_targetRoomId와_같으면_false를_반환한다() {
			given(roomRedisRepository.findJoinedRoomId(MEMBER_ID.toString())).willReturn(Optional.of(ROOM_ID));

			boolean result = roomMemberRecoveryService.leavePreviousRoomIfNecessary(MEMBER_ID, ROOM_ID, "coop");

			assertThat(result).isFalse();
			then(roomService).should(never()).leaveRoom(anyLong(), any());
		}

		@Test
		void 다른_방에_있으면_leaveRoom을_호출하고_true를_반환한다() {
			given(roomRedisRepository.findJoinedRoomId(MEMBER_ID.toString())).willReturn(Optional.of(PREVIOUS_ROOM_ID));

			boolean result = roomMemberRecoveryService.leavePreviousRoomIfNecessary(MEMBER_ID, ROOM_ID, "coop");

			assertThat(result).isTrue();
			then(roomService).should().leaveRoom(PREVIOUS_ROOM_ID, MEMBER_ID);
		}

		@Test
		void leaveRoom이_ROOM_NOT_FOUND를_던지면_removeMember를_호출하고_true를_반환한다() {
			given(roomRedisRepository.findJoinedRoomId(MEMBER_ID.toString())).willReturn(Optional.of(PREVIOUS_ROOM_ID));
			willThrow(new BusinessException(ROOM_NOT_FOUND)).given(roomService).leaveRoom(PREVIOUS_ROOM_ID, MEMBER_ID);

			boolean result = roomMemberRecoveryService.leavePreviousRoomIfNecessary(MEMBER_ID, ROOM_ID, "coop");

			assertThat(result).isTrue();
			then(roomRedisRepository).should().removeMember(PREVIOUS_ROOM_ID, MEMBER_ID.toString());
		}

		@Test
		void leaveRoom이_다른_BusinessException을_던지면_예외를_재던진다() {
			given(roomRedisRepository.findJoinedRoomId(MEMBER_ID.toString())).willReturn(Optional.of(PREVIOUS_ROOM_ID));
			willThrow(new BusinessException(ROOM_FULL)).given(roomService).leaveRoom(PREVIOUS_ROOM_ID, MEMBER_ID);

			assertThatThrownBy(
				() -> roomMemberRecoveryService.leavePreviousRoomIfNecessary(MEMBER_ID, ROOM_ID, "coop"))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_FULL);
		}
	}

	private Map<Object, Object> roomInfo() {
		Map<Object, Object> info = new LinkedHashMap<>();
		info.put("roomCode", "ABC123");
		info.put("hostMemberId", HOST_ID.toString());
		return info;
	}

}

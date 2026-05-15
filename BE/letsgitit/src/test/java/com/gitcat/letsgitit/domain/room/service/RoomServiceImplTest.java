package com.gitcat.letsgitit.domain.room.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.BDDMockito.*;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;

import com.gitcat.letsgitit.domain.coop.service.CoopService;
import com.gitcat.letsgitit.domain.room.dto.RoomCache;
import com.gitcat.letsgitit.domain.room.dto.response.RoomListResponse;
import com.gitcat.letsgitit.domain.room.dto.response.RoomSearchResponse;
import com.gitcat.letsgitit.domain.room.repository.RoomRedisRepository;
import com.gitcat.letsgitit.global.enums.RoomMode;
import com.gitcat.letsgitit.global.exception.BusinessException;

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

	private static final Long ROOM_ID = 1L;
	private static final UUID MEMBER_ID = UUID.fromString("aaaaaaaa-0000-0000-0000-000000000001");
	private static final UUID OTHER_ID = UUID.fromString("bbbbbbbb-0000-0000-0000-000000000002");

	private RoomCache buildRoom(String mode, String roomState) {
		return new RoomCache(ROOM_ID, "테스트 방", mode, 2, 4, false, roomState, null);
	}

	@Nested
	class GetRooms {

		@Test
		void ALL_모드는_모든_방을_반환한다() {
			RoomCache contribution = buildRoom("CONTRIBUTION", "WAITING");
			RoomCache coop = buildRoom("COOP", "WAITING");
			given(roomRedisRepository.findAll()).willReturn(List.of(contribution, coop));

			RoomListResponse result = roomService.getRooms(RoomMode.ALL);

			assertThat(result.rooms()).hasSize(2);
		}

		@Test
		void CONTRIBUTION_모드는_기여도_뺏기_방만_반환한다() {
			RoomCache contribution = buildRoom("CONTRIBUTION", "WAITING");
			RoomCache coop = buildRoom("COOP", "WAITING");
			given(roomRedisRepository.findAll()).willReturn(List.of(contribution, coop));

			RoomListResponse result = roomService.getRooms(RoomMode.CONTRIBUTION);

			assertThat(result.rooms()).hasSize(1);
			assertThat(result.rooms().get(0).mode()).isEqualTo("CONTRIBUTION");
		}

		@Test
		void COOP_모드는_협력_방만_반환한다() {
			RoomCache contribution = buildRoom("CONTRIBUTION", "WAITING");
			RoomCache coop = buildRoom("COOP", "WAITING");
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
			RoomCache room = buildRoom("CONTRIBUTION", "WAITING");
			given(roomRedisRepository.findByCode("ABC123")).willReturn(Optional.of(room));

			RoomSearchResponse result = roomService.searchByCode("ABC123");

			assertThat(result.roomId()).isEqualTo(ROOM_ID);
			assertThat(result.roomState()).isEqualTo("WAITING");
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
			RoomCache room = buildRoom("CONTRIBUTION", "IN_GAME");
			given(roomRedisRepository.findByCode("ABC123")).willReturn(Optional.of(room));

			assertThatThrownBy(() -> roomService.searchByCode("ABC123"))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_IN_GAME);
		}
	}

	@Nested
	class KickMember {

		@Test
		void 방장이_멤버를_추방하면_removeMember를_호출한다() {
			String targetId = OTHER_ID.toString();
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(MEMBER_ID.toString());
			given(roomRedisRepository.existsMember(ROOM_ID, targetId)).willReturn(true);

			roomService.kickMember(ROOM_ID, MEMBER_ID, targetId);

			then(roomRedisRepository).should().removeMember(ROOM_ID, targetId);
		}

		@Test
		void 방이_없으면_ROOM_NOT_FOUND를_던진다() {
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(false);

			assertThatThrownBy(() -> roomService.kickMember(ROOM_ID, MEMBER_ID, OTHER_ID.toString()))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(ROOM_NOT_FOUND);
		}

		@Test
		void 방장이_아니면_NOT_HOST를_던진다() {
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(OTHER_ID.toString());

			assertThatThrownBy(() -> roomService.kickMember(ROOM_ID, MEMBER_ID, OTHER_ID.toString()))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(NOT_HOST);
		}

		@Test
		void 자기_자신을_추방하면_CANNOT_KICK_SELF를_던진다() {
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(MEMBER_ID.toString());

			assertThatThrownBy(() -> roomService.kickMember(ROOM_ID, MEMBER_ID, MEMBER_ID.toString()))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(CANNOT_KICK_SELF);
		}

		@Test
		void 대상_멤버가_없으면_PLAYER_NOT_FOUND를_던진다() {
			String targetId = OTHER_ID.toString();
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(MEMBER_ID.toString());
			given(roomRedisRepository.existsMember(ROOM_ID, targetId)).willReturn(false);

			assertThatThrownBy(() -> roomService.kickMember(ROOM_ID, MEMBER_ID, targetId))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(PLAYER_NOT_FOUND);
		}
	}

	@Nested
	class LeaveRoom {

		@Test
		void 방장이_아닌_멤버가_나가면_removeMember만_호출한다() {
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(OTHER_ID.toString());

			roomService.leaveRoom(ROOM_ID, MEMBER_ID);

			then(roomRedisRepository).should().removeMember(ROOM_ID, MEMBER_ID.toString());
			then(roomRedisRepository).should(never()).dissolveRoom(any());
			then(roomRedisRepository).should(never()).updateHostId(any(), any());
		}

		@Test
		void 방장이_나가고_남은_멤버가_있으면_방장을_위임한다() {
			String newHostId = OTHER_ID.toString();
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(MEMBER_ID.toString());
			given(roomRedisRepository.findAllMemberIds(ROOM_ID)).willReturn(Set.of(newHostId));

			roomService.leaveRoom(ROOM_ID, MEMBER_ID);

			then(roomRedisRepository).should().updateHostId(ROOM_ID, newHostId);
			then(roomRedisRepository).should(never()).dissolveRoom(any());
		}

		@Test
		void 방장이_나가고_남은_멤버가_없으면_방을_해산한다() {
			given(roomRedisRepository.existsById(ROOM_ID)).willReturn(true);
			given(redissonClient.getLock(anyString())).willReturn(rLock);
			given(roomRedisRepository.existsMember(ROOM_ID, MEMBER_ID.toString())).willReturn(true);
			given(roomRedisRepository.findHostIdById(ROOM_ID)).willReturn(MEMBER_ID.toString());
			given(roomRedisRepository.findAllMemberIds(ROOM_ID)).willReturn(Set.of());

			roomService.leaveRoom(ROOM_ID, MEMBER_ID);

			then(roomRedisRepository).should().dissolveRoom(ROOM_ID);
			then(roomRedisRepository).should(never()).updateHostId(any(), any());
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

			assertThatThrownBy(() -> roomService.leaveRoom(ROOM_ID, MEMBER_ID))
				.isInstanceOf(BusinessException.class)
				.extracting(e -> ((BusinessException)e).getErrorCode())
				.isEqualTo(PLAYER_NOT_IN_ROOM);
		}
	}
}

package com.gitcat.letsgitit.domain.room.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.ROOM_NOT_FOUND;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.gitcat.letsgitit.domain.room.repository.RoomRedisRepository;
import com.gitcat.letsgitit.global.exception.BusinessException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoomMemberRecoveryService {

	private final RoomMemberStateRecoveryService roomMemberStateRecoveryService;
	private final RoomRedisRepository roomRedisRepository;
	private final RoomService roomService;

	public boolean ensureMemberInRoom(Long roomId, UUID memberId, Map<Object, Object> roomInfo, String context) {
		return roomMemberStateRecoveryService.ensureMemberInRoom(roomId, memberId, roomInfo, context);
	}

	public boolean leavePreviousRoomIfNecessary(UUID memberId, Long targetRoomId, String context) {
		String memberIdValue = memberId.toString();
		Optional<Long> joinedRoomId = roomRedisRepository.findJoinedRoomId(memberIdValue);
		if (joinedRoomId.isEmpty() || joinedRoomId.get().equals(targetRoomId)) {
			return false;
		}

		Long previousRoomId = joinedRoomId.get();
		try {
			roomService.leaveRoom(previousRoomId, memberId);
			log.info("[room] {} room auto-left previous room. memberId={}, previousRoomId={}, targetRoomId={}",
				context, memberId, previousRoomId, targetRoomId);
		} catch (BusinessException e) {
			if (e.getErrorCode() != ROOM_NOT_FOUND) {
				throw e;
			}
			roomRedisRepository.removeMember(previousRoomId, memberIdValue);
			log.warn(
				"[room] {} room stale previous room mapping cleaned. memberId={}, previousRoomId={}, targetRoomId={}",
				context, memberId, previousRoomId, targetRoomId);
		}
		return true;
	}
}

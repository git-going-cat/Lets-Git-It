package com.gitcat.letsgitit.domain.room.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.ROOM_NOT_FOUND;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;

import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.room.repository.RoomRedisRepository;
import com.gitcat.letsgitit.domain.room.util.RoomMemberMapper;
import com.gitcat.letsgitit.domain.room.util.RoomRedisReader;
import com.gitcat.letsgitit.global.exception.BusinessException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoomMemberRecoveryService {

	private final MemberService memberService;
	private final RoomRedisRepository roomRedisRepository;
	private final RoomMemberMapper roomMemberMapper;
	private final RoomService roomService;

	public boolean ensureMemberInRoom(Long roomId, UUID memberId, Map<Object, Object> roomInfo, String context) {
		String memberIdValue = memberId.toString();
		if (roomRedisRepository.existsMember(roomId, memberIdValue)) {
			return true;
		}

		Optional<Long> joinedRoomId = roomRedisRepository.findJoinedRoomId(memberIdValue);
		if (joinedRoomId.isEmpty() || !joinedRoomId.get().equals(roomId)) {
			return false;
		}

		Member member = memberService.findById(memberId);
		UUID hostMemberId = UUID.fromString(RoomRedisReader.readString(roomInfo, "hostMemberId"));
		boolean isHost = hostMemberId.equals(memberId);
		roomRedisRepository.saveMember(
			roomId.toString(),
			memberIdValue,
			roomMemberMapper.toMemberInfo(member, isHost));
		log.warn(
			"[room] {} room member state reconciled from member-room mapping. roomId={}, memberId={}, isHost={}, restoredIsReady=false",
			context, roomId, memberId, isHost);
		return true;
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

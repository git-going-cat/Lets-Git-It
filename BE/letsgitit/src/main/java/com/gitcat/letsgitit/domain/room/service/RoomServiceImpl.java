package com.gitcat.letsgitit.domain.room.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;

import com.gitcat.letsgitit.domain.coop.dto.response.CoopMapListResponse;
import com.gitcat.letsgitit.domain.coop.service.CoopService;
import com.gitcat.letsgitit.domain.room.dto.RoomCache;
import com.gitcat.letsgitit.domain.room.dto.response.RoomListResponse;
import com.gitcat.letsgitit.domain.room.dto.response.RoomSearchResponse;
import com.gitcat.letsgitit.domain.room.dto.response.RoomSummaryDto;
import com.gitcat.letsgitit.domain.room.repository.RoomRedisRepository;
import com.gitcat.letsgitit.global.enums.RoomMode;
import com.gitcat.letsgitit.global.exception.BusinessException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class RoomServiceImpl implements RoomService {

	private final RoomRedisRepository roomRedisRepository;
	private final RedissonClient redissonClient;
	private final CoopService coopService;

	@Override
	public RoomListResponse getRooms(RoomMode mode) {
		log.debug("[room] 방 목록 조회. mode={}", mode);
		List<RoomCache> all = roomRedisRepository.findAll();
		List<RoomSummaryDto> rooms = all.stream()
			.filter(r -> mode == RoomMode.ALL || mode.name().equals(r.mode()))
			.map(RoomSummaryDto::from)
			.toList();
		return new RoomListResponse(rooms);
	}

	@Override
	public void verifyRoomPassword(Long roomId, String password, UUID memberId) {
		if (!roomRedisRepository.existsById(roomId)) {
			throw new BusinessException(ROOM_NOT_FOUND);
		}
		String stored = roomRedisRepository.findPasswordById(roomId);
		if (!password.equals(stored)) {
			throw new BusinessException(INVALID_PASSWORD);
		}
		roomRedisRepository.savePasswordVerified(memberId.toString(), roomId);
		log.info("[room] 비밀번호 검증 완료. roomId={}, memberId={}", roomId, memberId);
	}

	@Override
	public void leaveRoom(Long roomId, UUID memberId) {
		if (!roomRedisRepository.existsById(roomId)) {
			throw new BusinessException(ROOM_NOT_FOUND);
		}
		String memberIdStr = memberId.toString();
		RLock lock = redissonClient.getLock("lock:room:" + roomId);
		lock.lock();
		try {
			if (!roomRedisRepository.existsMember(roomId, memberIdStr)) {
				throw new BusinessException(PLAYER_NOT_IN_ROOM);
			}
			roomRedisRepository.removeMember(roomId, memberIdStr);

			String hostId = roomRedisRepository.findHostIdById(roomId);
			if (!memberIdStr.equals(hostId)) {
				log.info("[room] 멤버 퇴장. roomId={}, memberId={}", roomId, memberId);
				return;
			}

			Set<String> remaining = roomRedisRepository.findAllMemberIds(roomId);
			if (remaining.isEmpty()) {
				roomRedisRepository.dissolveRoom(roomId);
				log.info("[room] 방 해산. roomId={}", roomId);
			} else {
				String newHostId = remaining.stream().sorted().findFirst().orElseThrow();
				roomRedisRepository.updateHostId(roomId, newHostId);
				log.info("[room] 방장 위임. roomId={}, newHostId={}", roomId, newHostId);
			}
		} finally {
			lock.unlock();
		}
	}

	@Override
	public void kickMember(Long roomId, UUID currentMemberId, String playerId) {
		if (!roomRedisRepository.existsById(roomId)) {
			throw new BusinessException(ROOM_NOT_FOUND);
		}
		RLock lock = redissonClient.getLock("lock:room:" + roomId);
		lock.lock();
		try {
			String hostId = roomRedisRepository.findHostIdById(roomId);
			if (!currentMemberId.toString().equals(hostId)) {
				throw new BusinessException(NOT_HOST);
			}
			if (playerId.equals(currentMemberId.toString())) {
				throw new BusinessException(CANNOT_KICK_SELF);
			}
			if (!roomRedisRepository.existsMember(roomId, playerId)) {
				throw new BusinessException(PLAYER_NOT_FOUND);
			}
			roomRedisRepository.removeMember(roomId, playerId);
			log.info("[room] 멤버 강제 퇴장. roomId={}, playerId={}", roomId, playerId);
		} finally {
			lock.unlock();
		}
	}

	@Override
	public CoopMapListResponse getCoopMaps() {
		return coopService.getCoopMaps();
	}

	@Override
	public RoomSearchResponse searchByCode(String code) {
		RoomCache room = roomRedisRepository.findByCode(code)
			.orElseThrow(() -> new BusinessException(ROOM_NOT_FOUND));
		if ("IN_GAME".equals(room.roomState())) {
			throw new BusinessException(ROOM_IN_GAME);
		}
		log.debug("[room] 방 코드 조회. code={}, roomId={}", code, room.roomId());
		return RoomSearchResponse.from(room);
	}
}

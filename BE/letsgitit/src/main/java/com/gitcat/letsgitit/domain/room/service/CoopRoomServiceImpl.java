package com.gitcat.letsgitit.domain.room.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;

import com.gitcat.letsgitit.domain.coop.service.CoopService;
import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.room.dto.request.CreateCoopRoomRequest;
import com.gitcat.letsgitit.domain.room.dto.request.UpdateCoopRoomInfoRequest;
import com.gitcat.letsgitit.domain.room.dto.response.CoopRoomInfoResponse;
import com.gitcat.letsgitit.domain.room.dto.response.CreateCoopRoomResponse;
import com.gitcat.letsgitit.domain.room.dto.response.JoinCoopRoomResponse;
import com.gitcat.letsgitit.domain.room.dto.response.SelectedMapDto;
import com.gitcat.letsgitit.domain.room.entity.enums.RoomState;
import com.gitcat.letsgitit.domain.room.repository.RoomRedisRepository;
import com.gitcat.letsgitit.domain.room.util.RoomMemberMapper;
import com.gitcat.letsgitit.domain.room.util.RoomRedisReader;
import com.gitcat.letsgitit.global.enums.GameMode;
import com.gitcat.letsgitit.global.exception.BusinessException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class CoopRoomServiceImpl implements CoopRoomService {

	private static final int COOP_MAX_PLAYERS = 4;
	private static final long JOIN_LOCK_WAIT_SECONDS = 3L;
	private static final long JOIN_LOCK_LEASE_SECONDS = 10L;

	private final CoopService coopService;
	private final MemberService memberService;
	private final RoomRedisRepository roomRedisRepository;
	private final RoomCodeGenerator roomCodeGenerator;
	private final RoomMemberMapper roomMemberMapper;
	private final RoomWebSocketEventPublisher roomWebSocketEventPublisher;
	private final RoomMemberRecoveryService roomMemberRecoveryService;
	private final RedissonClient redissonClient;

	@Override
	public CreateCoopRoomResponse createCoopRoom(UUID memberId, CreateCoopRoomRequest request) {
		// 1. 요청자(memberId)의 닉네임/캐릭터 정보를 조회한다.
		Member hostMember = memberService.findById(memberId);

		// 2. selectedMapId 로 협력 맵 정보를 조회한다.
		SelectedMapDto selectedMap = coopService.getSelectedMap(request.selectedMapId());

		// 3. generateAndReserveRoomCode()로 room code를 SETNX 선점한다.
		String roomCode = generateAndReserveRoomCode();

		// 4. roomId를 생성한다.
		Long roomId = roomRedisRepository.generateRoomId();
		String roomIdKey = roomId.toString();

		try {
			// 5. room:{roomId}:info 에 협력 방 메타 정보(title, mode, roomState, maxPlayers=4, hasPassword, password, roomCode, hostMemberId, teamName, selectedMap 정보)를 저장한다.
			roomRedisRepository.saveRoomInfo(roomIdKey,
				buildCoopRoomInfo(roomId, roomCode, memberId, request, selectedMap));

			// 6. room:{roomId}:members Hash 에 방장(memberId) 정보를 playerId -> JSON 형태로 저장한다.
			boolean memberAdded = roomRedisRepository.saveMemberIfNotInAnyRoom(
				roomIdKey,
				memberId.toString(),
				roomMemberMapper.toMemberInfo(hostMember, true));

			if (!memberAdded) {
				throw new BusinessException(ALREADY_IN_ANOTHER_ROOM);
			}

			// 7. room:code:{roomCode} 값을 RESERVED 에서 실제 roomId 로 확정한다.
			roomRedisRepository.confirmRoomCode(roomCode, roomIdKey);

			// 8. room:list:COOP ZSet 에 roomId를 생성 시각 score와 함께 추가한다.
			roomRedisRepository.addRoomToList(GameMode.COOP, roomIdKey, Instant.now().toEpochMilli());
			log.info("[room] coop room created. roomId={}, hostMemberId={}, hasPassword={}, selectedMapId={}",
				roomId, memberId, request.hasPassword(), request.selectedMapId());

			// 9. 맵 정보를 포함한 CreateCoopRoomResponse 를 조립해 반환한다.
			return new CreateCoopRoomResponse(
				roomId,
				request.teamName(),
				roomCode,
				request.title(),
				request.hasPassword(),
				COOP_MAX_PLAYERS,
				selectedMap);
		} catch (RuntimeException e) {
			log.warn("[room] coop room creation failed. roomId={}, hostMemberId={}, reason={}",
				roomId, memberId, e.getClass().getSimpleName());
			roomRedisRepository.deleteRoom(roomId);
			throw e;
		}
	}

	@Override
	public JoinCoopRoomResponse joinCoopRoom(UUID memberId, Long roomId) {
		// 같은 방에 대한 동시 입장 요청이 겹치면 정원 초과가 발생할 수 있으므로
		// roomId 단위 분산 락으로 조회/검증/멤버 추가를 하나의 임계 구역으로 묶는다.
		String lockKey = "room:" + roomId + ":join-lock";
		RLock lock = redissonClient.getLock(lockKey);

		try {
			// 최대 3초 동안 락 획득을 시도하고, 획득 후 10초 뒤에는 자동 해제되도록 설정한다.
			boolean acquired = lock.tryLock(JOIN_LOCK_WAIT_SECONDS, JOIN_LOCK_LEASE_SECONDS, TimeUnit.SECONDS);

			if (!acquired) {
				log.warn("[room] coop room join lock acquisition failed. roomId={}, memberId={}", roomId, memberId);
				throw new BusinessException(LOCK_ACQUISITION_FAILED);
			}

			// 1. room:{roomId}:info 조회로 방 존재 여부와 roomState를 확인한다.
			Map<Object, Object> roomInfo = roomRedisRepository.getRoomInfo(roomId.toString())
				.orElseThrow(() -> new BusinessException(ROOM_NOT_FOUND));

			try {
				validateCoopRoomMode(roomInfo, roomId, memberId, "join");

				if (roomRedisRepository.existsMember(roomId, memberId.toString())) {
					log.warn("[room] coop room join rejected: already in room. roomId={}, memberId={}", roomId,
						memberId);
					throw new BusinessException(ALREADY_IN_ROOM);
				}

				boolean hasPassword = RoomRedisReader.readBoolean(roomInfo, "hasPassword");
				if (hasPassword && !roomRedisRepository.isPasswordVerified(memberId.toString(), roomId)) {
					log.warn("[room] coop room join rejected: password not verified. roomId={}, memberId={}",
						roomId, memberId);
					throw new BusinessException(PASSWORD_NOT_VERIFIED);
				}

				// 2. roomState == IN_GAME 이면 ROOM_IN_GAME 예외를 반환한다.
				if (RoomState.valueOf(RoomRedisReader.readString(roomInfo, "roomState")) == RoomState.IN_GAME) {
					log.warn("[room] coop room join rejected: room already in game. roomId={}, memberId={}", roomId,
						memberId);
					throw new BusinessException(ROOM_IN_GAME);
				}

				// 3. room:{roomId}:members Hash 크기로 정원 초과 여부를 확인한다.
				long currentPlayers = roomRedisRepository.getMembersCount(roomId.toString());
				int maxPlayers = RoomRedisReader.readInt(roomInfo, "maxPlayers");
				if (currentPlayers >= maxPlayers) {
					log.warn(
						"[room] coop room join rejected: room full. roomId={}, memberId={}, currentPlayers={}, maxPlayers={}",
						roomId, memberId, currentPlayers, maxPlayers);
					throw new BusinessException(ROOM_FULL);
				}

				// 4. 요청자(memberId)의 닉네임/캐릭터 정보를 조회한다.
				Member member = memberService.findById(memberId);

				// 5. room:{roomId}:members Hash 에 참가자 정보를 추가한다.
				boolean memberAdded = roomRedisRepository.saveMemberIfNotInAnyRoom(
					roomId.toString(),
					memberId.toString(),
					roomMemberMapper.toMemberInfo(member, false));

				if (!memberAdded) {
					Optional<Long> joinedRoomId = roomRedisRepository.findJoinedRoomId(memberId.toString());
					if (joinedRoomId.isPresent() && joinedRoomId.get().equals(roomId)) {
						log.warn("[room] coop room join rejected: already in room. roomId={}, memberId={}", roomId,
							memberId);
						throw new BusinessException(ALREADY_IN_ROOM);
					}
					if (roomMemberRecoveryService.leavePreviousRoomIfNecessary(memberId, roomId, "coop")) {
						memberAdded = roomRedisRepository.saveMemberIfNotInAnyRoom(
							roomId.toString(),
							memberId.toString(),
							roomMemberMapper.toMemberInfo(member, false));
					}
					if (!memberAdded) {
						log.warn(
							"[room] coop room join rejected: already in another room. roomId={}, memberId={}, joinedRoomId={}",
							roomId, memberId, joinedRoomId.orElse(null));
						throw new BusinessException(ALREADY_IN_ANOTHER_ROOM);
					}
				}

				// 6. selectedMapId 로 맵 정보를 조회한다.
				SelectedMapDto selectedMap = coopService
					.getSelectedMap(UUID.fromString(RoomRedisReader.readString(roomInfo, "selectedMapId")));

				// 7. room info + members 로 JoinCoopRoomResponse 를 조립한다.
				Map<Object, Object> members = roomRedisRepository.getMembers(roomId.toString());
				log.info("[room] coop room joined. roomId={}, memberId={}, currentPlayers={}", roomId, memberId,
					members.size());

				JoinCoopRoomResponse response = buildJoinCoopRoomResponse(roomId, roomInfo, selectedMap, members);
				roomWebSocketEventPublisher.publishPlayerJoined(
					roomId,
					response.roomState(),
					memberId,
					response.members());
				return response;
			} catch (IllegalStateException e) {
				log.error("[room] invalid coop room redis state during join. roomId={}, memberId={}", roomId,
					memberId, e);
				throw e;
			}
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			log.warn("[room] coop room join interrupted. roomId={}, memberId={}", roomId, memberId);
			throw new BusinessException(LOCK_INTERRUPTED);
		} finally {
			// 현재 스레드가 점유한 락만 해제한다.
			if (lock.isHeldByCurrentThread()) {
				lock.unlock();
			}
		}
	}

	@Override
	public void updateCoopRoomInfo(UUID memberId, Long roomId, UpdateCoopRoomInfoRequest request) {
		Map<Object, Object> roomInfo = roomRedisRepository.getRoomInfo(roomId.toString())
			.orElseThrow(() -> new BusinessException(ROOM_NOT_FOUND));

		try {
			validateCoopRoomMode(roomInfo, roomId, memberId, "update");

			if (!roomMemberRecoveryService.ensureMemberInRoom(roomId, memberId, roomInfo, "coop")) {
				log.warn("[room] coop room update rejected: member not in room. roomId={}, memberId={}", roomId,
					memberId);
				throw new BusinessException(PLAYER_NOT_IN_ROOM);
			}

			// 호스트 여부 검증
			UUID hostMemberId = UUID.fromString(RoomRedisReader.readString(roomInfo, "hostMemberId"));
			if (!hostMemberId.equals(memberId)) {
				log.warn("[room] coop room update rejected: not host. roomId={}, memberId={}, hostMemberId={}",
					roomId, memberId, hostMemberId);
				throw new BusinessException(NOT_HOST);
			}

			// 1. selectedMapId 로 협력 맵 정보를 조회하고 수정 대상 맵 메타를 함께 확보한다.
			SelectedMapDto selectedMap = coopService.getSelectedMap(request.selectedMapId());

			// 2. 수정 가능한 필드를 room info Hash 에 반영한다.
			roomRedisRepository.updateRoomInfo(roomId.toString(), buildCoopRoomUpdateInfo(request, selectedMap));
			log.info("[room] coop room updated. roomId={}, memberId={}, hasPassword={}, selectedMapId={}",
				roomId, memberId, request.hasPassword(), request.selectedMapId());
		} catch (IllegalStateException e) {
			log.error("[room] invalid coop room redis state during update. roomId={}, memberId={}", roomId,
				memberId, e);
			throw e;
		}
	}

	@Override
	public CoopRoomInfoResponse getCoopRoomInfo(UUID memberId, Long roomId) {
		// 1. room:{roomId}:info 조회로 방 존재 여부를 확인한다.
		Map<Object, Object> roomInfo = roomRedisRepository.getRoomInfo(roomId.toString())
			.orElseThrow(() -> new BusinessException(ROOM_NOT_FOUND));

		try {
			validateCoopRoomMode(roomInfo, roomId, memberId, "info fetch");

			if (!roomMemberRecoveryService.ensureMemberInRoom(roomId, memberId, roomInfo, "coop")) {
				log.warn("[room] coop room info rejected: member not in room. roomId={}, memberId={}", roomId,
					memberId);
				throw new BusinessException(PLAYER_NOT_IN_ROOM);
			}

			// 2. room:{roomId}:members Hash 전체를 조회한다.
			Map<Object, Object> members = roomRedisRepository.getMembers(roomId.toString());

			// 3. selectedMapId 로 맵 정보를 조회한다.
			SelectedMapDto selectedMap = coopService
				.getSelectedMap(UUID.fromString(RoomRedisReader.readString(roomInfo, "selectedMapId")));
			log.info("[room] coop room info fetched. roomId={}, memberId={}, currentPlayers={}", roomId, memberId,
				members.size());
			return buildCoopRoomInfoResponse(roomId, roomInfo, selectedMap, members);
		} catch (IllegalStateException e) {
			log.error("[room] invalid coop room redis state during info fetch. roomId={}, memberId={}", roomId,
				memberId, e);
			throw e;
		}
	}

	/**
	 * 방 코드 생성 로직
	 * - 최대 20번 재시도
	 * - 20번 시도 후에도 실패 시, BusinessException 발생
	 *
	 * @return 방 코드
	 */
	private String generateAndReserveRoomCode() {
		for (int attempt = 0; attempt < RoomCodeGenerator.ROOM_CODE_MAX_RETRY; attempt++) {
			String roomCode = roomCodeGenerator.generate();
			if (roomRedisRepository.reserveRoomCode(roomCode)) {
				return roomCode;
			}
		}

		log.error("[room] coop room code generation exhausted retry limit. retryLimit={}",
			RoomCodeGenerator.ROOM_CODE_MAX_RETRY);
		throw new BusinessException(ROOM_CODE_GENERATION_FAILED);
	}

	private Map<String, Object> buildCoopRoomInfo(Long roomId, String roomCode, UUID memberId,
		CreateCoopRoomRequest request, SelectedMapDto selectedMap) {
		Map<String, Object> roomInfo = new LinkedHashMap<>();

		roomInfo.put("roomId", roomId);
		roomInfo.put("roomCode", roomCode);
		roomInfo.put("title", request.title());
		roomInfo.put("teamName", request.teamName());
		roomInfo.put("mode", GameMode.COOP.name());
		roomInfo.put("roomState", RoomState.WAITING.name());
		roomInfo.put("maxPlayers", COOP_MAX_PLAYERS);
		roomInfo.put("hasPassword", request.hasPassword());
		if (request.hasPassword()) {
			roomInfo.put("password", request.password());
		}
		roomInfo.put("hostMemberId", memberId.toString());
		applySelectedMapInfo(roomInfo, selectedMap);

		return roomInfo;
	}

	private Map<String, Object> buildCoopRoomUpdateInfo(UpdateCoopRoomInfoRequest request, SelectedMapDto selectedMap) {
		Map<String, Object> roomInfo = new LinkedHashMap<>();

		roomInfo.put("title", request.title());
		roomInfo.put("teamName", request.teamName());
		roomInfo.put("hasPassword", request.hasPassword());
		if (request.hasPassword()) {
			roomInfo.put("password", request.password());
		} else {
			roomInfo.put("password", null);
		}
		applySelectedMapInfo(roomInfo, selectedMap);

		return roomInfo;
	}

	private void applySelectedMapInfo(Map<String, Object> roomInfo, SelectedMapDto selectedMap) {
		roomInfo.put("selectedMapId", selectedMap.mapId().toString());
		roomInfo.put("selectedMapName", selectedMap.mapName());
		roomInfo.put("selectedMapDifficulty", selectedMap.difficulty());
	}

	private JoinCoopRoomResponse buildJoinCoopRoomResponse(Long roomId, Map<Object, Object> roomInfo,
		SelectedMapDto selectedMap, Map<Object, Object> members) {
		return new JoinCoopRoomResponse(
			roomId,
			RoomRedisReader.readString(roomInfo, "roomCode"),
			RoomRedisReader.readString(roomInfo, "title"),
			RoomRedisReader.readString(roomInfo, "teamName"),
			GameMode.valueOf(RoomRedisReader.readString(roomInfo, "mode")),
			RoomState.valueOf(RoomRedisReader.readString(roomInfo, "roomState")),
			members.size(),
			RoomRedisReader.readInt(roomInfo, "maxPlayers"),
			selectedMap,
			roomMemberMapper.toPlayerInfoDtos(members));
	}

	private CoopRoomInfoResponse buildCoopRoomInfoResponse(Long roomId, Map<Object, Object> roomInfo,
		SelectedMapDto selectedMap, Map<Object, Object> members) {
		return new CoopRoomInfoResponse(
			roomId,
			RoomRedisReader.readString(roomInfo, "roomCode"),
			RoomRedisReader.readString(roomInfo, "title"),
			RoomRedisReader.readString(roomInfo, "teamName"),
			GameMode.valueOf(RoomRedisReader.readString(roomInfo, "mode")),
			RoomState.valueOf(RoomRedisReader.readString(roomInfo, "roomState")),
			members.size(),
			RoomRedisReader.readInt(roomInfo, "maxPlayers"),
			selectedMap,
			roomMemberMapper.toPlayerInfoDtos(members));
	}

	private void validateCoopRoomMode(Map<Object, Object> roomInfo, Long roomId, UUID memberId, String action) {
		GameMode roomMode = GameMode.valueOf(RoomRedisReader.readString(roomInfo, "mode"));
		if (roomMode != GameMode.COOP) {
			log.warn("[room] coop room {} rejected: mode mismatch. roomId={}, memberId={}, roomMode={}",
				action, roomId, memberId, roomMode);
			throw new BusinessException(ROOM_MODE_MISMATCH);
		}
	}

}

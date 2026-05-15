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

import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.room.dto.request.CreateContributionRoomRequest;
import com.gitcat.letsgitit.domain.room.dto.request.UpdateContributionRoomRequest;
import com.gitcat.letsgitit.domain.room.dto.response.ContributionRoomInfoResponse;
import com.gitcat.letsgitit.domain.room.dto.response.ContributionRoomInfoUpdatedResponse;
import com.gitcat.letsgitit.domain.room.dto.response.CreateContributionRoomResponse;
import com.gitcat.letsgitit.domain.room.dto.response.JoinContributionRoomResponse;
import com.gitcat.letsgitit.domain.room.entity.enums.RoomState;
import com.gitcat.letsgitit.domain.room.repository.RoomRedisRepository;
import com.gitcat.letsgitit.domain.room.util.RoomMemberMapper;
import com.gitcat.letsgitit.domain.room.util.RoomRedisReader;
import com.gitcat.letsgitit.global.enums.GameMode;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.websocket.WebSocketMessageSender;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContributionRoomServiceImpl implements ContributionRoomService {

	private static final long JOIN_LOCK_WAIT_SECONDS = 3L;
	private static final long JOIN_LOCK_LEASE_SECONDS = 10L;

	private final MemberService memberService;
	private final RoomRedisRepository roomRedisRepository;
	private final RoomCodeGenerator roomCodeGenerator;
	private final RoomMemberMapper roomMemberMapper;
	private final RoomWebSocketEventPublisher roomWebSocketEventPublisher;
	private final RoomMemberRecoveryService roomMemberRecoveryService;
	private final RedissonClient redissonClient;
	private final WebSocketMessageSender messageSender;

	@Override
	public CreateContributionRoomResponse createContributionRoom(UUID memberId, CreateContributionRoomRequest request) {
		// 1. 요청자(memberId)의 닉네임/캐릭터 정보를 조회한다.
		Member hostMember = memberService.findById(memberId);

		// 2. generateAndReserveRoomCode()로 room code를 SETNX 선점한다.
		String roomCode = generateAndReserveRoomCode();

		// 3. roomId를 생성한다.
		Long roomId = roomRedisRepository.generateRoomId();
		String roomIdKey = roomId.toString();

		try {
			// 4. room:{roomId}:info 에 기여도 뺏기 방 메타 정보(title, mode, roomState, maxPlayers, hasPassword, password, roomCode, hostMemberId, selectedMapId)를 저장한다.
			roomRedisRepository.saveRoomInfo(roomIdKey,
				buildContributionRoomInfo(roomId, roomCode, memberId, request));

			// 5. room:{roomId}:members Hash 에 방장(memberId) 정보를 playerId -> JSON 형태로 저장한다.
			boolean memberAdded = roomRedisRepository.saveMemberIfNotInAnyRoom(
				roomIdKey,
				memberId.toString(),
				roomMemberMapper.toMemberInfo(hostMember, true));

			if (!memberAdded) {
				throw new BusinessException(ALREADY_IN_ANOTHER_ROOM);
			}

			// 6. room:code:{roomCode} 값을 RESERVED 에서 실제 roomId 로 확정한다.
			roomRedisRepository.confirmRoomCode(roomCode, roomIdKey);

			// 7. room:list:CONTRIBUTION ZSet 에 roomId를 생성 시각 score와 함께 추가한다.
			roomRedisRepository.addRoomToList(GameMode.CONTRIBUTION, roomIdKey, Instant.now().toEpochMilli());

			log.info("[room] contribution room created. roomId={}, hostMemberId={}, hasPassword={}, maxPlayers={}",
				roomId, memberId, request.hasPassword(), request.maxPlayers());

			return new CreateContributionRoomResponse(
				roomId,
				roomCode,
				request.title(),
				request.hasPassword(),
				request.maxPlayers());
		} catch (RuntimeException e) {
			log.warn("[room] contribution room creation failed. roomId={}, hostMemberId={}, reason={}",
				roomId, memberId, e.getClass().getSimpleName());
			roomRedisRepository.deleteRoom(roomId);
			throw e;
		}
	}

	@Override
	public JoinContributionRoomResponse joinContributionRoom(UUID memberId, Long roomId) {
		// 같은 방에 대한 동시 입장 요청이 겹치면 정원 초과가 발생할 수 있으므로
		// roomId 단위 분산 락으로 조회/검증/멤버 추가를 하나의 임계 구역으로 묶는다.
		String lockKey = "room:" + roomId + ":join-lock";
		RLock lock = redissonClient.getLock(lockKey);

		try {
			// 최대 3초 동안 락 획득을 시도하고, 획득 후 10초 뒤에는 자동 해제되도록 설정한다.
			boolean acquired = lock.tryLock(JOIN_LOCK_WAIT_SECONDS, JOIN_LOCK_LEASE_SECONDS, TimeUnit.SECONDS);

			if (!acquired) {
				log.warn("[room] contribution room join lock acquisition failed. roomId={}, memberId={}", roomId,
					memberId);
				throw new BusinessException(LOCK_ACQUISITION_FAILED);
			}

			// 1. room:{roomId}:info 조회로 방 존재 여부와 roomState를 확인한다.
			Map<Object, Object> roomInfo = roomRedisRepository.getRoomInfo(roomId.toString())
				.orElseThrow(() -> new BusinessException(ROOM_NOT_FOUND));

			try {
				validateContributionRoomMode(roomInfo, roomId, memberId, "join");

				if (roomRedisRepository.existsMember(roomId, memberId.toString())) {
					log.warn("[room] contribution room join rejected: already in room. roomId={}, memberId={}",
						roomId, memberId);
					throw new BusinessException(ALREADY_IN_ROOM);
				}

				boolean hasPassword = RoomRedisReader.readBoolean(roomInfo, "hasPassword");
				if (hasPassword && !roomRedisRepository.isPasswordVerified(memberId.toString(), roomId)) {
					log.warn("[room] contribution room join rejected: password not verified. roomId={}, memberId={}",
						roomId, memberId);
					throw new BusinessException(PASSWORD_NOT_VERIFIED);
				}

				// 2. roomState == IN_GAME 이면 ROOM_IN_GAME 예외를 반환한다.
				if (RoomState.valueOf(RoomRedisReader.readString(roomInfo, "roomState")) == RoomState.IN_GAME) {
					log.warn("[room] contribution room join rejected: room already in game. roomId={}, memberId={}",
						roomId, memberId);
					throw new BusinessException(ROOM_IN_GAME);
				}

				// 3. room:{roomId}:members Hash 크기로 정원 초과 여부를 확인한다.
				long currentPlayers = roomRedisRepository.getMembersCount(roomId.toString());
				int maxPlayers = RoomRedisReader.readInt(roomInfo, "maxPlayers");
				if (currentPlayers >= maxPlayers) {
					log.warn(
						"[room] contribution room join rejected: room full. roomId={}, memberId={}, currentPlayers={}, maxPlayers={}",
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
						log.warn("[room] contribution room join rejected: already in room. roomId={}, memberId={}",
							roomId, memberId);
						throw new BusinessException(ALREADY_IN_ROOM);
					}
					if (roomMemberRecoveryService.leavePreviousRoomIfNecessary(memberId, roomId, "contribution")) {
						memberAdded = roomRedisRepository.saveMemberIfNotInAnyRoom(
							roomId.toString(),
							memberId.toString(),
							roomMemberMapper.toMemberInfo(member, false));
					}
					if (!memberAdded) {
						log.warn(
							"[room] contribution room join rejected: already in another room. roomId={}, memberId={}, joinedRoomId={}",
							roomId, memberId, joinedRoomId.orElse(null));
						throw new BusinessException(ALREADY_IN_ANOTHER_ROOM);
					}
				}

				// 6. room info 와 members Hash 전체를 읽어 JoinContributionRoomResponse 를 조립한다.
				Map<Object, Object> members = roomRedisRepository.getMembers(roomId.toString());
				log.info("[room] contribution room joined. roomId={}, memberId={}, currentPlayers={}",
					roomId, memberId, members.size());
				JoinContributionRoomResponse response = buildJoinContributionRoomResponse(roomId, roomInfo, members);
				roomWebSocketEventPublisher.publishPlayerJoined(
					roomId,
					response.roomState(),
					memberId,
					response.members());
				return response;
			} catch (IllegalStateException e) {
				log.error("[room] invalid contribution room redis state during join. roomId={}, memberId={}",
					roomId, memberId, e);
				throw e;
			}
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
			log.warn("[room] contribution room join interrupted. roomId={}, memberId={}", roomId, memberId);
			throw new BusinessException(LOCK_INTERRUPTED);
		} finally {
			// 현재 스레드가 점유한 락만 해제한다.
			if (lock.isHeldByCurrentThread()) {
				lock.unlock();
			}
		}
	}

	@Override
	public void updateContributionRoomInfo(UUID memberId, Long roomId, UpdateContributionRoomRequest request) {
		Map<Object, Object> roomInfo = roomRedisRepository.getRoomInfo(roomId.toString())
			.orElseThrow(() -> new BusinessException(ROOM_NOT_FOUND));

		try {
			validateContributionRoomMode(roomInfo, roomId, memberId, "update");

			if (RoomState.valueOf(RoomRedisReader.readString(roomInfo, "roomState")) == RoomState.IN_GAME) {
				log.warn("[room] contribution room update rejected: game in progress. roomId={}, memberId={}", roomId,
					memberId);
				throw new BusinessException(ROOM_IN_GAME);
			}

			// 플레이어가 해당 방에 들어와있는지 검증
			if (!roomMemberRecoveryService.ensureMemberInRoom(roomId, memberId, roomInfo, "contribution")) {
				log.warn("[room] contribution room update rejected: member not in room. roomId={}, memberId={}", roomId,
					memberId);
				throw new BusinessException(PLAYER_NOT_IN_ROOM);
			}

			UUID hostMemberId = UUID.fromString(RoomRedisReader.readString(roomInfo, "hostMemberId"));
			if (!hostMemberId.equals(memberId)) {
				log.warn("[room] contribution room update rejected: not host. roomId={}, memberId={}, hostMemberId={}",
					roomId, memberId, hostMemberId);
				throw new BusinessException(NOT_HOST);
			}

			long currentPlayers = roomRedisRepository.getMembersCount(roomId.toString());
			if (request.maxPlayers() < currentPlayers) {
				log.warn(
					"[room] contribution room update rejected: maxPlayers below current players. roomId={}, memberId={}, currentPlayers={}, requestedMaxPlayers={}",
					roomId, memberId, currentPlayers, request.maxPlayers());
				throw new BusinessException(CANNOT_REDUCE_MAX_PLAYERS_BELOW_CURRENT);
			}

			roomRedisRepository.updateRoomInfo(roomId.toString(), buildContributionRoomUpdateInfo(request));
			log.info("[room] contribution room updated. roomId={}, memberId={}, hasPassword={}, maxPlayers={}",
				roomId, memberId, request.hasPassword(), request.maxPlayers());

			broadcastRoomInfoUpdated(roomId);
		} catch (IllegalStateException e) {
			log.error("[room] invalid contribution room redis state during update. roomId={}, memberId={}",
				roomId, memberId, e);
			throw e;
		}
	}

	@Override
	public ContributionRoomInfoResponse getContributionRoomInfo(UUID memberId, Long roomId) {
		// 1. room:{roomId}:info 조회로 방 존재 여부를 확인한다.
		Map<Object, Object> roomInfo = roomRedisRepository.getRoomInfo(roomId.toString())
			.orElseThrow(() -> new BusinessException(ROOM_NOT_FOUND));

		try {
			validateContributionRoomMode(roomInfo, roomId, memberId, "info fetch");

			// 플레이어가 해당 방에 들어와있는지 검증
			if (!roomMemberRecoveryService.ensureMemberInRoom(roomId, memberId, roomInfo, "contribution")) {
				log.warn("[room] contribution room info rejected: member not in room. roomId={}, memberId={}", roomId,
					memberId);
				throw new BusinessException(PLAYER_NOT_IN_ROOM);
			}

			// 2. room:{roomId}:members Hash 전체를 조회한다.
			Map<Object, Object> members = roomRedisRepository.getMembers(roomId.toString());
			log.info("[room] contribution room info fetched. roomId={}, memberId={}, currentPlayers={}",
				roomId, memberId, members.size());

			// 3. room info + members 를 기반으로 ContributionRoomInfoResponse 를 조립한다.
			// 4. currentPlayers 는 members Hash 크기로 계산한다. (응답 조립 내부)
			// 5. members[].isMe 는 현재 요청자(memberId)와 비교해서 계산한다. (응답 조립 내부)
			return buildContributionRoomInfoResponse(roomId, roomInfo, members);
		} catch (IllegalStateException e) {
			log.error("[room] invalid contribution room redis state during info fetch. roomId={}, memberId={}",
				roomId, memberId, e);
			throw e;
		}
	}

	private void broadcastRoomInfoUpdated(Long roomId) {
		try {
			var roomInfoOpt = roomRedisRepository.getRoomInfo(roomId.toString());

			if (roomInfoOpt.isEmpty()) {
				log.warn("[room] ROOM_INFO_UPDATED skipped: room not found. roomId={}", roomId);
				return;
			}

			Map<Object, Object> roomInfo = roomInfoOpt.get();

			Map<Object, Object> members = roomRedisRepository.getMembers(roomId.toString());

			ContributionRoomInfoUpdatedResponse response = ContributionRoomInfoUpdatedResponse.from(
				buildContributionRoomInfoResponse(roomId, roomInfo, members));

			messageSender.send("/topic/room/" + roomId, response);
			log.info("[room] contribution room info broadcast. roomId={}", roomId);
		} catch (RuntimeException e) {
			log.warn("[room] ROOM_INFO_UPDATED publish failed. roomId={}, reason={}",
				roomId, e.getClass().getSimpleName(), e);
		}
	}

	private String generateAndReserveRoomCode() {
		for (int attempt = 0; attempt < RoomCodeGenerator.ROOM_CODE_MAX_RETRY; attempt++) {
			String roomCode = roomCodeGenerator.generate();
			if (roomRedisRepository.reserveRoomCode(roomCode)) {
				return roomCode;
			}
		}

		log.error("[room] contribution room code generation exhausted retry limit. retryLimit={}",
			RoomCodeGenerator.ROOM_CODE_MAX_RETRY);
		throw new BusinessException(ROOM_CODE_GENERATION_FAILED);
	}

	private Map<String, Object> buildContributionRoomInfo(Long roomId, String roomCode, UUID memberId,
		CreateContributionRoomRequest request) {
		Map<String, Object> roomInfo = new LinkedHashMap<>();
		roomInfo.put("roomId", roomId);
		roomInfo.put("roomCode", roomCode);
		roomInfo.put("title", request.title());
		roomInfo.put("mode", GameMode.CONTRIBUTION.name());
		roomInfo.put("roomState", RoomState.WAITING.name());
		roomInfo.put("maxPlayers", request.maxPlayers());
		roomInfo.put("hasPassword", request.hasPassword());
		if (request.hasPassword()) {
			roomInfo.put("password", request.password());
		}
		roomInfo.put("hostMemberId", memberId.toString());
		return roomInfo;
	}

	private Map<String, Object> buildContributionRoomUpdateInfo(UpdateContributionRoomRequest request) {
		Map<String, Object> roomInfo = new LinkedHashMap<>();
		roomInfo.put("title", request.title());
		roomInfo.put("maxPlayers", request.maxPlayers());
		roomInfo.put("hasPassword", request.hasPassword());
		if (request.hasPassword()) {
			roomInfo.put("password", request.password());
		} else {
			roomInfo.put("password", null);
		}
		return roomInfo;
	}

	private JoinContributionRoomResponse buildJoinContributionRoomResponse(Long roomId,
		Map<Object, Object> roomInfo, Map<Object, Object> members) {
		return new JoinContributionRoomResponse(
			roomId,
			RoomRedisReader.readString(roomInfo, "roomCode"),
			RoomRedisReader.readString(roomInfo, "title"),
			GameMode.valueOf(RoomRedisReader.readString(roomInfo, "mode")),
			RoomState.valueOf(RoomRedisReader.readString(roomInfo, "roomState")),
			members.size(),
			RoomRedisReader.readInt(roomInfo, "maxPlayers"),
			roomMemberMapper.toPlayerInfoDtos(members));
	}

	private ContributionRoomInfoResponse buildContributionRoomInfoResponse(Long roomId,
		Map<Object, Object> roomInfo, Map<Object, Object> members) {
		return new ContributionRoomInfoResponse(
			roomId,
			RoomRedisReader.readString(roomInfo, "roomCode"),
			RoomRedisReader.readString(roomInfo, "title"),
			GameMode.valueOf(RoomRedisReader.readString(roomInfo, "mode")),
			RoomState.valueOf(RoomRedisReader.readString(roomInfo, "roomState")),
			members.size(),
			RoomRedisReader.readBoolean(roomInfo, "hasPassword"),
			RoomRedisReader.readInt(roomInfo, "maxPlayers"),
			roomMemberMapper.toPlayerInfoDtos(members));
	}

	private void validateContributionRoomMode(Map<Object, Object> roomInfo, Long roomId, UUID memberId, String action) {
		GameMode roomMode = GameMode.valueOf(RoomRedisReader.readString(roomInfo, "mode"));
		if (roomMode != GameMode.CONTRIBUTION) {
			log.warn("[room] contribution room {} rejected: mode mismatch. roomId={}, memberId={}, roomMode={}",
				action, roomId, memberId, roomMode);
			throw new BusinessException(ROOM_MODE_MISMATCH);
		}
	}

}

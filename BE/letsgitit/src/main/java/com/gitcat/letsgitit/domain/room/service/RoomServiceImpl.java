package com.gitcat.letsgitit.domain.room.service;

import static com.gitcat.letsgitit.domain.room.constants.RoomConstants.ROOM_STATE_IN_GAME;
import static com.gitcat.letsgitit.domain.room.constants.RoomConstants.ROOM_STATE_WAITING;
import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.stereotype.Service;

import com.gitcat.letsgitit.domain.command.dto.response.CommandSetResponse;
import com.gitcat.letsgitit.domain.command.service.CommandService;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopMapListResponse;
import com.gitcat.letsgitit.domain.coop.service.CoopService;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.record.entity.BestRecordMode;
import com.gitcat.letsgitit.domain.record.entity.MemberBestRecord;
import com.gitcat.letsgitit.domain.record.entity.MemberCoopBestRecord;
import com.gitcat.letsgitit.domain.record.service.RecordService;
import com.gitcat.letsgitit.domain.room.dto.RoomCache;
import com.gitcat.letsgitit.domain.room.dto.request.ChatRequest;
import com.gitcat.letsgitit.domain.room.dto.request.GameStartRequest;
import com.gitcat.letsgitit.domain.room.dto.request.ReadyUpdateRequest;
import com.gitcat.letsgitit.domain.room.dto.response.ChatResponse;
import com.gitcat.letsgitit.domain.room.dto.response.ContributionPlayerDto;
import com.gitcat.letsgitit.domain.room.dto.response.ContributionStartedResponse;
import com.gitcat.letsgitit.domain.room.dto.response.CoopPlayerDto;
import com.gitcat.letsgitit.domain.room.dto.response.CoopStartedResponse;
import com.gitcat.letsgitit.domain.room.dto.response.GameStartResult;
import com.gitcat.letsgitit.domain.room.dto.response.PlayerInfoDto;
import com.gitcat.letsgitit.domain.room.dto.response.ReadyChangedResponse;
import com.gitcat.letsgitit.domain.room.dto.response.RoomListResponse;
import com.gitcat.letsgitit.domain.room.dto.response.RoomSearchResponse;
import com.gitcat.letsgitit.domain.room.dto.response.RoomSummaryDto;
import com.gitcat.letsgitit.domain.room.entity.enums.RoomState;
import com.gitcat.letsgitit.domain.room.repository.RoomRedisRepository;
import com.gitcat.letsgitit.domain.room.util.RoomMemberMapper;
import com.gitcat.letsgitit.domain.room.util.RoomRedisReader;
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
	private final CommandService commandService;
	private final MemberService memberService;
	private final RecordService recordService;
	private final RoomMemberMapper roomMemberMapper;

	@Override
	public RoomListResponse getRooms(RoomMode mode) {
		log.debug("[room][getRooms] mode={}", mode);
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
		log.info("[room][verifyRoomPassword] roomId={}, memberId={}", roomId, memberId);
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
			if (!roomRedisRepository.existsMember(roomId, memberIdStr)
				&& roomRedisRepository.findJoinedRoomId(memberIdStr)
					.filter(roomId::equals)
					.isEmpty()) {
				throw new BusinessException(PLAYER_NOT_IN_ROOM);
			}
			if (!roomRedisRepository.existsMember(roomId, memberIdStr)) {
				log.warn("[room] leave reconciled from member-room mapping without member hash. roomId={}, memberId={}",
					roomId, memberId);
			}
			roomRedisRepository.removeMember(roomId, memberIdStr);

			String hostId = roomRedisRepository.findHostIdById(roomId);
			if (!memberIdStr.equals(hostId)) {
				log.info("[room][leaveRoom] roomId={}, memberId={}", roomId, memberId);
				return;
			}

			Set<String> remaining = roomRedisRepository.findAllMemberIds(roomId);
			if (remaining.isEmpty()) {
				roomRedisRepository.dissolveRoom(roomId);
				log.info("[room][leaveRoom] 방 해산. roomId={}", roomId);
			} else {
				String newHostId = remaining.stream().sorted().findFirst().orElseThrow();
				roomRedisRepository.updateHostId(roomId, newHostId);
				log.info("[room][leaveRoom] 방장 위임. roomId={}, newHostId={}", roomId, newHostId);
				roomRedisRepository.updateMemberToHost(roomId.toString(), newHostId);
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
			log.info("[room][kickMember] roomId={}, playerId={}", roomId, playerId);
		} finally {
			lock.unlock();
		}
	}

	@Override
	public CoopMapListResponse getCoopMaps() {
		return coopService.getCoopMaps();
	}

	@Override
	public ReadyChangedResponse updateReadyStatus(UUID memberId, Long roomId, ReadyUpdateRequest request) {
		Map<Object, Object> roomInfo = roomRedisRepository.getRoomInfo(roomId.toString())
			.orElseThrow(() -> new BusinessException(ROOM_NOT_FOUND));

		if (RoomState.valueOf(RoomRedisReader.readString(roomInfo, "roomState")) == RoomState.IN_GAME) {
			log.warn("[room] 준비 변경 거부: 게임 중인 방. roomId={}, memberId={}", roomId, memberId);
			throw new BusinessException(ROOM_IN_GAME);
		}

		String memberIdStr = memberId.toString();
		if (!roomRedisRepository.existsMember(roomId, memberIdStr)) {
			log.warn("[room] 준비 변경 거부: 방에 없는 플레이어. roomId={}, memberId={}", roomId, memberId);
			throw new BusinessException(PLAYER_NOT_IN_ROOM);
		}

		String hostMemberId = RoomRedisReader.readString(roomInfo, "hostMemberId");
		if (memberIdStr.equals(hostMemberId)) {
			log.warn("[room] 준비 변경 거부: 방장은 항상 준비 완료. roomId={}, memberId={}", roomId, memberId);
			throw new BusinessException(HOST_ALWAYS_READY);
		}

		roomRedisRepository.updateMemberIsReady(roomId.toString(), memberIdStr, request.isReady());

		Map<Object, Object> members = roomRedisRepository.getMembers(roomId.toString());
		List<PlayerInfoDto> players = roomMemberMapper.toPlayerInfoDtos(members);

		String nickname = players.stream()
			.filter(p -> memberId.equals(p.playerId()))
			.map(PlayerInfoDto::nickname)
			.findFirst()
			.orElse("");

		boolean allReady = !players.isEmpty() && players.stream().allMatch(p -> Boolean.TRUE.equals(p.isReady()));

		log.info("[room] 준비 상태 변경. roomId={}, memberId={}, isReady={}, allReady={}",
			roomId, memberId, request.isReady(), allReady);
		return ReadyChangedResponse.of(memberId, nickname, request.isReady(), allReady);
	}

	@Override
	public ChatResponse processChat(Long roomId, UUID memberId, ChatRequest request) {
		// 1. 방이 Redis에 존재하는지 확인 — 없으면 ROOM_NOT_FOUND 예외 발생
		//    예외는 WebSocketExceptionHandler가 잡아서 /user/queue/private 로 에러 응답을 보내줌
		if (!roomRedisRepository.existsById(roomId)) {
			throw new BusinessException(ROOM_NOT_FOUND);
		}

		// 2. 요청자가 해당 방의 멤버인지 확인 — room:{roomId}:members Hash에 memberId 존재 여부 체크
		if (!roomRedisRepository.existsMember(roomId, memberId.toString())) {
			throw new BusinessException(PLAYER_NOT_IN_ROOM);
		}

		String message = request.message();

		// 3. 메시지가 null이거나 공백만 있는 경우 — MESSAGE_EMPTY 예외 발생
		//    isBlank()는 "   " 같은 공백만 있는 문자열도 잡아줌
		if (message == null || message.isBlank()) {
			throw new BusinessException(MESSAGE_EMPTY);
		}

		// 4. 메시지가 150자를 초과하는 경우 — MESSAGE_TOO_LONG 예외 발생
		if (message.length() > 150) {
			throw new BusinessException(MESSAGE_TOO_LONG);
		}

		// 5. 검증 통과 시 브로드캐스트할 응답 객체 생성
		//    nickname은 클라이언트 요청값 대신 서버 기준 닉네임 사용 (위장 방지)
		String nickname = memberService.getNicknameById(memberId);
		log.debug("[room][processChat] roomId={}, memberId={}", roomId, memberId);
		return ChatResponse.of(memberId, nickname, message);
	}

	@Override
	public GameStartResult startGame(Long roomId, UUID memberId, GameStartRequest request) {
		// 1. 방 존재 확인
		if (!roomRedisRepository.existsById(roomId)) {
			throw new BusinessException(ROOM_NOT_FOUND);
		}

		// 2~6. 검증 + 상태 선점을 락 안에서 원자적으로 처리 (중복 시작 방지)
		UUID gameSessionId = UUID.randomUUID();
		String mode;
		String hostId;
		Set<String> memberIdStrs;

		RLock lock = redissonClient.getLock("lock:room:" + roomId);
		lock.lock();
		try {
			if (ROOM_STATE_IN_GAME.equals(roomRedisRepository.findRoomStateById(roomId))) {
				throw new BusinessException(GAME_ALREADY_STARTED);
			}

			hostId = roomRedisRepository.findHostIdById(roomId);
			if (!memberId.toString().equals(hostId)) {
				throw new BusinessException(NOT_HOST);
			}

			memberIdStrs = roomRedisRepository.findAllMemberIds(roomId);
			mode = roomRedisRepository.findModeById(roomId);

			if (RoomMode.CONTRIBUTION.name().equals(mode) && memberIdStrs.size() < 2) {
				throw new BusinessException(NOT_ENOUGH_PLAYERS);
			}
			if (RoomMode.COOP.name().equals(mode) && memberIdStrs.size() < 4) {
				throw new BusinessException(NOT_ENOUGH_PLAYERS);
			}

			long readyCount = roomRedisRepository.countReadyNonHostMembers(roomId, hostId);
			if (readyCount < memberIdStrs.size() - 1) {
				throw new BusinessException(NOT_ALL_READY);
			}

			// 선점: 즉시 IN_GAME으로 변경하여 동시 요청 차단
			roomRedisRepository.updateRoomState(roomId, ROOM_STATE_IN_GAME);
		} finally {
			lock.unlock();
		}

		// 7. 락 해제 후 무거운 데이터 조회 — 실패 시 WAITING으로 롤백
		// IN_GAME 선점 이후 발생 가능한 모든 예외를 catch 범위 안에서 처리해야 롤백 보장됨
		List<UUID> memberIds = memberIdStrs.stream().map(UUID::fromString).toList();
		try {
			Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(memberIds);
			GameStartResult result;
			if (RoomMode.CONTRIBUTION.name().equals(mode)) {
				CommandSetResponse commandSet = commandService.getRandomContributionCommandSet();
				List<ContributionPlayerDto> players = memberIds.stream()
					.map(id -> {
						int best = recordService.getBestRecords(id).stream()
							.filter(r -> r.getMode() == BestRecordMode.CONTRIBUTION)
							.mapToInt(MemberBestRecord::getBestScore)
							.findFirst()
							.orElse(0);
						return new ContributionPlayerDto(id, nicknameMap.getOrDefault(id, ""), best);
					})
					.toList();
				long now = System.currentTimeMillis();
				result = new GameStartResult(
					"/topic/room/" + roomId + "/contribution",
					ContributionStartedResponse.of(gameSessionId, now,
						commandSet.commandSetId(), commandSet.initialBranch(),
						commandSet.commandSet(), players));
			} else {
				String selectedMapId = roomRedisRepository.findSelectedMapId(roomId);
				String graphPicture = coopService.getGraphPictureByMapId(UUID.fromString(selectedMapId));
				List<CoopPlayerDto> players = memberIds.stream()
					.map(id -> {
						MemberCoopBestRecord coopRecord = recordService.getBestCoopRecord(id);
						int bestTime = coopRecord != null ? coopRecord.getBestTime() : 0;
						return new CoopPlayerDto(id, nicknameMap.getOrDefault(id, ""), bestTime);
					})
					.toList();
				long now = System.currentTimeMillis();
				result = new GameStartResult(
					"/topic/room/" + roomId + "/coop",
					CoopStartedResponse.of(gameSessionId, now, graphPicture, players));
			}

			roomRedisRepository.saveGameSessionId(roomId, gameSessionId.toString());
			log.info("[room][startGame] roomId={}, mode={}, gameSessionId={}", roomId, mode, gameSessionId);
			return result;
		} catch (Exception e) {
			roomRedisRepository.updateRoomState(roomId, ROOM_STATE_WAITING);
			log.error("[room][startGame] 데이터 조회 실패 — roomState 롤백. roomId={}, mode={}", roomId, mode, e);
			throw e;
		}
	}

	@Override
	public RoomSearchResponse searchByCode(String code) {
		RoomCache room = roomRedisRepository.findByCode(code)
			.orElseThrow(() -> new BusinessException(ROOM_NOT_FOUND));
		if (ROOM_STATE_IN_GAME.equals(room.roomState())) {
			throw new BusinessException(ROOM_IN_GAME);
		}
		log.debug("[room][searchByCode] code={}, roomId={}", code, room.roomId());
		return RoomSearchResponse.from(room);
	}
}

package com.gitcat.letsgitit.domain.room.service;

import static com.gitcat.letsgitit.domain.coop.constants.CoopConstants.REVEAL_DURATION_MS;
import static com.gitcat.letsgitit.domain.room.constants.RoomConstants.ROOM_STATE_IN_GAME;
import static com.gitcat.letsgitit.domain.room.constants.RoomConstants.ROOM_STATE_WAITING;
import static com.gitcat.letsgitit.global.exception.ErrorCode.CANNOT_KICK_SELF;
import static com.gitcat.letsgitit.global.exception.ErrorCode.GAME_ALREADY_STARTED;
import static com.gitcat.letsgitit.global.exception.ErrorCode.HOST_ALWAYS_READY;
import static com.gitcat.letsgitit.global.exception.ErrorCode.INVALID_PASSWORD;
import static com.gitcat.letsgitit.global.exception.ErrorCode.MESSAGE_EMPTY;
import static com.gitcat.letsgitit.global.exception.ErrorCode.MESSAGE_TOO_LONG;
import static com.gitcat.letsgitit.global.exception.ErrorCode.NOT_ALL_READY;
import static com.gitcat.letsgitit.global.exception.ErrorCode.NOT_ENOUGH_PLAYERS;
import static com.gitcat.letsgitit.global.exception.ErrorCode.NOT_HOST;
import static com.gitcat.letsgitit.global.exception.ErrorCode.PLAYER_NOT_FOUND;
import static com.gitcat.letsgitit.global.exception.ErrorCode.PLAYER_NOT_IN_ROOM;
import static com.gitcat.letsgitit.global.exception.ErrorCode.ROOM_IN_GAME;
import static com.gitcat.letsgitit.global.exception.ErrorCode.ROOM_MODE_MISMATCH;
import static com.gitcat.letsgitit.global.exception.ErrorCode.ROOM_NOT_FOUND;
import static com.gitcat.letsgitit.global.exception.ErrorCode.SELF_TRANSFER;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import com.gitcat.letsgitit.domain.command.dto.response.CommandSetResponse;
import com.gitcat.letsgitit.domain.command.service.CommandService;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionInputResult;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionSessionCommand;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionSessionPlayer;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionGameEndMessage;
import com.gitcat.letsgitit.domain.competitive.service.ContributionGameService;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopGameEndResponse;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopMapListResponse;
import com.gitcat.letsgitit.domain.coop.dto.response.GraphDataDto;
import com.gitcat.letsgitit.domain.coop.service.CoopGameService;
import com.gitcat.letsgitit.domain.coop.service.CoopGraphDataStore;
import com.gitcat.letsgitit.domain.coop.service.CoopService;
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.record.entity.BestRecordMode;
import com.gitcat.letsgitit.domain.record.entity.MemberBestRecord;
import com.gitcat.letsgitit.domain.record.service.RecordService;
import com.gitcat.letsgitit.domain.room.dto.RoomCache;
import com.gitcat.letsgitit.domain.room.dto.request.ChatRequest;
import com.gitcat.letsgitit.domain.room.dto.request.GameStartRequest;
import com.gitcat.letsgitit.domain.room.dto.request.ReadyUpdateRequest;
import com.gitcat.letsgitit.domain.room.dto.response.ChatResponse;
import com.gitcat.letsgitit.domain.room.dto.response.ContributionPlayerDto;
import com.gitcat.letsgitit.domain.room.dto.response.ContributionRoomInfoResponse;
import com.gitcat.letsgitit.domain.room.dto.response.ContributionRoomStateResponse;
import com.gitcat.letsgitit.domain.room.dto.response.ContributionStartedResponse;
import com.gitcat.letsgitit.domain.room.dto.response.CoopPlayerDto;
import com.gitcat.letsgitit.domain.room.dto.response.CoopRoomInfoResponse;
import com.gitcat.letsgitit.domain.room.dto.response.CoopRoomStateResponse;
import com.gitcat.letsgitit.domain.room.dto.response.CoopStartedResponse;
import com.gitcat.letsgitit.domain.room.dto.response.GameStartResult;
import com.gitcat.letsgitit.domain.room.dto.response.HostTransferredResponse;
import com.gitcat.letsgitit.domain.room.dto.response.KickMemberResultResponse;
import com.gitcat.letsgitit.domain.room.dto.response.PlayerInfoDto;
import com.gitcat.letsgitit.domain.room.dto.response.ReadyChangedResponse;
import com.gitcat.letsgitit.domain.room.dto.response.RoomListResponse;
import com.gitcat.letsgitit.domain.room.dto.response.RoomSearchResponse;
import com.gitcat.letsgitit.domain.room.dto.response.RoomSummaryDto;
import com.gitcat.letsgitit.domain.room.dto.response.SelectedMapDto;
import com.gitcat.letsgitit.domain.room.entity.enums.RoomState;
import com.gitcat.letsgitit.domain.room.repository.RoomRedisRepository;
import com.gitcat.letsgitit.domain.room.util.RoomMemberMapper;
import com.gitcat.letsgitit.domain.room.util.RoomRedisReader;
import com.gitcat.letsgitit.global.enums.GameMode;
import com.gitcat.letsgitit.global.enums.RoomMode;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.websocket.WebSocketMessageSender;
import com.gitcat.letsgitit.global.websocket.dto.BaseWebSocketResponse;

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
	private final RoomWebSocketEventPublisher roomWebSocketEventPublisher;
	private final RoomMemberStateRecoveryService roomMemberStateRecoveryService;
	private final CoopGraphDataStore coopGraphDataStore;
	private final CoopGameService coopGameService;
	private final TaskScheduler taskScheduler;
	private final WebSocketMessageSender messageSender;
	private final ContributionGameService contributionGameService;

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
				log.warn(
					"[room][leaveRoom] leave reconciled from member-room mapping without member hash. roomId={}, memberId={}",
					roomId, memberId);
			}
			List<PlayerInfoDto> membersBeforeLeave = roomMemberMapper
				.toPlayerInfoDtos(roomRedisRepository.getMembers(roomId.toString()));
			String leftPlayerNickname = membersBeforeLeave.stream()
				.filter(player -> player.playerId().equals(memberId))
				.map(PlayerInfoDto::nickname)
				.findFirst()
				.orElseGet(() -> memberService.getNicknameById(memberId));
			String hostId = roomRedisRepository.findHostIdById(roomId);
			boolean hostLeft = memberIdStr.equals(hostId);
			boolean inGame = ROOM_STATE_IN_GAME.equals(roomRedisRepository.findRoomStateById(roomId));
			String currentMode = inGame ? roomRedisRepository.findModeById(roomId) : null;
			boolean contributionGameInProgress = inGame && RoomMode.CONTRIBUTION.name().equals(currentMode);
			boolean coopGameInProgress = inGame && RoomMode.COOP.name().equals(currentMode);
			String gameSessionId = contributionGameInProgress ? roomRedisRepository.findGameSessionId(roomId) : null;
			ContributionInputResult disconnectedResult = null;
			UUID parsedSessionId = null;
			if (contributionGameInProgress && gameSessionId != null) {
				parsedSessionId = UUID.fromString(gameSessionId);
				disconnectedResult = contributionGameService.handlePlayerDisconnected(parsedSessionId, memberId);
			}

			roomRedisRepository.removeMember(roomId, memberIdStr);
			List<PlayerInfoDto> remainMembers = roomMemberMapper
				.toPlayerInfoDtos(roomRedisRepository.getMembers(roomId.toString()));
			if (parsedSessionId != null) {
				if (disconnectedResult != null && disconnectedResult.payload() != null) {
					roomWebSocketEventPublisher.publishContributionEvent(roomId, disconnectedResult.payload());
				}
				if (remainMembers.size() < 2) {
					ContributionGameEndMessage gameEnd = contributionGameService.endByPlayerDisconnected(
						roomId, parsedSessionId);
					if (gameEnd != null) {
						roomRedisRepository.updateRoomState(roomId, ROOM_STATE_WAITING);
						roomRedisRepository.resetMembersReadyExceptHost(roomId);
						contributionGameService.deleteSession(parsedSessionId);
						roomWebSocketEventPublisher.publishContributionGameEnd(roomId, gameEnd);
					}
				}
			}
			if (coopGameInProgress) {
				coopGameService.handlePlayerDisconnect(roomId);
			}
			if (remainMembers.isEmpty()) {
				roomRedisRepository.dissolveRoom(roomId);
				log.info("[room][leaveRoom] room dissolved. roomId={}", roomId);
				return;
			}

			UUID delegatedHostId = null;
			if (hostLeft) {
				PlayerInfoDto newHost = pickRandomHost(remainMembers);
				String newHostId = newHost.playerId().toString();
				delegatedHostId = newHost.playerId();

				// Redis 상태 변경 (Lua 원자 처리)
				roomRedisRepository.delegateHostAtomic(roomId.toString(), newHostId);

				remainMembers = applyHostFlag(remainMembers, delegatedHostId);
				log.info("[room][leaveRoom] host transferred. roomId={}, leftHostId={}, newHostId={}", roomId, memberId,
					newHostId);
			}

			if (!hostLeft) {
				log.info("[room][leaveRoom] roomId={}, memberId={}", roomId, memberId);
			}
			String currentRoomState = roomRedisRepository.findRoomStateById(roomId);
			roomWebSocketEventPublisher.publishPlayerLeft(roomId, memberId, leftPlayerNickname, remainMembers,
				currentRoomState);
			if (delegatedHostId != null) {
				roomWebSocketEventPublisher.publishHostDelegated(roomId, delegatedHostId, remainMembers);
			}
		} finally {
			lock.unlock();
		}
	}

	@Override
	public void leaveContributionGameIfDisconnected(String memberId) {
		roomRedisRepository.findJoinedRoomId(memberId)
			.ifPresent(roomId -> {
				if (!ROOM_STATE_IN_GAME.equals(roomRedisRepository.findRoomStateById(roomId))
					|| !RoomMode.CONTRIBUTION.name().equals(roomRedisRepository.findModeById(roomId))) {
					return;
				}
				leaveRoom(roomId, UUID.fromString(memberId));
			});
	}

	@Override
	public void leaveGameIfDisconnected(String memberId) {
		roomRedisRepository.findJoinedRoomId(memberId)
			.ifPresent(roomId -> {
				String mode = roomRedisRepository.findModeById(roomId);
				if (mode == null) {
					return;
				}
				boolean isInGame = ROOM_STATE_IN_GAME.equals(roomRedisRepository.findRoomStateById(roomId));
				if (RoomMode.CONTRIBUTION.name().equals(mode)) {
					leaveRoom(roomId, UUID.fromString(memberId));
					return;
				}
				if (RoomMode.COOP.name().equals(mode)) {
					if (isInGame) {
						coopGameService.handlePlayerDisconnect(roomId);
					}
					// handlePlayerDisconnect()가 방 상태를 WAITING으로 되돌린 후 호출하므로
					// isInGame 여부와 무관하게 멤버 존재 시 항상 제거 (ghost player 방지)
					if (roomRedisRepository.existsMember(roomId, memberId)) {
						leaveRoom(roomId, UUID.fromString(memberId));
					}
				}
			});
	}

	private PlayerInfoDto pickRandomHost(List<PlayerInfoDto> remainMembers) {
		List<PlayerInfoDto> candidates = List.copyOf(remainMembers);
		return candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));
	}

	private List<PlayerInfoDto> applyHostFlag(List<PlayerInfoDto> members, UUID hostId) {
		return members.stream()
			.map(member -> new PlayerInfoDto(
				member.playerId(),
				member.nickname(),
				member.characterHair(),
				member.characterHairColor(),
				member.characterBody(),
				member.characterEye(),
				member.characterOutfit(),
				member.characterOutfitColor(),
				member.isReady(),
				member.playerId().equals(hostId)))
			.toList();
	}

	@Override
	public KickMemberResultResponse kickMember(Long roomId, UUID currentMemberId, String playerId) {
		RLock lock = redissonClient.getLock("lock:room:" + roomId);
		lock.lock();
		try {
			Map<Object, Object> roomInfo = roomRedisRepository.getRoomInfo(roomId.toString())
				.orElseThrow(() -> new BusinessException(ROOM_NOT_FOUND));

			if (RoomState.valueOf(RoomRedisReader.readString(roomInfo, "roomState")) == RoomState.IN_GAME) {
				log.warn("[room][kickMember] kick rejected: game in progress. roomId={}, playerId={}", roomId,
					playerId);
				throw new BusinessException(ROOM_IN_GAME);
			}

			String hostId = RoomRedisReader.readString(roomInfo, "hostMemberId");
			if (!currentMemberId.toString().equals(hostId)) {
				throw new BusinessException(NOT_HOST);
			}
			if (playerId.equals(currentMemberId.toString())) {
				throw new BusinessException(CANNOT_KICK_SELF);
			}
			if (!roomRedisRepository.existsMember(roomId, playerId)) {
				throw new BusinessException(PLAYER_NOT_FOUND);
			}

			// 강퇴 전 닉네임 조회
			Map<Object, Object> members = roomRedisRepository.getMembers(roomId.toString());
			List<PlayerInfoDto> allPlayers = roomMemberMapper.toPlayerInfoDtos(members);
			String kickedNickname = allPlayers.stream()
				.filter(p -> playerId.equals(p.playerId().toString()))
				.map(PlayerInfoDto::nickname)
				.findFirst()
				.orElse("");

			roomRedisRepository.removeMember(roomId, playerId);

			// 강퇴 후 남은 멤버 조회
			Map<Object, Object> remainingMembers = roomRedisRepository.getMembers(roomId.toString());
			List<PlayerInfoDto> remainPlayers = roomMemberMapper.toPlayerInfoDtos(remainingMembers);

			log.info("[room][kickMember] roomId={}, playerId={}", roomId, playerId);
			return new KickMemberResultResponse(UUID.fromString(playerId), kickedNickname, remainPlayers);
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
		RLock lock = redissonClient.getLock("lock:room:" + roomId);
		lock.lock();
		try {
			Map<Object, Object> roomInfo = roomRedisRepository.getRoomInfo(roomId.toString())
				.orElseThrow(() -> new BusinessException(ROOM_NOT_FOUND));

			if (RoomState.valueOf(RoomRedisReader.readString(roomInfo, "roomState")) == RoomState.IN_GAME) {
				log.warn("[room][updateReadyStatus] ready change rejected: game in progress. roomId={}, memberId={}",
					roomId, memberId);
				throw new BusinessException(ROOM_IN_GAME);
			}

			String memberIdStr = memberId.toString();
			if (!roomRedisRepository.existsMember(roomId, memberIdStr)) {
				log.warn("[room][updateReadyStatus] ready change rejected: player not in room. roomId={}, memberId={}",
					roomId, memberId);
				throw new BusinessException(PLAYER_NOT_IN_ROOM);
			}

			String hostMemberId = RoomRedisReader.readString(roomInfo, "hostMemberId");
			if (memberIdStr.equals(hostMemberId)) {
				log.warn(
					"[room][updateReadyStatus] ready change rejected: host is always ready. roomId={}, memberId={}",
					roomId, memberId);
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

			boolean allReady = players.stream()
				.filter(p -> !p.playerId().toString().equals(hostMemberId))
				.allMatch(p -> Boolean.TRUE.equals(p.isReady()))
				&& players.stream().anyMatch(p -> !p.playerId().toString().equals(hostMemberId));

			log.info("[room][updateReadyStatus] ready status changed. roomId={}, memberId={}, isReady={}, allReady={}",
				roomId, memberId, request.isReady(), allReady);
			return ReadyChangedResponse.of(memberId, nickname, request.isReady(), allReady);
		} finally {
			lock.unlock();
		}
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

		// ── 1. 방 존재 여부 확인 ──────────────────────────────────────────────────
		if (!roomRedisRepository.existsById(roomId)) {
			throw new BusinessException(ROOM_NOT_FOUND);
		}

		// ── 2. 분산 락 + 원자적 검증 (중복 게임 시작 방지) ─────────────────────────
		// 락 범위 안에서 검증 → 상태 선점까지 한 번에 처리
		// (락 밖에서 검증하면 동시 요청 시 두 요청 모두 통과할 수 있음)
		UUID gameSessionId = UUID.randomUUID();
		String mode;
		String hostId;
		Set<String> memberIdStrs;

		RLock lock = redissonClient.getLock("lock:room:" + roomId);
		lock.lock();
		try {
			// 이미 게임 중이면 중복 시작 차단
			if (ROOM_STATE_IN_GAME.equals(roomRedisRepository.findRoomStateById(roomId))) {
				throw new BusinessException(GAME_ALREADY_STARTED);
			}

			// 요청자가 방장인지 확인
			hostId = roomRedisRepository.findHostIdById(roomId);
			if (!memberId.toString().equals(hostId)) {
				throw new BusinessException(NOT_HOST);
			}

			memberIdStrs = roomRedisRepository.findAllMemberIds(roomId);
			mode = roomRedisRepository.findModeById(roomId);

			// 게임 모드별 최소 인원 검증
			if (RoomMode.CONTRIBUTION.name().equals(mode) && memberIdStrs.size() < 2) {
				throw new BusinessException(NOT_ENOUGH_PLAYERS);
			}
			if (RoomMode.COOP.name().equals(mode) && memberIdStrs.size() < 4) {
				throw new BusinessException(NOT_ENOUGH_PLAYERS);
			}

			// 방의 모든 멤버가 준비 완료인지 확인 (방장은 기본값 true)
			if (!roomRedisRepository.isAllMembersReady(roomId)) {
				throw new BusinessException(NOT_ALL_READY);
			}

			// ── 3. 상태 선점: 검증 통과 즉시 IN_GAME으로 변경 ────────────────────
			// 이 시점부터 다른 요청은 위의 GAME_ALREADY_STARTED로 튕겨냄
			roomRedisRepository.updateRoomState(roomId, ROOM_STATE_IN_GAME);
		} finally {
			lock.unlock();
		}

		// ── 4. 락 해제 후 무거운 데이터 조회 (실패 시 WAITING으로 롤백) ────────────
		// DB/외부 서비스 조회는 락 밖에서 처리해 락 점유 시간을 최소화
		// 단, 이 구간에서 예외 발생 시 반드시 룸 상태를 WAITING으로 되돌려야 함
		List<UUID> memberIds = memberIdStrs.stream().map(UUID::fromString).toList();
		try {
			Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(memberIds);
			GameStartResult result;

			if (RoomMode.CONTRIBUTION.name().equals(mode)) {
				// ── 5a. 기여도 모드: 랜덤 커맨드셋 + 플레이어 최고 기록 조회 ──────────
				CommandSetResponse commandSet = commandService.getRandomContributionCommandSet(memberIds.size());
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
				ContributionStartedResponse response = ContributionStartedResponse.of(gameSessionId, now,
					commandSet.commandSetId(), commandSet.initialBranch(),
					commandSet.commandSet(), players);
				List<ContributionSessionCommand> sessionCommands = commandSet.commandSet().stream()
					.map(command -> new ContributionSessionCommand(
						command.commandSequence(),
						command.text(),
						command.branchName()))
					.toList();
				List<ContributionSessionPlayer> sessionPlayers = players.stream()
					.map(player -> new ContributionSessionPlayer(
						player.playerId(),
						player.nickname(),
						player.bestContribution()))
					.toList();
				contributionGameService.initializeSession(
					roomId,
					gameSessionId,
					response.startAt(),
					commandSet.commandSetId(),
					commandSet.initialBranch(),
					sessionCommands,
					sessionPlayers);
				result = new GameStartResult(
					"/topic/room/" + roomId + "/contribution",
					ContributionStartedResponse.of(gameSessionId, now,
						commandSet.commandSetId(), commandSet.initialBranch(),
						commandSet.commandSet(), players));
			} else {
				// ── 5b. 협력 모드: 맵 그래프 데이터 + 플레이어 최고 기록 조회 ─────────
				String selectedMapId = roomRedisRepository.findSelectedMapId(roomId);
				SelectedMapDto selectedMap = coopService.getSelectedMap(UUID.fromString(selectedMapId));
				GraphDataDto graphData = coopGraphDataStore.getByMapId(UUID.fromString(selectedMapId));
				List<CoopPlayerDto> players = memberIds.stream()
					.map(id -> new CoopPlayerDto(id, nicknameMap.getOrDefault(id, "")))
					.toList();
				long now = System.currentTimeMillis();
				result = new GameStartResult(
					"/topic/room/" + roomId + "/coop",
					CoopStartedResponse.of(gameSessionId, now, graphData, players));

				// 협력 모드는 별도 게임 세션 초기화 필요 (기여도 모드는 클라이언트 주도)
				// COOP_STARTED 브로드캐스트 후 클라이언트가 coop topic 재구독을 완료할 시간을 확보한 뒤
				// ROUND_REVEAL을 전송하기 위해 initAndStartGame 호출을 REVEAL_DURATION_MS만큼 지연
				// startAt(= now + REVEAL_DURATION_MS) 시각에 정확히 REVEAL이 나가도록 맞춤
				final UUID finalGameSessionId = gameSessionId;
				final UUID finalMapId = UUID.fromString(selectedMapId);
				final List<UUID> finalMemberIds = memberIds;
				final String finalMapName = selectedMap.mapName();
				final String finalMapDifficulty = String.valueOf(selectedMap.difficulty());
				final String finalTeamName = roomRedisRepository.findTeamNameById(roomId);
				taskScheduler.schedule(() -> {
					if (!ROOM_STATE_IN_GAME.equals(roomRedisRepository.findRoomStateById(roomId))) {
						log.warn("[room][startGame] room no longer in game before init, skipping. roomId={}", roomId);
						return;
					}
					try {
						coopGameService.initAndStartGame(roomId, finalGameSessionId, finalMapId, finalMemberIds,
							finalMapName, finalMapDifficulty, finalTeamName);
					} catch (Exception e) {
						log.error("[room][startGame] initAndStartGame failed, room state rolled back. roomId={}",
							roomId, e);
						roomRedisRepository.updateRoomState(roomId, ROOM_STATE_WAITING);
						messageSender.send("/topic/room/" + roomId + "/coop",
							CoopGameEndResponse.disconnected(finalGameSessionId));
					}
				}, java.time.Instant.now().plusMillis(REVEAL_DURATION_MS));
			}

			// ── 6. 게임 세션 ID 저장 및 결과 반환 ─────────────────────────────────
			roomRedisRepository.saveGameSessionId(roomId, gameSessionId.toString());
			log.info("[room][startGame] roomId={}, mode={}, gameSessionId={}", roomId, mode, gameSessionId);
			return result;

		} catch (Exception e) {
			// ── 7. 롤백: 데이터 조회 실패 시 룸 상태를 WAITING으로 복구 ────────────
			roomRedisRepository.updateRoomState(roomId, ROOM_STATE_WAITING);
			if (RoomMode.CONTRIBUTION.name().equals(mode)) {
				contributionGameService.deleteSession(gameSessionId);
			}
			log.error("[room][startGame] data fetch failed, room state rolled back. roomId={}, mode={}", roomId, mode,
				e);
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

	@Override
	public HostTransferredResponse transferHost(Long roomId, UUID currentHostId, UUID nextHostId) {
		String currentHostIdStr = currentHostId.toString();
		String nextHostIdStr = nextHostId.toString();

		RLock lock = redissonClient.getLock("lock:room:" + roomId);
		lock.lock();
		try {
			Map<Object, Object> roomInfo = roomRedisRepository.getRoomInfo(roomId.toString())
				.orElseThrow(() -> new BusinessException(ROOM_NOT_FOUND));

			if (RoomState.valueOf(RoomRedisReader.readString(roomInfo, "roomState")) == RoomState.IN_GAME) {
				log.warn("[room][transferHost] transfer rejected: game in progress. roomId={}, nextHostId={}", roomId,
					nextHostId);
				throw new BusinessException(ROOM_IN_GAME);
			}

			String hostId = RoomRedisReader.readString(roomInfo, "hostMemberId");
			if (!currentHostIdStr.equals(hostId)) {
				throw new BusinessException(NOT_HOST);
			}
			if (currentHostIdStr.equals(nextHostIdStr)) {
				throw new BusinessException(SELF_TRANSFER);
			}
			if (!roomRedisRepository.existsMember(roomId, nextHostIdStr)) {
				throw new BusinessException(PLAYER_NOT_FOUND);
			}

			// Redis 상태 변경 (Lua 원자 처리)
			roomRedisRepository.transferHostAtomic(roomId.toString(), currentHostIdStr, nextHostIdStr);

			// 전체 멤버 조회 후 응답 생성
			Map<Object, Object> members = roomRedisRepository.getMembers(roomId.toString());
			List<PlayerInfoDto> allPlayers = roomMemberMapper.toPlayerInfoDtos(members);

			String newHostNickname = allPlayers.stream()
				.filter(p -> nextHostId.equals(p.playerId()))
				.map(PlayerInfoDto::nickname)
				.findFirst()
				.orElse("");

			log.info("[room][transferHost] roomId={}, prevHostId={}, newHostId={}", roomId, currentHostId, nextHostId);
			return HostTransferredResponse.of(nextHostId, newHostNickname, allPlayers);
		} finally {
			lock.unlock();
		}
	}

	@Override
	public BaseWebSocketResponse getRoomState(UUID memberId, Long roomId) {
		Map<Object, Object> roomInfo = roomRedisRepository.getRoomInfo(roomId.toString())
			.orElseThrow(() -> new BusinessException(ROOM_NOT_FOUND));

		if (!roomMemberStateRecoveryService.ensureMemberInRoom(roomId, memberId, roomInfo, "room-state")) {
			log.warn("[room][getRoomState] room state rejected: player not in room. roomId={}, memberId={}",
				roomId, memberId);
			throw new BusinessException(PLAYER_NOT_IN_ROOM);
		}

		Map<Object, Object> members = roomRedisRepository.getMembers(roomId.toString());
		List<PlayerInfoDto> players = roomMemberMapper.toPlayerInfoDtos(members);
		RoomMode mode = RoomMode.valueOf(RoomRedisReader.readString(roomInfo, "mode"));

		if (mode == RoomMode.CONTRIBUTION) {
			ContributionRoomInfoResponse response = new ContributionRoomInfoResponse(
				roomId,
				RoomRedisReader.readString(roomInfo, "roomCode"),
				RoomRedisReader.readString(roomInfo, "title"),
				GameMode.CONTRIBUTION,
				RoomState.valueOf(RoomRedisReader.readString(roomInfo, "roomState")),
				players.size(),
				RoomRedisReader.readBoolean(roomInfo, "hasPassword"),
				RoomRedisReader.readInt(roomInfo, "maxPlayers"),
				players);
			return ContributionRoomStateResponse.from(response);
		}

		if (mode == RoomMode.COOP) {
			SelectedMapDto selectedMap = new SelectedMapDto(
				UUID.fromString(RoomRedisReader.readString(roomInfo, "selectedMapId")),
				RoomRedisReader.readString(roomInfo, "selectedMapName"),
				RoomRedisReader.readInt(roomInfo, "selectedMapDifficulty"));
			CoopRoomInfoResponse response = new CoopRoomInfoResponse(
				roomId,
				RoomRedisReader.readString(roomInfo, "roomCode"),
				RoomRedisReader.readString(roomInfo, "title"),
				RoomRedisReader.readString(roomInfo, "teamName"),
				GameMode.COOP,
				RoomState.valueOf(RoomRedisReader.readString(roomInfo, "roomState")),
				players.size(),
				RoomRedisReader.readInt(roomInfo, "maxPlayers"),
				RoomRedisReader.readBoolean(roomInfo, "hasPassword"),
				selectedMap,
				players);
			return CoopRoomStateResponse.from(response);
		}

		log.warn("[room][getRoomState] unsupported room mode. roomId={}, memberId={}, mode={}", roomId, memberId, mode);
		throw new BusinessException(ROOM_MODE_MISMATCH);
	}

	@Override
	public void resetRoomAfterGame(Long roomId) {
		RLock lock = redissonClient.getLock("lock:room:" + roomId);
		lock.lock();
		try {
			roomRedisRepository.updateRoomState(roomId, ROOM_STATE_WAITING);
			roomRedisRepository.resetMembersReadyExceptHost(roomId);
			log.info("[room][resetRoomAfterGame] room state reset to WAITING after game. roomId={}", roomId);
		} finally {
			lock.unlock();
		}
	}
}

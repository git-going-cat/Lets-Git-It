package com.gitcat.letsgitit.domain.coop.repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface CoopGameRedisRepository {

	// 게임 초기화
	void initGameState(UUID gameSessionId, UUID mapId, Long roomId, List<UUID> playerIds,
		String mapName, String mapDifficulty, String teamName);

	// 게임 활성 여부
	boolean isGameActive(UUID gameSessionId);

	// 상태 조회
	int getCurrentRound(UUID gameSessionId);

	int getCompletedCount(UUID gameSessionId);

	long getStartTime(UUID gameSessionId);

	UUID getMapId(UUID gameSessionId);

	Long getRoomId(UUID gameSessionId);

	List<UUID> getPlayers(UUID gameSessionId);

	// 차단 상태
	boolean isBlocked(UUID gameSessionId);

	void block(UUID gameSessionId, UUID resetTargetPlayerId);

	void unblock(UUID gameSessionId);

	UUID getResetTargetPlayerId(UUID gameSessionId);

	// 라운드 명령어 (order 1~4 → commandText)
	void saveRoundCommands(UUID gameSessionId, int round, Map<Integer, String> commands);

	String getCommandByOrder(UUID gameSessionId, int round, int order);

	// 플레이어별 명령어 배정
	void assignCommand(UUID gameSessionId, int round, UUID playerId, String commandText);

	String getAssignedCommand(UUID gameSessionId, int round, UUID playerId);

	// 진행도 업데이트
	int incrementCompletedCount(UUID gameSessionId);

	void setRound(UUID gameSessionId, int round);

	void resetRoundProgress(UUID gameSessionId, int round);

	// 게임 종료
	void deleteGameState(UUID gameSessionId);

	void saveRoomGameSession(Long roomId, UUID gameSessionId);

	UUID findGameSessionIdByRoomId(Long roomId);

	void deleteRoomGameSession(Long roomId);

	// 플레이어별 오타/순서오류 카운터
	void incrementWrongType(UUID gameSessionId, UUID playerId);

	void incrementWrongOrder(UUID gameSessionId, UUID playerId);

	int getWrongType(UUID gameSessionId, UUID playerId);

	int getWrongOrder(UUID gameSessionId, UUID playerId);

	// 게임 메타 정보 조회 (DB 저장용)
	String getMapName(UUID gameSessionId);

	String getMapDifficulty(UUID gameSessionId);

	String getTeamName(UUID gameSessionId);
}

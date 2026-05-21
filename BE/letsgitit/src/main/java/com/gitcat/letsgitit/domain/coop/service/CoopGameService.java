package com.gitcat.letsgitit.domain.coop.service;

import java.util.List;
import java.util.UUID;

import com.gitcat.letsgitit.domain.coop.dto.request.CoopInputRequest;
import com.gitcat.letsgitit.domain.coop.dto.request.CoopResetRequest;

public interface CoopGameService {

	// 게임 시작 — 상태 초기화 후 1라운드 REVEAL 전송
	void initAndStartGame(Long roomId, UUID gameSessionId, UUID mapId, List<UUID> playerIds,
		String mapName, String mapDifficulty, String teamName);

	// 명령어 입력 처리
	void processInput(Long roomId, UUID memberId, CoopInputRequest request);

	// git reset 입력 처리
	void processReset(Long roomId, UUID memberId, CoopResetRequest request);

	// 플레이어 이탈 처리
	void handlePlayerDisconnect(Long roomId);
}

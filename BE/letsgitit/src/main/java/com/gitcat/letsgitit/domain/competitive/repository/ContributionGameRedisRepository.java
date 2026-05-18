package com.gitcat.letsgitit.domain.competitive.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.gitcat.letsgitit.domain.competitive.dto.ContributionCommandCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionGameSessionCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionPlayerCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionRankingCache;

public interface ContributionGameRedisRepository {

	void initializeSession(ContributionGameSessionCache session);

	void deleteSession(UUID gameSessionId);

	Optional<ContributionGameSessionCache> findSession(UUID gameSessionId);

	Optional<ContributionCommandCache> findCommand(UUID gameSessionId, int commandSequence);

	void saveCommand(UUID gameSessionId, ContributionCommandCache command);

	void markSessionEnded(UUID gameSessionId);

	boolean markSessionEndedIfInProgress(UUID gameSessionId);

	boolean existsPlayer(UUID gameSessionId, UUID playerId);

	List<ContributionPlayerCache> findPlayers(UUID gameSessionId);

	boolean existsBranch(UUID gameSessionId, String branch);

	Optional<String> findPosition(UUID gameSessionId, UUID playerId);

	void updatePosition(UUID gameSessionId, UUID playerId, String branch);

	long incrementSuccessCount(UUID gameSessionId, UUID playerId);

	long incrementCatExpiredCount(UUID gameSessionId);

	int findSuccessCount(UUID gameSessionId, UUID playerId);

	int findCatExpiredCount(UUID gameSessionId);

	int countScoredClearedCommands(UUID gameSessionId);

	void saveFinalRankings(UUID gameSessionId, List<ContributionRankingCache> rankings);

	List<ContributionRankingCache> findFinalRankings(UUID gameSessionId);

	void markPlayerDisconnected(UUID gameSessionId, UUID playerId);

	boolean isPlayerDisconnected(UUID gameSessionId, UUID playerId);
}

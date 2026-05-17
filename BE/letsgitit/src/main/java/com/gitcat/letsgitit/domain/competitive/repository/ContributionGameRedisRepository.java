package com.gitcat.letsgitit.domain.competitive.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.gitcat.letsgitit.domain.competitive.dto.ContributionCommandCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionGameSessionCache;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionPlayerCache;

public interface ContributionGameRedisRepository {

	void initializeSession(ContributionGameSessionCache session);

	void deleteSession(UUID gameSessionId);

	Optional<ContributionGameSessionCache> findSession(UUID gameSessionId);

	Optional<ContributionCommandCache> findCommand(UUID gameSessionId, int commandSequence);

	void saveCommand(UUID gameSessionId, ContributionCommandCache command);

	boolean existsPlayer(UUID gameSessionId, UUID playerId);

	List<ContributionPlayerCache> findPlayers(UUID gameSessionId);

	boolean existsBranch(UUID gameSessionId, String branch);

	void updatePosition(UUID gameSessionId, UUID playerId, String branch);

	long incrementSuccessCount(UUID gameSessionId, UUID playerId);

	int findSuccessCount(UUID gameSessionId, UUID playerId);

	int findCatExpiredCount(UUID gameSessionId);

	int countScoredClearedCommands(UUID gameSessionId);
}

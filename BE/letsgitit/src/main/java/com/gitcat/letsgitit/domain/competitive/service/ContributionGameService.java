package com.gitcat.letsgitit.domain.competitive.service;

import java.util.List;
import java.util.UUID;

import com.gitcat.letsgitit.domain.competitive.dto.ContributionInputResult;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionSessionCommand;
import com.gitcat.letsgitit.domain.competitive.dto.ContributionSessionPlayer;
import com.gitcat.letsgitit.domain.competitive.message.contribution.ContributionInputMessage;

public interface ContributionGameService {

	void initializeSession(
		Long roomId,
		UUID gameSessionId,
		long startAt,
		int commandSetId,
		String initialBranch,
		List<ContributionSessionCommand> commandSet,
		List<ContributionSessionPlayer> players);

	void deleteSession(UUID gameSessionId);

	ContributionInputResult processInput(Long roomId, UUID memberId, ContributionInputMessage request);
}

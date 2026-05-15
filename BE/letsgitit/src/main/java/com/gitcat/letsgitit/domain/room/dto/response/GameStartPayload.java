package com.gitcat.letsgitit.domain.room.dto.response;

public sealed interface GameStartPayload
	permits ContributionStartedResponse, CoopStartedResponse {}

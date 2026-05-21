package com.gitcat.letsgitit.domain.command.service;

import com.gitcat.letsgitit.domain.command.dto.response.CommandSetResponse;

public interface CommandService {
	// DB에서 기여도 뺏기용 커맨드셋 하나를 랜덤으로 골라서 반환
	CommandSetResponse getRandomContributionCommandSet();

	// DB에서 현재 게임 인원수에 맞는 기여도 뺏기용 커맨드셋 하나를 랜덤으로 골라서 반환
	CommandSetResponse getRandomContributionCommandSet(int playerCount);
}

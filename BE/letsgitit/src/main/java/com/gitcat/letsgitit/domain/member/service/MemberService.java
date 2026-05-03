package com.gitcat.letsgitit.domain.member.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.gitcat.letsgitit.domain.member.dto.request.NicknameRequest;
import com.gitcat.letsgitit.domain.member.dto.request.SaveCharacterRequest;
import com.gitcat.letsgitit.domain.member.dto.response.MemberProfileResponse;

public interface MemberService {

	void endTutorial(UUID memberId);

	MemberProfileResponse getProfile(UUID memberId);

	void saveCharacterAssets(UUID memberId, SaveCharacterRequest saveCharacterRequest);

	void saveNickname(UUID memberId, NicknameRequest nicknameRequest);

	void updateNickname(UUID memberId, NicknameRequest nicknameRequest);

	void validateNicknameDuplicate(String nickname);

	// 랭킹 기능 구현을 위한 메서드
	String getNicknameById(UUID memberId);

	// 랭킹 기능 구현을 위한 메서드
	Map<UUID, String> getNicknamesByIds(List<UUID> memberIds);
}

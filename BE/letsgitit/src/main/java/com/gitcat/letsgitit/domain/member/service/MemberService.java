package com.gitcat.letsgitit.domain.member.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.gitcat.letsgitit.domain.member.dto.request.NicknameRequest;
import com.gitcat.letsgitit.domain.member.dto.request.SaveCharacterRequest;
import com.gitcat.letsgitit.domain.member.dto.response.MemberProfileResponse;
import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.global.enums.Provider;

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

	boolean existsByEmail(String email);

	Member findByEmail(String email);

	void createMember(String email, String encodedPassword);

	void updatePassword(Member member, String encodedPassword);

	void addPlayTime(UUID memberId, int seconds);

	Member findOrCreateOAuthMember(String email, Provider provider, String providerId);

	Member findById(UUID memberId);
}

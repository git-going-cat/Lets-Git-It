package com.gitcat.letsgitit.domain.member.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface MemberService {

	// 랭킹 기능 구현을 위한 메서드
	String getNicknameById(UUID memberId);

	// 랭킹 기능 구현을 위한 메서드
	Map<UUID, String> getNicknamesByIds(List<UUID> memberIds);
}

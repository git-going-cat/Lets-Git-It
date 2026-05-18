package com.gitcat.letsgitit.domain.coop.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.gitcat.letsgitit.domain.coop.entity.CoopResultMember;

public interface CoopResultMemberRepository {

	void saveAll(List<CoopResultMember> members);

	// 랭킹 조회 시 여러 coopResultId의 멤버를 한 번에 배치 조회
	List<CoopResultMember> findAllByCoopResultIdIn(Collection<UUID> coopResultIds);
}

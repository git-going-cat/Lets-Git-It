package com.gitcat.letsgitit.domain.coop.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.coop.entity.CoopResultMember;

public interface CoopResultMemberJpaRepository extends JpaRepository<CoopResultMember, UUID> {

	// 랭킹 목록의 coopResultId를 한 번에 조회 (N+1 방지)
	List<CoopResultMember> findAllByCoopResultIdIn(Collection<UUID> coopResultIds);
}

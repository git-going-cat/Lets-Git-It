package com.gitcat.letsgitit.domain.coop.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.coop.entity.CoopResultMember;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class CoopResultMemberRepositoryImpl implements CoopResultMemberRepository {

	private final CoopResultMemberJpaRepository jpaRepository;

	@Override
	public void saveAll(List<CoopResultMember> members) {
		jpaRepository.saveAll(members);
	}

	@Override
	public List<CoopResultMember> findAllByCoopResultIdIn(Collection<UUID> coopResultIds) {
		return jpaRepository.findAllByCoopResultIdIn(coopResultIds);
	}
}

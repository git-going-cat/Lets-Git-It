package com.gitcat.letsgitit.domain.coop.repository;

import java.util.List;

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
}

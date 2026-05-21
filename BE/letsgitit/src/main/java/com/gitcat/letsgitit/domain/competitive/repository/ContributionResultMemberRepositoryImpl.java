package com.gitcat.letsgitit.domain.competitive.repository;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.competitive.entity.ContributionResultMember;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class ContributionResultMemberRepositoryImpl implements ContributionResultMemberRepository {

	private final ContributionResultMemberJpaRepository contributionResultMemberJpaRepository;

	@Override
	public void saveAll(List<ContributionResultMember> resultMembers) {
		contributionResultMemberJpaRepository.saveAll(resultMembers);
	}
}

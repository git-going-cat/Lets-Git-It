package com.gitcat.letsgitit.domain.competitive.repository;

import java.util.List;

import com.gitcat.letsgitit.domain.competitive.entity.ContributionResultMember;

public interface ContributionResultMemberRepository {

	void saveAll(List<ContributionResultMember> resultMembers);
}

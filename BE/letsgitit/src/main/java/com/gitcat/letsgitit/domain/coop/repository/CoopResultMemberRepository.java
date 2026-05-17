package com.gitcat.letsgitit.domain.coop.repository;

import java.util.List;

import com.gitcat.letsgitit.domain.coop.entity.CoopResultMember;

public interface CoopResultMemberRepository {

	void saveAll(List<CoopResultMember> members);
}

package com.gitcat.letsgitit.domain.member.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.gitcat.letsgitit.domain.member.entity.Member;

public interface MemberRepository {
	Optional<Member> findById(UUID id);

	List<Member> findAllByIds(List<UUID> ids);

	boolean existsByNickname(String nickname);

	void flush();
}

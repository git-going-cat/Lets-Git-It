package com.gitcat.letsgitit.domain.member.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.gitcat.letsgitit.domain.member.entity.Member;

public interface MemberRepository {

	// 랭킹 기능 구현을 위한 임시 메서드 -> 추후 member 기능 구현시 제거해도 됨
	Optional<Member> findById(UUID id);

	// 랭킹 기능 구현을 위한 임시 메서드 -> 추후 member 기능 구현시 제거해도 됨
	List<Member> findAllByIds(List<UUID> ids);
}

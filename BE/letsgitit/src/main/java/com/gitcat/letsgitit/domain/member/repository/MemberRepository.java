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

	// 이메일로 회원 조회 (로그인, 인증 등에서 사용)
	Optional<Member> findByEmail(String email);

	// 이메일 중복 체크 (회원가입 시 사용)
	boolean existsByEmail(String email);

	Member save(Member member);
}

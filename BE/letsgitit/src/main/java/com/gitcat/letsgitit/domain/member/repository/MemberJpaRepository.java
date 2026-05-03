package com.gitcat.letsgitit.domain.member.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.gitcat.letsgitit.domain.member.entity.Member;

public interface MemberJpaRepository extends JpaRepository<Member, UUID> {

	Optional<Member> findById(UUID memberId);

	Optional<Member> findByEmail(String email);

	boolean existsByEmail(String email);

	@Query(value = "select count(*) > 0 from member where nickname = :nickname", nativeQuery = true)
	boolean existsByNicknameIncludingDeleted(@Param("nickname")
	String nickname);

}

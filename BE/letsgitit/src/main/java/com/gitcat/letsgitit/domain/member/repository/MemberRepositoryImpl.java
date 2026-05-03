package com.gitcat.letsgitit.domain.member.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.member.entity.Member;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class MemberRepositoryImpl implements MemberRepository {

	private final MemberJpaRepository memberJpaRepository;

	@Override
	public Optional<Member> findById(UUID id) {
		return memberJpaRepository.findById(id);
	}

	@Override
	public List<Member> findAllByIds(List<UUID> ids) {
		return memberJpaRepository.findAllById(ids);
	}

	@Override
	public boolean existsByNickname(String nickname) {
		return memberJpaRepository.existsByNicknameIncludingDeleted(nickname);
	}

	@Override
	public void flush() {
		memberJpaRepository.flush();
	}
}

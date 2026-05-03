package com.gitcat.letsgitit.domain.member.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.member.entity.Member;

import lombok.RequiredArgsConstructor;

// 랭킹 기능 구현을 위한 임시 클래스 -> 추후 member 기능 구현시 제거해도 됨
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
}

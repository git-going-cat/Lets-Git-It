package com.gitcat.letsgitit.domain.member.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.member.entity.Member;

// 랭킹 기능 구현을 위한 임시 인터페이스 -> 추후 member 기능 구현시 제거해도 됨
public interface MemberJpaRepository extends JpaRepository<Member, UUID> {}

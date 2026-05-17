package com.gitcat.letsgitit.domain.competitive.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.competitive.entity.ContributionResultMember;

public interface ContributionResultMemberJpaRepository extends JpaRepository<ContributionResultMember, UUID> {}

package com.gitcat.letsgitit.domain.record.repository;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.record.entity.MemberCoopBestRecord;

public interface MemberCoopBestRecordJpaRepository extends JpaRepository<MemberCoopBestRecord, UUID> {}

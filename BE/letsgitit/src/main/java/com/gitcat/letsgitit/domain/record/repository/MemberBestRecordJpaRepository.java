package com.gitcat.letsgitit.domain.record.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.gitcat.letsgitit.domain.record.entity.MemberBestRecord;

public interface MemberBestRecordJpaRepository extends JpaRepository<MemberBestRecord, UUID> {
	List<MemberBestRecord> findByMemberId(UUID memberId);
}

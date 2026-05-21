package com.gitcat.letsgitit.domain.record.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.gitcat.letsgitit.domain.record.entity.BestRecordMode;
import com.gitcat.letsgitit.domain.record.entity.MemberBestRecord;

public interface MemberBestRecordRepository {
	List<MemberBestRecord> findByMemberId(UUID memberId);

	void save(MemberBestRecord record);

	Optional<MemberBestRecord> findByMemberIdAndMode(UUID memberId, BestRecordMode mode);
}

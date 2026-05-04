package com.gitcat.letsgitit.domain.record.repository;

import java.util.List;
import java.util.UUID;

import com.gitcat.letsgitit.domain.record.entity.MemberBestRecord;

public interface MemberBestRecordRepository {
	List<MemberBestRecord> findByMemberId(UUID memberId);
}

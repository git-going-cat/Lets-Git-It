package com.gitcat.letsgitit.domain.record.repository;

import java.util.Optional;
import java.util.UUID;

import com.gitcat.letsgitit.domain.record.entity.MemberCoopBestRecord;

public interface MemberCoopBestRecordRepository {
	Optional<MemberCoopBestRecord> findBestRecordByMemberId(UUID memberId);

	Optional<MemberCoopBestRecord> findBestRecordByMemberIdAndMap(UUID memberId, String mapName, int difficulty);

	void save(MemberCoopBestRecord record);
}

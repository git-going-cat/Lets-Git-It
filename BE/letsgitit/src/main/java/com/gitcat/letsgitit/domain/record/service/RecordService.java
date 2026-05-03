package com.gitcat.letsgitit.domain.record.service;

import java.util.List;
import java.util.UUID;

import com.gitcat.letsgitit.domain.record.entity.MemberBestRecord;
import com.gitcat.letsgitit.domain.record.entity.MemberCoopBestRecord;

public interface RecordService {

	List<MemberBestRecord> getBestRecords(UUID memberId);

	MemberCoopBestRecord getBestCoopRecord(UUID memberId);
}

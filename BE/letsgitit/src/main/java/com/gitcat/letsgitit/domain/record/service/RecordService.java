package com.gitcat.letsgitit.domain.record.service;

import java.util.List;
import java.util.UUID;

import com.gitcat.letsgitit.domain.record.entity.MemberBestRecord;
import com.gitcat.letsgitit.domain.record.entity.MemberCoopBestRecord;
import com.gitcat.letsgitit.global.enums.Difficulty;

public interface RecordService {

	List<MemberBestRecord> getBestRecords(UUID memberId);

	MemberCoopBestRecord getBestCoopRecord(UUID memberId);

	MemberCoopBestRecord getBestCoopRecordByMap(UUID memberId, String mapName, int difficulty);

	boolean updateSingleBestRecord(UUID memberId, Difficulty difficulty, int score, int rank);

	boolean updateContributionBestRecord(UUID memberId, int contribution, int rank);

	boolean updateCoopBestRecord(UUID memberId, String mapName, int difficulty, int elapsedTime, int rank);
}

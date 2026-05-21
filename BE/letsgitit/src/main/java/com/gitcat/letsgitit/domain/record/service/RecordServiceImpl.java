package com.gitcat.letsgitit.domain.record.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.record.entity.BestRecordMode;
import com.gitcat.letsgitit.domain.record.entity.MemberBestRecord;
import com.gitcat.letsgitit.domain.record.entity.MemberCoopBestRecord;
import com.gitcat.letsgitit.domain.record.repository.MemberBestRecordRepository;
import com.gitcat.letsgitit.domain.record.repository.MemberCoopBestRecordRepository;
import com.gitcat.letsgitit.global.enums.Difficulty;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RecordServiceImpl implements RecordService {

	private final MemberBestRecordRepository memberBestRecordRepository;
	private final MemberCoopBestRecordRepository memberCoopBestRecordRepository;

	@Override
	@Transactional(readOnly = true)
	public List<MemberBestRecord> getBestRecords(UUID memberId) {
		return memberBestRecordRepository.findByMemberId(memberId);
	}

	@Override
	@Transactional(readOnly = true)
	public MemberCoopBestRecord getBestCoopRecord(UUID memberId) {
		return memberCoopBestRecordRepository.findBestRecordByMemberId(memberId)
			.orElse(null);
	}

	@Override
	@Transactional(readOnly = true)
	public MemberCoopBestRecord getBestCoopRecordByMap(UUID memberId, String mapName, int difficulty) {
		return memberCoopBestRecordRepository.findBestRecordByMemberIdAndMap(memberId, mapName, difficulty)
			.orElse(null);
	}

	@Override
	@Transactional
	public boolean updateSingleBestRecord(UUID memberId, Difficulty difficulty, int score, int rank) {
		BestRecordMode mode = toSingleBestRecordMode(difficulty);

		MemberBestRecord record = memberBestRecordRepository
			.findByMemberIdAndMode(memberId, mode)
			.orElseGet(() -> MemberBestRecord.of(memberId, mode, 0, 0));

		if (score <= record.getBestScore()) {
			return false;
		}

		record.update(score, rank);
		memberBestRecordRepository.save(record);
		return true;
	}

	@Override
	@Transactional
	public boolean updateCoopBestRecord(UUID memberId, String mapName, int difficulty, int elapsedTime, int rank) {
		MemberCoopBestRecord record = memberCoopBestRecordRepository
			.findBestRecordByMemberIdAndMap(memberId, mapName, difficulty)
			.orElse(null);

		if (record == null) {
			memberCoopBestRecordRepository
				.save(MemberCoopBestRecord.of(memberId, mapName, difficulty, elapsedTime, rank));
			return true;
		}

		if (elapsedTime >= record.getBestTime()) {
			return false;
		}

		record.update(elapsedTime, rank);
		memberCoopBestRecordRepository.save(record);
		return true;
	}

	@Override
	@Transactional
	public boolean updateContributionBestRecord(UUID memberId, int contribution, int rank) {
		MemberBestRecord record = memberBestRecordRepository
			.findByMemberIdAndMode(memberId, BestRecordMode.CONTRIBUTION)
			.orElseGet(() -> MemberBestRecord.of(memberId, BestRecordMode.CONTRIBUTION, 0, 0));

		if (contribution <= record.getBestScore()) {
			return false;
		}

		record.update(contribution, rank);
		memberBestRecordRepository.save(record);
		return true;
	}

	private BestRecordMode toSingleBestRecordMode(Difficulty difficulty) {
		return switch (difficulty) {
			case EASY -> BestRecordMode.SINGLE_EASY;
			case NORMAL -> BestRecordMode.SINGLE_NORMAL;
			case HARD -> BestRecordMode.SINGLE_HARD;
		};
	}
}

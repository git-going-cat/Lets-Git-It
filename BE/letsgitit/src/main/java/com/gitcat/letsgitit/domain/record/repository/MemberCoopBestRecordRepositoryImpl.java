package com.gitcat.letsgitit.domain.record.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.record.entity.MemberCoopBestRecord;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class MemberCoopBestRecordRepositoryImpl implements MemberCoopBestRecordRepository {

	private final MemberCoopBestRecordDslRepository memberCoopBestRecordDslRepository;
	private final MemberCoopBestRecordJpaRepository memberCoopBestRecordJpaRepository;

	@Override
	public Optional<MemberCoopBestRecord> findBestRecordByMemberId(UUID memberId) {
		return memberCoopBestRecordDslRepository.findBestRecordByMemberId(memberId);
	}

	@Override
	public Optional<MemberCoopBestRecord> findBestRecordByMemberIdAndMap(UUID memberId, String mapName,
		int difficulty) {
		return memberCoopBestRecordDslRepository.findBestRecordByMemberIdAndMap(memberId, mapName, difficulty);
	}

	@Override
	public void save(MemberCoopBestRecord record) {
		memberCoopBestRecordJpaRepository.save(record);
	}
}

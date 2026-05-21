package com.gitcat.letsgitit.domain.record.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.record.entity.BestRecordMode;
import com.gitcat.letsgitit.domain.record.entity.MemberBestRecord;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class MemberBestRecordRepositoryImpl implements MemberBestRecordRepository {

	private final MemberBestRecordJpaRepository memberBestRecordJpaRepository;

	@Override
	public List<MemberBestRecord> findByMemberId(UUID memberId) {
		return memberBestRecordJpaRepository.findByMemberId(memberId);
	}

	@Override
	public void save(MemberBestRecord record) {
		memberBestRecordJpaRepository.save(record);
	}

	@Override
	public Optional<MemberBestRecord> findByMemberIdAndMode(UUID memberId, BestRecordMode mode) {
		return memberBestRecordJpaRepository.findByMemberIdAndMode(memberId, mode);
	}
}

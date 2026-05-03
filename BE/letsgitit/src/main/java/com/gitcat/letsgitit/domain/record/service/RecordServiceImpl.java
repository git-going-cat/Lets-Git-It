package com.gitcat.letsgitit.domain.record.service;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.record.entity.MemberBestRecord;
import com.gitcat.letsgitit.domain.record.entity.MemberCoopBestRecord;
import com.gitcat.letsgitit.domain.record.repository.MemberBestRecordRepository;
import com.gitcat.letsgitit.domain.record.repository.MemberCoopBestRecordRepository;

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
}

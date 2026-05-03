package com.gitcat.letsgitit.domain.record.service;

import static com.gitcat.letsgitit.domain.record.entity.BestRecordMode.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.BDDMockito.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.gitcat.letsgitit.domain.record.entity.MemberBestRecord;
import com.gitcat.letsgitit.domain.record.entity.MemberCoopBestRecord;
import com.gitcat.letsgitit.domain.record.repository.MemberBestRecordRepository;
import com.gitcat.letsgitit.domain.record.repository.MemberCoopBestRecordRepository;

@ExtendWith(MockitoExtension.class)
class RecordServiceImplTest {

	@Mock
	private MemberBestRecordRepository memberBestRecordRepository;

	@Mock
	private MemberCoopBestRecordRepository memberCoopBestRecordRepository;

	@InjectMocks
	private RecordServiceImpl recordService;

	@Test
	void 최고_기록_목록을_회원_ID로_조회한다() {
		// given
		UUID memberId = UUID.randomUUID();
		List<MemberBestRecord> records = List.of(
			MemberBestRecord.of(memberId, SINGLE_EASY, 9500, 12),
			MemberBestRecord.of(memberId, TIME_ATTACK, 10500, 3));

		given(memberBestRecordRepository.findByMemberId(memberId)).willReturn(records);

		// when
		List<MemberBestRecord> result = recordService.getBestRecords(memberId);

		// then
		assertThat(result).containsExactlyElementsOf(records);
		then(memberBestRecordRepository).should().findByMemberId(memberId);
	}

	@Test
	void 협력_최고_기록이_있으면_기록을_반환한다() {
		// given
		UUID memberId = UUID.randomUUID();
		MemberCoopBestRecord coopBestRecord = MemberCoopBestRecord.of(memberId, "기초 브랜치", "MAP_1", 61000, 2);

		given(memberCoopBestRecordRepository.findBestRecordByMemberId(memberId))
			.willReturn(Optional.of(coopBestRecord));

		// when
		MemberCoopBestRecord result = recordService.getBestCoopRecord(memberId);

		// then
		assertThat(result).isSameAs(coopBestRecord);
		then(memberCoopBestRecordRepository).should().findBestRecordByMemberId(memberId);
	}

	@Test
	void 협력_최고_기록이_없으면_null을_반환한다() {
		// given
		UUID memberId = UUID.randomUUID();

		given(memberCoopBestRecordRepository.findBestRecordByMemberId(memberId))
			.willReturn(Optional.empty());

		// when
		MemberCoopBestRecord result = recordService.getBestCoopRecord(memberId);

		// then
		assertThat(result).isNull();
		then(memberCoopBestRecordRepository).should().findBestRecordByMemberId(memberId);
	}
}

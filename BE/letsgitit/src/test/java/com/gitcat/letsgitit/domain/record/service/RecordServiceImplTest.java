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
import com.gitcat.letsgitit.global.enums.Difficulty;

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
		MemberCoopBestRecord coopBestRecord = MemberCoopBestRecord.of(memberId, "기초 브랜치", 1, 61000, 2);

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

	@Test
	void 싱글_최고_기록이_없으면_새로_생성해서_저장한다() {
		// given
		UUID memberId = UUID.randomUUID();

		given(memberBestRecordRepository.findByMemberIdAndMode(memberId, SINGLE_NORMAL))
			.willReturn(Optional.empty());

		// when
		boolean result = recordService.updateSingleBestRecord(memberId, Difficulty.NORMAL, 7200, 12);

		// then
		assertThat(result).isTrue();
		then(memberBestRecordRepository).should().save(argThat(record -> record.getMemberId().equals(memberId)
			&& record.getMode() == SINGLE_NORMAL
			&& record.getBestScore() == 7200
			&& record.getBestRank() == 12));
	}

	@Test
	void 기존_최고_점수보다_낮거나_같으면_저장하지_않는다() {
		// given
		UUID memberId = UUID.randomUUID();
		MemberBestRecord record = MemberBestRecord.of(memberId, SINGLE_HARD, 8000, 5);

		given(memberBestRecordRepository.findByMemberIdAndMode(memberId, SINGLE_HARD))
			.willReturn(Optional.of(record));

		// when
		boolean result = recordService.updateSingleBestRecord(memberId, Difficulty.HARD, 8000, 4);

		// then
		assertThat(result).isFalse();
		assertThat(record.getBestScore()).isEqualTo(8000);
		assertThat(record.getBestRank()).isEqualTo(5);
		then(memberBestRecordRepository).should(never()).save(any(MemberBestRecord.class));
	}

	@Test
	void 기존_최고_점수보다_높으면_기록을_갱신해_저장한다() {
		// given
		UUID memberId = UUID.randomUUID();
		MemberBestRecord record = MemberBestRecord.of(memberId, SINGLE_EASY, 5000, 20);

		given(memberBestRecordRepository.findByMemberIdAndMode(memberId, SINGLE_EASY))
			.willReturn(Optional.of(record));

		// when
		boolean result = recordService.updateSingleBestRecord(memberId, Difficulty.EASY, 6000, 10);

		// then
		assertThat(result).isTrue();
		assertThat(record.getBestScore()).isEqualTo(6000);
		assertThat(record.getBestRank()).isEqualTo(10);
		then(memberBestRecordRepository).should().save(record);
	}
}

package com.gitcat.letsgitit.domain.record.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.record.entity.MemberCoopBestRecord;
import com.gitcat.letsgitit.domain.record.entity.QMemberCoopBestRecord;
import com.querydsl.jpa.impl.JPAQueryFactory;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class MemberCoopBestRecordDslRepository {

	private final JPAQueryFactory jpaQueryFactory;

	public Optional<MemberCoopBestRecord> findBestRecordByMemberId(UUID memberId) {
		QMemberCoopBestRecord record = QMemberCoopBestRecord.memberCoopBestRecord;

		MemberCoopBestRecord result = jpaQueryFactory
			.selectFrom(record)
			.where(record.memberId.eq(memberId))
			.orderBy(
				record.bestTime.asc(), // 1. 시간 짧은 순
				record.mapDifficulty.desc(), // 2. 난이도 높은 순
				record.updatedAt.desc() // 3. 최신 순
			)
			.limit(1)
			.fetchOne();

		return Optional.ofNullable(result);
	}
}

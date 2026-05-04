package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.ranking.entity.QSingleRanking;
import com.gitcat.letsgitit.domain.ranking.entity.SingleRanking;
import com.gitcat.letsgitit.global.enums.Difficulty;
import com.querydsl.jpa.impl.JPAQueryFactory;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class SingleRankingDslRepository {

	private final JPAQueryFactory jpaQueryFactory;

	public List<SingleRanking> findScrollResult(Difficulty difficulty, String week,
		int cursor, int size) {
		QSingleRanking sr = QSingleRanking.singleRanking;

		return jpaQueryFactory
			.selectFrom(sr)
			.where(
				sr.difficulty.eq(difficulty),
				sr.week.eq(week),
				sr.rank.gt(cursor))
			.orderBy(sr.rank.asc())
			.limit(size)
			.fetch();
	}
}

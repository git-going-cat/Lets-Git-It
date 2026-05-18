package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.ranking.entity.CompetitiveRanking;
import com.gitcat.letsgitit.domain.ranking.entity.QCompetitiveRanking;
import com.gitcat.letsgitit.global.enums.CompetitiveMode;
import com.querydsl.jpa.impl.JPAQueryFactory;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class CompetitiveRankingDslRepository {

	private final JPAQueryFactory jpaQueryFactory;

	// 아래 스크롤: afterRank 초과를 rank ASC로 size개 조회
	public List<CompetitiveRanking> findScrollResult(CompetitiveMode mode, String week, int afterRank, int size) {
		QCompetitiveRanking cr = QCompetitiveRanking.competitiveRanking;

		return jpaQueryFactory
			.selectFrom(cr)
			.where(
				cr.mode.eq(mode),
				cr.week.eq(week),
				cr.rank.gt(afterRank))
			.orderBy(cr.rank.asc())
			.limit(size)
			.fetch();
	}

	// 위 스크롤: beforeRank 미만을 rank DESC로 size+1개 조회
	// size+1개를 fetch해서 hasPrev 판단 후, 서비스에서 Collections.reverse로 오름차순 복원
	public List<CompetitiveRanking> findScrollResultBefore(CompetitiveMode mode, String week, int beforeRank,
		int size) {
		QCompetitiveRanking cr = QCompetitiveRanking.competitiveRanking;

		return jpaQueryFactory
			.selectFrom(cr)
			.where(
				cr.mode.eq(mode),
				cr.week.eq(week),
				cr.rank.lt(beforeRank))
			.orderBy(cr.rank.desc())
			.limit(size + 1)
			.fetch();
	}
}

package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Repository;

import com.gitcat.letsgitit.domain.coop.entity.QCoopResultMember;
import com.gitcat.letsgitit.domain.ranking.entity.CoopRanking;
import com.gitcat.letsgitit.domain.ranking.entity.QCoopRanking;
import com.querydsl.jpa.impl.JPAQueryFactory;

import lombok.RequiredArgsConstructor;

@Repository
@RequiredArgsConstructor
public class CoopRankingDslRepository {

	private final JPAQueryFactory jpaQueryFactory;

	/**
	 * 내 팀 랭킹 조회: coop_ranking ↔ coop_result_member 조인
	 * 로그인 사용자가 참여한 팀 중 해당 주차에서 가장 높은 순위(rank ASC)를 반환
	 * 한 주에 여러 게임을 플레이했을 경우 최고 순위 팀이 myRank로 표시됨
	 */
	public Optional<CoopRanking> findMyCoopRankingByMemberIdAndWeek(UUID memberId, String week) {
		QCoopRanking cr = QCoopRanking.coopRanking;
		QCoopResultMember crm = QCoopResultMember.coopResultMember;

		CoopRanking result = jpaQueryFactory
			.selectFrom(cr)
			.join(crm).on(crm.coopResultId.eq(cr.coopResultId))
			.where(
				cr.week.eq(week),
				crm.memberId.eq(memberId))
			.orderBy(cr.rank.asc())
			.limit(1)
			.fetchOne();

		return Optional.ofNullable(result);
	}

	// 아래 스크롤: afterRank 초과를 rank ASC로 size개 조회
	public List<CoopRanking> findScrollResult(String week, int afterRank, int size) {
		QCoopRanking cr = QCoopRanking.coopRanking;

		return jpaQueryFactory
			.selectFrom(cr)
			.where(
				cr.week.eq(week),
				cr.rank.gt(afterRank))
			.orderBy(cr.rank.asc())
			.limit(size)
			.fetch();
	}

	// 위 스크롤: beforeRank 미만을 rank DESC로 size+1개 조회
	// size+1개를 fetch해서 hasPrev 판단 후, 서비스에서 Collections.reverse로 오름차순 복원
	public List<CoopRanking> findScrollResultBefore(String week, int beforeRank, int size) {
		QCoopRanking cr = QCoopRanking.coopRanking;

		return jpaQueryFactory
			.selectFrom(cr)
			.where(
				cr.week.eq(week),
				cr.rank.lt(beforeRank))
			.orderBy(cr.rank.desc())
			.limit(size + 1)
			.fetch();
	}

	// ── 맵+난이도 필터 (맵별 랭킹용) ────────────────────────────────────────────

	// 내 팀 랭킹 조회: mapName+difficulty 조건 추가
	public Optional<CoopRanking> findMyCoopRankingByMemberIdAndWeekAndMapNameAndDifficulty(
		UUID memberId, String week, String mapName, int difficulty) {
		QCoopRanking cr = QCoopRanking.coopRanking;
		QCoopResultMember crm = QCoopResultMember.coopResultMember;

		CoopRanking result = jpaQueryFactory
			.selectFrom(cr)
			.join(crm).on(crm.coopResultId.eq(cr.coopResultId))
			.where(
				cr.week.eq(week),
				cr.mapName.eq(mapName),
				cr.difficulty.eq(difficulty),
				crm.memberId.eq(memberId))
			.orderBy(cr.rank.asc())
			.limit(1)
			.fetchOne();

		return Optional.ofNullable(result);
	}

	// 특정 맵+난이도에서 globalRank보다 낮은(더 좋은) 기록 수 → 맵별 display rank 계산용
	public long countByWeekAndMapNameAndDifficultyAndRankLt(
		String week, String mapName, int difficulty, int rank) {
		QCoopRanking cr = QCoopRanking.coopRanking;

		Long count = jpaQueryFactory
			.select(cr.count())
			.from(cr)
			.where(
				cr.week.eq(week),
				cr.mapName.eq(mapName),
				cr.difficulty.eq(difficulty),
				cr.rank.lt(rank))
			.fetchOne();

		return count != null ? count : 0L;
	}

	// rank ASC + OFFSET/LIMIT: top3·around·scrollAfter에 공통 사용
	public List<CoopRanking> findByWeekAndMapNameAndDifficultyAscWithOffset(
		String week, String mapName, int difficulty, long offset, int limit) {
		QCoopRanking cr = QCoopRanking.coopRanking;

		return jpaQueryFactory
			.selectFrom(cr)
			.where(
				cr.week.eq(week),
				cr.mapName.eq(mapName),
				cr.difficulty.eq(difficulty))
			.orderBy(cr.rank.asc())
			.offset(offset)
			.limit(limit)
			.fetch();
	}

	// rank DESC + OFFSET/LIMIT: scrollBefore에서 역순 fetch 후 서비스에서 reverse
	public List<CoopRanking> findByWeekAndMapNameAndDifficultyDescWithOffset(
		String week, String mapName, int difficulty, long offset, int limit) {
		QCoopRanking cr = QCoopRanking.coopRanking;

		return jpaQueryFactory
			.selectFrom(cr)
			.where(
				cr.week.eq(week),
				cr.mapName.eq(mapName),
				cr.difficulty.eq(difficulty))
			.orderBy(cr.rank.desc())
			.offset(offset)
			.limit(limit)
			.fetch();
	}
}

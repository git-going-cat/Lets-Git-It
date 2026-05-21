package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.gitcat.letsgitit.domain.ranking.dto.CoopRankingData;

public interface CoopRankingRedisRepository {

	// ── 등록 ────────────────────────────────────────────────────────────────────

	/**
	 * 협력 랭킹 등록 (원자적 처리)
	 * - ZADD ranking:COOP:{week} 0 {lexString}
	 * - HSET ranking:COOP:{week}:data {coopResultId} {JSON}
	 * - HSET ranking:COOP:{week}:lookup {coopResultId} {lexString}
	 * - SADD ranking:COOP:{week}:members:{memberId} {coopResultId} (×4명)
	 * - SADD ranking:COOP:{week}:memberKeys {memberId} (×4명)
	 */
	void register(String week, CoopRankingData data);

	// ── ZSet 조회 ─────────────────────────────────────��─────────────────────────

	/**
	 * Top N 조회 (lexicographical 오름차순)
	 * @return lexString 목록
	 */
	List<String> getTopEntries(String week, int count);

	/**
	 * 범위 조회 (0-indexed, inclusive)
	 * @return lexString 목록
	 */
	List<String> getRangeByRank(String week, long start, long end);

	/**
	 * lexString으로 순위 조회 (0-indexed)
	 * @return 순위 (없으면 null)
	 */
	Long getRankByLexString(String week, String lexString);

	/**
	 * 전체 개수 조회
	 */
	long getTotalCount(String week);

	// ── Hash 조회 ───────────────────────────────────────────────────────────────

	/**
	 * coopResultId로 데이터 조회
	 */
	CoopRankingData getData(String week, String coopResultId);

	/**
	 * coopResultId 목록으로 데이터 일괄 조회.
	 * 반환 리스트의 크기는 입력과 동일하며, Hash miss 항목은 null로 채워 인덱스를 보존한다.
	 */
	List<CoopRankingData> getDataBatch(String week, List<String> coopResultIds);

	/**
	 * coopResultId로 lexString 조회 (lookup)
	 */
	String getLexString(String week, String coopResultId);

	// ── Set 조회 ────────────────────────────────────────────────────────────────

	/**
	 * 특정 회원이 참여한 coopResultId 목록 조회
	 */
	Set<String> getMemberCoopResultIds(String week, UUID memberId);

	// ── 정산용 ──────────────────────────────────────────────────────────────────

	/**
	 * 모든 memberKeys 조회 (정산 시 members:{memberId} 삭제용)
	 */
	Set<String> getAllMemberKeys(String week);

	/**
	 * 키 삭제
	 */
	void deleteKeys(String... keys);
}

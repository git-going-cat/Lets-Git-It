package com.gitcat.letsgitit.domain.ranking.repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface SingleRankingRedisRepository {

	record RankEntry(String memberId, double score) {
	}

	// ZSet에 composite score 저장 + Hash에 grade/playTime 저장 (기존 composite보다 높은 경우에만 갱신)
	boolean saveScoreGradeAndPlayTime(String scoreKey, String gradeKey, String playTimeKey,
		UUID memberId, double compositeScore, String grade, int playTimeMs);

	// 상위 count명 내림차순 조회
	List<RankEntry> getTopEntries(String key, int count);

	// 특정 멤버의 0-based 역순 순위 (없으면 null)
	Long getRankZeroBased(String key, UUID memberId);

	// 특정 멤버의 점수 (없으면 null)
	Double getScore(String key, UUID memberId);

	// 특정 멤버의 grade (없으면 null)
	String getGrade(String gradeKey, UUID memberId);

	// 여러 멤버의 grade 일괄 조회
	Map<UUID, String> getGrades(String gradeKey, List<UUID> memberIds);

	// 특정 멤버의 playTime(ms). 없으면 null
	Integer getPlayTime(String playTimeKey, UUID memberId);

	// 여러 멤버의 playTime(ms) 일괄 조회
	Map<UUID, Integer> getPlayTimes(String playTimeKey, List<UUID> memberIds);

	// 0-based [start, end] 범위 내림차순 조회
	List<RankEntry> getRangeByRank(String key, long start, long end);

	// 전체 등록 인원 수
	long getTotalCount(String key);

	// 정산 완료 후 키 삭제
	void deleteKey(String key);
}

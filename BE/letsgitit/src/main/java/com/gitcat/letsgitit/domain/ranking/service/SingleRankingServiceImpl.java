package com.gitcat.letsgitit.domain.ranking.service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.ranking.constants.RankingKeyUtil;
import com.gitcat.letsgitit.domain.ranking.dto.response.RankingEntry;
import com.gitcat.letsgitit.domain.ranking.dto.response.SingleRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.SingleRankingScrollResponse;
import com.gitcat.letsgitit.domain.ranking.entity.SingleRanking;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRedisRepository;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRedisRepository.RankEntry;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRepository;
import com.gitcat.letsgitit.domain.single.entity.enums.Grade;
import com.gitcat.letsgitit.global.enums.Difficulty;
import com.gitcat.letsgitit.global.util.WeekUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SingleRankingServiceImpl implements SingleRankingService {

	private final SingleRankingRedisRepository singleRankingRedisRepository;
	private final SingleRankingRepository singleRankingRepository;
	private final MemberService memberService;

	@Override
	@Transactional(readOnly = true)
	public SingleRankingInitialResponse getSingleRanking(Difficulty difficulty, int size, UUID memberId) {

		LocalDate now = LocalDate.now(ZoneId.of("Asia/Seoul"));

		String key = RankingKeyUtil.singleKey(difficulty.name(), WeekUtil.getWeek(now));
		String gradeKey = RankingKeyUtil.singleGradeKey(difficulty.name(), WeekUtil.getWeek(now));
		long total = singleRankingRedisRepository.getTotalCount(key);

		List<RankEntry> top3Raw = singleRankingRedisRepository.getTopEntries(key, 3);
		List<UUID> top3Ids = top3Raw.stream().map(r -> UUID.fromString(r.memberId())).toList();
		Map<UUID, String> top3NicknameMap = memberService.getNicknamesByIds(top3Ids);
		Map<UUID, String> top3GradeMap = singleRankingRedisRepository.getGrades(gradeKey, top3Ids);
		List<RankingEntry> top3 = toEntries(top3Raw, 1, top3NicknameMap, top3GradeMap);

		Long myRankZeroBased = singleRankingRedisRepository.getRankZeroBased(key, memberId);
		Double myScore = singleRankingRedisRepository.getScore(key, memberId);

		if (myRankZeroBased == null || myScore == null) {
			return new SingleRankingInitialResponse(
				difficulty.name(),
				WeekUtil.getYear(now),
				WeekUtil.getMonth(now),
				WeekUtil.getWeekOfMonth(now),
				top3,
				null,
				List.of(),
				null,
				false);
		}

		String nickname = memberService.getNicknameById(memberId);
		String myGradeStr = singleRankingRedisRepository.getGrade(gradeKey, memberId);
		Grade myGrade = myGradeStr != null ? Grade.valueOf(myGradeStr) : null;

		RankingEntry myRank = new RankingEntry(
			(int)(myRankZeroBased + 1),
			nickname,
			(int)Math.round(myScore),
			myGrade);

		long aroundStart = Math.max(0, myRankZeroBased - 2);
		long aroundEnd = Math.min(total - 1, myRankZeroBased + 2);

		List<RankEntry> aroundRaw = singleRankingRedisRepository.getRangeByRank(key, aroundStart, aroundEnd);
		List<UUID> aroundIds = aroundRaw.stream().map(r -> UUID.fromString(r.memberId())).toList();
		Map<UUID, String> aroundNicknameMap = memberService.getNicknamesByIds(aroundIds);
		Map<UUID, String> aroundGradeMap = singleRankingRedisRepository.getGrades(gradeKey, aroundIds);
		List<RankingEntry> around = toEntries(aroundRaw, (int)aroundStart + 1, aroundNicknameMap, aroundGradeMap);

		long nextCursorLong = aroundEnd + 1;
		boolean hasNext = nextCursorLong < total;

		return new SingleRankingInitialResponse(
			difficulty.name(),
			WeekUtil.getYear(now),
			WeekUtil.getMonth(now),
			WeekUtil.getWeekOfMonth(now),
			top3,
			myRank,
			around,
			hasNext ? (int)nextCursorLong : null,
			hasNext);
	}

	@Override
	@Transactional(readOnly = true)
	public SingleRankingScrollResponse getSingleRankingScroll(Difficulty difficulty, int cursor, int size,
		UUID memberId) {

		LocalDate now = LocalDate.now(ZoneId.of("Asia/Seoul"));

		String key = RankingKeyUtil.singleKey(difficulty.name(), WeekUtil.getWeek(now));
		String gradeKey = RankingKeyUtil.singleGradeKey(difficulty.name(), WeekUtil.getWeek(now));
		long total = singleRankingRedisRepository.getTotalCount(key);

		long start = cursor;
		long end = cursor + (long)size - 1;

		List<RankEntry> raw = singleRankingRedisRepository.getRangeByRank(key, start, end);
		List<UUID> memberUuids = raw.stream().map(r -> UUID.fromString(r.memberId())).toList();
		Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(memberUuids);
		Map<UUID, String> gradeMap = singleRankingRedisRepository.getGrades(gradeKey, memberUuids);
		List<RankingEntry> rankings = toEntries(raw, cursor + 1, nicknameMap, gradeMap);

		long nextCursorLong = start + raw.size();
		boolean hasNext = nextCursorLong < total;

		return new SingleRankingScrollResponse(
			rankings,
			hasNext ? (int)nextCursorLong : null,
			hasNext);
	}

	@Override
	@Transactional(readOnly = true)
	public SingleRankingInitialResponse getSingleRankingHistory(Difficulty difficulty, int year, int month, int week,
		int size, UUID memberId) {
		String weekKey = WeekUtil.getWeek(year, month, week);

		List<SingleRanking> top3Raw = singleRankingRepository.findTop3ByDifficultyAndWeek(
			difficulty,
			weekKey);

		long total = singleRankingRepository.countByDifficultyAndWeek(difficulty, weekKey);

		SingleRanking myRankEntity = singleRankingRepository
			.findByMemberIdAndDifficultyAndWeek(memberId, difficulty, weekKey)
			.orElse(null);

		if (myRankEntity == null) {
			List<UUID> top3Ids = top3Raw.stream().map(SingleRanking::getMemberId).toList();
			Map<UUID, String> top3NicknameMap = memberService.getNicknamesByIds(top3Ids);
			List<RankingEntry> top3 = toHistoryEntries(top3Raw, top3NicknameMap);

			boolean hasNext = total > 3;
			return new SingleRankingInitialResponse(
				difficulty.name(),
				year,
				month,
				week,
				top3,
				null,
				List.of(),
				hasNext ? 3 : null,
				hasNext);
		}

		int aroundMinRank = Math.max(1, myRankEntity.getRank() - 2);
		int aroundMaxRank = Math.min((int)total, myRankEntity.getRank() + 2);

		List<SingleRanking> aroundRaw = singleRankingRepository
			.findAroundByDifficultyAndWeekAndRank(
				difficulty,
				weekKey,
				aroundMinRank,
				aroundMaxRank);

		List<UUID> allIds = new ArrayList<>();
		top3Raw.stream().map(SingleRanking::getMemberId).forEach(allIds::add);
		aroundRaw.stream().map(SingleRanking::getMemberId).forEach(allIds::add);
		allIds.add(myRankEntity.getMemberId());
		Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(allIds.stream().distinct().toList());

		List<RankingEntry> top3 = toHistoryEntries(top3Raw, nicknameMap);
		String myNickname = nicknameMap.getOrDefault(myRankEntity.getMemberId(), "[Unknown]");
		RankingEntry myRank = new RankingEntry(
			myRankEntity.getRank(),
			myNickname,
			myRankEntity.getScore(),
			myRankEntity.getGrade());
		List<RankingEntry> around = toHistoryEntries(aroundRaw, nicknameMap);

		boolean hasNext = aroundMaxRank < total;

		return new SingleRankingInitialResponse(
			difficulty.name(),
			year,
			month,
			week,
			top3,
			myRank,
			around,
			hasNext ? aroundMaxRank : null,
			hasNext);
	}

	@Override
	@Transactional(readOnly = true)
	public SingleRankingScrollResponse getSingleRankingHistoryScroll(Difficulty difficulty, int year, int month,
		int week, int cursor, int size, UUID memberId) {
		String weekKey = WeekUtil.getWeek(year, month, week);

		List<SingleRanking> raw = singleRankingRepository.findScrollResult(
			difficulty,
			weekKey,
			cursor,
			size + 1);

		if (raw.isEmpty()) {
			return new SingleRankingScrollResponse(List.of(), null, false);
		}

		boolean hasNext = raw.size() > size;
		List<SingleRanking> page = hasNext ? raw.subList(0, size) : raw;

		List<UUID> memberIds = page.stream().map(SingleRanking::getMemberId).toList();
		Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(memberIds);
		List<RankingEntry> rankings = toHistoryEntries(page, nicknameMap);
		Integer nextCursor = hasNext ? page.get(page.size() - 1).getRank() : null;

		return new SingleRankingScrollResponse(
			rankings,
			nextCursor,
			hasNext);
	}

	private List<RankingEntry> toHistoryEntries(List<SingleRanking> raw, Map<UUID, String> nicknameMap) {
		return raw.stream()
			.map(sr -> new RankingEntry(
				sr.getRank(),
				nicknameMap.getOrDefault(sr.getMemberId(), "[Unknown]"),
				sr.getScore(),
				sr.getGrade()))
			.toList();
	}

	private List<RankingEntry> toEntries(List<RankEntry> raw, int startRank,
		Map<UUID, String> nicknameMap, Map<UUID, String> gradeMap) {
		List<RankingEntry> result = new ArrayList<>(raw.size());

		for (int i = 0; i < raw.size(); i++) {
			RankEntry r = raw.get(i);
			UUID id = UUID.fromString(r.memberId());
			String gradeStr = gradeMap.get(id);
			result.add(new RankingEntry(
				startRank + i,
				nicknameMap.getOrDefault(id, "[Unknown]"),
				(int)Math.round(r.score()),
				gradeStr != null ? Grade.valueOf(gradeStr) : null));
		}

		return result;
	}
}

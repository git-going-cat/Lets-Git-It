package com.gitcat.letsgitit.domain.ranking.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.INVALID_INPUT_VALUE;

import java.time.LocalDate;
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
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRedisRepository;
import com.gitcat.letsgitit.domain.ranking.repository.SingleRankingRedisRepository.RankEntry;
import com.gitcat.letsgitit.global.enums.Difficulty;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.util.WeekUtil;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SingleRankingServiceImpl implements SingleRankingService {

	private final SingleRankingRedisRepository singleRankingRedisRepository;

	private final MemberService memberService;

	@Override
	@Transactional(readOnly = true)
	public SingleRankingInitialResponse getSingleRanking(String difficulty, int size, UUID memberId) {

		LocalDate now = LocalDate.now();

		Difficulty diff = parseDifficulty(difficulty);
		String key = RankingKeyUtil.singleKey(diff.name(), WeekUtil.getWeek(now));
		long total = singleRankingRedisRepository.getTotalCount(key);

		List<RankEntry> top3Raw = singleRankingRedisRepository.getTopEntries(key, 3);
		List<UUID> top3Ids = top3Raw.stream().map(r -> UUID.fromString(r.memberId())).toList();
		Map<UUID, String> top3NicknameMap = memberService.getNicknamesByIds(top3Ids);
		List<RankingEntry> top3 = toEntries(top3Raw, 1, top3NicknameMap);

		Long myRankZeroBased = singleRankingRedisRepository.getRankZeroBased(key, memberId);
		Double myScore = singleRankingRedisRepository.getScore(key, memberId);

		if (myRankZeroBased == null || myScore == null) {
			return new SingleRankingInitialResponse(
				diff.name(),
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

		RankingEntry myRank = new RankingEntry(
			(int)(myRankZeroBased + 1),
			nickname,
			(int)Math.round(myScore));

		long aroundStart = Math.max(0, myRankZeroBased - 2);
		long aroundEnd = Math.min(total - 1, myRankZeroBased + 2);

		List<RankEntry> aroundRaw = singleRankingRedisRepository.getRangeByRank(key, aroundStart, aroundEnd);
		List<UUID> aroundIds = aroundRaw.stream().map(r -> UUID.fromString(r.memberId())).toList();
		Map<UUID, String> aroundNicknameMap = memberService.getNicknamesByIds(aroundIds);
		List<RankingEntry> around = toEntries(aroundRaw, (int)aroundStart + 1, aroundNicknameMap);

		long nextCursorLong = aroundEnd + 1;
		boolean hasNext = nextCursorLong < total;

		return new SingleRankingInitialResponse(
			diff.name(),
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
	public SingleRankingScrollResponse getSingleRankingScroll(String difficulty, int cursor, int size, UUID memberId) {

		LocalDate now = LocalDate.now();

		Difficulty diff = parseDifficulty(difficulty);
		String key = RankingKeyUtil.singleKey(diff.name(), WeekUtil.getWeek(now));
		long total = singleRankingRedisRepository.getTotalCount(key);

		long start = cursor;
		long end = cursor + (long)size - 1;

		List<RankEntry> raw = singleRankingRedisRepository.getRangeByRank(key, start, end);
		List<UUID> memberUuids = raw.stream().map(r -> UUID.fromString(r.memberId())).toList();
		Map<UUID, String> nicknameMap = memberService.getNicknamesByIds(memberUuids);
		List<RankingEntry> rankings = toEntries(raw, cursor + 1, nicknameMap);

		long nextCursorLong = start + raw.size();
		boolean hasNext = nextCursorLong < total;

		return new SingleRankingScrollResponse(
			rankings,
			hasNext ? (int)nextCursorLong : null,
			hasNext);
	}

	private Difficulty parseDifficulty(String difficulty) {
		try {
			return Difficulty.valueOf(difficulty.toUpperCase());
		} catch (IllegalArgumentException e) {
			throw new BusinessException(INVALID_INPUT_VALUE);
		}
	}

	private List<RankingEntry> toEntries(List<RankEntry> raw, int startRank, Map<UUID, String> nicknameMap) {
		List<RankingEntry> result = new ArrayList<>(raw.size());

		for (int i = 0; i < raw.size(); i++) {
			RankEntry r = raw.get(i);
			UUID id = UUID.fromString(r.memberId());
			result.add(new RankingEntry(
				startRank + i,
				nicknameMap.getOrDefault(id, "(알 수 없음)"),
				(int)Math.round(r.score())));
		}

		return result;
	}
}

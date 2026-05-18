package com.gitcat.letsgitit.domain.ranking.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import com.gitcat.letsgitit.domain.member.model.CustomUserDetails;
import com.gitcat.letsgitit.domain.ranking.service.ContributionRankingService;
import com.gitcat.letsgitit.domain.ranking.service.CoopRankingService;
import com.gitcat.letsgitit.domain.ranking.service.SingleRankingService;
import com.gitcat.letsgitit.global.enums.Difficulty;
import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.exception.ErrorCode;
import com.gitcat.letsgitit.global.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@Validated
@RestController
@RequestMapping("/api/v1/rankings")
@RequiredArgsConstructor
public class RankingController implements RankingControllerDocs {

	private final SingleRankingService singleRankingService;
	private final ContributionRankingService contributionRankingService;
	private final CoopRankingService coopRankingService;

	@Override
	@GetMapping("/single")
	public ResponseEntity<?> getSingleRanking(
		@AuthenticationPrincipal
		CustomUserDetails userDetails,
		@RequestParam
		Difficulty difficulty,
		@RequestParam(required = false)
		Integer afterRank,
		@RequestParam(required = false)
		Integer beforeRank,
		@RequestParam(required = false, defaultValue = "20")
		Integer size) {

		if (afterRank != null && beforeRank != null) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
		}

		UUID memberId = userDetails.getMemberId();

		if (afterRank == null && beforeRank == null) {
			return ApiResponse.ok("싱글 랭킹 조회 성공",
				singleRankingService.getSingleRanking(difficulty, size, memberId));
		}
		if (beforeRank != null) {
			return ApiResponse.ok("싱글 랭킹 조회 성공",
				singleRankingService.getSingleRankingScrollBefore(difficulty, beforeRank, size, memberId));
		}
		return ApiResponse.ok("싱글 랭킹 조회 성공",
			singleRankingService.getSingleRankingScrollAfter(difficulty, afterRank, size, memberId));
	}

	@Override
	@GetMapping("/contribution")
	public ResponseEntity<?> getContributionRanking(
		@AuthenticationPrincipal
		CustomUserDetails userDetails,
		@RequestParam(required = false)
		Integer afterRank,
		@RequestParam(required = false)
		Integer beforeRank,
		@RequestParam(required = false, defaultValue = "20")
		Integer size) {

		if (afterRank != null && beforeRank != null) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
		}

		UUID memberId = userDetails.getMemberId();

		if (afterRank == null && beforeRank == null) {
			return ApiResponse.ok("기여도 뺏기 랭킹 조회 성공",
				contributionRankingService.getContributionRanking(size, memberId));
		}
		if (beforeRank != null) {
			return ApiResponse.ok("기여도 뺏기 랭킹 조회 성공",
				contributionRankingService.getContributionRankingScrollBefore(beforeRank, size, memberId));
		}
		return ApiResponse.ok("기여도 뺏기 랭킹 조회 성공",
			contributionRankingService.getContributionRankingScrollAfter(afterRank, size, memberId));
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@GetMapping("/timeattack")
	public ResponseEntity<?> getTimeAttackRanking(
		@RequestParam(required = false)
		Integer cursor,
		@RequestParam(required = false, defaultValue = "20")
		Integer size) {

		if (cursor == null) {
			Map<String, Object> data = new LinkedHashMap<>();
			data.put("year", 2026);
			data.put("month", 4);
			data.put("week", 18);
			data.put("top3", List.of(
				Map.of("rank", 1, "nickname", "timemaster", "totalCount", 15000),
				Map.of("rank", 2, "nickname", "clockking", "totalCount", 14200),
				Map.of("rank", 3, "nickname", "ticktock", "totalCount", 13800)));
			data.put("myRank", Map.of("rank", 7, "totalCount", 10500));
			data.put("around", List.of(
				Map.of("rank", 5, "nickname", "user1", "totalCount", 11000),
				Map.of("rank", 6, "nickname", "user2", "totalCount", 10700),
				Map.of("rank", 7, "nickname", "dobby", "totalCount", 10500),
				Map.of("rank", 8, "nickname", "user3", "totalCount", 10200),
				Map.of("rank", 9, "nickname", "user4", "totalCount", 10000)));
			data.put("nextCursor", 9);
			data.put("hasNext", true);
			return ApiResponse.ok("타임어택 랭킹 조회 성공", data);
		}

		Map<String, Object> data = new LinkedHashMap<>();
		data.put("rankings", List.of(
			Map.of("rank", cursor + 1, "nickname", "user5", "totalCount", 9800)));
		data.put("nextCursor", cursor + 20);
		data.put("hasNext", true);
		return ApiResponse.ok("타임어택 랭킹 조회 성공", data);
	}

	@Override
	@GetMapping("/coop")
	public ResponseEntity<?> getCoopRanking(
		@AuthenticationPrincipal
		CustomUserDetails userDetails,
		@RequestParam(required = false)
		Integer afterRank,
		@RequestParam(required = false)
		Integer beforeRank,
		@RequestParam(required = false, defaultValue = "20")
		Integer size) {

		if (afterRank != null && beforeRank != null) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
		}

		UUID memberId = userDetails.getMemberId();

		if (afterRank == null && beforeRank == null) {
			return ApiResponse.ok("협력 랭킹 조회 성공",
				coopRankingService.getCoopRanking(memberId));
		}
		if (beforeRank != null) {
			return ApiResponse.ok("협력 랭킹 조회 성공",
				coopRankingService.getCoopRankingScrollBefore(beforeRank, size, memberId));
		}
		return ApiResponse.ok("협력 랭킹 조회 성공",
			coopRankingService.getCoopRankingScrollAfter(afterRank, size, memberId));
	}

	@Override
	@GetMapping("/single/history")
	public ResponseEntity<?> getSingleRankingHistory(
		@AuthenticationPrincipal
		CustomUserDetails userDetails,
		@RequestParam
		Difficulty difficulty,
		@RequestParam
		Integer year,
		@RequestParam
		Integer month,
		@RequestParam
		Integer week,
		@RequestParam(required = false)
		Integer afterRank,
		@RequestParam(required = false)
		Integer beforeRank,
		@RequestParam(required = false, defaultValue = "20")
		Integer size) {

		if (afterRank != null && beforeRank != null) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
		}

		UUID memberId = userDetails.getMemberId();

		if (afterRank == null && beforeRank == null) {
			return ApiResponse.ok("싱글 랭킹 조회 성공",
				singleRankingService.getSingleRankingHistory(difficulty, year, month, week, size, memberId));
		}
		if (beforeRank != null) {
			return ApiResponse.ok("싱글 랭킹 조회 성공",
				singleRankingService.getSingleRankingHistoryScrollBefore(difficulty, year, month, week, beforeRank,
					size,
					memberId));
		}
		return ApiResponse.ok("싱글 랭킹 조회 성공",
			singleRankingService.getSingleRankingHistoryScrollAfter(difficulty, year, month, week, afterRank, size,
				memberId));
	}

	@Override
	@GetMapping("/contribution/history")
	public ResponseEntity<?> getContributionRankingHistory(
		@AuthenticationPrincipal
		CustomUserDetails userDetails,
		@RequestParam
		Integer year,
		@RequestParam
		Integer month,
		@RequestParam
		Integer week,
		@RequestParam(required = false)
		Integer afterRank,
		@RequestParam(required = false)
		Integer beforeRank,
		@RequestParam(required = false, defaultValue = "20")
		Integer size) {

		if (afterRank != null && beforeRank != null) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
		}

		UUID memberId = userDetails.getMemberId();

		if (afterRank == null && beforeRank == null) {
			return ApiResponse.ok("기여도 뺏기 랭킹 조회 성공",
				contributionRankingService.getContributionRankingHistory(year, month, week, size, memberId));
		}
		if (beforeRank != null) {
			return ApiResponse.ok("기여도 뺏기 랭킹 조회 성공",
				contributionRankingService.getContributionRankingHistoryScrollBefore(year, month, week, beforeRank,
					size, memberId));
		}
		return ApiResponse.ok("기여도 뺏기 랭킹 조회 성공",
			contributionRankingService.getContributionRankingHistoryScrollAfter(year, month, week, afterRank, size,
				memberId));
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@GetMapping("/timeattack/history")
	public ResponseEntity<?> getTimeAttackRankingHistory(
		@RequestParam
		Integer year,
		@RequestParam
		Integer month,
		@RequestParam
		Integer week,
		@RequestParam(required = false)
		Integer cursor,
		@RequestParam(required = false, defaultValue = "20")
		Integer size) {

		if (cursor == null) {
			Map<String, Object> data = new LinkedHashMap<>();
			data.put("year", year);
			data.put("month", month);
			data.put("week", week);
			data.put("top3", List.of(
				Map.of("rank", 1, "nickname", "timemaster", "totalCount", 15000),
				Map.of("rank", 2, "nickname", "clockking", "totalCount", 14200),
				Map.of("rank", 3, "nickname", "ticktock", "totalCount", 13800)));
			data.put("myRank", Map.of("rank", 7, "totalCount", 10500));
			data.put("around", List.of(
				Map.of("rank", 5, "nickname", "user1", "totalCount", 11000),
				Map.of("rank", 6, "nickname", "user2", "totalCount", 10700),
				Map.of("rank", 7, "nickname", "dobby", "totalCount", 10500),
				Map.of("rank", 8, "nickname", "user3", "totalCount", 10200),
				Map.of("rank", 9, "nickname", "user4", "totalCount", 10000)));
			data.put("nextCursor", 9);
			data.put("hasNext", true);
			return ApiResponse.ok("타임어택 랭킹 조회 성공", data);
		}

		Map<String, Object> data = new LinkedHashMap<>();
		data.put("rankings", List.of(
			Map.of("rank", cursor + 1, "nickname", "user5", "totalCount", 9800)));
		data.put("nextCursor", cursor + 20);
		data.put("hasNext", true);
		return ApiResponse.ok("타임어택 랭킹 조회 성공", data);
	}

	@Override
	@GetMapping("/coop/history")
	public ResponseEntity<?> getCoopRankingHistory(
		@AuthenticationPrincipal
		CustomUserDetails userDetails,
		@RequestParam
		Integer year,
		@RequestParam
		Integer month,
		@RequestParam
		Integer week,
		@RequestParam(required = false)
		Integer afterRank,
		@RequestParam(required = false)
		Integer beforeRank,
		@RequestParam(required = false, defaultValue = "20")
		Integer size) {

		if (afterRank != null && beforeRank != null) {
			throw new BusinessException(ErrorCode.INVALID_INPUT_VALUE);
		}

		UUID memberId = userDetails.getMemberId();

		if (afterRank == null && beforeRank == null) {
			return ApiResponse.ok("협력 랭킹 조회 성공",
				coopRankingService.getCoopRankingHistory(year, month, week, size, memberId));
		}
		if (beforeRank != null) {
			return ApiResponse.ok("협력 랭킹 조회 성공",
				coopRankingService.getCoopRankingHistoryScrollBefore(year, month, week, beforeRank, size, memberId));
		}
		return ApiResponse.ok("협력 랭킹 조회 성공",
			coopRankingService.getCoopRankingHistoryScrollAfter(year, month, week, afterRank, size, memberId));
	}
}

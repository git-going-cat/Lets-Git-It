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
import com.gitcat.letsgitit.domain.ranking.service.SingleRankingService;
import com.gitcat.letsgitit.global.enums.Difficulty;
import com.gitcat.letsgitit.global.response.ApiResponse;

import lombok.RequiredArgsConstructor;

@Validated
@RestController
@RequestMapping("/api/v1/rankings")
@RequiredArgsConstructor
public class RankingController implements RankingControllerDocs {

	private final SingleRankingService singleRankingService;

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

	// TODO: 서비스 로직 연동 후 제거
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

		if (afterRank == null && beforeRank == null) {
			Map<String, Object> data = new LinkedHashMap<>();
			data.put("year", 2026);
			data.put("month", 4);
			data.put("week", 18);
			data.put("top3", List.of(
				Map.of("rank", 1, "playerId", "550e8400-e29b-41d4-a716-446655440000", "nickname", "dobby",
					"contribution", 12000, "playCount", 10),
				Map.of("rank", 2, "playerId", "661f9511-f30c-52e5-b827-557766551111", "nickname", "alice",
					"contribution", 11500, "playCount", 9),
				Map.of("rank", 3, "playerId", "772g0622-g41d-63f6-c938-668877662222", "nickname", "bob",
					"contribution", 10900, "playCount", 11)));
			data.put("myRank", Map.of("rank", 15, "contribution", 8800, "playCount", 10));
			data.put("around", List.of(
				Map.of("rank", 13, "playerId", "11111111-e29b-41d4-a716-446655440000", "nickname", "user1",
					"contribution", 9100, "playCount", 10),
				Map.of("rank", 14, "playerId", "22222222-e29b-41d4-a716-446655440000", "nickname", "user2",
					"contribution", 8900, "playCount", 9),
				Map.of("rank", 15, "playerId", "33333333-e29b-41d4-a716-446655440000", "nickname", "dobby",
					"contribution", 8800, "playCount", 10),
				Map.of("rank", 16, "playerId", "44444444-e29b-41d4-a716-446655440000", "nickname", "user3",
					"contribution", 8600, "playCount", 12),
				Map.of("rank", 17, "playerId", "55555555-e29b-41d4-a716-446655440000", "nickname", "user4",
					"contribution", 8400, "playCount", 8)));
			data.put("prevCursor", 13);
			data.put("hasPrev", true);
			data.put("nextCursor", 17);
			data.put("hasNext", true);
			return ApiResponse.ok("스피드런 랭킹 조회 성공", data);
		}

		if (beforeRank != null) {
			Map<String, Object> data = new LinkedHashMap<>();
			data.put("rankings", List.of(
				Map.of("rank", 10, "playerId", "77777777-e29b-41d4-a716-446655440000", "nickname", "user0",
					"contribution", 9500, "playCount", 6)));
			data.put("prevCursor", 10);
			data.put("hasPrev", true);
			data.put("nextCursor", 12);
			data.put("hasNext", true);
			return ApiResponse.ok("스피드런 랭킹 조회 성공", data);
		}

		Map<String, Object> data = new LinkedHashMap<>();
		data.put("rankings", List.of(
			Map.of("rank", afterRank + 1, "playerId", "66666666-e29b-41d4-a716-446655440000", "nickname", "user5",
				"contribution", 8200, "playCount", 7)));
		data.put("prevCursor", afterRank + 1);
		data.put("hasPrev", true);
		data.put("nextCursor", afterRank + 20);
		data.put("hasNext", true);
		return ApiResponse.ok("스피드런 랭킹 조회 성공", data);
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

	// TODO: 서비스 로직 연동 후 제거
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

		if (afterRank == null && beforeRank == null) {
			Map<String, Object> data = new LinkedHashMap<>();
			data.put("year", 2026);
			data.put("month", 4);
			data.put("week", 18);
			data.put("top3", List.of(
				Map.of(
					"rank", 1,
					"teamName", "git masters",
					"mapId", "550e8400-e29b-41d4-a716-446655440000",
					"mapName", "기초 브랜치",
					"difficulty", "NORMAL",
					"elapsedTime", 61000,
					"totalWrongTypeCount", 2,
					"totalWrongOrderCount", 1,
					"members", List.of(
						Map.of("playerId", "22222222-e29b-41d4-a716-446655440000", "nickname", "alice"),
						Map.of("playerId", "33333333-e29b-41d4-a716-446655440000", "nickname", "bob"),
						Map.of("playerId", "44444444-e29b-41d4-a716-446655440000", "nickname", "charlie"),
						Map.of("playerId", "11111111-e29b-41d4-a716-446655440000", "nickname", "dobby")))));
			data.put("myRank", Map.of(
				"rank", 5,
				"teamName", "merge crew",
				"mapId", "770e8400-e29b-41d4-a716-446655440000",
				"mapName", "rebase 실전",
				"difficulty", "NORMAL",
				"elapsedTime", 83000,
				"totalWrongTypeCount", 5,
				"totalWrongOrderCount", 3,
				"members", List.of(
					Map.of("playerId", "aaaaaaaa-e29b-41d4-a716-446655440000", "nickname", "alice"),
					Map.of("playerId", "bbbbbbbb-e29b-41d4-a716-446655440000", "nickname", "bob"),
					Map.of("playerId", "cccccccc-e29b-41d4-a716-446655440000", "nickname", "charlie"),
					Map.of("playerId", "99999999-e29b-41d4-a716-446655440000", "nickname", "dobby"))));
			data.put("around", List.of(
				Map.of(
					"rank", 4,
					"teamName", "reset zero",
					"mapId", "880e8400-e29b-41d4-a716-446655440000",
					"mapName", "브랜치 이동",
					"difficulty", "NORMAL",
					"elapsedTime", 81000,
					"totalWrongTypeCount", 4,
					"totalWrongOrderCount", 2,
					"members", List.of(
						Map.of("playerId", "dddddddd-e29b-41d4-a716-446655440000", "nickname", "user5"),
						Map.of("playerId", "eeeeeeee-e29b-41d4-a716-446655440000", "nickname", "user6"),
						Map.of("playerId", "ffffffff-e29b-41d4-a716-446655440000", "nickname", "user7"),
						Map.of("playerId", "12121212-e29b-41d4-a716-446655440000", "nickname", "user8")))));
			data.put("prevCursor", 4);
			data.put("hasPrev", true);
			data.put("nextCursor", 6);
			data.put("hasNext", true);
			return ApiResponse.ok("협력 랭킹 조회 성공", data);
		}

		if (beforeRank != null) {
			Map<String, Object> data = new LinkedHashMap<>();
			data.put("rankings", List.of(
				Map.of(
					"rank", 2,
					"teamName", "branch squad",
					"mapId", "330e8400-e29b-41d4-a716-446655440000",
					"mapName", "merge 충돌",
					"difficulty", "NORMAL",
					"elapsedTime", 72000,
					"totalWrongTypeCount", 3,
					"totalWrongOrderCount", 1,
					"members", List.of(
						Map.of("playerId", "23232323-e29b-41d4-a716-446655440000", "nickname", "anna"),
						Map.of("playerId", "24242424-e29b-41d4-a716-446655440000", "nickname", "bella"),
						Map.of("playerId", "25252525-e29b-41d4-a716-446655440000", "nickname", "cody"),
						Map.of("playerId", "26262626-e29b-41d4-a716-446655440000", "nickname", "dane")))));
			data.put("prevCursor", 2);
			data.put("hasPrev", true);
			data.put("nextCursor", 3);
			data.put("hasNext", true);
			return ApiResponse.ok("협력 랭킹 조회 성공", data);
		}

		Map<String, Object> data = new LinkedHashMap<>();
		data.put("rankings", List.of(
			Map.of(
				"rank", afterRank + 1,
				"teamName", "conflict solvers",
				"mapId", "550e8400-e29b-41d4-a716-446655440000",
				"mapName", "기초 브랜치",
				"difficulty", "NORMAL",
				"elapsedTime", 89000,
				"totalWrongTypeCount", 7,
				"totalWrongOrderCount", 4,
				"members", List.of(
					Map.of("playerId", "17171717-e29b-41d4-a716-446655440000", "nickname", "user13"),
					Map.of("playerId", "18181818-e29b-41d4-a716-446655440000", "nickname", "user14"),
					Map.of("playerId", "19191919-e29b-41d4-a716-446655440000", "nickname", "user15"),
					Map.of("playerId", "20202020-e29b-41d4-a716-446655440000", "nickname", "user16")))));
		data.put("prevCursor", afterRank + 1);
		data.put("hasPrev", true);
		data.put("nextCursor", afterRank + 20);
		data.put("hasNext", true);
		return ApiResponse.ok("협력 랭킹 조회 성공", data);
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

	// TODO: 서비스 로직 연동 후 제거
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

		if (afterRank == null && beforeRank == null) {
			Map<String, Object> data = new LinkedHashMap<>();
			data.put("year", year);
			data.put("month", month);
			data.put("week", week);
			data.put("top3", List.of(
				Map.of("rank", 1, "playerId", "550e8400-e29b-41d4-a716-446655440000", "nickname", "dobby",
					"contribution", 12000, "playCount", 10),
				Map.of("rank", 2, "playerId", "661f9511-f30c-52e5-b827-557766551111", "nickname", "alice",
					"contribution", 11500, "playCount", 9),
				Map.of("rank", 3, "playerId", "772g0622-g41d-63f6-c938-668877662222", "nickname", "bob",
					"contribution", 10900, "playCount", 11)));
			data.put("myRank", Map.of("rank", 15, "contribution", 8800, "playCount", 10));
			data.put("around", List.of(
				Map.of("rank", 13, "playerId", "11111111-e29b-41d4-a716-446655440000", "nickname", "user1",
					"contribution", 9100, "playCount", 10),
				Map.of("rank", 14, "playerId", "22222222-e29b-41d4-a716-446655440000", "nickname", "user2",
					"contribution", 8900, "playCount", 9),
				Map.of("rank", 15, "playerId", "33333333-e29b-41d4-a716-446655440000", "nickname", "dobby",
					"contribution", 8800, "playCount", 10),
				Map.of("rank", 16, "playerId", "44444444-e29b-41d4-a716-446655440000", "nickname", "user3",
					"contribution", 8600, "playCount", 12),
				Map.of("rank", 17, "playerId", "55555555-e29b-41d4-a716-446655440000", "nickname", "user4",
					"contribution", 8400, "playCount", 8)));
			data.put("prevCursor", 13);
			data.put("hasPrev", true);
			data.put("nextCursor", 17);
			data.put("hasNext", true);
			return ApiResponse.ok("스피드런 랭킹 조회 성공", data);
		}

		if (beforeRank != null) {
			Map<String, Object> data = new LinkedHashMap<>();
			data.put("rankings", List.of(
				Map.of("rank", 10, "playerId", "77777777-e29b-41d4-a716-446655440000", "nickname", "user0",
					"contribution", 9500, "playCount", 6)));
			data.put("prevCursor", 10);
			data.put("hasPrev", true);
			data.put("nextCursor", 12);
			data.put("hasNext", true);
			return ApiResponse.ok("스피드런 랭킹 조회 성공", data);
		}

		Map<String, Object> data = new LinkedHashMap<>();
		data.put("rankings", List.of(
			Map.of("rank", afterRank + 1, "playerId", "66666666-e29b-41d4-a716-446655440000", "nickname", "user5",
				"contribution", 8200, "playCount", 7)));
		data.put("prevCursor", afterRank + 1);
		data.put("hasPrev", true);
		data.put("nextCursor", afterRank + 20);
		data.put("hasNext", true);
		return ApiResponse.ok("스피드런 랭킹 조회 성공", data);
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

	// TODO: 서비스 로직 연동 후 제거
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

		if (afterRank == null && beforeRank == null) {
			Map<String, Object> data = new LinkedHashMap<>();
			data.put("year", year);
			data.put("month", month);
			data.put("week", week);
			data.put("top3", List.of(
				Map.of(
					"rank", 1,
					"teamName", "git masters",
					"mapId", "550e8400-e29b-41d4-a716-446655440000",
					"mapName", "기초 브랜치",
					"difficulty", "NORMAL",
					"elapsedTime", 61000,
					"totalWrongTypeCount", 2,
					"totalWrongOrderCount", 1,
					"members", List.of(
						Map.of("playerId", "22222222-e29b-41d4-a716-446655440000", "nickname", "alice"),
						Map.of("playerId", "33333333-e29b-41d4-a716-446655440000", "nickname", "bob"),
						Map.of("playerId", "44444444-e29b-41d4-a716-446655440000", "nickname", "charlie"),
						Map.of("playerId", "11111111-e29b-41d4-a716-446655440000", "nickname", "dobby")))));
			data.put("myRank", Map.of(
				"rank", 5,
				"teamName", "merge crew",
				"mapId", "770e8400-e29b-41d4-a716-446655440000",
				"mapName", "rebase 실전",
				"difficulty", "NORMAL",
				"elapsedTime", 83000,
				"totalWrongTypeCount", 5,
				"totalWrongOrderCount", 3,
				"members", List.of(
					Map.of("playerId", "aaaaaaaa-e29b-41d4-a716-446655440000", "nickname", "alice"),
					Map.of("playerId", "bbbbbbbb-e29b-41d4-a716-446655440000", "nickname", "bob"),
					Map.of("playerId", "cccccccc-e29b-41d4-a716-446655440000", "nickname", "charlie"),
					Map.of("playerId", "99999999-e29b-41d4-a716-446655440000", "nickname", "dobby"))));
			data.put("around", List.of(
				Map.of(
					"rank", 4,
					"teamName", "reset zero",
					"mapId", "880e8400-e29b-41d4-a716-446655440000",
					"mapName", "브랜치 이동",
					"difficulty", "NORMAL",
					"elapsedTime", 81000,
					"totalWrongTypeCount", 4,
					"totalWrongOrderCount", 2,
					"members", List.of(
						Map.of("playerId", "dddddddd-e29b-41d4-a716-446655440000", "nickname", "user5"),
						Map.of("playerId", "eeeeeeee-e29b-41d4-a716-446655440000", "nickname", "user6"),
						Map.of("playerId", "ffffffff-e29b-41d4-a716-446655440000", "nickname", "user7"),
						Map.of("playerId", "12121212-e29b-41d4-a716-446655440000", "nickname", "user8")))));
			data.put("prevCursor", 4);
			data.put("hasPrev", true);
			data.put("nextCursor", 6);
			data.put("hasNext", true);
			return ApiResponse.ok("협력 랭킹 조회 성공", data);
		}

		if (beforeRank != null) {
			Map<String, Object> data = new LinkedHashMap<>();
			data.put("rankings", List.of(
				Map.of(
					"rank", 2,
					"teamName", "branch squad",
					"mapId", "330e8400-e29b-41d4-a716-446655440000",
					"mapName", "merge 충돌",
					"difficulty", "NORMAL",
					"elapsedTime", 72000,
					"totalWrongTypeCount", 3,
					"totalWrongOrderCount", 1,
					"members", List.of(
						Map.of("playerId", "23232323-e29b-41d4-a716-446655440000", "nickname", "anna"),
						Map.of("playerId", "24242424-e29b-41d4-a716-446655440000", "nickname", "bella"),
						Map.of("playerId", "25252525-e29b-41d4-a716-446655440000", "nickname", "cody"),
						Map.of("playerId", "26262626-e29b-41d4-a716-446655440000", "nickname", "dane")))));
			data.put("prevCursor", 2);
			data.put("hasPrev", true);
			data.put("nextCursor", 3);
			data.put("hasNext", true);
			return ApiResponse.ok("협력 랭킹 조회 성공", data);
		}

		Map<String, Object> data = new LinkedHashMap<>();
		data.put("rankings", List.of(
			Map.of(
				"rank", afterRank + 1,
				"teamName", "conflict solvers",
				"mapId", "550e8400-e29b-41d4-a716-446655440000",
				"mapName", "기초 브랜치",
				"difficulty", "NORMAL",
				"elapsedTime", 89000,
				"totalWrongTypeCount", 7,
				"totalWrongOrderCount", 4,
				"members", List.of(
					Map.of("playerId", "17171717-e29b-41d4-a716-446655440000", "nickname", "user13"),
					Map.of("playerId", "18181818-e29b-41d4-a716-446655440000", "nickname", "user14"),
					Map.of("playerId", "19191919-e29b-41d4-a716-446655440000", "nickname", "user15"),
					Map.of("playerId", "20202020-e29b-41d4-a716-446655440000", "nickname", "user16")))));
		data.put("prevCursor", afterRank + 1);
		data.put("hasPrev", true);
		data.put("nextCursor", afterRank + 20);
		data.put("hasNext", true);
		return ApiResponse.ok("협력 랭킹 조회 성공", data);
	}
}

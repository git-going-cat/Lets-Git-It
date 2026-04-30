package com.gitcat.letsgitit.domain.ranking.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.gitcat.letsgitit.global.response.ApiResponse;

@RestController
@RequestMapping("/api/v1/rankings")
public class RankingController implements RankingControllerDocs {

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@GetMapping("/single")
	public ResponseEntity<?> getSingleRanking(
		@RequestParam
		String difficulty,
		@RequestParam(required = false)
		Integer cursor,
		@RequestParam(required = false, defaultValue = "20")
		Integer size) {

		if (cursor == null) {
			Map<String, Object> data = new LinkedHashMap<>();
			data.put("difficulty", difficulty);
			data.put("year", 2026);
			data.put("month", 4);
			data.put("week", 18);
			data.put("top3", List.of(
				Map.of("rank", 1, "nickname", "gitmaster", "score", 9800),
				Map.of("rank", 2, "nickname", "branchking", "score", 9200),
				Map.of("rank", 3, "nickname", "mergelord", "score", 8700)));
			data.put("myRank", Map.of("rank", 42, "score", 7200));
			data.put("around", List.of(
				Map.of("rank", 40, "nickname", "user1", "score", 7400),
				Map.of("rank", 41, "nickname", "user2", "score", 7300),
				Map.of("rank", 42, "nickname", "dobby", "score", 7200),
				Map.of("rank", 43, "nickname", "user3", "score", 7100),
				Map.of("rank", 44, "nickname", "user4", "score", 7000)));
			data.put("nextCursor", 44);
			data.put("hasNext", true);
			return ApiResponse.ok("싱글 랭킹 조회 성공", data);
		}

		Map<String, Object> data = new LinkedHashMap<>();
		data.put("rankings", List.of(
			Map.of("rank", cursor + 1, "nickname", "user5", "score", 6900),
			Map.of("rank", cursor + 2, "nickname", "user6", "score", 6800)));
		data.put("nextCursor", cursor + 20);
		data.put("hasNext", true);
		return ApiResponse.ok("싱글 랭킹 조회 성공", data);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@GetMapping("/speed")
	public ResponseEntity<?> getSpeedRanking(
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
				Map.of("rank", 1, "nickname", "speedking", "contribution", 12000),
				Map.of("rank", 2, "nickname", "fastuser", "contribution", 11500),
				Map.of("rank", 3, "nickname", "quickdraw", "contribution", 10900)));
			data.put("myRank", Map.of("rank", 15, "contribution", 8800));
			data.put("around", List.of(
				Map.of("rank", 13, "nickname", "user1", "contribution", 9100),
				Map.of("rank", 14, "nickname", "user2", "contribution", 8900),
				Map.of("rank", 15, "nickname", "dobby", "contribution", 8800),
				Map.of("rank", 16, "nickname", "user3", "contribution", 8600),
				Map.of("rank", 17, "nickname", "user4", "contribution", 8400)));
			data.put("nextCursor", 17);
			data.put("hasNext", true);
			return ApiResponse.ok("스피드런 랭킹 조회 성공", data);
		}

		Map<String, Object> data = new LinkedHashMap<>();
		data.put("rankings", List.of(
			Map.of("rank", cursor + 1, "nickname", "user5", "contribution", 8200)));
		data.put("nextCursor", cursor + 20);
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
		@RequestParam
		String mapName,
		@RequestParam
		String difficulty,
		@RequestParam(required = false)
		Integer cursor,
		@RequestParam(required = false, defaultValue = "20")
		Integer size) {

		if (cursor == null) {
			Map<String, Object> data = new LinkedHashMap<>();
			data.put("mapId", 1);
			data.put("mapName", mapName);
			data.put("year", 2026);
			data.put("month", 4);
			data.put("week", 18);
			data.put("top3", List.of(
				Map.of("rank", 1, "nickname", "coopmaster", "clearTime", 61000),
				Map.of("rank", 2, "nickname", "teamwork", "clearTime", 65000),
				Map.of("rank", 3, "nickname", "syncpro", "clearTime", 70000)));
			data.put("myRank", Map.of("rank", 5, "clearTime", 83000));
			data.put("around", List.of(
				Map.of("rank", 3, "nickname", "user1", "clearTime", 79000),
				Map.of("rank", 4, "nickname", "user2", "clearTime", 81000),
				Map.of("rank", 5, "nickname", "dobby", "clearTime", 83000),
				Map.of("rank", 6, "nickname", "user3", "clearTime", 85000),
				Map.of("rank", 7, "nickname", "user4", "clearTime", 87000)));
			data.put("nextCursor", 7);
			data.put("hasNext", true);
			return ApiResponse.ok("협력 랭킹 조회 성공", data);
		}

		Map<String, Object> data = new LinkedHashMap<>();
		data.put("rankings", List.of(
			Map.of("rank", cursor + 1, "nickname", "user5", "clearTime", 89000)));
		data.put("nextCursor", cursor + 20);
		data.put("hasNext", true);
		return ApiResponse.ok("협력 랭킹 조회 성공", data);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@GetMapping("/single/history")
	public ResponseEntity<?> getSingleRankingHistory(
		@RequestParam
		String difficulty,
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
			data.put("difficulty", difficulty);
			data.put("year", year);
			data.put("month", month);
			data.put("week", week);
			data.put("top3", List.of(
				Map.of("rank", 1, "nickname", "gitmaster", "score", 9800),
				Map.of("rank", 2, "nickname", "branchking", "score", 9200),
				Map.of("rank", 3, "nickname", "mergelord", "score", 8700)));
			data.put("myRank", Map.of("rank", 42, "score", 7200));
			data.put("around", List.of(
				Map.of("rank", 40, "nickname", "user1", "score", 7400),
				Map.of("rank", 41, "nickname", "user2", "score", 7300),
				Map.of("rank", 42, "nickname", "dobby", "score", 7200),
				Map.of("rank", 43, "nickname", "user3", "score", 7100),
				Map.of("rank", 44, "nickname", "user4", "score", 7000)));
			data.put("nextCursor", 44);
			data.put("hasNext", true);
			return ApiResponse.ok("싱글 랭킹 조회 성공", data);
		}

		Map<String, Object> data = new LinkedHashMap<>();
		data.put("rankings", List.of(
			Map.of("rank", cursor + 1, "nickname", "user5", "score", 6900)));
		data.put("nextCursor", cursor + 20);
		data.put("hasNext", true);
		return ApiResponse.ok("싱글 랭킹 조회 성공", data);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@GetMapping("/speed/history")
	public ResponseEntity<?> getSpeedRankingHistory(
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
				Map.of("rank", 1, "nickname", "speedking", "contribution", 12000),
				Map.of("rank", 2, "nickname", "fastuser", "contribution", 11500),
				Map.of("rank", 3, "nickname", "quickdraw", "contribution", 10900)));
			data.put("myRank", Map.of("rank", 15, "contribution", 8800));
			data.put("around", List.of(
				Map.of("rank", 13, "nickname", "user1", "contribution", 9100),
				Map.of("rank", 14, "nickname", "user2", "contribution", 8900),
				Map.of("rank", 15, "nickname", "dobby", "contribution", 8800),
				Map.of("rank", 16, "nickname", "user3", "contribution", 8600),
				Map.of("rank", 17, "nickname", "user4", "contribution", 8400)));
			data.put("nextCursor", 17);
			data.put("hasNext", true);
			return ApiResponse.ok("스피드런 랭킹 조회 성공", data);
		}

		Map<String, Object> data = new LinkedHashMap<>();
		data.put("rankings", List.of(
			Map.of("rank", cursor + 1, "nickname", "user5", "contribution", 8200)));
		data.put("nextCursor", cursor + 20);
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
		@RequestParam
		Integer mapId,
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
			data.put("mapId", mapId);
			data.put("mapName", "기초 브랜치");
			data.put("year", year);
			data.put("month", month);
			data.put("week", week);
			data.put("top3", List.of(
				Map.of("rank", 1, "nickname", "coopmaster", "clearTime", 61000),
				Map.of("rank", 2, "nickname", "teamwork", "clearTime", 65000),
				Map.of("rank", 3, "nickname", "syncpro", "clearTime", 70000)));
			data.put("myRank", Map.of("rank", 5, "clearTime", 83000));
			data.put("around", List.of(
				Map.of("rank", 3, "nickname", "user1", "clearTime", 79000),
				Map.of("rank", 4, "nickname", "user2", "clearTime", 81000),
				Map.of("rank", 5, "nickname", "dobby", "clearTime", 83000),
				Map.of("rank", 6, "nickname", "user3", "clearTime", 85000),
				Map.of("rank", 7, "nickname", "user4", "clearTime", 87000)));
			data.put("nextCursor", 7);
			data.put("hasNext", true);
			return ApiResponse.ok("협력 랭킹 조회 성공", data);
		}

		Map<String, Object> data = new LinkedHashMap<>();
		data.put("rankings", List.of(
			Map.of("rank", cursor + 1, "nickname", "user5", "clearTime", 89000)));
		data.put("nextCursor", cursor + 20);
		data.put("hasNext", true);
		return ApiResponse.ok("협력 랭킹 조회 성공", data);
	}
}

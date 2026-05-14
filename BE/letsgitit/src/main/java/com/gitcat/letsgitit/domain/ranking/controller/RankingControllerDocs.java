package com.gitcat.letsgitit.domain.ranking.controller;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import org.springframework.http.ResponseEntity;

import com.gitcat.letsgitit.domain.member.model.CustomUserDetails;
import com.gitcat.letsgitit.global.enums.Difficulty;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Ranking", description = "랭킹 관련 API (로그인 유저는 myRank 반환)")
public interface RankingControllerDocs {

	@Operation(summary = "이번주 싱글 난이도별 랭킹 조회", description = "afterRank/beforeRank 모두 생략 시 초기 응답(top3 + myRank + around + prevCursor + nextCursor). afterRank 포함 시 아래 방향 스크롤, beforeRank 포함 시 위 방향 스크롤.")
	@ApiResponse(responseCode = "200", description = "싱글 랭킹 조회 성공", content = @Content(mediaType = "application/json", examples = {
		@ExampleObject(name = "초기 진입", value = """
			{
			  "status": 200,
			  "message": "싱글 랭킹 조회 성공",
			  "data": {
			    "difficulty": "NORMAL",
			    "year": 2026, "month": 4, "week": 18,
			    "top3": [
			      {"rank": 1, "nickname": "gitcat", "score": 9800, "playTime": 95432},
			      {"rank": 2, "nickname": "brnch", "score": 9200, "playTime": 103210},
			      {"rank": 3, "nickname": "merge", "score": 8700, "playTime": null}
			    ],
			    "myRank": {"rank": 42, "score": 7200, "playTime": 143000},
			    "around": [
			      {"rank": 40, "nickname": "user1", "score": 7400, "playTime": 138000},
			      {"rank": 42, "nickname": "dobby", "score": 7200, "playTime": 143000},
			      {"rank": 44, "nickname": "user4", "score": 7000, "playTime": null}
			    ],
			    "prevCursor": 40, "hasPrev": true,
			    "nextCursor": 44, "hasNext": true
			  }
			}
			"""),
		@ExampleObject(name = "아래 방향 스크롤 (afterRank=44)", value = """
			{
			  "status": 200,
			  "message": "싱글 랭킹 조회 성공",
			  "data": {
			    "rankings": [
			      {"rank": 45, "nickname": "user5", "score": 6900, "playTime": 155000},
			      {"rank": 46, "nickname": "user6", "score": 6800, "playTime": null}
			    ],
			    "prevCursor": 45, "hasPrev": true,
			    "nextCursor": 46, "hasNext": true
			  }
			}
			"""),
		@ExampleObject(name = "위 방향 스크롤 (beforeRank=40)", value = """
			{
			  "status": 200,
			  "message": "싱글 랭킹 조회 성공",
			  "data": {
			    "rankings": [
			      {"rank": 20, "nickname": "user1", "score": 8100, "playTime": 121000},
			      {"rank": 39, "nickname": "user2", "score": 7600, "playTime": null}
			    ],
			    "prevCursor": 20, "hasPrev": true,
			    "nextCursor": 39, "hasNext": true
			  }
			}
			""")
	}))
	ResponseEntity<?> getSingleRanking(
		@Parameter(hidden = true)
		CustomUserDetails userDetails,
		@Parameter(name = "difficulty", description = "난이도 (EASY / NORMAL / HARD)", required = true)
		Difficulty difficulty,
		@Parameter(name = "afterRank", description = "아래 방향 스크롤 커서 (마지막으로 확인한 순위). 1 이상") @Min(1)
		Integer afterRank,
		@Parameter(name = "beforeRank", description = "위 방향 스크롤 커서 (첫 번째로 확인한 순위). 1 이상") @Min(1)
		Integer beforeRank,
		@Parameter(name = "size", description = "페이지 크기 (기본값 20, 최솟값 1, 최댓값 100)") @Min(1) @Max(100)
		Integer size);

	@Operation(summary = "이번주 기여도 뺏기 랭킹 조회", description = "cursor 생략 시 초기 응답, cursor 포함 시 무한 스크롤 응답.")
	@ApiResponse(responseCode = "200", description = "스피드런 랭킹 조회 성공", content = @Content(mediaType = "application/json", examples = {
		@ExampleObject(name = "초기 진입", value = """
			{
			  "status": 200,
			  "message": "스피드런 랭킹 조회 성공",
			  "data": {
			    "year": 2026, "month": 4, "week": 18,
			    "top3": [
			      {"rank": 1, "nickname": "speed", "contribution": 12000},
			      {"rank": 2, "nickname": "fastu", "contribution": 11500},
			      {"rank": 3, "nickname": "quick", "contribution": 10900}
			    ],
			    "myRank": {"rank": 15, "contribution": 8800},
			    "around": [
			      {"rank": 13, "nickname": "user1", "contribution": 9100},
			      {"rank": 15, "nickname": "dobby", "contribution": 8800},
			      {"rank": 17, "nickname": "user4", "contribution": 8400}
			    ],
			    "nextCursor": 17, "hasNext": true
			  }
			}
			"""),
		@ExampleObject(name = "무한 스크롤", value = """
			{
			  "status": 200,
			  "message": "스피드런 랭킹 조회 성공",
			  "data": {
			    "rankings": [{"rank": 18, "nickname": "user5", "contribution": 8200}],
			    "nextCursor": 37, "hasNext": true
			  }
			}
			""")
	}))
	ResponseEntity<?> getSpeedRanking(
		@Parameter(name = "cursor", description = "무한 스크롤 커서. 생략 시 초기 응답")
		Integer cursor,
		@Parameter(name = "size", description = "페이지 크기 (기본값 20)")
		Integer size);

	@Operation(summary = "이번주 타임어택 랭킹 조회", description = "cursor 생략 시 초기 응답, cursor 포함 시 무한 스크롤 응답.")
	@ApiResponse(responseCode = "200", description = "타임어택 랭킹 조회 성공", content = @Content(mediaType = "application/json", examples = {
		@ExampleObject(name = "초기 진입", value = """
			{
			  "status": 200,
			  "message": "타임어택 랭킹 조회 성공",
			  "data": {
			    "year": 2026, "month": 4, "week": 18,
			    "top3": [
			      {"rank": 1, "nickname": "timer", "totalCount": 15000},
			      {"rank": 2, "nickname": "clock", "totalCount": 14200},
			      {"rank": 3, "nickname": "tick", "totalCount": 13800}
			    ],
			    "myRank": {"rank": 7, "totalCount": 10500},
			    "around": [
			      {"rank": 5, "nickname": "user1", "totalCount": 11000},
			      {"rank": 7, "nickname": "dobby", "totalCount": 10500},
			      {"rank": 9, "nickname": "user4", "totalCount": 10000}
			    ],
			    "nextCursor": 9, "hasNext": true
			  }
			}
			"""),
		@ExampleObject(name = "무한 스크롤", value = """
			{
			  "status": 200,
			  "message": "타임어택 랭킹 조회 성공",
			  "data": {
			    "rankings": [{"rank": 10, "nickname": "user5", "totalCount": 9800}],
			    "nextCursor": 29, "hasNext": true
			  }
			}
			""")
	}))
	ResponseEntity<?> getTimeAttackRanking(
		@Parameter(name = "cursor", description = "무한 스크롤 커서. 생략 시 초기 응답")
		Integer cursor,
		@Parameter(name = "size", description = "페이지 크기 (기본값 20)")
		Integer size);

	@Operation(summary = "이번주 협력 랭킹 조회", description = "clearTime은 낮을수록 높은 순위. Redis 키는 맵마다 분리. cursor 생략 시 초기 응답.")
	@ApiResponse(responseCode = "200", description = "협력 랭킹 조회 성공", content = @Content(mediaType = "application/json", examples = {
		@ExampleObject(name = "초기 진입", value = """
			{
			  "status": 200,
			  "message": "협력 랭킹 조회 성공",
			  "data": {
			    "mapId": 1, "mapName": "기초 브랜치",
			    "year": 2026, "month": 4, "week": 18,
			    "top3": [
			      {"rank": 1, "nickname": "coop", "clearTime": 61000},
			      {"rank": 2, "nickname": "team", "clearTime": 65000},
			      {"rank": 3, "nickname": "sync", "clearTime": 70000}
			    ],
			    "myRank": {"rank": 5, "clearTime": 83000},
			    "around": [
			      {"rank": 3, "nickname": "user1", "clearTime": 79000},
			      {"rank": 5, "nickname": "dobby", "clearTime": 83000},
			      {"rank": 7, "nickname": "user4", "clearTime": 87000}
			    ],
			    "nextCursor": 7, "hasNext": true
			  }
			}
			"""),
		@ExampleObject(name = "무한 스크롤", value = """
			{
			  "status": 200,
			  "message": "협력 랭킹 조회 성공",
			  "data": {
			    "rankings": [{"rank": 8, "nickname": "user5", "clearTime": 89000}],
			    "nextCursor": 27, "hasNext": true
			  }
			}
			""")
	}))
	ResponseEntity<?> getCoopRanking(
		@Parameter(name = "mapName", description = "맵 이름", required = true)
		String mapName,
		@Parameter(name = "difficulty", description = "맵 난이도", required = true)
		String difficulty,
		@Parameter(name = "cursor", description = "무한 스크롤 커서. 생략 시 초기 응답")
		Integer cursor,
		@Parameter(name = "size", description = "페이지 크기 (기본값 20)")
		Integer size);

	@Operation(summary = "과거주 싱글 난이도별 랭킹 조회", description = "RDB에서 조회. afterRank/beforeRank 모두 생략 시 초기 응답, afterRank 포함 시 아래 방향 스크롤, beforeRank 포함 시 위 방향 스크롤.")
	@ApiResponse(responseCode = "200", description = "싱글 랭킹 조회 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "status": 200,
		  "message": "싱글 랭킹 조회 성공",
		  "data": {
		    "difficulty": "NORMAL",
		    "year": 2025, "month": 4, "week": 3,
		    "top3": [
		      {"rank": 1, "nickname": "gitcat", "score": 9800, "playTime": 95432},
		      {"rank": 2, "nickname": "branch", "score": 9200, "playTime": null}
		    ],
		    "myRank": {"rank": 42, "score": 7200, "playTime": 143000},
		    "around": [{"rank": 42, "nickname": "dobby", "score": 7200, "playTime": 143000}],
		    "prevCursor": 40, "hasPrev": true,
		    "nextCursor": 44, "hasNext": true
		  }
		}
		""")))
	ResponseEntity<?> getSingleRankingHistory(
		@Parameter(hidden = true)
		CustomUserDetails userDetails,
		@Parameter(name = "difficulty", description = "난이도 (EASY / NORMAL / HARD)", required = true)
		Difficulty difficulty,
		@Parameter(name = "year", description = "조회 연도 (예: 2025)", required = true)
		Integer year,
		@Parameter(name = "month", description = "조회 월 (예: 4)", required = true)
		Integer month,
		@Parameter(name = "week", description = "조회 주차 (예: 3)", required = true)
		Integer week,
		@Parameter(name = "afterRank", description = "아래 방향 스크롤 커서 (마지막으로 확인한 순위). 1 이상") @Min(1)
		Integer afterRank,
		@Parameter(name = "beforeRank", description = "위 방향 스크롤 커서 (첫 번째로 확인한 순위). 1 이상") @Min(1)
		Integer beforeRank,
		@Parameter(name = "size", description = "페이지 크기 (기본값 20)") @Min(1) @Max(100)
		Integer size);

	@Operation(summary = "과거주 기여도 뺏기 랭킹 조회", description = "RDB에서 조회. cursor 생략 시 초기 응답, cursor 포함 시 무한 스크롤 응답.")
	@ApiResponse(responseCode = "200", description = "스피드런 랭킹 조회 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "status": 200,
		  "message": "스피드런 랭킹 조회 성공",
		  "data": {
		    "year": 2025, "month": 4, "week": 3,
		    "top3": [{"rank": 1, "nickname": "speed", "contribution": 12000}],
		    "myRank": {"rank": 15, "contribution": 8800},
		    "around": [{"rank": 15, "nickname": "dobby", "contribution": 8800}],
		    "nextCursor": 17, "hasNext": true
		  }
		}
		""")))
	ResponseEntity<?> getSpeedRankingHistory(
		@Parameter(name = "year", description = "조회 연도", required = true)
		Integer year,
		@Parameter(name = "month", description = "조회 월", required = true)
		Integer month,
		@Parameter(name = "week", description = "조회 주차", required = true)
		Integer week,
		@Parameter(name = "cursor", description = "무한 스크롤 커서. 생략 시 초기 응답")
		Integer cursor,
		@Parameter(name = "size", description = "페이지 크기 (기본값 20)")
		Integer size);

	@Operation(summary = "과거주 타임어택 랭킹 조회", description = "RDB에서 조회. cursor 생략 시 초기 응답, cursor 포함 시 무한 스크롤 응답.")
	@ApiResponse(responseCode = "200", description = "타임어택 랭킹 조회 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "status": 200,
		  "message": "타임어택 랭킹 조회 성공",
		  "data": {
		    "year": 2025, "month": 4, "week": 3,
		    "top3": [{"rank": 1, "nickname": "timer", "totalCount": 15000}],
		    "myRank": {"rank": 7, "totalCount": 10500},
		    "around": [{"rank": 7, "nickname": "dobby", "totalCount": 10500}],
		    "nextCursor": 9, "hasNext": true
		  }
		}
		""")))
	ResponseEntity<?> getTimeAttackRankingHistory(
		@Parameter(name = "year", description = "조회 연도", required = true)
		Integer year,
		@Parameter(name = "month", description = "조회 월", required = true)
		Integer month,
		@Parameter(name = "week", description = "조회 주차", required = true)
		Integer week,
		@Parameter(name = "cursor", description = "무한 스크롤 커서. 생략 시 초기 응답")
		Integer cursor,
		@Parameter(name = "size", description = "페이지 크기 (기본값 20)")
		Integer size);

	@Operation(summary = "과거주 협력 랭킹 조회", description = "RDB에서 조회. cursor 생략 시 초기 응답, cursor 포함 시 무한 스크롤 응답.")
	@ApiResponse(responseCode = "200", description = "협력 랭킹 조회 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "status": 200,
		  "message": "협력 랭킹 조회 성공",
		  "data": {
		    "mapId": 1, "mapName": "기초 브랜치",
		    "year": 2025, "month": 4, "week": 3,
		    "top3": [{"rank": 1, "nickname": "coop", "clearTime": 61000}],
		    "myRank": {"rank": 5, "clearTime": 83000},
		    "around": [{"rank": 5, "nickname": "dobby", "clearTime": 83000}],
		    "nextCursor": 7, "hasNext": true
		  }
		}
		""")))
	ResponseEntity<?> getCoopRankingHistory(
		@Parameter(name = "mapId", description = "맵 ID", required = true)
		Integer mapId,
		@Parameter(name = "year", description = "조회 연도", required = true)
		Integer year,
		@Parameter(name = "month", description = "조회 월", required = true)
		Integer month,
		@Parameter(name = "week", description = "조회 주차", required = true)
		Integer week,
		@Parameter(name = "cursor", description = "무한 스크롤 커서. 생략 시 초기 응답")
		Integer cursor,
		@Parameter(name = "size", description = "페이지 크기 (기본값 20)")
		Integer size);
}

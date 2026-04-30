package com.gitcat.letsgitit.domain.single.controller;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gitcat.letsgitit.global.exception.BusinessException;
import com.gitcat.letsgitit.global.response.ApiResponse;

@RestController
@RequestMapping("/api/v1/single")
public class SingleController implements SingleControllerDocs {

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/sessions")
	public ResponseEntity<?> startSession(@RequestBody
	Map<String, Object> body) {
		String difficulty = (String)body.getOrDefault("difficulty", "NORMAL");

		Map<String, Object> data = new LinkedHashMap<>();
		data.put("sessionId", "session-uuid-abc123");
		data.put("difficulty", difficulty);
		data.put("bestScore", 7200);
		data.put("commandSet", List.of(
			Map.of(
				"commandSequence", 0,
				"text", "git commit -m 'fix login bug'",
				"displayText", "fix login bug",
				"branchName", "main",
				"type", "COMMON"),
			Map.of(
				"commandSequence", 1,
				"text", "git switch -c feature/login",
				"displayText", "feature/login",
				"branchName", "feature/login",
				"type", "CREATE"),
			Map.of(
				"commandSequence", 2,
				"text", "git add .",
				"displayText", "add all changes",
				"branchName", "feature/login",
				"type", "COMMON"),
			Map.of(
				"commandSequence", 3,
				"text", "git commit -m 'feat: add login page'",
				"displayText", "feat: add login page",
				"branchName", "feature/login",
				"type", "COMMON"),
			Map.of(
				"commandSequence", 4,
				"text", "git switch main",
				"displayText", "main",
				"branchName", "main",
				"type", "COMMON"),
			Map.of(
				"commandSequence", 5,
				"text", "git merge feature/login",
				"displayText", "merge feature/login",
				"branchName", "main",
				"type", "MERGE")));
		return ApiResponse.ok("싱글 게임 세션 생성 성공", data);
	}

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@PostMapping("/sessions/{sessionId}/result")
	public ResponseEntity<?> saveResult(
		@PathVariable
		String sessionId,
		@RequestBody
		Map<String, Object> body) {
		if ("NOTFOUND".equals(sessionId)) {
			throw new BusinessException(SESSION_NOT_FOUND);
		}
		if ("EXPIRED".equals(sessionId)) {
			throw new BusinessException(SESSION_EXPIRED);
		}
		if ("FINISHED".equals(sessionId)) {
			throw new BusinessException(ALREADY_FINISHED);
		}
		Map<String, Object> data = new LinkedHashMap<>();
		data.put("isNewRecord", true);
		return ApiResponse.ok("게임 결과 저장 성공", data);
	}
}

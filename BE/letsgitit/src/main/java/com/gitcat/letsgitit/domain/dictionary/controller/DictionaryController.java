package com.gitcat.letsgitit.domain.dictionary.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gitcat.letsgitit.global.response.ApiResponse;

@RestController
@RequestMapping("/api/v1/dictionary")
public class DictionaryController implements DictionaryControllerDocs {

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@GetMapping("/commands")
	public ResponseEntity<?> getCommands() {
		Map<String, Object> data = Map.of(
			"commands", List.of(
				Map.of(
					"commandId", "550e8400-e29b-41d4-a716-446655440001",
					"name", "git commit",
					"description", "변경사항을 로컬 저장소에 저장합니다",
					"imageUrl", "https://cdn.example.com/commands/commit.png",
					"options", List.of(
						Map.of("option", "-m", "description", "커밋 메시지를 인라인으로 작성"),
						Map.of("option", "--amend", "description", "직전 커밋 수정"))),
				Map.of(
					"commandId", "550e8400-e29b-41d4-a716-446655440002",
					"name", "git branch",
					"description", "브랜치를 생성하거나 목록을 조회합니다",
					"imageUrl", "https://cdn.example.com/commands/branch.png",
					"options", List.of(
						Map.of("option", "-d", "description", "브랜치 삭제"),
						Map.of("option", "-a", "description", "모든 브랜치 조회"))),
				Map.of(
					"commandId", "550e8400-e29b-41d4-a716-446655440003",
					"name", "git merge",
					"description", "두 브랜치를 병합합니다",
					"imageUrl", "https://cdn.example.com/commands/merge.png",
					"options", List.of(
						Map.of("option", "--no-ff", "description", "Fast-forward 병합 방지"),
						Map.of("option", "--squash", "description", "커밋을 하나로 합쳐 병합")))));
		return ApiResponse.ok("도감 조회 성공", data);
	}
}

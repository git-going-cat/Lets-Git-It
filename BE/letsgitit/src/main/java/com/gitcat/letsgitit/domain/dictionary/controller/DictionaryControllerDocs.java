package com.gitcat.letsgitit.domain.dictionary.controller;

import org.springframework.http.ResponseEntity;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Dictionary", description = "도감 관련 API")
public interface DictionaryControllerDocs {

	@Operation(summary = "도감 조회", description = "Git 명령어 도감 전체 목록을 조회합니다. 인증 불필요.")
	@ApiResponse(responseCode = "200", description = "도감 조회 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "status": 200,
		  "message": "도감 조회 성공",
		  "data": {
		    "commands": [
		      {
		        "commandId": "550e8400-e29b-41d4-a716-446655440001",
		        "name": "git commit",
		        "description": "변경사항을 로컬 저장소에 저장합니다",
		        "imageUrl": "https://cdn.example.com/commands/commit.png",
		        "options": [
		          {"option": "-m", "description": "커밋 메시지를 인라인으로 작성"},
		          {"option": "--amend", "description": "직전 커밋 수정"}
		        ]
		      }
		    ]
		  }
		}
		""")))
	ResponseEntity<?> getCommands();
}

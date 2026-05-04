package com.gitcat.letsgitit.domain.tutorial.controller;

import org.springframework.http.ResponseEntity;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Tutorial", description = "튜토리얼 관련 API")
public interface TutorialControllerDocs {

	@Operation(summary = "튜토리얼 명령어 셋 조회", description = "13단계 14개 명령어로 구성된 튜토리얼 전체 목록을 반환합니다. 인증 불필요.")
	@ApiResponse(responseCode = "200", description = "조회 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "status": 200,
		  "message": "요청 성공",
		  "data": {
		    "steps": [
		      {
		        "order": 1,
		        "title": "게임 시작",
		        "description": "프로젝트를 가져오는 것부터 시작해요.",
		        "commands": [
		          {
		            "sequence": 1,
		            "command": "git clone https://github.com/gitcat/project.git",
		            "explanation": "원격 저장소를 내 컴퓨터로 복사합니다."
		          }
		        ]
		      },
		      {
		        "order": 12,
		        "title": "브랜치 합치기",
		        "description": "작업한 브랜치들을 main에 합쳐봐요.",
		        "commands": [
		          {
		            "sequence": 12,
		            "command": "git merge feature/login",
		            "explanation": "다른 브랜치의 작업 내용을 현재 브랜치로 가져와 합칩니다."
		          },
		          {
		            "sequence": 13,
		            "command": "git merge feature/signup",
		            "explanation": "두 번째 브랜치도 동일하게 머지합니다."
		          }
		        ]
		      }
		    ]
		  }
		}
		""")))
	ResponseEntity<?> getTutorial();
}

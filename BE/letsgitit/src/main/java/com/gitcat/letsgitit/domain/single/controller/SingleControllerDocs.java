package com.gitcat.letsgitit.domain.single.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;

import com.gitcat.letsgitit.domain.member.model.CustomUserDetails;
import com.gitcat.letsgitit.domain.single.dto.request.SingleSessionStartRequest;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Single", description = "싱글 게임 관련 API")
public interface SingleControllerDocs {

	@Operation(summary = "싱글 게임 세션 시작", description = "난이도 선택 후 게임 세션을 생성합니다. 명령어 셋(암호화)과 최고 점수를 반환합니다.")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{"difficulty": "NORMAL"}
		""")))
	@ApiResponse(responseCode = "200", description = "싱글 게임 세션 생성 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "status": 200,
		  "message": "싱글 게임 세션 생성 성공",
		  "data": {
		    "sessionId": "session-uuid-abc123",
		    "difficulty": "NORMAL",
		    "bestScore": 7200,
		    "commandSet": [
		      {
		        "commandSequence": 0,
		        "text": "git commit -m 'fix login bug'",
		        "branchName": "main",
		        "type": "COMMON"
		      },
		      {
		        "commandSequence": 1,
		        "text": "git switch -c feature/login",
		        "branchName": "feature/login",
		        "type": "CREATE"
		      },
		      {
		        "commandSequence": 5,
		        "text": "git merge feature/login",
		        "branchName": "main",
		        "type": "MERGE"
		      }
		    ]
		  }
		}
		""")))
	ResponseEntity<?> startSession(
		@Parameter(hidden = true)
		CustomUserDetails userDetails,
		SingleSessionStartRequest request);

	@Operation(summary = "싱글 게임 결과 저장", description = """
		점수 및 등급 계산은 프론트에서 처리 후 전송. 서버는 저장 및 랭킹 업데이트만 수행.
		최고 점수 갱신 시 isNewRecord=true 반환.

		**Mock 에러 트리거 (테스트용)**
		| sessionId 값 | 발생 에러 |
		|---|---|
		| "NOTFOUND" | 404 SESSION_NOT_FOUND |
		| "EXPIRED" | 410 SESSION_EXPIRED |
		| "FINISHED" | 409 ALREADY_FINISHED |
		""")
	@RequestBody(content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "status": "SUCCESS",
		  "score": 8500,
		  "playTime": 143000,
		  "grade": "A"
		}
		""")))
	@ApiResponses({
		@ApiResponse(responseCode = "200", description = "게임 결과 저장 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
			{
			  "status": 200,
			  "message": "게임 결과 저장 성공",
			  "data": {"isNewRecord": true}
			}
			"""))),
		@ApiResponse(responseCode = "404", description = "세션 없음", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "SESSION_NOT_FOUND", value = """
			{"status": 404, "code": "SESSION_NOT_FOUND", "message": "세션을 찾을 수 없습니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "410", description = "세션 만료", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "SESSION_EXPIRED", value = """
			{"status": 410, "code": "SESSION_EXPIRED", "message": "세션이 만료되었습니다.", "errors": []}
			"""))),
		@ApiResponse(responseCode = "409", description = "이미 종료된 세션", content = @Content(mediaType = "application/json", examples = @ExampleObject(name = "ALREADY_FINISHED", value = """
			{"status": 409, "code": "ALREADY_FINISHED", "message": "이미 종료된 세션입니다.", "errors": []}
			""")))
	})
	ResponseEntity<?> saveResult(
		@Parameter(name = "sessionId", description = "세션 ID", required = true)
		String sessionId,
		Map<String, Object> body);
}

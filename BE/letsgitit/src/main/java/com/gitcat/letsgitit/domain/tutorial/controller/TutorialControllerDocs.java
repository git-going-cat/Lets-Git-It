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
		  "message": "튜토리얼 조회 성공",
		  "data": {
		    "steps": [
		      {
		        "order": 1,
		        "title": "게임 시작",
		        "description": "프로젝트를 가져오는 것부터 시작해요. git clone으로 게임을 시작합니다.",
		        "commands": [
		          {
		            "sequence": 1,
		            "command": "git clone https://github.com/gitcat/project.git",
		            "explanation": "원격 저장소를 내 컴퓨터로 복사합니다. 모든 모드는 이 명령어로 시작해요."
		          }
		        ]
		      },
		      {
		        "order": 2,
		        "title": "새 브랜치 만들기 (checkout)",
		        "description": "checkout -b로 브랜치를 만들고 이동해봐요.",
		        "commands": [
		          {
		            "sequence": 1,
		            "command": "git checkout -b feature/login",
		            "explanation": "새 브랜치를 생성하면서 동시에 그 브랜치로 이동합니다."
		          }
		        ]
		      },
		      {
		        "order": 3,
		        "title": "변경 사항 스테이징",
		        "description": "작업한 파일을 커밋 대기열에 올려요.",
		        "commands": [
		          {
		            "sequence": 1,
		            "command": "git add .",
		            "explanation": "변경된 파일을 스테이징 영역에 추가합니다. '.'은 모든 변경 파일을 의미해요."
		          }
		        ]
		      },
		      {
		        "order": 4,
		        "title": "커밋하기",
		        "description": "스테이징한 내용을 기록으로 남겨요.",
		        "commands": [
		          {
		            "sequence": 1,
		            "command": "git commit -m \\"feat: add login page\\"",
		            "explanation": "변경 사항을 저장소에 기록합니다. 어떤 작업을 했는지 메시지로 남겨요."
		          }
		        ]
		      },
		      {
		        "order": 5,
		        "title": "원격 저장소에 올리기",
		        "description": "내 브랜치를 원격 저장소에 올려봐요.",
		        "commands": [
		          {
		            "sequence": 1,
		            "command": "git push origin feature/login",
		            "explanation": "로컬 브랜치의 커밋을 원격 저장소(origin)에 업로드합니다."
		          }
		        ]
		      },
		      {
		        "order": 6,
		        "title": "브랜치 이동하기 (checkout)",
		        "description": "checkout은 브랜치 이동에도 쓰여요. main으로 돌아가볼게요.",
		        "commands": [
		          {
		            "sequence": 1,
		            "command": "git checkout main",
		            "explanation": "이미 있는 브랜치로 이동합니다. -b 없이 쓰면 이동만 해요."
		          }
		        ]
		      },
		      {
		        "order": 7,
		        "title": "새 브랜치 만들기 (switch)",
		        "description": "이번엔 switch -c로 브랜치를 만들어봐요. checkout -b와 같은 기능이에요.",
		        "commands": [
		          {
		            "sequence": 1,
		            "command": "git switch -c feature/signup",
		            "explanation": "새 브랜치를 생성하면서 동시에 이동합니다. git checkout -b의 최신 대체 명령어예요."
		          }
		        ]
		      },
		      {
		        "order": 8,
		        "title": "변경 사항 스테이징",
		        "description": "작업한 파일을 다시 스테이징해요.",
		        "commands": [
		          {
		            "sequence": 1,
		            "command": "git add .",
		            "explanation": "변경된 파일을 스테이징 영역에 추가합니다."
		          }
		        ]
		      },
		      {
		        "order": 9,
		        "title": "커밋하기",
		        "description": "스테이징한 내용을 기록으로 남겨요.",
		        "commands": [
		          {
		            "sequence": 1,
		            "command": "git commit -m \\"feat: add signup page\\"",
		            "explanation": "변경 사항을 저장소에 기록합니다."
		          }
		        ]
		      },
		      {
		        "order": 10,
		        "title": "원격 저장소에 올리기",
		        "description": "새 브랜치를 원격 저장소에 올려요.",
		        "commands": [
		          {
		            "sequence": 1,
		            "command": "git push origin feature/signup",
		            "explanation": "로컬 브랜치의 커밋을 원격 저장소(origin)에 업로드합니다."
		          }
		        ]
		      },
		      {
		        "order": 11,
		        "title": "브랜치 이동하기 (switch)",
		        "description": "switch로도 브랜치를 이동할 수 있어요. main으로 돌아가볼게요.",
		        "commands": [
		          {
		            "sequence": 1,
		            "command": "git switch main",
		            "explanation": "이미 있는 브랜치로 이동합니다. git checkout의 최신 대체 명령어예요."
		          }
		        ]
		      },
		      {
		        "order": 12,
		        "title": "브랜치 합치기",
		        "description": "작업한 브랜치들을 main에 합쳐봐요.",
		        "commands": [
		          {
		            "sequence": 1,
		            "command": "git merge feature/login",
		            "explanation": "다른 브랜치의 작업 내용을 현재 브랜치로 가져와 합칩니다."
		          },
		          {
		            "sequence": 2,
		            "command": "git merge feature/signup",
		            "explanation": "두 번째 브랜치도 동일하게 머지합니다."
		          }
		        ]
		      },
		      {
		        "order": 13,
		        "title": "최종 반영",
		        "description": "합쳐진 main 브랜치를 원격 저장소에 올리면 끝이에요!",
		        "commands": [
		          {
		            "sequence": 1,
		            "command": "git push origin main",
		            "explanation": "머지된 main 브랜치를 원격 저장소에 최종 반영합니다."
		          }
		        ]
		      }
		    ]
		  }
		}
		""")))
	ResponseEntity<?> getTutorial();
}

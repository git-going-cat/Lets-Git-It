package com.gitcat.letsgitit.domain.map.controller;

import org.springframework.http.ResponseEntity;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "Map", description = "맵 관련 API")
public interface MapControllerDocs {

	@Operation(summary = "협력 맵 리스트 조회", description = "방 생성 전 맵 선택 UI 시 사용.")
	@ApiResponse(responseCode = "200", description = "조회 성공", content = @Content(mediaType = "application/json", examples = @ExampleObject(value = """
		{
		  "status": 200,
		  "message": "맵 목록 조회 성공",
		  "data": {
		    "maps": [
		      {
		        "mapId": "550e8400-e29b-41d4-a716-446655440002",
		        "mapName": "초보의 숲",
		        "difficulty": 1,
		        "isActive": true,
		        "updatedAt": "2026-05-13T14:30:45+09:00"
		      },
		      {
		        "mapId": "550e8400-e29b-41d4-a716-446655440003",
		        "mapName": "병합 지옥",
		        "difficulty": 4,
		        "isActive": true,
		        "updatedAt": "2026-05-13T14:30:45+09:00"
		      },
		      {
		        "mapId": "550e8400-e29b-41d4-a716-446655440004",
		        "mapName": "리베이스 전쟁",
		        "difficulty": 3,
		        "isActive": true,
		        "updatedAt": "2026-05-13T14:30:45+09:00"
		      }
		    ]
		  }
		}
		""")))
	ResponseEntity<?> getCoopMaps();
}

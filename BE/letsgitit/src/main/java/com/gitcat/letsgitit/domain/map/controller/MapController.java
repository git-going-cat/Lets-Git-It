package com.gitcat.letsgitit.domain.map.controller;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gitcat.letsgitit.global.response.ApiResponse;

@RestController
@RequestMapping("/api/v1/maps")
public class MapController implements MapControllerDocs {

	// TODO: 서비스 로직 연동 후 제거
	@Override
	@GetMapping("/coop")
	public ResponseEntity<?> getCoopMaps() {
		Map<String, Object> map1 = new LinkedHashMap<>();
		map1.put("mapId", "550e8400-e29b-41d4-a716-446655440002");
		map1.put("mapName", "초보의 숲");
		map1.put("difficulty", 1);
		map1.put("isActive", true);
		map1.put("updatedAt", "2026-05-13T14:30:45+09:00");

		Map<String, Object> map2 = new LinkedHashMap<>();
		map2.put("mapId", "550e8400-e29b-41d4-a716-446655440003");
		map2.put("mapName", "병합 지옥");
		map2.put("difficulty", 4);
		map2.put("isActive", true);
		map2.put("updatedAt", "2026-05-13T14:30:45+09:00");

		Map<String, Object> map3 = new LinkedHashMap<>();
		map3.put("mapId", "550e8400-e29b-41d4-a716-446655440004");
		map3.put("mapName", "리베이스 전쟁");
		map3.put("difficulty", 3);
		map3.put("isActive", true);
		map3.put("updatedAt", "2026-05-13T14:30:45+09:00");

		Map<String, Object> data = Map.of("maps", List.of(map1, map2, map3));
		return ApiResponse.ok("맵 목록 조회 성공", data);
	}
}

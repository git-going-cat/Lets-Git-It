package com.gitcat.letsgitit.domain.coop.service;

import java.util.UUID;

import com.gitcat.letsgitit.domain.coop.dto.response.CoopMapListResponse;
import com.gitcat.letsgitit.domain.coop.entity.CoopMap;
import com.gitcat.letsgitit.domain.room.dto.response.SelectedMapDto;

public interface CoopService {

	// 활성화된 협력 맵 목록 조회
	CoopMapListResponse getCoopMaps();

	// mapId로 해당 맵의 그래프 이미지(Base64 또는 URL) 반환 — 협력 게임 시작 응답에 사용
	String getGraphPictureByMapId(UUID mapId);

	CoopMap getActiveCoopMap(UUID mapId);

	SelectedMapDto getSelectedMap(UUID mapId);
}

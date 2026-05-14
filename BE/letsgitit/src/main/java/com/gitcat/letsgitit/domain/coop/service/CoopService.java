package com.gitcat.letsgitit.domain.coop.service;

import com.gitcat.letsgitit.domain.coop.dto.response.CoopMapResponse;

public interface CoopService {

	// 활성화된 협력 맵 목록 조회
	CoopMapResponse.MapListResponse getCoopMaps();
}

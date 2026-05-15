package com.gitcat.letsgitit.domain.coop.service;

import java.util.UUID;

import com.gitcat.letsgitit.domain.coop.dto.response.CoopMapListResponse;
import com.gitcat.letsgitit.domain.coop.entity.CoopMap;
import com.gitcat.letsgitit.domain.room.dto.response.SelectedMapDto;

public interface CoopService {

	CoopMapListResponse getCoopMaps();

	CoopMap getActiveCoopMap(UUID mapId);

	SelectedMapDto getSelectedMap(UUID mapId);
}

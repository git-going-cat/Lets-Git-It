package com.gitcat.letsgitit.domain.coop.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.coop.dto.response.CoopMapDto;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopMapListResponse;
import com.gitcat.letsgitit.domain.coop.entity.CoopMap;
import com.gitcat.letsgitit.domain.coop.repository.CoopMapRepository;
import com.gitcat.letsgitit.domain.room.dto.response.SelectedMapDto;
import com.gitcat.letsgitit.global.exception.BusinessException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CoopServiceImpl implements CoopService {

	private final CoopMapRepository coopMapRepository;

	@Override
	@Transactional(readOnly = true)
	public CoopMapListResponse getCoopMaps() {
		return new CoopMapListResponse(
			coopMapRepository.findAll().stream()
				.map(CoopMapDto::from)
				.toList());
	}

	public CoopMap getActiveCoopMap(UUID mapId) {
		CoopMap coopMap = coopMapRepository.findById(mapId)
			.orElseThrow(() -> new BusinessException(COOP_MAP_NOT_FOUND));

		if (!coopMap.isActive()) {
			throw new BusinessException(COOP_MAP_NOT_ACTIVE);
		}

		return coopMap;
	}

	@Override
	public SelectedMapDto getSelectedMap(UUID mapId) {
		CoopMap coopMap = getActiveCoopMap(mapId);
		return new SelectedMapDto(coopMap.getId(), coopMap.getName(), coopMap.getDifficulty());
	}

	@Override
	@Transactional(readOnly = true)
	public String getGraphPictureByMapId(UUID mapId) {
		return coopMapRepository.findById(mapId)
			.orElseThrow(() -> new BusinessException(ROOM_NOT_FOUND))
			.getGraphPicture();
	}
}

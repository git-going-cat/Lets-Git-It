package com.gitcat.letsgitit.domain.coop.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.coop.dto.response.CoopMapResponse;
import com.gitcat.letsgitit.domain.coop.repository.CoopMapRepository;

import lombok.RequiredArgsConstructor;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class CoopServiceImpl implements CoopService {

	private final CoopMapRepository coopMapRepository;

	@Override
	public CoopMapResponse.MapListResponse getCoopMaps() {
		return new CoopMapResponse.MapListResponse(
			coopMapRepository.findAllByIsActiveTrue().stream()
				.map(CoopMapResponse.MapDto::from)
				.toList());
	}
}

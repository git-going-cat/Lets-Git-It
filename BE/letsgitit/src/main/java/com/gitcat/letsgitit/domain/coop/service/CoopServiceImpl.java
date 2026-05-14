package com.gitcat.letsgitit.domain.coop.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.coop.dto.response.CoopMapDto;
import com.gitcat.letsgitit.domain.coop.dto.response.CoopMapListResponse;
import com.gitcat.letsgitit.domain.coop.repository.CoopMapRepository;

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
}

package com.gitcat.letsgitit.domain.coop.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.io.InputStream;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import jakarta.annotation.PostConstruct;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gitcat.letsgitit.domain.coop.dto.response.GraphDataDto;
import com.gitcat.letsgitit.domain.coop.repository.CoopMapRepository;
import com.gitcat.letsgitit.global.exception.BusinessException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class CoopGraphDataStore {

	private static final GraphDataDto EMPTY = new GraphDataDto(
		"0 0 600 300", List.of(), List.of());

	private final CoopMapRepository coopMapRepository;
	private final ObjectMapper objectMapper;

	// difficulty(1~5) → GraphDataDto 캐시
	private final Map<Integer, GraphDataDto> cache = new HashMap<>();

	@PostConstruct
	public void init() {
		for (int difficulty = 1; difficulty <= 5; difficulty++) {
			try {
				InputStream is = new ClassPathResource(
					"graph/difficulty-" + difficulty + ".json").getInputStream();
				GraphDataDto graphData = objectMapper.readValue(is, GraphDataDto.class);
				cache.put(difficulty, graphData);
				log.info("[coop][init] graphData loaded. difficulty={}", difficulty);
			} catch (Exception e) {
				log.error("[coop][init] graphData load failed. difficulty={}, reason={}", difficulty,
					e.getMessage());
			}
		}
	}

	/**
	 * mapId로 해당 맵의 난이도를 조회한 뒤 GraphDataDto를 반환한다.
	 */
	public GraphDataDto getByMapId(UUID mapId) {
		int difficulty = coopMapRepository.findById(mapId)
			.orElseThrow(() -> new BusinessException(COOP_MAP_NOT_FOUND))
			.getDifficulty();
		return getByDifficulty(difficulty);
	}

	/**
	 * 난이도로 직접 GraphDataDto를 반환한다.
	 */
	public GraphDataDto getByDifficulty(int difficulty) {
		GraphDataDto graphData = cache.get(difficulty);
		if (graphData == null) {
			log.warn("[coop][getByDifficulty] graphData not found for difficulty={}. returning empty.", difficulty);
			return EMPTY;
		}
		return graphData;
	}
}

package com.gitcat.letsgitit.domain.coop.repository;

import java.util.List;
import java.util.UUID;

import com.gitcat.letsgitit.domain.coop.entity.CoopCommandSetItem;

public interface CoopCommandSetItemRepository {

	// 특정 맵의 특정 라운드 명령어 4개를 순서대로 조회
	List<CoopCommandSetItem> findByMapIdAndRound(UUID coopMapId, int round);
}

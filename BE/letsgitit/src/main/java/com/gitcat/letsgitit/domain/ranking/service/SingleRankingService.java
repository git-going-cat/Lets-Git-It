package com.gitcat.letsgitit.domain.ranking.service;

import java.util.UUID;

import com.gitcat.letsgitit.domain.ranking.dto.response.SingleRankingInitialResponse;
import com.gitcat.letsgitit.domain.ranking.dto.response.SingleRankingScrollResponse;

public interface SingleRankingService {

	SingleRankingInitialResponse getSingleRanking(String difficulty, int size, UUID memberId);

	SingleRankingScrollResponse getSingleRankingScroll(String difficulty, int cursor, int size, UUID memberId);
}

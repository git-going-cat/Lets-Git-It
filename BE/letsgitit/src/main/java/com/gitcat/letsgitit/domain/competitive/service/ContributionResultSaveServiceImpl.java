package com.gitcat.letsgitit.domain.competitive.service;

import java.util.List;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.competitive.dto.ContributionRankingCache;
import com.gitcat.letsgitit.domain.competitive.entity.ContributionResult;
import com.gitcat.letsgitit.domain.competitive.entity.ContributionResultMember;
import com.gitcat.letsgitit.domain.competitive.repository.ContributionResultMemberRepository;
import com.gitcat.letsgitit.domain.competitive.repository.ContributionResultRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContributionResultSaveServiceImpl implements ContributionResultSaveService {

	private final ContributionResultRepository contributionResultRepository;
	private final ContributionResultMemberRepository contributionResultMemberRepository;

	@Override
	@Transactional
	public void saveCompletedResult(Long roomId, UUID gameSessionId, List<ContributionRankingCache> rankings) {
		String sessionId = gameSessionId.toString();
		if (contributionResultRepository.existsBySessionId(sessionId)) {
			log.warn("[contribution][saveCompletedResult] duplicate result ignored. roomId={}, gameSessionId={}",
				roomId, gameSessionId);
			return;
		}

		ContributionResult result;
		try {
			result = contributionResultRepository.save(ContributionResult.of(roomId, sessionId));
		} catch (DataIntegrityViolationException e) {
			if (contributionResultRepository.existsBySessionId(sessionId)) {
				log.warn(
					"[contribution][saveCompletedResult] duplicate result collision ignored. roomId={}, gameSessionId={}",
					roomId, gameSessionId);
				return;
			}
			log.error("[contribution][saveCompletedResult] data integrity violation. roomId={}, gameSessionId={}",
				roomId, gameSessionId, e);
			throw e;
		} catch (RuntimeException e) {
			log.error("[contribution][saveCompletedResult] unexpected error. roomId={}, gameSessionId={}",
				roomId, gameSessionId, e);
			throw e;
		}

		try {
			List<ContributionResultMember> members = rankings.stream()
				.filter(ranking -> ranking.playerId() != null)
				.map(ranking -> ContributionResultMember.of(
					result.getId(),
					ranking.playerId(),
					ranking.contribution()))
				.toList();
			contributionResultMemberRepository.saveAll(members);
			log.info("[contribution][saveCompletedResult] roomId={}, gameSessionId={}, playerCount={}",
				roomId, gameSessionId, members.size());
		} catch (RuntimeException e) {
			log.error("[contribution][saveCompletedResult] unexpected error. roomId={}, gameSessionId={}",
				roomId, gameSessionId, e);
			throw e;
		}
	}
}

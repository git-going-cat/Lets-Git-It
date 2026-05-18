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
import com.gitcat.letsgitit.domain.member.service.MemberService;
import com.gitcat.letsgitit.domain.record.service.RecordService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ContributionResultSaveServiceImpl implements ContributionResultSaveService {

	private final ContributionResultRepository contributionResultRepository;
	private final ContributionResultMemberRepository contributionResultMemberRepository;
	private final MemberService memberService;
	private final RecordService recordService;

	@Override
	@Transactional
	public void saveCompletedResult(Long roomId, UUID gameSessionId, List<ContributionRankingCache> rankings,
		long startAt) {
		int playTimeSeconds = (int)((System.currentTimeMillis() - startAt) / 1000);
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
			List<ContributionRankingCache> realPlayers = rankings.stream()
				.filter(ranking -> ranking.playerId() != null)
				.toList();

			List<ContributionResultMember> members = realPlayers.stream()
				.map(ranking -> ContributionResultMember.of(
					result.getId(),
					ranking.playerId(),
					ranking.contribution()))
				.toList();
			contributionResultMemberRepository.saveAll(members);
			log.info("[contribution][saveCompletedResult] roomId={}, gameSessionId={}, playerCount={}",
				roomId, gameSessionId, members.size());

			for (ContributionRankingCache ranking : realPlayers) {
				memberService.addPlayTime(ranking.playerId(), playTimeSeconds);
				boolean isNewRecord = recordService.updateContributionBestRecord(
					ranking.playerId(), ranking.contribution(), ranking.rank());
				log.info(
					"[contribution][saveCompletedResult] playTime+record. memberId={}, playTimeSeconds={}, contribution={}, isNewRecord={}",
					ranking.playerId(), playTimeSeconds, ranking.contribution(), isNewRecord);
			}
		} catch (RuntimeException e) {
			log.error("[contribution][saveCompletedResult] unexpected error. roomId={}, gameSessionId={}",
				roomId, gameSessionId, e);
			throw e;
		}
	}
}

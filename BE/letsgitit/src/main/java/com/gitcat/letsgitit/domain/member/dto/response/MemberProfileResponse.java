package com.gitcat.letsgitit.domain.member.dto.response;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.entity.enums.OnboardingStatus;
import com.gitcat.letsgitit.domain.record.entity.BestRecordMode;
import com.gitcat.letsgitit.domain.record.entity.MemberBestRecord;
import com.gitcat.letsgitit.domain.record.entity.MemberCoopBestRecord;
import com.gitcat.letsgitit.global.enums.AuthType;
import com.gitcat.letsgitit.global.enums.Provider;

public record MemberProfileResponse(
	UUID memberId,
	String nickname,
	AuthType authType,
	Provider provider,
	String email,
	OnboardingStatus onboardingStatus,
	int totalPlayTime,
	String characterHair,
	String characterHairColor,
	String characterBody,
	String characterEye,
	String characterOutfit,
	String characterOutfitColor,
	List<RecordResponse> records) {

	public static MemberProfileResponse of(
		Member member,
		List<MemberBestRecord> bestRecords,
		MemberCoopBestRecord coopBestRecord) {
		return new MemberProfileResponse(
			member.getId(),
			member.getNickname(),
			member.getAuthType(),
			member.getProvider(),
			member.getEmail(),
			member.getOnboardingStatus(),
			member.getTotalPlayTime(),
			member.getCharacterHair(),
			member.getCharacterHairColor(),
			member.getCharacterBody(),
			member.getCharacterEye(),
			member.getCharacterOutfit(),
			member.getCharacterOutfitColor(),
			RecordResponse.from(bestRecords, coopBestRecord));
	}

	@JsonInclude(JsonInclude.Include.NON_NULL)
	public record RecordResponse(
		String mode,
		Integer bestScore,
		Integer totalContribution,
		Integer totalCount,
		Integer bestClearTime) {
		public static List<RecordResponse> from(
			List<MemberBestRecord> bestRecords,
			MemberCoopBestRecord coopBestRecord) {

			Map<BestRecordMode, MemberBestRecord> recordMap = new EnumMap<>(BestRecordMode.class);

			for (MemberBestRecord record : bestRecords) {
				recordMap.put(record.getMode(), record);
			}

			return List.of(
				singleRecord(BestRecordMode.SINGLE_EASY, recordMap),
				singleRecord(BestRecordMode.SINGLE_NORMAL, recordMap),
				singleRecord(BestRecordMode.SINGLE_HARD, recordMap),
				contributionRecord(recordMap),
				timeAttackRecord(recordMap),
				coopRecord(coopBestRecord));
		}

		private static RecordResponse singleRecord(
			BestRecordMode mode,
			Map<BestRecordMode, MemberBestRecord> recordMap) {
			MemberBestRecord record = recordMap.get(mode);
			int bestScore = record == null ? 0 : record.getBestScore();

			return new RecordResponse(
				mode.name(),
				bestScore,
				null,
				null,
				null);
		}

		private static RecordResponse contributionRecord(
			Map<BestRecordMode, MemberBestRecord> recordMap) {
			MemberBestRecord record = recordMap.get(BestRecordMode.CONTRIBUTION_RUN);
			int totalContribution = record == null ? 0 : record.getBestScore();

			return new RecordResponse(
				BestRecordMode.CONTRIBUTION_RUN.name(),
				null,
				totalContribution,
				null,
				null);
		}

		private static RecordResponse timeAttackRecord(
			Map<BestRecordMode, MemberBestRecord> recordMap) {
			MemberBestRecord record = recordMap.get(BestRecordMode.TIME_ATTACK);
			int totalCount = record == null ? 0 : record.getBestScore();

			return new RecordResponse(
				BestRecordMode.TIME_ATTACK.name(),
				null,
				null,
				totalCount,
				null);
		}

		private static RecordResponse coopRecord(MemberCoopBestRecord coopBestRecord) {
			int bestClearTime = coopBestRecord == null ? 0 : coopBestRecord.getBestTime();

			return new RecordResponse(
				BestRecordMode.COOP.name(),
				null,
				null,
				null,
				bestClearTime);
		}
	}
}

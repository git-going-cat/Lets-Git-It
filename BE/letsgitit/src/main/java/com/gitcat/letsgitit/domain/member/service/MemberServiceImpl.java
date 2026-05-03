package com.gitcat.letsgitit.domain.member.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.member.dto.request.NicknameRequest;
import com.gitcat.letsgitit.domain.member.dto.request.SaveCharacterRequest;
import com.gitcat.letsgitit.domain.member.dto.response.MemberProfileResponse;
import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.entity.enums.OnboardingStatus;
import com.gitcat.letsgitit.domain.member.repository.MemberRepository;
import com.gitcat.letsgitit.domain.record.entity.MemberBestRecord;
import com.gitcat.letsgitit.domain.record.entity.MemberCoopBestRecord;
import com.gitcat.letsgitit.domain.record.service.RecordService;
import com.gitcat.letsgitit.global.exception.BusinessException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {

	private final MemberRepository memberRepository;
	private final RecordService recordService;

	@Override
	@Transactional
	public void endTutorial(UUID memberId) {
		Member member = findById(memberId);

		OnboardingStatus onboardingStatus = member.getOnboardingStatus();

		if (onboardingStatus == OnboardingStatus.NONE) {
			throw new BusinessException(NICKNAME_NOT_SET);
		}

		if (onboardingStatus == OnboardingStatus.TUTORIAL_DONE) {
			throw new BusinessException(TUTORIAL_ALREADY_COMPLETED);
		}

		member.updateOnboardingStatus(OnboardingStatus.TUTORIAL_DONE);
	}

	@Override
	@Transactional(readOnly = true)
	public MemberProfileResponse getProfile(UUID memberId) {
		Member member = findById(memberId);

		List<MemberBestRecord> bestRecords = recordService.getBestRecords(memberId);

		MemberCoopBestRecord coopBestRecord = recordService.getBestCoopRecord(memberId);

		return MemberProfileResponse.of(member, bestRecords, coopBestRecord);
	}

	@Override
	@Transactional
	public void saveCharacterAssets(UUID memberId, SaveCharacterRequest saveCharacterRequest) {
		Member member = findById(memberId);

		member.updateCharacter(
			saveCharacterRequest.characterHair(),
			saveCharacterRequest.characterHairColor(),
			saveCharacterRequest.characterBody(),
			saveCharacterRequest.characterEye(),
			saveCharacterRequest.characterOutfit(),
			saveCharacterRequest.characterOutfitColor());
	}

	@Override
	@Transactional
	public void saveNickname(UUID memberId, NicknameRequest nicknameRequest) {
		Member member = findById(memberId);

		if (member.getOnboardingStatus() != OnboardingStatus.NONE) {
			throw new BusinessException(NICKNAME_ALREADY_SET);
		}

		String nickname = nicknameRequest.nickname();

		validateNicknameDuplicate(nickname);

		try {
			member.updateNickname(nickname);
			member.updateOnboardingStatus(OnboardingStatus.NICKNAME_SET_DONE);
			memberRepository.flush();
		} catch (DataIntegrityViolationException e) {
			throw new BusinessException(NICKNAME_DUPLICATE);
		}
	}

	@Override
	@Transactional
	public void updateNickname(UUID memberId, NicknameRequest nicknameRequest) {
		Member member = findById(memberId);

		String newNickname = nicknameRequest.nickname();

		if (Objects.equals(member.getNickname(), newNickname)) {
			return;
		}

		validateNicknameDuplicate(newNickname);

		try {
			member.updateNickname(newNickname);
			memberRepository.flush();
		} catch (DataIntegrityViolationException e) {
			throw new BusinessException(NICKNAME_DUPLICATE);
		}
	}

	@Override
	public void validateNicknameDuplicate(String nickname) {
		if (memberRepository.existsByNickname(nickname)) {
			throw new BusinessException(NICKNAME_DUPLICATE);
		}
	}

	@Override
	@Transactional(readOnly = true)
	public String getNicknameById(UUID memberId) {
		return memberRepository.findById(memberId)
			.map(Member::getNickname)
			.orElseThrow(() -> new BusinessException(MEMBER_NOT_FOUND));
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, String> getNicknamesByIds(List<UUID> memberIds) {
		return memberRepository.findAllByIds(memberIds).stream()
			.collect(Collectors.toMap(Member::getId, Member::getNickname));
	}

	@Override
	@Transactional(readOnly = true)
	public Member findByEmail(String email) {
		return memberRepository.findByEmail(email)
			.orElseThrow(() -> new BusinessException(MEMBER_NOT_FOUND));
	}

	@Override
	@Transactional(readOnly = true)
	public boolean existsByEmail(String email) {
		return memberRepository.existsByEmail(email);
	}

	@Override
	@Transactional
	public void createMember(String email, String encodedPassword) {
		memberRepository.save(Member.of(email, encodedPassword));
	}

	@Override
	@Transactional
	public void updatePassword(Member member, String encodedPassword) {
		member.updatePassword(encodedPassword);
		memberRepository.save(member);
	}

	private Member findById(UUID memberId) {
		return memberRepository.findById(memberId)
			.orElseThrow(() -> new BusinessException(MEMBER_NOT_FOUND));
	}
}

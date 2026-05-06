package com.gitcat.letsgitit.domain.member.service;

import static com.gitcat.letsgitit.global.exception.ErrorCode.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gitcat.letsgitit.domain.member.dto.request.NicknameRequest;
import com.gitcat.letsgitit.domain.member.dto.request.SaveCharacterRequest;
import com.gitcat.letsgitit.domain.member.dto.response.MemberProfileResponse;
import com.gitcat.letsgitit.domain.member.dto.response.OAuthMemberResponse;
import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.entity.enums.OnboardingStatus;
import com.gitcat.letsgitit.domain.member.repository.MemberRedisRepository;
import com.gitcat.letsgitit.domain.member.repository.MemberRepository;
import com.gitcat.letsgitit.domain.record.entity.MemberBestRecord;
import com.gitcat.letsgitit.domain.record.entity.MemberCoopBestRecord;
import com.gitcat.letsgitit.domain.record.service.RecordService;
import com.gitcat.letsgitit.global.enums.AuthType;
import com.gitcat.letsgitit.global.enums.Provider;
import com.gitcat.letsgitit.global.exception.BusinessException;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MemberServiceImpl implements MemberService {

	private final MemberRepository memberRepository;
	private final MemberRedisRepository memberRedisRepository;
	private final RecordService recordService;
	private final PasswordEncoder passwordEncoder;

	@Override
	@Transactional
	public void endTutorial(UUID memberId) {
		Member member = getMemberOrThrow(memberId);

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
		Member member = getMemberOrThrow(memberId);

		List<MemberBestRecord> bestRecords = recordService.getBestRecords(memberId);

		MemberCoopBestRecord coopBestRecord = recordService.getBestCoopRecord(memberId);

		return MemberProfileResponse.of(member, bestRecords, coopBestRecord);
	}

	@Override
	@Transactional
	public void saveCharacterAssets(UUID memberId, SaveCharacterRequest saveCharacterRequest) {
		Member member = getMemberOrThrow(memberId);

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
		Member member = getMemberOrThrow(memberId);

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
		Member member = getMemberOrThrow(memberId);

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

	@Override
	@Transactional
	public void addPlayTime(UUID memberId, int seconds) {
		Member member = findById(memberId);
		member.addPlayTime(seconds);
	}

	@Override
	@Transactional(readOnly = true)
	public Member findById(UUID memberId) {
		return getMemberOrThrow(memberId);
	}

	@Override
	@Transactional
	public OAuthMemberResponse findOrCreateOAuthMember(String email, Provider provider, String providerId) {

		// 1. providerId로 기존 OAuth 계정 조회
		//    동일 소셜 계정으로 재로그인하는 경우 → 그대로 반환
		Optional<Member> oauthMember = memberRepository.findByProviderAndProviderId(provider, providerId);
		if (oauthMember.isPresent()) {
			return new OAuthMemberResponse(oauthMember.get(), false);
		}

		// 2. providerId로 못 찾은 경우 — 탈퇴 계정 포함 이메일로 조회
		Optional<Member> existingMember = memberRepository.findByEmailIncludingDeleted(email);

		if (existingMember.isPresent()) {
			Member member = existingMember.get();

			if (member.getDeletedAt() == null) {
				// 2-1. 탈퇴하지 않은 정상 계정 존재 → 이메일 중복
				throw new BusinessException(EMAIL_DUPLICATE);
			}

			long daysSinceDeleted = ChronoUnit.DAYS.between(member.getDeletedAt(), LocalDateTime.now());

			if (daysSinceDeleted <= 30) {
				// 2-2. 30일 이내 재가입 → 기존 계정 재활성화
				//      provider, providerId 업데이트해서 OAuth 계정으로 전환
				member.reactivate();
				member.updateOAuth(provider, providerId);
				return new OAuthMemberResponse(member, true);
			} else {
				// 2-3. 30일 초과 → 기존 계정 마스킹 후 신규 생성
				member.mask();
				memberRepository.flush();
			}
		}

		// 3. 신규 OAuth 계정 생성
		Member newMember = memberRepository.save(Member.ofOAuth(email, provider, providerId));
		return new OAuthMemberResponse(newMember, false);
	}

	@Override
	@Transactional
	public void withdraw(UUID memberId, String password) {
		Member member = findById(memberId);

		if (member.getAuthType() == AuthType.LOCAL) {
			if (password == null || password.isBlank()) {
				throw new BusinessException(INVALID_CREDENTIALS);
			}
			if (!passwordEncoder.matches(password, member.getPassword())) {
				throw new BusinessException(INVALID_CREDENTIALS);
			}
		}

		member.delete();
	}

	@Override
	public void verifyPassword(UUID memberId, String password) {
		Member member = findById(memberId);

		// OAuth 계정은 비밀번호가 없으므로 검증 자체가 불가
		if (member.getAuthType() == AuthType.OAUTH) {
			throw new BusinessException(OAUTH_ACCOUNT);
		}

		// 비밀번호 일치 여부 확인
		if (!passwordEncoder.matches(password, member.getPassword())) {
			throw new BusinessException(PASSWORD_MISMATCH);
		}

		// 검증 성공 → Redis에 5분 TTL로 저장
		// changePassword에서 이 키를 확인해 "검증 단계를 거쳤는지" 판단한다
		memberRedisRepository.savePasswordVerified(memberId.toString());
	}

	@Override
	@Transactional
	public void changePassword(UUID memberId, String currentPassword, String newPassword) {
		Member member = findById(memberId);

		if (member.getAuthType() == AuthType.OAUTH) {
			throw new BusinessException(OAUTH_ACCOUNT);
		}

		// verifyPassword API 호출 여부 확인
		// Redis 키가 없으면 검증 단계를 우회한 요청으로 판단해 차단
		if (!memberRedisRepository.isPasswordVerified(memberId.toString())) {
			throw new BusinessException(PASSWORD_VERIFY_REQUIRED);
		}

		// currentPassword 재검증
		// 토큰이 탈취되어도 Redis 키만으로 변경되는 것을 방어하는 2차 검증
		if (!passwordEncoder.matches(currentPassword, member.getPassword())) {
			throw new BusinessException(PASSWORD_MISMATCH);
		}

		if (!newPassword.matches("^(?=.*[A-Za-z])(?=.*\\d)(?=.*[!@#$%^&*])[A-Za-z\\d!@#$%^&*]{8,20}$")) {
			throw new BusinessException(INVALID_PASSWORD_FORMAT);
		}

		if (passwordEncoder.matches(newPassword, member.getPassword())) {
			throw new BusinessException(SAME_AS_CURRENT_PASSWORD);
		}

		updatePassword(member, passwordEncoder.encode(newPassword));

		// 변경 성공 후 즉시 삭제 — 같은 키로 재사용하는 것을 방지
		memberRedisRepository.deletePasswordVerified(memberId.toString());
	}

	@Override
	@Transactional(readOnly = true)
	public Optional<Member> findByEmailIncludingDeleted(String email) {
		return memberRepository.findByEmailIncludingDeleted(email);
	}

	@Override
	@Transactional
	public void flush() {
		memberRepository.flush();
	}

	private Member getMemberOrThrow(UUID memberId) {
		return memberRepository.findById(memberId)
			.orElseThrow(() -> new BusinessException(MEMBER_NOT_FOUND));
	}
}

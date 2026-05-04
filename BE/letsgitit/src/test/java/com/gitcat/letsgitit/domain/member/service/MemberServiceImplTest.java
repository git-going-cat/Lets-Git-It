package com.gitcat.letsgitit.domain.member.service;

import static com.gitcat.letsgitit.domain.member.entity.enums.OnboardingStatus.*;
import static com.gitcat.letsgitit.domain.record.entity.BestRecordMode.*;
import static com.gitcat.letsgitit.global.exception.ErrorCode.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import com.gitcat.letsgitit.domain.member.dto.request.NicknameRequest;
import com.gitcat.letsgitit.domain.member.dto.request.SaveCharacterRequest;
import com.gitcat.letsgitit.domain.member.dto.response.MemberProfileResponse;
import com.gitcat.letsgitit.domain.member.entity.Member;
import com.gitcat.letsgitit.domain.member.repository.MemberRepository;
import com.gitcat.letsgitit.domain.record.entity.MemberBestRecord;
import com.gitcat.letsgitit.domain.record.entity.MemberCoopBestRecord;
import com.gitcat.letsgitit.domain.record.service.RecordService;
import com.gitcat.letsgitit.global.enums.Provider;
import com.gitcat.letsgitit.global.exception.BusinessException;

@ExtendWith(MockitoExtension.class)
class MemberServiceImplTest {

	@Mock
	private MemberRepository memberRepository;

	@Mock
	private RecordService recordService;

	@InjectMocks
	private MemberServiceImpl memberService;

	@Test
	void 튜토리얼_완료_시_온보딩_상태를_완료로_변경한다() {
		// given
		UUID memberId = UUID.randomUUID();
		Member member = Member.of("user@example.com", "encodedPassword");
		member.updateNickname("dobby");
		member.updateOnboardingStatus(NICKNAME_SET_DONE);

		given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

		// when
		memberService.endTutorial(memberId);

		// then
		assertThat(member.getOnboardingStatus()).isEqualTo(TUTORIAL_DONE);
	}

	@Test
	void 튜토리얼_완료_시_닉네임이_설정되지_않으면_예외가_발생한다() {
		// given
		UUID memberId = UUID.randomUUID();
		Member member = Member.of("user@example.com", "encodedPassword");

		given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

		// when & then
		assertThatThrownBy(() -> memberService.endTutorial(memberId))
			.isInstanceOf(BusinessException.class)
			.hasFieldOrPropertyWithValue("errorCode", NICKNAME_NOT_SET);
	}

	@Test
	void 튜토리얼_완료_시_이미_완료된_회원이면_예외가_발생한다() {
		// given
		UUID memberId = UUID.randomUUID();
		Member member = Member.of("user@example.com", "encodedPassword");
		member.updateOnboardingStatus(TUTORIAL_DONE);

		given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

		// when & then
		assertThatThrownBy(() -> memberService.endTutorial(memberId))
			.isInstanceOf(BusinessException.class)
			.hasFieldOrPropertyWithValue("errorCode", TUTORIAL_ALREADY_COMPLETED);
	}

	@Test
	void 내_정보_조회_시_회원과_기록을_응답으로_변환한다() {
		// given
		UUID memberId = UUID.randomUUID();
		Member member = Member.of("user@example.com", "encodedPassword");
		member.updateNickname("dobby");
		member.updateOnboardingStatus(TUTORIAL_DONE);

		List<MemberBestRecord> bestRecords = List.of(
			MemberBestRecord.of(memberId, SINGLE_NORMAL, 7200, 45),
			MemberBestRecord.of(memberId, CONTRIBUTION_RUN, 88000, 7),
			MemberBestRecord.of(memberId, TIME_ATTACK, 10500, 3));
		MemberCoopBestRecord coopBestRecord = MemberCoopBestRecord.of(memberId, "기초 브랜치", "MAP_1", 61000, 2);

		given(memberRepository.findById(memberId)).willReturn(Optional.of(member));
		given(recordService.getBestRecords(memberId)).willReturn(bestRecords);
		given(recordService.getBestCoopRecord(memberId)).willReturn(coopBestRecord);

		// when
		MemberProfileResponse response = memberService.getProfile(memberId);

		// then
		assertThat(response.nickname()).isEqualTo("dobby");
		assertThat(response.email()).isEqualTo("user@example.com");
		assertThat(response.records())
			.extracting(MemberProfileResponse.RecordResponse::mode)
			.containsExactly("SINGLE_EASY", "SINGLE_NORMAL", "SINGLE_HARD", "CONTRIBUTION_RUN", "TIME_ATTACK", "COOP");
		assertThat(response.records().get(0).bestScore()).isEqualTo(0);
		assertThat(response.records().get(1).bestScore()).isEqualTo(7200);
		assertThat(response.records().get(2).bestScore()).isEqualTo(0);
		assertThat(response.records().get(3).totalContribution()).isEqualTo(88000);
		assertThat(response.records().get(4).totalCount()).isEqualTo(10500);
		assertThat(response.records().get(5).bestClearTime()).isEqualTo(61000);
	}

	@Test
	void 캐릭터_에셋_저장_시_회원의_캐릭터_필드를_수정한다() {
		// given
		UUID memberId = UUID.randomUUID();
		Member member = Member.of("user@example.com", "encodedPassword");
		SaveCharacterRequest request = new SaveCharacterRequest(
			"Hairstyle_02",
			"Hairstyle-color_03",
			"Body_04",
			"Eyes_05",
			"Outfit_06",
			"Outfit-color_07");

		given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

		// when
		memberService.saveCharacterAssets(memberId, request);

		// then
		assertThat(member.getCharacterHair()).isEqualTo("Hairstyle_02");
		assertThat(member.getCharacterHairColor()).isEqualTo("Hairstyle-color_03");
		assertThat(member.getCharacterBody()).isEqualTo("Body_04");
		assertThat(member.getCharacterEye()).isEqualTo("Eyes_05");
		assertThat(member.getCharacterOutfit()).isEqualTo("Outfit_06");
		assertThat(member.getCharacterOutfitColor()).isEqualTo("Outfit-color_07");
	}

	@Test
	void 닉네임_저장_시_중복이_아니면_닉네임과_온보딩_상태를_수정한다() {
		// given
		UUID memberId = UUID.randomUUID();
		Member member = Member.of("user@example.com", "encodedPassword");
		NicknameRequest request = new NicknameRequest("dobby");

		given(memberRepository.findById(memberId)).willReturn(Optional.of(member));
		given(memberRepository.existsByNickname("dobby")).willReturn(false);

		// when
		memberService.saveNickname(memberId, request);

		// then
		assertThat(member.getNickname()).isEqualTo("dobby");
		assertThat(member.getOnboardingStatus()).isEqualTo(NICKNAME_SET_DONE);
		then(memberRepository).should().flush();
	}

	@Test
	void 닉네임_저장_시_이미_닉네임이_설정되어_있으면_예외가_발생한다() {
		// given
		UUID memberId = UUID.randomUUID();
		Member member = Member.of("user@example.com", "encodedPassword");
		member.updateOnboardingStatus(NICKNAME_SET_DONE);

		given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

		// when & then
		assertThatThrownBy(() -> memberService.saveNickname(memberId, new NicknameRequest("dobby")))
			.isInstanceOf(BusinessException.class)
			.hasFieldOrPropertyWithValue("errorCode", NICKNAME_ALREADY_SET);
		then(memberRepository).should(never()).existsByNickname(anyString());
	}

	@Test
	void 닉네임_수정_시_현재_닉네임과_같으면_중복_검사를_하지_않는다() {
		// given
		UUID memberId = UUID.randomUUID();
		Member member = Member.of("user@example.com", "encodedPassword");
		member.updateNickname("dobby");

		given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

		// when
		memberService.updateNickname(memberId, new NicknameRequest("dobby"));

		// then
		assertThat(member.getNickname()).isEqualTo("dobby");
		then(memberRepository).should(never()).existsByNickname(anyString());
	}

	@Test
	void 닉네임_수정_시_중복이_아니면_새_닉네임으로_수정한다() {
		// given
		UUID memberId = UUID.randomUUID();
		Member member = Member.of("user@example.com", "encodedPassword");
		member.updateNickname("dobby");

		given(memberRepository.findById(memberId)).willReturn(Optional.of(member));
		given(memberRepository.existsByNickname("newdobby")).willReturn(false);

		// when
		memberService.updateNickname(memberId, new NicknameRequest("newdobby"));

		// then
		assertThat(member.getNickname()).isEqualTo("newdobby");
		then(memberRepository).should().flush();
	}

	@Test
	void 닉네임_저장_시_flush에서_unique_제약_위반이_나면_중복_예외로_변환한다() {
		// given
		UUID memberId = UUID.randomUUID();
		Member member = Member.of("user@example.com", "encodedPassword");
		NicknameRequest request = new NicknameRequest("dobby");

		given(memberRepository.findById(memberId)).willReturn(Optional.of(member));
		given(memberRepository.existsByNickname("dobby")).willReturn(false);
		willThrow(new DataIntegrityViolationException("uq_member_nickname"))
			.given(memberRepository).flush();

		// when & then
		assertThatThrownBy(() -> memberService.saveNickname(memberId, request))
			.isInstanceOf(BusinessException.class)
			.hasFieldOrPropertyWithValue("errorCode", NICKNAME_DUPLICATE);
	}

	@Test
	void 닉네임_수정_시_flush에서_unique_제약_위반이_나면_중복_예외로_변환한다() {
		// given
		UUID memberId = UUID.randomUUID();
		Member member = Member.of("user@example.com", "encodedPassword");
		member.updateNickname("before");

		given(memberRepository.findById(memberId)).willReturn(Optional.of(member));
		given(memberRepository.existsByNickname("dobby")).willReturn(false);
		willThrow(new DataIntegrityViolationException("uq_member_nickname"))
			.given(memberRepository).flush();

		// when & then
		assertThatThrownBy(() -> memberService.updateNickname(memberId, new NicknameRequest("dobby")))
			.isInstanceOf(BusinessException.class)
			.hasFieldOrPropertyWithValue("errorCode", NICKNAME_DUPLICATE);
	}

	@Test
	void 닉네임_중복_확인_시_이미_존재하면_예외가_발생한다() {
		// given
		given(memberRepository.existsByNickname("dobby")).willReturn(true);

		// when & then
		assertThatThrownBy(() -> memberService.validateNicknameDuplicate("dobby"))
			.isInstanceOf(BusinessException.class)
			.hasFieldOrPropertyWithValue("errorCode", NICKNAME_DUPLICATE);
	}

	@Test
	void 회원_조회_시_존재하지_않으면_예외가_발생한다() {
		// given
		UUID memberId = UUID.randomUUID();
		given(memberRepository.findById(memberId)).willReturn(Optional.empty());

		// when & then
		assertThatThrownBy(() -> memberService.getProfile(memberId))
			.isInstanceOf(BusinessException.class)
			.hasFieldOrPropertyWithValue("errorCode", MEMBER_NOT_FOUND);
	}

	@Test
	void 플레이_시간_추가_시_totalPlayTime이_누적된다() {
		// given
		UUID memberId = UUID.randomUUID();
		Member member = Member.of("user@example.com", "encodedPassword");

		given(memberRepository.findById(memberId)).willReturn(Optional.of(member));

		// when
		memberService.addPlayTime(memberId, 120);

		// then
		assertThat(member.getTotalPlayTime()).isEqualTo(120);
	}

	// ===================== findOrCreateOAuthMember =====================

	@Test
	void OAuth_회원이_이미_존재하면_저장_없이_기존_회원을_반환한다() {
		// given
		String email = "oauth@example.com";
		String providerId = "google-123";
		Member existingMember = Member.ofOAuth(email, Provider.GOOGLE, providerId);

		given(memberRepository.findByProviderAndProviderId(Provider.GOOGLE, providerId))
			.willReturn(Optional.of(existingMember));

		// when
		Member result = memberService.findOrCreateOAuthMember(email, Provider.GOOGLE, providerId);

		// then
		assertThat(result).isEqualTo(existingMember);
		then(memberRepository).should(never()).save(any());
	}

	@Test
	void 신규_OAuth_회원이고_이메일_중복이_없으면_새_회원을_생성한다() {
		// given
		String email = "newoauth@example.com";
		String providerId = "google-456";
		Member newMember = Member.ofOAuth(email, Provider.GOOGLE, providerId);

		given(memberRepository.findByProviderAndProviderId(Provider.GOOGLE, providerId))
			.willReturn(Optional.empty());
		given(memberRepository.existsByEmail(email)).willReturn(false);
		given(memberRepository.save(any())).willReturn(newMember);

		// when
		Member result = memberService.findOrCreateOAuthMember(email, Provider.GOOGLE, providerId);

		// then
		assertThat(result).isEqualTo(newMember);
		then(memberRepository).should().save(any());
	}

	@Test
	void 신규_OAuth_회원인데_이메일이_이미_로컬_가입된_경우_EMAIL_DUPLICATE() {
		// given
		String email = "existing@example.com";
		String providerId = "google-789";

		given(memberRepository.findByProviderAndProviderId(Provider.GOOGLE, providerId))
			.willReturn(Optional.empty());
		given(memberRepository.existsByEmail(email)).willReturn(true);

		// when & then
		assertThatThrownBy(
			() -> memberService.findOrCreateOAuthMember(email, Provider.GOOGLE, providerId))
			.isInstanceOf(BusinessException.class)
			.hasFieldOrPropertyWithValue("errorCode", EMAIL_DUPLICATE);

		then(memberRepository).should(never()).save(any());
	}
}
